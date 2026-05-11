import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  currentMonitor,
  getCurrentWindow,
  LogicalSize,
} from "@tauri-apps/api/window";
import { lazy, useEffect, useRef, useState } from "react";
import { applyAccentTheme } from "./accentTheme";
import UpdateBanner from "./components/Updatebanner";
import { canonicalizeHotkeyForBackend } from "./hotkeys";
import { I18nProvider, isRtlLanguage } from "./i18n";
import {
  buildPresetSnapshot,
  createPresetDefinition,
  MAX_PRESETS,
  sanitizePresetName,
  type PresetId,
} from "./settingsSchema";
import {
  DEFAULT_SETTINGS,
  type ClickerStatus,
  type Settings,
  clearSavedSettings,
  loadSettings,
  saveSettings,
} from "./store";

const SimplePanel = lazy(() => import("./components/panels/SimplePanel"));
const AdvancedPanel = lazy(
  () => import("./components/panels/advanced/AdvancedPanel"),
);
const ZonesPanel = lazy(() => import("./components/panels/zones/ZonesPanel"));
const SettingsPanel = lazy(() => import("./components/panels/SettingsPanel"));
const TitleBar = lazy(() => import("./components/TitleBar"));
export type Tab = "simple" | "advanced" | "zones" | "settings";

const BACKEND_SETTINGS_SCHEMA_VERSION = 10;
const MAX_DROPDOWN_OVERFLOW_BOTTOM = 220;
const OPERATIONAL_SETTING_KEYS = new Set<string>(
  Object.keys(buildPresetSnapshot(DEFAULT_SETTINGS)),
);

type DropdownOverflowDetail = {
  active: boolean;
  bottom?: number;
};

function getPanelSize(tab: Tab, hasUpdate: boolean) {
  const extra = hasUpdate ? 30 : 0;
  if (tab === "simple") {
    return { width: 650, height: 175 + extra };
  }
  if (tab === "settings") return { width: 860, height: 720 + extra };
  if (tab === "zones") return { width: 550, height: 400 + extra };
  return { width: 860, height: 720 + extra };
}

const textScale = await invoke<number>("get_text_scale_factor");
await invoke("set_webview_zoom", { factor: 1.0 / textScale });

async function getClampedPanelSize(
  size: { width: number; height: number },
  textScale: number,
) {
  const monitor = await currentMonitor();
  if (!monitor) return size;

  const scale = monitor.scaleFactor || 1;
  const workAreaWidth = Math.floor(monitor.workArea.size.width / scale);
  const workAreaHeight = Math.floor(monitor.workArea.size.height / scale);
  const horizontalMargin = 24;
  const verticalMargin = 24;

  return {
    width: Math.min(
      Math.ceil(size.width * textScale),
      Math.max(360, workAreaWidth - horizontalMargin),
    ),
    height: Math.min(
      Math.ceil(size.height * textScale),
      Math.max(220, workAreaHeight - verticalMargin),
    ),
  };
}

const DEFAULT_STATUS: ClickerStatus = {
  running: false,
  paused: false,
  clickCount: 0,
  lastError: null,
  stopReason: null,
  activeSequenceIndex: null,
};

type UpdateSettingsOptions = {
  preserveActivePreset?: boolean;
};

async function syncSettingsToBackend(settings: Settings) {
  await invoke("update_settings", {
    settings: {
      ...settings,
      version: BACKEND_SETTINGS_SCHEMA_VERSION,
    },
  });
}

async function registerHotkeyCandidate(hotkey: string) {
  const canonicalHotkey = await canonicalizeHotkeyForBackend(hotkey);
  return invoke<string>("register_hotkey", { hotkey: canonicalHotkey });
}

