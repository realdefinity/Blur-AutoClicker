import "./SettingsPanel.css";
import type { PresetDefinition, PresetId, Settings } from "../../store";
import {
  isLanguage,
  LANGUAGE_OPTIONS,
  useTranslation,
  type Language,
} from "../../i18n";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ConfirmDialog from "../ConfirmDialog";
import { AdvDropdown } from "./advanced/shared";
import {
  DEFAULT_ACCENT_COLOR,
  MAX_PRESETS,
  PRESET_NAME_MAX_LENGTH,
} from "../../settingsSchema";

type PendingAction = "reset-settings" | "clear-stats" | null;

const LANGUAGE_DROPDOWN_OPTIONS = LANGUAGE_OPTIONS.map((option) => ({
  value: option.code,
  label: option.label,
}));

interface CumulativeStats {
  totalClicks: number;
  totalTimeSecs: number;
  totalSessions: number;
  avgCpu: number;
}

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  running: boolean;
  onSavePreset: (name: string) => boolean;
  onApplyPreset: (presetId: PresetId) => boolean;
  onUpdatePreset: (presetId: PresetId) => boolean;
  onRenamePreset: (presetId: PresetId, name: string) => boolean;
  onDeletePreset: (presetId: PresetId) => boolean;
  onToggleAlwaysOnTop: () => Promise<void>;
  onReset: () => Promise<void>;
}

function formatTime(totalSeconds: number, language: Language): string {
  if (totalSeconds < 0.01) return "0s";
  if (totalSeconds < 60) {
    return `${Math.floor(totalSeconds).toLocaleString(language)}s`;
  }
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return s > 0
      ? `${m.toLocaleString(language)}m ${s.toLocaleString(language)}s`
      : `${m.toLocaleString(language)}m`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return m > 0
    ? `${h.toLocaleString(language)}h ${m.toLocaleString(language)}m`
    : `${h.toLocaleString(language)}h`;
}

function formatNumber(n: number, language: Language): string {
  return Math.floor(n).toLocaleString(language);
}

