import "./AdvancedPanel.css";
import { useEffect, useEffectEvent } from "react";
import { getMaxDoubleClickDelayMs } from "../../../cadence";
import type { Settings } from "../../../store";
import CadenceSection from "./CadenceSection";
import DutyCycleSection from "./DutyCycleSection";
import SpeedVariationSection from "./SpeedVariationSection";
import DoubleClickSection from "./DoubleClickSection";
import SequenceSection from "./SequenceSection";
import LimitsSection from "./LimitsSection";
import ClickPatternsSection from "./ClickPatternsSection";
import ScreenTriggerSection from "./ScreenTriggerSection";
import { useTranslation } from "../../../i18n";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  showInfo: boolean;
  running: boolean;
  activeSequenceIndex: number | null;
}

export default function AdvancedPanel({
  settings,
  update,
  showInfo,
  running,
  activeSequenceIndex,
}: Props) {
  const { t } = useTranslation();
  const {
    clickInterval,
    clickSpeed,
    doubleClickDelay,
    durationHours,
    durationMilliseconds,
    durationMinutes,
    durationSeconds,
    rateInputMode,
  } = settings;
  const clampDoubleClickDelay = useEffectEvent((maxDelay: number) => {
    update({ doubleClickDelay: maxDelay });
  });

  useEffect(() => {
    const max = getMaxDoubleClickDelayMs({
      clickInterval,
      clickSpeed,
      rateInputMode,
      durationHours,
      durationMinutes,
      durationSeconds,
      durationMilliseconds,
    });
    if (doubleClickDelay > max) {
      clampDoubleClickDelay(max);
    }
  }, [
    clickInterval,
    clickSpeed,
    doubleClickDelay,
    durationHours,
    durationMilliseconds,
    durationMinutes,
    durationSeconds,
    rateInputMode,
  ]);

  return (
    <div className="adv-panel adv-panel-text">
      <div className="adv-columns">
        <div className="adv-col">
          <div className="adv-column-kicker">{t("advanced.groupTiming")}</div>
          <CadenceSection settings={settings} update={update} showInfo={showInfo} />
          <DutyCycleSection settings={settings} update={update} showInfo={showInfo} />
          <LimitsSection settings={settings} update={update} showInfo={showInfo} />
          <SpeedVariationSection settings={settings} update={update} showInfo={showInfo} />
          <DoubleClickSection settings={settings} update={update} showInfo={showInfo} />
        </div>

        <div className="adv-col">
          <div className="adv-column-kicker">{t("advanced.groupAutomation")}</div>
          <ClickPatternsSection settings={settings} update={update} showInfo={showInfo} />
          <ScreenTriggerSection settings={settings} update={update} showInfo={showInfo} />
          <SequenceSection
            settings={settings}
            update={update}
            showInfo={showInfo}
            running={running}
            activeSequenceIndex={activeSequenceIndex}
          />
        </div>
      </div>
    </div>
  );
}