async function registerPauseHotkeyCandidate(hotkey: string) {
  const trimmed = hotkey.trim();
  if (!trimmed) {
    return invoke<string>("register_pause_hotkey", { hotkey: "" });
  }
  const canonicalHotkey = await canonicalizeHotkeyForBackend(trimmed);
  return invoke<string>("register_pause_hotkey", { hotkey: canonicalHotkey });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

export default function App() {
  const [tab, setTab] = useState<Tab>("simple");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [status, setStatus] = useState<ClickerStatus>(DEFAULT_STATUS);
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
  } | null>(null);
  const [dropdownOverflowBottom, setDropdownOverflowBottom] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionNow, setSessionNow] = useState(() => Date.now());

  const hotkeyTimer = useRef<number | null>(null);
  const hotkeyRequestIdRef = useRef(0);
  const pauseHotkeyTimer = useRef<number | null>(null);
  const pauseHotkeyRequestIdRef = useRef(0);
  const uiSettingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const committedSettingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const lastValidHotkeyRef = useRef(DEFAULT_SETTINGS.hotkey);
  const lastValidPauseHotkeyRef = useRef(DEFAULT_SETTINGS.pauseHotkey);
  const launchWindowPlacementDone = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeAnimationRef = useRef(0);

  const setUiSettings = (nextSettings: Settings) => {
    uiSettingsRef.current = nextSettings;
    setSettings(nextSettings);
  };

  const scheduleSave = (nextSettings: Settings) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveSettings(nextSettings).catch((err) => {
        console.error("Failed to save settings:", err);
      });
    }, 100);
  };

  const persistCommittedSettings = (
    nextCommittedSettings: Settings,
    nextUiSettings: Settings,
  ) => {
    committedSettingsRef.current = nextCommittedSettings;
    setUiSettings(nextUiSettings);

    if (!settingsLoaded) {
      return;
    }

    syncSettingsToBackend(nextCommittedSettings).catch((err) => {
      console.error("Failed to sync settings:", err);
    });
    scheduleSave(nextCommittedSettings);
  };

  const restoreLastValidHotkey = () => {
    const restoredHotkey = lastValidHotkeyRef.current;
    if (uiSettingsRef.current.hotkey === restoredHotkey) {
      return;
    }

    setUiSettings({
      ...uiSettingsRef.current,
      hotkey: restoredHotkey,
    });
  };

  const restoreLastValidPauseHotkey = () => {
    const restored = lastValidPauseHotkeyRef.current;
    if (uiSettingsRef.current.pauseHotkey === restored) {
      return;
    }

    setUiSettings({
      ...uiSettingsRef.current,
      pauseHotkey: restored,
    });
  };

  const queueHotkeyRegistration = (hotkey: string) => {
    if (!settingsLoaded) {
      return;
    }

    if (hotkeyTimer.current !== null) {
      window.clearTimeout(hotkeyTimer.current);
    }

    const requestId = ++hotkeyRequestIdRef.current;
    hotkeyTimer.current = window.setTimeout(() => {
      hotkeyTimer.current = null;

      registerHotkeyCandidate(hotkey)
        .then((normalizedHotkey) => {
          if (hotkeyRequestIdRef.current !== requestId) {
            return;
          }

          lastValidHotkeyRef.current = normalizedHotkey;
          const nextCommittedSettings = {
            ...committedSettingsRef.current,
            hotkey: normalizedHotkey,
          };
          const nextUiSettings = {
            ...uiSettingsRef.current,
            hotkey: normalizedHotkey,
          };

          persistCommittedSettings(nextCommittedSettings, nextUiSettings);
        })
        .catch((err) => {
          if (hotkeyRequestIdRef.current !== requestId) {
            return;
          }

          console.error("Failed to register hotkey:", err);
          restoreLastValidHotkey();
        });
    }, 250);
  };

  const queuePauseHotkeyRegistration = (hotkey: string) => {
    if (!settingsLoaded) {
      return;
    }

    if (pauseHotkeyTimer.current !== null) {
      window.clearTimeout(pauseHotkeyTimer.current);
    }

    const requestId = ++pauseHotkeyRequestIdRef.current;
    pauseHotkeyTimer.current = window.setTimeout(() => {
      pauseHotkeyTimer.current = null;

      registerPauseHotkeyCandidate(hotkey)
        .then((normalizedHotkey) => {
          if (pauseHotkeyRequestIdRef.current !== requestId) {
            return;
          }

          lastValidPauseHotkeyRef.current = normalizedHotkey;
          const nextCommittedSettings = {
            ...committedSettingsRef.current,
            pauseHotkey: normalizedHotkey,
          };
          const nextUiSettings = {
            ...uiSettingsRef.current,
            pauseHotkey: normalizedHotkey,
          };

          persistCommittedSettings(nextCommittedSettings, nextUiSettings);
        })
        .catch((err) => {
          if (pauseHotkeyRequestIdRef.current !== requestId) {
            return;
          }

          console.error("Failed to register pause hotkey:", err);
          restoreLastValidPauseHotkey();
        });
    }, 250);
  };

  const updateSettings = (
    patch: Partial<Settings>,
    options: UpdateSettingsOptions = {},
  ) => {
    const { hotkey, pauseHotkey, ...rest } = patch;
    const shouldClearActivePreset =
      !options.preserveActivePreset &&
      (hotkey !== undefined ||
        Object.keys(rest).some((key) => OPERATIONAL_SETTING_KEYS.has(key)));

    const restPatch: Partial<Settings> = { ...rest };
    if (
      shouldClearActivePreset &&
      patch.activePresetId === undefined &&
      committedSettingsRef.current.activePresetId !== null
    ) {
      restPatch.activePresetId = null;
    }

    if (Object.keys(restPatch).length > 0) {
      const nextUiSettings = { ...uiSettingsRef.current, ...restPatch };
      const nextCommittedSettings = {
        ...committedSettingsRef.current,
        ...restPatch,
      };
      persistCommittedSettings(nextCommittedSettings, nextUiSettings);
    }

    if (hotkey !== undefined) {
      setUiSettings({
        ...uiSettingsRef.current,
        hotkey,
      });
      queueHotkeyRegistration(hotkey);
    }

    if (pauseHotkey !== undefined) {
      setUiSettings({
        ...uiSettingsRef.current,
        pauseHotkey,
      });
      queuePauseHotkeyRegistration(pauseHotkey);
    }
  };

  const applyStartupWindowPlacement = async () => {
    await getCurrentWindow().center();
  };

  const animateWindowSize = async (
    width: number,
    height: number,
    fromWidth?: number,
    fromHeight?: number,
  ) => {
    const appWindow = getCurrentWindow();
    const animationId = resizeAnimationRef.current + 1;
    resizeAnimationRef.current = animationId;

    const currentSize = await appWindow.innerSize();
    const monitorScale = await appWindow.scaleFactor();
    const startWidth = fromWidth ?? currentSize.width / monitorScale;
    const startHeight = fromHeight ?? currentSize.height / monitorScale;

    if (
      Math.abs(startWidth - width) < 1 &&
      Math.abs(startHeight - height) < 1
    ) {
      return;
    }

    const duration = 170;
    const startedAt = performance.now();
    let lastWidth = Math.round(startWidth);
    let lastHeight = Math.round(startHeight);

    await new Promise<void>((resolve) => {
      const step = () => {
        if (resizeAnimationRef.current !== animationId) {
          resolve();
          return;
        }

        const progress = Math.min(1, (performance.now() - startedAt) / duration);
        const eased = easeOutQuint(progress);
        const nextWidth = Math.round(startWidth + (width - startWidth) * eased);
        const nextHeight = Math.round(startHeight + (height - startHeight) * eased);

        if (nextWidth !== lastWidth || nextHeight !== lastHeight) {
          lastWidth = nextWidth;
          lastHeight = nextHeight;
          void appWindow.setSize(new LogicalSize(nextWidth, nextHeight));
        }

        if (progress >= 1) {
          resolve();
          return;
        }

        window.requestAnimationFrame(step);
      };

      window.requestAnimationFrame(step);
    });
  };

  const handleWindowClose = async () => {
    if (uiSettingsRef.current.minimizeToTray) {
      await getCurrentWindow().hide();
    } else {
      await invoke("quit_app");
    }
  };

  const handleToggleAlwaysOnTop = async () => {
    const nextValue = !committedSettingsRef.current.alwaysOnTop;

    try {
      await getCurrentWindow().setAlwaysOnTop(nextValue);
      updateSettings(
        {
          alwaysOnTop: nextValue,
        },
        { preserveActivePreset: true },
      );
    } catch (err) {
      console.error("Failed to set always on top:", err);
    }
  };

  const handleSavePreset = (name: string) => {
    if (status.running) {
      return false;
    }

    if (committedSettingsRef.current.presets.length >= MAX_PRESETS) {
      return false;
    }

    const preset = createPresetDefinition(name, committedSettingsRef.current);
    if (!preset.name) {
      return false;
    }

    const nextPresets = [...committedSettingsRef.current.presets, preset];
    const nextCommittedSettings = {
      ...committedSettingsRef.current,
      presets: nextPresets,
      activePresetId: preset.id,
    };
    const nextUiSettings = {
      ...uiSettingsRef.current,
      presets: nextPresets,
      activePresetId: preset.id,
    };

    persistCommittedSettings(nextCommittedSettings, nextUiSettings);
    return true;
  };

  const handleApplyPreset = (presetId: PresetId) => {
    if (status.running) {
      return false;
    }

    const preset = committedSettingsRef.current.presets.find(
      (item) => item.id === presetId,
    );
    if (!preset) {
      return false;
    }

    updateSettings(
      {
        ...preset.settings,
        activePresetId: presetId,
      },
      { preserveActivePreset: true },
    );
    return true;
  };

  const handleUpdatePreset = (presetId: PresetId) => {
    if (status.running) {
      return false;
    }

    const nextSnapshot = buildPresetSnapshot(committedSettingsRef.current);

    let updated = false;
    const nextPresets = committedSettingsRef.current.presets.map((preset) => {
      if (preset.id !== presetId) {
        return preset;
      }

      updated = true;
      return {
        ...preset,
        updatedAt: new Date().toISOString(),
        settings: nextSnapshot,
      };
    });

    if (!updated) {
      return false;
    }

    const nextCommittedSettings = {
      ...committedSettingsRef.current,
      presets: nextPresets,
      activePresetId: presetId,
    };
    const nextUiSettings = {
      ...uiSettingsRef.current,
      presets: nextPresets,
      activePresetId: presetId,
    };

    persistCommittedSettings(nextCommittedSettings, nextUiSettings);
    return true;
  };

  const handleRenamePreset = (presetId: PresetId, name: string) => {
    if (status.running) {
      return false;
    }

    const sanitizedName = sanitizePresetName(name);
    if (!sanitizedName) {
      return false;
    }

    let updated = false;
    const nextPresets = committedSettingsRef.current.presets.map((preset) => {
      if (preset.id !== presetId) {
        return preset;
      }

      updated = true;
      return {
        ...preset,
        name: sanitizedName,
        updatedAt: new Date().toISOString(),
      };
    });

    if (!updated) {
      return false;
    }

    const nextCommittedSettings = {
      ...committedSettingsRef.current,
      presets: nextPresets,
    };
    const nextUiSettings = {
      ...uiSettingsRef.current,
      presets: nextPresets,
    };

    persistCommittedSettings(nextCommittedSettings, nextUiSettings);
    return true;
  };

  const handleDeletePreset = (presetId: PresetId) => {
    if (status.running) {
      return false;
    }

    const nextPresets = committedSettingsRef.current.presets.filter(
      (preset) => preset.id !== presetId,
    );
    if (nextPresets.length === committedSettingsRef.current.presets.length) {
      return false;
    }

    const nextActivePresetId =
      committedSettingsRef.current.activePresetId === presetId
        ? null
        : committedSettingsRef.current.activePresetId;

    const nextCommittedSettings = {
      ...committedSettingsRef.current,
      presets: nextPresets,
      activePresetId: nextActivePresetId,
    };
    const nextUiSettings = {
      ...uiSettingsRef.current,
      presets: nextPresets,
      activePresetId: nextActivePresetId,
    };

    persistCommittedSettings(nextCommittedSettings, nextUiSettings);
    return true;
  };

  useEffect(() => {
    let mounted = true;

    void Promise.all([loadSettings(), invoke<ClickerStatus>("get_status")])
      .then(async ([loadedSettings, loadedStatus]) => {
        if (!mounted) return;

        let hydratedSettings = loadedSettings;

        let registeredHotkey = loadedSettings.hotkey;
        try {
          registeredHotkey = await registerHotkeyCandidate(
            loadedSettings.hotkey,
          );
        } catch (err) {
          console.error("Failed to register saved hotkey:", err);
          registeredHotkey = lastValidHotkeyRef.current;
        }

        if (registeredHotkey !== hydratedSettings.hotkey) {
          hydratedSettings = {
            ...hydratedSettings,
            hotkey: registeredHotkey,
          };
        }

        try {
          await getCurrentWindow().setAlwaysOnTop(hydratedSettings.alwaysOnTop);
        } catch (err) {
          console.error("Failed to restore always on top:", err);
          hydratedSettings = {
            ...hydratedSettings,
            alwaysOnTop: false,
          };
        }

        lastValidHotkeyRef.current = hydratedSettings.hotkey;

        let pauseHotkeyHydrated = hydratedSettings.pauseHotkey;
        try {
          pauseHotkeyHydrated = await registerPauseHotkeyCandidate(
            hydratedSettings.pauseHotkey ?? "",
          );
        } catch (err) {
          console.error("Failed to register saved pause hotkey:", err);
          pauseHotkeyHydrated = lastValidPauseHotkeyRef.current;
        }

        if (pauseHotkeyHydrated !== hydratedSettings.pauseHotkey) {
          hydratedSettings = {
            ...hydratedSettings,
            pauseHotkey: pauseHotkeyHydrated,
          };
        }

        lastValidPauseHotkeyRef.current = hydratedSettings.pauseHotkey;
        uiSettingsRef.current = hydratedSettings;
        committedSettingsRef.current = hydratedSettings;

        setTab(hydratedSettings.lastPanel);
        setSettings(hydratedSettings);
        setStatus({
          ...loadedStatus,
          paused: loadedStatus.paused ?? false,
        });
        if (loadedStatus.running) {
          const now = Date.now();
          setSessionNow(now);
          setSessionStartedAt(now);
        }
        setSettingsLoaded(true);

        await syncSettingsToBackend(hydratedSettings);

        if (
          hydratedSettings.hotkey !== loadedSettings.hotkey ||
          hydratedSettings.pauseHotkey !== loadedSettings.pauseHotkey ||
          hydratedSettings.alwaysOnTop !== loadedSettings.alwaysOnTop
        ) {
          await saveSettings(hydratedSettings);
        }
      })
      .catch((err) => {
        console.error("Failed to boot app:", err);
        if (!mounted) return;
        setSettingsLoaded(true);
      });

    return () => {
      mounted = false;
      if (hotkeyTimer.current !== null) {
        window.clearTimeout(hotkeyTimer.current);
      }
      if (pauseHotkeyTimer.current !== null) {
        window.clearTimeout(pauseHotkeyTimer.current);
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      resizeAnimationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!status.running || sessionStartedAt === null) {
      return;
    }
    const id = window.setInterval(() => setSessionNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [status.running, sessionStartedAt]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    listen<ClickerStatus>("clicker-status", (event) => {
      const nextStatus = event.payload;
      setStatus(nextStatus);
      if (nextStatus.running) {
        const now = Date.now();
        setSessionNow(now);
        setSessionStartedAt((prev) => prev ?? now);
      } else {
        setSessionStartedAt(null);
      }
    })
      .then((unlisten) => {
        cleanup = unlisten;
      })
      .catch((err) => {
        console.error("Failed to listen for clicker status:", err);
      });

    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const handleDropdownOverflow = (event: Event) => {
      const { active, bottom = 0 } = (event as CustomEvent<DropdownOverflowDetail>)
        .detail;
      const nextOverflow = active
        ? Math.min(Math.max(0, bottom), MAX_DROPDOWN_OVERFLOW_BOTTOM)
        : 0;

      setDropdownOverflowBottom(nextOverflow);
    };

    window.addEventListener("blur-dropdown-overflow", handleDropdownOverflow);

    return () => {
      window.removeEventListener(
        "blur-dropdown-overflow",
        handleDropdownOverflow,
      );
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector(".app-root") as HTMLElement;

    void (async () => {
      try {
        const textScale = await invoke<number>("get_text_scale_factor");
        document.documentElement.style.fontSize = `${16 * textScale}px`;

        const preferredSize = getPanelSize(tab, !!updateInfo);
        const { width, height } = await getClampedPanelSize(
          preferredSize,
          textScale,
        );
        const windowHeight = height + dropdownOverflowBottom;

        const appWindow = getCurrentWindow();

        if (!launchWindowPlacementDone.current) {
          await appWindow.setSize(new LogicalSize(width, windowHeight));

          root.style.width = `${width}px`;
          root.style.height = `${height}px`;

          await wait(30);
          await applyStartupWindowPlacement();
          launchWindowPlacementDone.current = true;
          return;
        }

        const currentSize = await appWindow.innerSize();
        const monitorScale = await appWindow.scaleFactor();
        const currentH = currentSize.height / monitorScale;
        const currentW = currentSize.width / monitorScale;

        root.style.width = `${currentW}px`;
        root.style.height = `${currentH}px`;
        void root.offsetHeight;
        root.style.width = `${width}px`;
        root.style.height = `${height}px`;
        await animateWindowSize(width, windowHeight, currentW, currentH);
      } catch (err) {
        console.error("Failed to size window:", err);
      }
    })();
  }, [settingsLoaded, tab, updateInfo, dropdownOverflowBottom]);

  useEffect(() => {
    const checkForUpdates = () => {
      invoke<{
        currentVersion: string;
        latestVersion: string;
        updateAvailable: boolean;
      }>("check_for_updates")
        .then((result) => {
          if (result?.updateAvailable) {
            setUpdateInfo({
              currentVersion: result.currentVersion,
              latestVersion: result.latestVersion,
            });
          }
        })
        .catch((err) => console.error("Update check failed:", err));
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const theme = settings.theme ?? "dark";
    document.documentElement.dataset.theme = theme;
    applyAccentTheme(settings.accentColor, theme);
  }, [settings.accentColor, settings.theme]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dir = isRtlLanguage(settings.language)
      ? "rtl"
      : "ltr";
  }, [settings.language]);

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab);

    if (nextTab === "settings") return;
    if (committedSettingsRef.current.lastPanel === nextTab) return;

    updateSettings({
      lastPanel: nextTab,
    });
  };

  const handleResetSettings = async () => {
    try {
      if (hotkeyTimer.current !== null) {
        window.clearTimeout(hotkeyTimer.current);
        hotkeyTimer.current = null;
      }
      hotkeyRequestIdRef.current += 1;

      await invoke("reset_settings");
      await clearSavedSettings();
      await invoke("set_autostart_enabled", { enabled: false }).catch(() => {});
      await getCurrentWindow().setAlwaysOnTop(DEFAULT_SETTINGS.alwaysOnTop);

      lastValidHotkeyRef.current = DEFAULT_SETTINGS.hotkey;
      committedSettingsRef.current = DEFAULT_SETTINGS;
      uiSettingsRef.current = DEFAULT_SETTINGS;

      setSettings(DEFAULT_SETTINGS);
      setTab("simple");
      launchWindowPlacementDone.current = false;
    } catch (err) {
      console.error("Failed to reset settings:", err);
    }
  };

  const sessionElapsedSecs =
    status.running && sessionStartedAt !== null
      ? (sessionNow - sessionStartedAt) / 1000
      : 0;

  return (
    <I18nProvider language={settings.language}>
      <div className="app-root" data-tab={tab}>
        <TitleBar
          tab={tab}
          setTab={handleTabChange}
          running={status.running}
          paused={status.paused}
          sessionClickCount={status.clickCount}
          showSessionClickCountInTitle={settings.showSessionClickCountInTitle}
          sessionElapsedSecs={sessionElapsedSecs}
          showSessionElapsedInTitle={settings.showSessionElapsedInTitle}
          stopReason={
            settings.showStopReason && (tab === "advanced" || tab === "zones")
              ? status.stopReason
              : null
          }
          isAlwaysOnTop={settings.alwaysOnTop}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          onRequestClose={handleWindowClose}
        />
        {updateInfo && (
          <UpdateBanner
            key={`${updateInfo.currentVersion}:${updateInfo.latestVersion}`}
            currentVersion={updateInfo.currentVersion}
            latestVersion={updateInfo.latestVersion}
          />
        )}
        <main key={tab} className="panel-area">
          {tab === "simple" && (
            <SimplePanel settings={settings} update={updateSettings} />
          )}
          {tab === "advanced" && (
            <AdvancedPanel
              settings={settings}
              update={updateSettings}
              showInfo={true}
              running={status.running}
              activeSequenceIndex={status.activeSequenceIndex}
            />
          )}
          {tab === "zones" && (
            <ZonesPanel
              settings={settings}
              update={updateSettings}
              showInfo={true}
            />
          )}
          {tab === "settings" && (
            <SettingsPanel
              settings={settings}
              update={updateSettings}
              running={status.running}
              onSavePreset={handleSavePreset}
              onApplyPreset={handleApplyPreset}
              onUpdatePreset={handleUpdatePreset}
              onRenamePreset={handleRenamePreset}
              onDeletePreset={handleDeletePreset}
              onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
              onReset={handleResetSettings}
            />
          )}
        </main>
      </div>
    </I18nProvider>
  );
}