function formatCpu(
  cpu: number,
  language: Language,
  notAvailable: string,
): string {
  if (cpu < 0) return notAvailable;
  return `${cpu.toLocaleString(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function effectiveCps(settings: Settings) {
  if (settings.rateInputMode === "duration") {
    const totalMs =
      settings.durationHours * 3_600_000 +
      settings.durationMinutes * 60_000 +
      settings.durationSeconds * 1_000 +
      settings.durationMilliseconds;
    return 1000 / Math.max(1, totalMs);
  }

  if (settings.clickInterval === "m") return settings.clickSpeed / 60;
  if (settings.clickInterval === "h") return settings.clickSpeed / 3600;
  if (settings.clickInterval === "d") return settings.clickSpeed / 86400;
  return settings.clickSpeed;
}

function smartBatchSize(settings: Settings) {
  const cps = effectiveCps(settings);
  const duty = settings.dutyCycleEnabled ? settings.dutyCycle : 0.01;
  const holdMs = Math.trunc(
    (1000 / Math.max(cps, 0.001)) * (Math.max(0, duty) / 100),
  );
  const preciseMode =
    settings.clicksPerGesture !== 1 ||
    settings.doubleClickEnabled ||
    settings.alternateButtonsEnabled ||
    settings.burstModeEnabled ||
    settings.fixedHoldEnabled ||
    settings.clickWithCtrl ||
    settings.clickWithShift ||
    settings.clickWithAlt ||
    settings.sequenceEnabled ||
    settings.gridClickEnabled ||
    settings.linePathEnabled ||
    settings.screenTriggerEnabled ||
    settings.cursorJitterPx > 0 ||
    holdMs > 0 ||
    cps < 50;

  if (preciseMode) return 1;
  return settings.smartPerformanceEnabled ? Math.ceil(cps * 0.01) : 2;
}

function SettingsSectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="settings-section-heading">
      <span className="settings-section-title">{title}</span>
      {description ? (
        <span className="settings-section-description">{description}</span>
      ) : null}
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-card">
      <SettingsSectionHeading title={title} description={description} />
      <div className="settings-card-content">{children}</div>
    </section>
  );
}

function PresetRow({
  preset,
  isActive,
  isEditing,
  isConfirmingDelete,
  running,
  renameDraft,
  onRenameDraftChange,
  onStartRename,
  onCancelRename,
  onCommitRename,
  onApply,
  onUpdatePreset,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  preset: PresetDefinition;
  isActive: boolean;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  running: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onCommitRename: () => void;
  onApply: () => void;
  onUpdatePreset: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`preset-card ${isActive ? "preset-card--active" : ""}`}
      data-preset-id={preset.id}
    >
      <div className="preset-card-head">
        <div className="preset-card-meta">
          {isEditing ? (
            <input
              className="preset-rename-input"
              value={renameDraft}
              maxLength={PRESET_NAME_MAX_LENGTH}
              onChange={(event) => onRenameDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCommitRename();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelRename();
                }
              }}
              autoFocus
            />
          ) : (
            <span className="preset-name">{preset.name}</span>
          )}
          <div className="preset-badges">
            {isActive && (
              <span className="preset-badge preset-badge--active">
                {t("settings.presetActive")}
              </span>
            )}
            <span className="preset-badge">
              {new Date(preset.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="preset-actions">
          {isEditing ? (
            <>
              <button
                className="settings-btn-secondary"
                onClick={onCommitRename}
                disabled={running}
              >
                {t("settings.presetSave")}
              </button>
              <button className="settings-btn-quiet" onClick={onCancelRename}>
                {t("settings.presetCancel")}
              </button>
            </>
          ) : isConfirmingDelete ? (
            <>
              <button
                className="settings-btn-danger settings-btn-danger--compact"
                onClick={onConfirmDelete}
                disabled={running}
              >
                {t("settings.presetConfirmDelete")}
              </button>
              <button className="settings-btn-quiet" onClick={onCancelDelete}>
                {t("settings.presetCancel")}
              </button>
            </>
          ) : (
            <>
              <button
                className="settings-btn-primary"
                onClick={onApply}
                disabled={running}
              >
                {t("settings.presetApply")}
              </button>
              <button
                className="settings-btn-secondary"
                onClick={onUpdatePreset}
                disabled={running}
              >
                {t("settings.presetUpdate")}
              </button>
              <button
                className="settings-btn-secondary"
                onClick={onStartRename}
                disabled={running}
              >
                {t("settings.presetRename")}
              </button>
              <button
                className="settings-btn-danger settings-btn-danger--compact"
                onClick={onRequestDelete}
                disabled={running}
              >
                {t("settings.presetDelete")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPanel({
  settings,
  update,
  running,
  onSavePreset,
  onApplyPreset,
  onUpdatePreset,
  onRenamePreset,
  onDeletePreset,
  onToggleAlwaysOnTop,
  onReset,
}: Props) {
  const [resetting, setResetting] = useState(false);
  const [resettingStats, setResettingStats] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [stats, setStats] = useState<CumulativeStats | null>(null);
  const [atBottom, setAtBottom] = useState(false);
  const [presetsAtBottom, setPresetsAtBottom] = useState(true);
  const [autostartEnabled, setAutostartEnabled] = useState<boolean | null>(
    null,
  );
  const [newPresetName, setNewPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<PresetId | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<PresetId | null>(
    null,
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const presetsListRef = useRef<HTMLDivElement>(null);
  const { language, t } = useTranslation();

  useEffect(() => {
    invoke<CumulativeStats>("get_stats")
      .then(setStats)
      .catch(() => {});
    invoke<boolean>("get_autostart_enabled")
      .then(setAutostartEnabled)
      .catch(() => setAutostartEnabled(false));
  }, []);

  useEffect(() => {
    if (!confirmingDeleteId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const presetCard = target.closest("[data-preset-id]");
      if (presetCard?.getAttribute("data-preset-id") === confirmingDeleteId) {
        return;
      }

      setConfirmingDeleteId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [confirmingDeleteId]);

  const handleScroll = () => {
    const el = panelRef.current;
    if (!el) return;
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  };

  const handlePresetsScroll = () => {
    const el = presetsListRef.current;
    if (!el) return;
    setPresetsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  };

  const handleSavePreset = () => {
    if (onSavePreset(newPresetName)) {
      setNewPresetName("");
      setConfirmingDeleteId(null);
    }
  };

  const handleStartRename = (preset: PresetDefinition) => {
    setConfirmingDeleteId(null);
    setEditingPresetId(preset.id);
    setRenameDraft(preset.name);
  };

  const handleCommitRename = () => {
    if (!editingPresetId) {
      return;
    }

    if (onRenamePreset(editingPresetId, renameDraft)) {
      setEditingPresetId(null);
      setRenameDraft("");
    }
  };

  const handleCancelRename = () => {
    setEditingPresetId(null);
    setRenameDraft("");
  };

  const handleRequestDelete = (presetId: PresetId) => {
    setEditingPresetId(null);
    setRenameDraft("");
    setConfirmingDeleteId(presetId);
  };

  const handleConfirmDelete = (presetId: PresetId) => {
    if (onDeletePreset(presetId)) {
      setConfirmingDeleteId(null);
    }
  };

  const handleAlwaysOnTopChange = (nextValue: boolean) => {
    if (settings.alwaysOnTop === nextValue) {
      return;
    }

    void onToggleAlwaysOnTop();
  };

  const hasStats = stats !== null && stats.totalSessions > 0;
  const presetLimitReached = settings.presets.length >= MAX_PRESETS;
  const activeEditingPresetId = running ? null : editingPresetId;
  const activeConfirmingDeleteId = running ? null : confirmingDeleteId;
  const onOffOptions = [
    { value: true, label: t("common.on") },
    { value: false, label: t("common.off") },
  ];
  const smartCps = effectiveCps(settings);
  const smartBatch = Math.max(1, Math.min(64, smartBatchSize(settings)));
  const smartActive = settings.smartPerformanceEnabled && smartBatch > 1;
  const smartStatus = !settings.smartPerformanceEnabled
    ? t("settings.smartPerformanceOff")
    : smartActive
      ? t("settings.smartPerformanceTurbo", {
          batch: smartBatch,
          cps: Math.round(smartCps),
        })
      : t("settings.smartPerformanceCompatible");

  const renderOnOff = (
    value: boolean | null,
    onChange: (nextValue: boolean) => void,
    disabled = false,
  ) => (
    <div className="settings-seg-group settings-toggle-group">
      {onOffOptions.map((option) => (
        <button
          key={String(option.value)}
          className={`settings-seg-btn ${value === option.value ? "active" : ""}`}
          data-toggle-option={option.value ? "on" : "off"}
          data-toggle-label={option.label}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const prepareSmartPerformance = () => {
    update({
      smartPerformanceEnabled: true,
      dutyCycleEnabled: false,
      speedVariationEnabled: false,
      doubleClickEnabled: false,
      burstModeEnabled: false,
      fixedHoldEnabled: false,
      clicksPerGesture: 1,
      alternateButtonsEnabled: false,
      cursorJitterPx: 0,
      clickWithCtrl: false,
      clickWithShift: false,
      clickWithAlt: false,
      gridClickEnabled: false,
      linePathEnabled: false,
      screenTriggerEnabled: false,
    });
  };

  const handleConfirmResetSettings = async () => {
    setResetting(true);
    try {
      await onReset();
      setAutostartEnabled(false);
    } finally {
      setResetting(false);
      setPendingAction(null);
    }
  };

  const handleConfirmClearStats = async () => {
    setResettingStats(true);
    try {
      const next = await invoke<CumulativeStats>("reset_stats");
      setStats(next);
    } catch {
      // swallow ? failure leaves stats unchanged
    } finally {
      setResettingStats(false);
      setPendingAction(null);
    }
  };

  useEffect(() => {
    handlePresetsScroll();
  }, [settings.presets.length]);

  return (
    <div className="settings-wrapper">
      <div className="settings-panel" ref={panelRef} onScroll={handleScroll}>
        <SettingsCard
          title={t("settings.sectionUsage")}
          description={t("settings.sectionUsageDescription")}
        >
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">{t("settings.usageData")}</span>
              <span className="settings-sublabel">
                {t("settings.usageDataDescription")}
              </span>
            </div>
          </div>
          {hasStats ? (
            <div className="stats-grid">
              <div className="stats-cell">
                <span className="stats-cell-label">
                  {t("settings.totalClicks")}
                </span>
                <span className="stats-cell-value">
                  {formatNumber(stats.totalClicks, language)}
                </span>
              </div>
              <div className="stats-cell">
                <span className="stats-cell-label">
                  {t("settings.totalTimeClicking")}
                </span>
                <span className="stats-cell-value">
                  {formatTime(stats.totalTimeSecs, language)}
                </span>
              </div>
              <div className="stats-cell">
                <span className="stats-cell-label">
                  {t("settings.averageCpu")}
                </span>
                <span className="stats-cell-value">
                  {formatCpu(stats.avgCpu, language, t("common.notAvailable"))}
                </span>
              </div>
              <div className="stats-cell">
                <span className="stats-cell-label">
                  {t("settings.sessions")}
                </span>
                <span className="stats-cell-value">
                  {formatNumber(stats.totalSessions, language)}
                </span>
              </div>
            </div>
          ) : (
            <div className="stats-empty">{t("settings.noRuns")}</div>
          )}
          {hasStats && (
            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">
                  {t("settings.clearStats")}
                </span>
                <span className="settings-sublabel">
                  {t("settings.clearStatsDescription")}
                </span>
              </div>
              <button
                type="button"
                className="settings-btn-danger settings-btn-danger--compact"
                onClick={() => setPendingAction("clear-stats")}
              >
                {t("settings.clearStats")}
              </button>
            </div>
          )}
        </SettingsCard>

        <SettingsCard
          title={t("settings.sectionPresets")}
          description={t("settings.sectionPresetsDescription")}
        >
          <div className="settings-row settings-row--stacked">
            <div className="settings-label-group">
              <span className="settings-label">{t("settings.presets")}</span>
              <span className="settings-sublabel">
                {t("settings.presetsDescription")}
              </span>
            </div>
            <div className="preset-compose">
              <input
                className="preset-name-input"
                placeholder={t("settings.presetNamePlaceholder")}
                value={newPresetName}
                maxLength={PRESET_NAME_MAX_LENGTH}
                onChange={(event) => setNewPresetName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (
                      !running &&
                      !presetLimitReached &&
                      newPresetName.trim()
                    ) {
                      handleSavePreset();
                    }
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setNewPresetName("");
                  }
                }}
                disabled={running}
              />
              <button
                className="settings-btn-primary"
                onClick={handleSavePreset}
                disabled={
                  running ||
                  presetLimitReached ||
                  newPresetName.trim().length === 0
                }
              >
                {t("settings.saveNewPreset")}
              </button>
            </div>
            {presetLimitReached && (
              <span className="settings-note">
                {t("settings.presetLimitReached")}
              </span>
            )}
            {running && (
              <span className="settings-note">
                {t("settings.presetActionsDisabled")}
              </span>
            )}
            {settings.presets.length > 0 ? (
              <div className="preset-list-shell">
                <div
                  className="preset-list"
                  ref={presetsListRef}
                  onScroll={handlePresetsScroll}
                >
                  {settings.presets.map((preset) => (
                    <PresetRow
                      key={preset.id}
                      preset={preset}
                      isActive={settings.activePresetId === preset.id}
                      isEditing={activeEditingPresetId === preset.id}
                      isConfirmingDelete={
                        activeConfirmingDeleteId === preset.id
                      }
                      running={running}
                      renameDraft={
                        activeEditingPresetId === preset.id
                          ? renameDraft
                          : preset.name
                      }
                      onRenameDraftChange={setRenameDraft}
                      onStartRename={() => handleStartRename(preset)}
                      onCancelRename={handleCancelRename}
                      onCommitRename={handleCommitRename}
                      onApply={() => {
                        setConfirmingDeleteId(null);
                        onApplyPreset(preset.id);
                      }}
                      onUpdatePreset={() => {
                        setConfirmingDeleteId(null);
                        onUpdatePreset(preset.id);
                      }}
                      onRequestDelete={() => handleRequestDelete(preset.id)}
                      onCancelDelete={() => setConfirmingDeleteId(null)}
                      onConfirmDelete={() => handleConfirmDelete(preset.id)}
                    />
                  ))}
                </div>
                <div
                  className={`preset-list-fade ${presetsAtBottom ? "preset-list-fade--hidden" : ""}`}
                />
              </div>
            ) : (
              <div className="stats-empty">{t("settings.noPresets")}</div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          title={t("settings.sectionPerformance")}
          description={t("settings.sectionPerformanceDescription")}
        >
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.smartPerformance")}
              </span>
              <span className="settings-sublabel">
                {t("settings.smartPerformanceDescription")}
              </span>
            </div>
            {renderOnOff(settings.smartPerformanceEnabled, (value) =>
              update({ smartPerformanceEnabled: value }),
            )}
          </div>
          <div className="settings-smart-card">
            <div className="settings-smart-meter" data-active={smartActive}>
              <span className="settings-smart-value">{smartBatch}x</span>
              <span className="settings-smart-label">
                {t("settings.smartPerformanceBatch")}
              </span>
            </div>
            <div className="settings-smart-copy">
              <span className="settings-smart-status">{smartStatus}</span>
              <button
                type="button"
                className="settings-btn-secondary settings-smart-action"
                onClick={prepareSmartPerformance}
              >
                {t("settings.smartPerformancePrepare")}
              </button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title={t("settings.sectionBehavior")}
          description={t("settings.sectionBehaviorDescription")}
        >
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.alwaysOnTop")}
              </span>
              <span className="settings-sublabel">
                {t("settings.alwaysOnTopDescription")}
              </span>
            </div>
            {renderOnOff(settings.alwaysOnTop, handleAlwaysOnTopChange)}
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.stopHitboxOverlay")}
              </span>
              <span className="settings-sublabel">
                {t("settings.stopHitboxOverlayDescription")}
              </span>
            </div>
            {renderOnOff(settings.showStopOverlay, (value) =>
              update({ showStopOverlay: value }),
            )}
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.stopReasonAlert")}
              </span>
              <span className="settings-sublabel">
                {t("settings.stopReasonAlertDescription")}
              </span>
            </div>
            {renderOnOff(settings.showStopReason, (value) =>
              update({ showStopReason: value }),
            )}
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.sessionClickCountInTitle")}
              </span>
              <span className="settings-sublabel">
                {t("settings.sessionClickCountInTitleDescription")}
              </span>
            </div>
            {renderOnOff(settings.showSessionClickCountInTitle, (value) =>
              update({ showSessionClickCountInTitle: value }),
            )}
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.sessionElapsedInTitle")}
              </span>
              <span className="settings-sublabel">
                {t("settings.sessionElapsedInTitleDescription")}
              </span>
            </div>
            {renderOnOff(settings.showSessionElapsedInTitle, (value) =>
              update({ showSessionElapsedInTitle: value }),
            )}
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.strictHotkeyModifiers")}
              </span>
              <span className="settings-sublabel">
                {t("settings.strictHotkeyModifiersDescription")}
              </span>
            </div>
            {renderOnOff(settings.strictHotkeyModifiers, (value) =>
              update({ strictHotkeyModifiers: value }),
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          title={t("settings.sectionStartup")}
          description={t("settings.sectionStartupDescription")}
        >
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.minimizeToTray")}
              </span>
              <span className="settings-sublabel">
                {t("settings.minimizeToTrayDescription")}
              </span>
            </div>
            {renderOnOff(settings.minimizeToTray, (value) =>
              update({ minimizeToTray: value }),
            )}
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.runOnStartup")}
              </span>
              <span className="settings-sublabel">
                {t("settings.runOnStartupDescription")}
              </span>
            </div>
            {renderOnOff(
              autostartEnabled,
              (value) => {
                invoke("set_autostart_enabled", { enabled: value })
                  .then(() => setAutostartEnabled(value))
                  .catch(console.error);
              },
              autostartEnabled === null,
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          title={t("settings.sectionAppearance")}
          description={t("settings.sectionAppearanceDescription")}
        >
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">{t("settings.language")}</span>
              <span className="settings-sublabel">
                {t("settings.languageDescription")}
              </span>
            </div>
            <AdvDropdown
              value={settings.language}
              options={LANGUAGE_DROPDOWN_OPTIONS}
              onChange={(next) => {
                if (isLanguage(next)) {
                  update({ language: next });
                }
              }}
            />
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">{t("settings.theme")}</span>
              <span className="settings-sublabel">
                {t("settings.themeDescription")}
              </span>
            </div>
            <div className="settings-seg-group">
              {(["dark", "light"] as const).map((theme) => (
                <button
                  key={theme}
                  className={`settings-seg-btn ${settings.theme === theme ? "active" : ""}`}
                  onClick={() => update({ theme })}
                >
                  {t(theme === "dark" ? "common.dark" : "common.light")}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">
                {t("settings.accentColor")}
              </span>
              <span className="settings-sublabel">
                {t("settings.accentColorDescription")}
              </span>
            </div>
            <div className="settings-color-controls">
              <label className="settings-color-picker">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(event) =>
                    update({ accentColor: event.target.value })
                  }
                />
              </label>
              <span className="settings-value settings-value--mono">
                {settings.accentColor.toUpperCase()}
              </span>
              <button
                className="settings-btn-secondary"
                onClick={() => update({ accentColor: DEFAULT_ACCENT_COLOR })}
                disabled={settings.accentColor === DEFAULT_ACCENT_COLOR}
              >
                {t("common.reset")}
              </button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title={t("settings.sectionReset")}
          description={t("settings.sectionResetDescription")}
        >
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">{t("settings.resetAll")}</span>
              <span className="settings-sublabel">
                {t("settings.resetAllDescription")}
              </span>
            </div>
            <button
              className="settings-btn-danger"
              onClick={() => setPendingAction("reset-settings")}
            >
              {t("common.reset")}
            </button>
          </div>
        </SettingsCard>
      </div>
      <div
        className={`settings-fade ${atBottom ? "settings-fade--hidden" : ""}`}
      ></div>
      <ConfirmDialog
        open={pendingAction === "reset-settings"}
        title={t("settings.resetDialogTitle")}
        message={t("settings.resetDialogMessage")}
        confirmLabel={t("settings.resetDialogConfirm")}
        busy={resetting}
        onConfirm={handleConfirmResetSettings}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "clear-stats"}
        title={t("settings.clearStatsDialogTitle")}
        message={t("settings.clearStatsDialogMessage")}
        confirmLabel={t("settings.clearStatsDialogConfirm")}
        busy={resettingStats}
        onConfirm={handleConfirmClearStats}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
