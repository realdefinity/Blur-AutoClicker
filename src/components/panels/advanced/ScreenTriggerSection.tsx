import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import type { ScreenTriggerMode, Settings } from "../../../store";
import { useTranslation, type TranslationKey } from "../../../i18n";
import { SETTINGS_LIMITS } from "../../../settingsSchema";
import { Disableable, InfoIcon, NumInput, ToggleBtn } from "./shared";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  showInfo: boolean;
}

const MODE_OPTIONS: {
  value: ScreenTriggerMode;
  labelKey: TranslationKey;
}[] = [
  { value: "whileMatch", labelKey: "advanced.screenTriggerModeWhileMatch" },
  { value: "onAppear", labelKey: "advanced.screenTriggerModeOnAppear" },
  { value: "onDisappear", labelKey: "advanced.screenTriggerModeOnDisappear" },
  { value: "onChange", labelKey: "advanced.screenTriggerModeOnChange" },
];

export default function ScreenTriggerSection({
  settings,
  update,
  showInfo,
}: Props) {
  const { t } = useTranslation();
  const [sampleError, setSampleError] = useState<string | null>(null);

  const sampleReference = async () => {
    setSampleError(null);
    try {
      const rgb = await invoke<{ r: number; g: number; b: number }>(
        "sample_screen_region",
        {
          x: Math.trunc(settings.screenTriggerX),
          y: Math.trunc(settings.screenTriggerY),
          width: Math.trunc(settings.screenTriggerWidth),
          height: Math.trunc(settings.screenTriggerHeight),
        },
      );
      update({
        screenTriggerRefR: rgb.r,
        screenTriggerRefG: rgb.g,
        screenTriggerRefB: rgb.b,
        screenTriggerHasReference: true,
      });
    } catch (e) {
      setSampleError(
        e instanceof Error ? e.message : String(e ?? "Sample failed"),
      );
    }
  };

  return (
    <div className="adv-sectioncontainer adv-basic-card">
      <div className="adv-card-header">
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {showInfo ? (
            <InfoIcon text={t("advanced.screenTriggerDescription")} />
          ) : null}
          <span className="adv-card-title">{t("advanced.screenTrigger")}</span>
        </div>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <ToggleBtn
          value={settings.screenTriggerEnabled}
          onChange={(v) => update({ screenTriggerEnabled: v })}
        />
        <span className="adv-label">{t("advanced.screenTriggerGate")}</span>
      </div>

      <Disableable enabled={settings.screenTriggerEnabled}>
        <>
        <div className="adv-row" style={{ marginTop: 12, alignItems: "center", gap: 8 }}>
          <span className="adv-label">{t("advanced.screenTriggerMode")}</span>
          <select
            className="adv-textbox-text"
            style={{ minWidth: 200 }}
            aria-label={t("advanced.screenTriggerMode")}
            value={settings.screenTriggerMode}
            onChange={(e) =>
              update({
                screenTriggerMode: e.target.value as ScreenTriggerMode,
              })
            }
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <span className="adv-label">{t("advanced.screenTriggerRegion")}</span>
          <span className="adv-unit">X</span>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.screenTriggerX}
              onChange={(v) => update({ screenTriggerX: v })}
              min={-32_000}
              max={32_000}
            />
          </div>
          <span className="adv-unit">Y</span>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.screenTriggerY}
              onChange={(v) => update({ screenTriggerY: v })}
              min={-32_000}
              max={32_000}
            />
          </div>
          <span className="adv-unit">W</span>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.screenTriggerWidth}
              onChange={(v) => update({ screenTriggerWidth: v })}
              min={SETTINGS_LIMITS.screenTriggerRegionSize.min}
              max={SETTINGS_LIMITS.screenTriggerRegionSize.max}
            />
          </div>
          <span className="adv-unit">H</span>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.screenTriggerHeight}
              onChange={(v) => update({ screenTriggerHeight: v })}
              min={SETTINGS_LIMITS.screenTriggerRegionSize.min}
              max={SETTINGS_LIMITS.screenTriggerRegionSize.max}
            />
          </div>
        </div>

        <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="adv-seg-btn active" onClick={sampleReference}>
            {t("advanced.screenTriggerSample")}
          </button>
          {settings.screenTriggerHasReference ? (
            <span style={{ fontSize: "0.85rem", opacity: 0.9 }}>
              RGB ({Math.round(settings.screenTriggerRefR)},{" "}
              {Math.round(settings.screenTriggerRefG)},{" "}
              {Math.round(settings.screenTriggerRefB)})
            </span>
          ) : (
            <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>
              {t("advanced.screenTriggerNoReference")}
            </span>
          )}
        </div>
        {sampleError ? (
          <p style={{ color: "var(--accent-red, #f87171)", margin: "8px 0 0", fontSize: "0.85rem" }}>
            {sampleError}
          </p>
        ) : null}

        <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <span className="adv-label">{t("advanced.screenTriggerTolerance")}</span>
          <div className="adv-numbox-sm">
            <NumInput
              value={Math.round(settings.screenTriggerTolerance)}
              onChange={(v) => update({ screenTriggerTolerance: v })}
              min={SETTINGS_LIMITS.screenTriggerTolerance.min}
              max={SETTINGS_LIMITS.screenTriggerTolerance.max}
            />
          </div>
          <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            {t("advanced.screenTriggerToleranceHint")}
          </span>
        </div>

        <Disableable
          enabled={settings.screenTriggerMode === "onChange"}
          disabledReason={t("advanced.screenTriggerChangeOnly")}
        >
          <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
            <span className="adv-label">{t("advanced.screenTriggerChangeSens")}</span>
            <div className="adv-numbox-sm">
              <NumInput
                value={Math.round(settings.screenTriggerChangeSensitivity)}
                onChange={(v) => update({ screenTriggerChangeSensitivity: v })}
                min={SETTINGS_LIMITS.screenTriggerChangeSensitivity.min}
                max={SETTINGS_LIMITS.screenTriggerChangeSensitivity.max}
              />
            </div>
          </div>
        </Disableable>
        </>
      </Disableable>
    </div>
  );
}
