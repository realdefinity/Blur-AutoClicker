import type { Settings } from "../../../store";
import { useTranslation } from "../../../i18n";
import { SETTINGS_LIMITS } from "../../../settingsSchema";
import {
  AdvSelectDropdown,
  Disableable,
  InfoIcon,
  NumInput,
  ToggleBtn,
} from "./shared";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  showInfo: boolean;
}

export default function ClickPatternsSection({
  settings,
  update,
  showInfo,
}: Props) {
  const { t } = useTranslation();
  const pathConflict =
    settings.sequenceEnabled && settings.sequencePoints.length > 0;
  const modifierValues = [
    settings.clickWithCtrl ? "ctrl" : null,
    settings.clickWithShift ? "shift" : null,
    settings.clickWithAlt ? "alt" : null,
  ].filter((value): value is string => value !== null);
  const modifierOptions = [
    { value: "ctrl", label: "Ctrl" },
    { value: "shift", label: "Shift" },
    { value: "alt", label: "Alt" },
  ];

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
            <InfoIcon text={t("advanced.clickPatternsDescription")} />
          ) : null}
          <span className="adv-card-title">
            {t("advanced.clickPatterns")}
          </span>
        </div>
      </div>
      {pathConflict ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
          {t("advanced.clickPatternsSequenceWins")}
        </p>
      ) : null}

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <ToggleBtn
          value={settings.burstModeEnabled}
          onChange={(v) => update({ burstModeEnabled: v })}
        />
        <span className="adv-label">{t("advanced.clickPatternsBurst")}</span>
        <Disableable enabled={settings.burstModeEnabled}>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.burstClicksBeforeRest}
              onChange={(v) => update({ burstClicksBeforeRest: v })}
              min={SETTINGS_LIMITS.burstClicksBeforeRest.min}
              max={SETTINGS_LIMITS.burstClicksBeforeRest.max}
            />
            <span className="adv-unit">{t("advanced.clickPatternsClicksUnit")}</span>
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.burstRestMs}
              onChange={(v) => update({ burstRestMs: v })}
              min={SETTINGS_LIMITS.burstRestMs.min}
              max={SETTINGS_LIMITS.burstRestMs.max}
            />
            <span className="adv-unit">ms</span>
          </div>
        </Disableable>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <span className="adv-label">{t("advanced.clickPatternsRamp")}</span>
        <div className="adv-numbox-sm">
          <NumInput
            value={settings.rampUpSeconds}
            onChange={(v) => update({ rampUpSeconds: v })}
            min={SETTINGS_LIMITS.rampSeconds.min}
            max={SETTINGS_LIMITS.rampSeconds.max}
          />
          <span className="adv-unit">s ↑</span>
        </div>
        <div className="adv-numbox-sm">
          <NumInput
            value={settings.rampDownSeconds}
            onChange={(v) => update({ rampDownSeconds: v })}
            min={SETTINGS_LIMITS.rampSeconds.min}
            max={SETTINGS_LIMITS.rampSeconds.max}
          />
          <span className="adv-unit">s ↓</span>
        </div>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <ToggleBtn
          value={settings.scheduleEnabled}
          onChange={(v) => update({ scheduleEnabled: v })}
        />
        <span className="adv-label">{t("advanced.clickPatternsSchedule")}</span>
        <Disableable enabled={settings.scheduleEnabled}>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.schedulePhase1Seconds}
              onChange={(v) => update({ schedulePhase1Seconds: v })}
              min={SETTINGS_LIMITS.schedulePhaseSeconds.min}
              max={SETTINGS_LIMITS.schedulePhaseSeconds.max}
            />
            <span className="adv-unit">s ×</span>
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={Math.round(settings.schedulePhase1SpeedMult * 100)}
              onChange={(v) =>
                update({ schedulePhase1SpeedMult: Math.max(0.05, v / 100) })
              }
              min={5}
              max={500}
            />
            <span className="adv-unit">%</span>
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.schedulePhase2Seconds}
              onChange={(v) => update({ schedulePhase2Seconds: v })}
              min={SETTINGS_LIMITS.schedulePhaseSeconds.min}
              max={SETTINGS_LIMITS.schedulePhaseSeconds.max}
            />
            <span className="adv-unit">s ×</span>
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={Math.round(settings.schedulePhase2SpeedMult * 100)}
              onChange={(v) =>
                update({ schedulePhase2SpeedMult: Math.max(0.05, v / 100) })
              }
              min={5}
              max={500}
            />
            <span className="adv-unit">%</span>
          </div>
        </Disableable>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <ToggleBtn
          value={settings.fixedHoldEnabled}
          onChange={(v) => update({ fixedHoldEnabled: v })}
        />
        <span className="adv-label">{t("advanced.clickPatternsFixedHold")}</span>
        <Disableable enabled={settings.fixedHoldEnabled}>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.fixedHoldMs}
              onChange={(v) => update({ fixedHoldMs: v })}
              min={SETTINGS_LIMITS.fixedHoldMs.min}
              max={SETTINGS_LIMITS.fixedHoldMs.max}
            />
            <span className="adv-unit">ms</span>
          </div>
        </Disableable>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <span className="adv-label">{t("advanced.clickPatternsClicksPerGesture")}</span>
        <div className="adv-numbox-sm">
          <NumInput
            value={settings.clicksPerGesture}
            onChange={(v) => update({ clicksPerGesture: v })}
            min={SETTINGS_LIMITS.clicksPerGesture.min}
            max={SETTINGS_LIMITS.clicksPerGesture.max}
          />
        </div>
        <ToggleBtn
          value={settings.alternateButtonsEnabled}
          onChange={(v) => update({ alternateButtonsEnabled: v })}
        />
        <span className="adv-label">{t("advanced.clickPatternsAlternateLR")}</span>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <span className="adv-label">{t("advanced.clickPatternsModifiers")}</span>
        <AdvSelectDropdown
          multiple
          values={modifierValues}
          options={modifierOptions}
          placeholder={t("common.none")}
          onValuesChange={(values) =>
            update({
              clickWithCtrl: values.includes("ctrl"),
              clickWithShift: values.includes("shift"),
              clickWithAlt: values.includes("alt"),
            })
          }
        />
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <span className="adv-label">{t("advanced.clickPatternsJitter")}</span>
        <div className="adv-numbox-sm">
          <NumInput
            value={settings.cursorJitterPx}
            onChange={(v) => update({ cursorJitterPx: v })}
            min={SETTINGS_LIMITS.cursorJitterPx.min}
            max={SETTINGS_LIMITS.cursorJitterPx.max}
          />
          <span className="adv-unit">px</span>
        </div>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <ToggleBtn
          value={settings.oneShotEnabled}
          onChange={(v) => update({ oneShotEnabled: v })}
        />
        <span className="adv-label">{t("advanced.clickPatternsOneShot")}</span>
        <Disableable enabled={settings.oneShotEnabled}>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.oneShotClickCount}
              onChange={(v) => update({ oneShotClickCount: v })}
              min={SETTINGS_LIMITS.oneShotClickCount.min}
              max={SETTINGS_LIMITS.oneShotClickCount.max}
            />
            <span className="adv-unit">{t("advanced.clickPatternsClicksUnit")}</span>
          </div>
        </Disableable>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <Disableable
          enabled={!pathConflict}
          disabledReason={t("advanced.clickPatternsPathBlocked")}
        >
          <ToggleBtn
            value={settings.gridClickEnabled}
            onChange={(v) =>
              update({
                gridClickEnabled: v,
                linePathEnabled: v ? false : settings.linePathEnabled,
              })
            }
          />
          <span className="adv-label">{t("advanced.clickPatternsGrid")}</span>
        </Disableable>
        <Disableable enabled={settings.gridClickEnabled && !pathConflict}>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.gridCols}
              onChange={(v) => update({ gridCols: v })}
              min={SETTINGS_LIMITS.gridDimension.min}
              max={SETTINGS_LIMITS.gridDimension.max}
            />
            <span className="adv-unit">×</span>
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.gridRows}
              onChange={(v) => update({ gridRows: v })}
              min={SETTINGS_LIMITS.gridDimension.min}
              max={SETTINGS_LIMITS.gridDimension.max}
            />
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.gridSpacingPx}
              onChange={(v) => update({ gridSpacingPx: v })}
              min={SETTINGS_LIMITS.gridSpacingPx.min}
              max={SETTINGS_LIMITS.gridSpacingPx.max}
            />
            <span className="adv-unit">px</span>
          </div>
        </Disableable>
      </div>

      <div className="adv-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <Disableable
          enabled={!pathConflict}
          disabledReason={t("advanced.clickPatternsPathBlocked")}
        >
          <ToggleBtn
            value={settings.linePathEnabled}
            onChange={(v) =>
              update({
                linePathEnabled: v,
                gridClickEnabled: v ? false : settings.gridClickEnabled,
              })
            }
          />
          <span className="adv-label">{t("advanced.clickPatternsLine")}</span>
        </Disableable>
        <Disableable enabled={settings.linePathEnabled && !pathConflict}>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.lineSteps}
              onChange={(v) => update({ lineSteps: v })}
              min={SETTINGS_LIMITS.lineSteps.min}
              max={SETTINGS_LIMITS.lineSteps.max}
            />
            <span className="adv-unit">{t("advanced.clickPatternsSteps")}</span>
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.lineEndOffsetX}
              onChange={(v) => update({ lineEndOffsetX: v })}
              min={SETTINGS_LIMITS.lineOffset.min}
              max={SETTINGS_LIMITS.lineOffset.max}
            />
            <span className="adv-unit">Δx</span>
          </div>
          <div className="adv-numbox-sm">
            <NumInput
              value={settings.lineEndOffsetY}
              onChange={(v) => update({ lineEndOffsetY: v })}
              min={SETTINGS_LIMITS.lineOffset.min}
              max={SETTINGS_LIMITS.lineOffset.max}
            />
            <span className="adv-unit">Δy</span>
          </div>
        </Disableable>
      </div>
    </div>
  );
}
