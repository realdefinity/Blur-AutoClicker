import { DEFAULT_LANGUAGE, isLanguage, type Language } from "./i18n";

export type ClickInterval = "s" | "m" | "h" | "d";
export type MouseButton = "Left" | "Middle" | "Right";
export type ClickMode = "Toggle" | "Hold";
export type TimeLimitUnit = "s" | "m" | "h";
export type SavedPanel = "simple" | "advanced" | "zones";
export type Theme = "dark" | "light";
export type PresetId = string;
export type RateInputMode = "rate" | "duration";
export type ScreenTriggerMode =
  | "whileMatch"
  | "onAppear"
  | "onDisappear"
  | "onChange";

export interface SequencePoint {
  id: string;
  x: number;
  y: number;
  clicks: number;
}

function createSequencePointId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `seq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

export interface PresetSnapshot {
  clickSpeed: number;
  clickInterval: ClickInterval;
  mouseButton: MouseButton;
  mode: ClickMode;
  dutyCycleEnabled: boolean;
  dutyCycle: number;
  speedVariationEnabled: boolean;
  speedVariation: number;
  doubleClickEnabled: boolean;
  doubleClickDelay: number;
  clickLimitEnabled: boolean;
  clickLimit: number;
  timeLimitEnabled: boolean;
  timeLimit: number;
  timeLimitUnit: TimeLimitUnit;
  cornerStopEnabled: boolean;
  cornerStopTL: number;
  cornerStopTR: number;
  cornerStopBL: number;
  cornerStopBR: number;
  edgeStopEnabled: boolean;
  edgeStopTop: number;
  edgeStopBottom: number;
  edgeStopLeft: number;
  edgeStopRight: number;
  burstModeEnabled: boolean;
  burstClicksBeforeRest: number;
  burstRestMs: number;
  rampUpSeconds: number;
  rampDownSeconds: number;
  scheduleEnabled: boolean;
  schedulePhase1Seconds: number;
  schedulePhase1SpeedMult: number;
  schedulePhase2Seconds: number;
  schedulePhase2SpeedMult: number;
  fixedHoldEnabled: boolean;
  fixedHoldMs: number;
  clicksPerGesture: number;
  alternateButtonsEnabled: boolean;
  cursorJitterPx: number;
  oneShotEnabled: boolean;
  oneShotClickCount: number;
  clickWithCtrl: boolean;
  clickWithShift: boolean;
  clickWithAlt: boolean;
  gridClickEnabled: boolean;
  gridCols: number;
  gridRows: number;
  gridSpacingPx: number;
  linePathEnabled: boolean;
  lineSteps: number;
  lineEndOffsetX: number;
  lineEndOffsetY: number;
  screenTriggerEnabled: boolean;
  screenTriggerMode: ScreenTriggerMode;
  screenTriggerX: number;
  screenTriggerY: number;
  screenTriggerWidth: number;
  screenTriggerHeight: number;
  screenTriggerRefR: number;
  screenTriggerRefG: number;
  screenTriggerRefB: number;
  screenTriggerTolerance: number;
  screenTriggerChangeSensitivity: number;
  screenTriggerHasReference: boolean;
}

export interface PresetDefinition {
  id: PresetId;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: PresetSnapshot;
}

export interface Settings extends PresetSnapshot {
  version: string;
  hotkey: string;
  language: Language;
  rateInputMode: RateInputMode;
  durationHours: number;
  durationMinutes: number;
  durationSeconds: number;
  durationMilliseconds: number;
  sequenceEnabled: boolean;
  sequencePoints: SequencePoint[];
  customStopZoneEnabled: boolean;
  customStopZoneX: number;
  customStopZoneY: number;
  customStopZoneWidth: number;
  customStopZoneHeight: number;
  disableScreenshots: boolean;
  advancedSettingsEnabled: boolean;
  lastPanel: SavedPanel;
  showStopReason: boolean;
  showStopOverlay: boolean;
  /** While running, append session click count to the centered title text. */
  showSessionClickCountInTitle: boolean;
  /** While running, append session elapsed time (mm:ss or h:mm:ss) to the title bar. */
  showSessionElapsedInTitle: boolean;
  strictHotkeyModifiers: boolean;
  minimizeToTray: boolean;
  theme: Theme;
  alwaysOnTop: boolean;
  accentColor: string;
  presets: PresetDefinition[];
  activePresetId: PresetId | null;
  /** Second hotkey: pause/resume clicking while session stays "running". */
  pauseHotkey: string;
}

export const DEFAULT_ACCENT_COLOR = "#8b5cf6";
export const MAX_PRESETS = 20;
export const PRESET_NAME_MAX_LENGTH = 40;

export const CLICK_INTERVAL_OPTIONS = [
  { value: "s", label: "Second" },
  { value: "m", label: "Minute" },
  { value: "h", label: "Hour" },
  { value: "d", label: "Day" },
] as const satisfies ReadonlyArray<{ value: ClickInterval; label: string }>;

export const MODE_OPTIONS = ["Toggle", "Hold"] as const satisfies ReadonlyArray<ClickMode>;
export const MOUSE_BUTTON_OPTIONS = ["Left", "Middle", "Right"] as const satisfies ReadonlyArray<MouseButton>;
export const TIME_LIMIT_UNIT_OPTIONS = ["s", "m", "h"] as const satisfies ReadonlyArray<TimeLimitUnit>;
export const THEME_OPTIONS = ["dark", "light"] as const satisfies ReadonlyArray<Theme>;

export const SETTINGS_LIMITS = {
  clickSpeed: { min: 1, max: 500 },
  dutyCycle: { min: 0, max: 100 },
  speedVariation: { min: 0, max: 200 },
  doubleClickDelay: { min: 20, max: 9999 },
  clickLimit: { min: 1, max: 10_000_000 },
  timeLimit: { min: 1 },
  stopBoundary: { min: 0, max: 999 },
  position: { min: 0 },
  durationHours: { min: 0, max: 999 },
  durationMinutes: { min: 0 },
  durationSeconds: { min: 0, max: 59 },
  durationMilliseconds: { min: 0, max: 999 },
  stopZoneDimension: { min: 1 },
  sequencePointClicks: { min: 1, max: 1000 },
  burstClicksBeforeRest: { min: 1, max: 500 },
  burstRestMs: { min: 0, max: 60_000 },
  rampSeconds: { min: 0, max: 600 },
  schedulePhaseSeconds: { min: 0, max: 86_400 },
  speedMultiplier: { min: 0.05, max: 5 },
  fixedHoldMs: { min: 0, max: 5000 },
  clicksPerGesture: { min: 1, max: 5 },
  cursorJitterPx: { min: 0, max: 80 },
  oneShotClickCount: { min: 1, max: 10_000_000 },
  gridDimension: { min: 1, max: 80 },
  gridSpacingPx: { min: 1, max: 2000 },
  lineSteps: { min: 2, max: 2000 },
  lineOffset: { min: -16_000, max: 16_000 },
  screenTriggerTolerance: { min: 0, max: 100 },
  screenTriggerChangeSensitivity: { min: 0, max: 100 },
  screenTriggerRegionSize: { min: 1, max: 512 },
} as const;

export const PRESET_SNAPSHOT_KEYS = [
  "clickSpeed",
  "clickInterval",
  "mouseButton",
  "mode",
  "dutyCycleEnabled",
  "dutyCycle",
  "speedVariationEnabled",
  "speedVariation",
  "doubleClickEnabled",
  "doubleClickDelay",
  "clickLimitEnabled",
  "clickLimit",
  "timeLimitEnabled",
  "timeLimit",
  "timeLimitUnit",
  "cornerStopEnabled",
  "cornerStopTL",
  "cornerStopTR",
  "cornerStopBL",
  "cornerStopBR",
  "edgeStopEnabled",
  "edgeStopTop",
  "edgeStopBottom",
  "edgeStopLeft",
  "edgeStopRight",
  "burstModeEnabled",
  "burstClicksBeforeRest",
  "burstRestMs",
  "rampUpSeconds",
  "rampDownSeconds",
  "scheduleEnabled",
  "schedulePhase1Seconds",
  "schedulePhase1SpeedMult",
  "schedulePhase2Seconds",
  "schedulePhase2SpeedMult",
  "fixedHoldEnabled",
  "fixedHoldMs",
  "clicksPerGesture",
  "alternateButtonsEnabled",
  "cursorJitterPx",
  "oneShotEnabled",
  "oneShotClickCount",
  "clickWithCtrl",
  "clickWithShift",
  "clickWithAlt",
  "gridClickEnabled",
  "gridCols",
  "gridRows",
  "gridSpacingPx",
  "linePathEnabled",
  "lineSteps",
  "lineEndOffsetX",
  "lineEndOffsetY",
  "screenTriggerEnabled",
  "screenTriggerMode",
  "screenTriggerX",
  "screenTriggerY",
  "screenTriggerWidth",
  "screenTriggerHeight",
  "screenTriggerRefR",
  "screenTriggerRefG",
  "screenTriggerRefB",
  "screenTriggerTolerance",
  "screenTriggerChangeSensitivity",
  "screenTriggerHasReference",
] as const satisfies ReadonlyArray<keyof PresetSnapshot>;

export function clampNumber(
  value: unknown,
  fallback: number,
  min?: number,
  max?: number,
) {
  const parsed =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const minClamped = min === undefined ? parsed : Math.max(min, parsed);
  return max === undefined ? minClamped : Math.min(max, minClamped);
}

export function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function migrateClicksPerGesture(
  saved: { clicksPerGesture?: unknown; doubleClickEnabled?: unknown },
  defaults: Pick<PresetSnapshot, "clicksPerGesture" | "doubleClickEnabled">,
): number {
  const raw = saved.clicksPerGesture;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clampNumber(
      raw,
      defaults.clicksPerGesture,
      SETTINGS_LIMITS.clicksPerGesture.min,
      SETTINGS_LIMITS.clicksPerGesture.max,
    );
  }
  const dc = sanitizeBoolean(saved.doubleClickEnabled, defaults.doubleClickEnabled);
  return clampNumber(
    dc ? 2 : defaults.clicksPerGesture,
    defaults.clicksPerGesture,
    SETTINGS_LIMITS.clicksPerGesture.min,
    SETTINGS_LIMITS.clicksPerGesture.max,
  );
}

function sanitizeSavedPanel(value: unknown): SavedPanel {
  return value === "advanced" || value === "zones" ? value : "simple";
}

function sanitizeTheme(value: unknown): Theme {
  return value === "light" ? "light" : "dark";
}

export function sanitizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

export function sanitizePresetName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, PRESET_NAME_MAX_LENGTH);
}

function createFallbackPresetId(index: number) {
  return `preset-${index + 1}`;
}

export function createDefaultSettings(version: string): Settings {
  return {
    version,
    clickSpeed: 25,
    clickInterval: "s",
    mouseButton: "Left",
    hotkey: "ctrl+y",
    language: DEFAULT_LANGUAGE,
    mode: "Toggle",
    dutyCycleEnabled: true,
    dutyCycle: 45,
    speedVariationEnabled: true,
    speedVariation: 35,
    doubleClickEnabled: false,
    doubleClickDelay: 40,
    clickLimitEnabled: false,
    clickLimit: 1000,
    timeLimitEnabled: false,
    timeLimit: 60,
    timeLimitUnit: "s",
    cornerStopEnabled: true,
    cornerStopTL: 50,
    cornerStopTR: 50,
    cornerStopBL: 50,
    cornerStopBR: 50,
    edgeStopEnabled: true,
    edgeStopTop: 40,
    edgeStopBottom: 40,
    edgeStopLeft: 40,
    edgeStopRight: 40,
    burstModeEnabled: false,
    burstClicksBeforeRest: 5,
    burstRestMs: 200,
    rampUpSeconds: 0,
    rampDownSeconds: 0,
    scheduleEnabled: false,
    schedulePhase1Seconds: 10,
    schedulePhase1SpeedMult: 0.5,
    schedulePhase2Seconds: 60,
    schedulePhase2SpeedMult: 1,
    fixedHoldEnabled: false,
    fixedHoldMs: 40,
    clicksPerGesture: 1,
    alternateButtonsEnabled: false,
    cursorJitterPx: 0,
    oneShotEnabled: false,
    oneShotClickCount: 100,
    clickWithCtrl: false,
    clickWithShift: false,
    clickWithAlt: false,
    gridClickEnabled: false,
    gridCols: 3,
    gridRows: 3,
    gridSpacingPx: 40,
    linePathEnabled: false,
    lineSteps: 10,
    lineEndOffsetX: 200,
    lineEndOffsetY: 0,
    screenTriggerEnabled: false,
    screenTriggerMode: "whileMatch",
    screenTriggerX: 0,
    screenTriggerY: 0,
    screenTriggerWidth: 32,
    screenTriggerHeight: 32,
    screenTriggerRefR: 0,
    screenTriggerRefG: 0,
    screenTriggerRefB: 0,
    screenTriggerTolerance: 18,
    screenTriggerChangeSensitivity: 12,
    screenTriggerHasReference: false,
    rateInputMode: "rate",
    durationHours: 0,
    durationMinutes: 0,
    durationSeconds: 0,
    durationMilliseconds: 40,
    sequenceEnabled: false,
    sequencePoints: [],
    customStopZoneEnabled: false,
    customStopZoneX: 0,
    customStopZoneY: 0,
    customStopZoneWidth: 100,
    customStopZoneHeight: 100,
    disableScreenshots: false,
    advancedSettingsEnabled: true,
    lastPanel: "simple",
    showStopReason: true,
    showStopOverlay: true,
    showSessionClickCountInTitle: true,
    showSessionElapsedInTitle: true,
    strictHotkeyModifiers: false,
    minimizeToTray: false,
    theme: "dark",
    alwaysOnTop: false,
    accentColor: DEFAULT_ACCENT_COLOR,
    presets: [],
    activePresetId: null,
    pauseHotkey: "",
  };
}

export function buildPresetSnapshot(settings: Settings): PresetSnapshot {
  return {
    clickSpeed: settings.clickSpeed,
    clickInterval: settings.clickInterval,
    mouseButton: settings.mouseButton,
    mode: settings.mode,
    dutyCycleEnabled: settings.dutyCycleEnabled,
    dutyCycle: settings.dutyCycle,
    speedVariationEnabled: settings.speedVariationEnabled,
    speedVariation: settings.speedVariation,
    doubleClickEnabled: settings.doubleClickEnabled,
    doubleClickDelay: settings.doubleClickDelay,
    clickLimitEnabled: settings.clickLimitEnabled,
    clickLimit: settings.clickLimit,
    timeLimitEnabled: settings.timeLimitEnabled,
    timeLimit: settings.timeLimit,
    timeLimitUnit: settings.timeLimitUnit,
    cornerStopEnabled: settings.cornerStopEnabled,
    cornerStopTL: settings.cornerStopTL,
    cornerStopTR: settings.cornerStopTR,
    cornerStopBL: settings.cornerStopBL,
    cornerStopBR: settings.cornerStopBR,
    edgeStopEnabled: settings.edgeStopEnabled,
    edgeStopTop: settings.edgeStopTop,
    edgeStopBottom: settings.edgeStopBottom,
    edgeStopLeft: settings.edgeStopLeft,
    edgeStopRight: settings.edgeStopRight,
    burstModeEnabled: settings.burstModeEnabled,
    burstClicksBeforeRest: settings.burstClicksBeforeRest,
    burstRestMs: settings.burstRestMs,
    rampUpSeconds: settings.rampUpSeconds,
    rampDownSeconds: settings.rampDownSeconds,
    scheduleEnabled: settings.scheduleEnabled,
    schedulePhase1Seconds: settings.schedulePhase1Seconds,
    schedulePhase1SpeedMult: settings.schedulePhase1SpeedMult,
    schedulePhase2Seconds: settings.schedulePhase2Seconds,
    schedulePhase2SpeedMult: settings.schedulePhase2SpeedMult,
    fixedHoldEnabled: settings.fixedHoldEnabled,
    fixedHoldMs: settings.fixedHoldMs,
    clicksPerGesture: settings.clicksPerGesture,
    alternateButtonsEnabled: settings.alternateButtonsEnabled,
    cursorJitterPx: settings.cursorJitterPx,
    oneShotEnabled: settings.oneShotEnabled,
    oneShotClickCount: settings.oneShotClickCount,
    clickWithCtrl: settings.clickWithCtrl,
    clickWithShift: settings.clickWithShift,
    clickWithAlt: settings.clickWithAlt,
    gridClickEnabled: settings.gridClickEnabled,
    gridCols: settings.gridCols,
    gridRows: settings.gridRows,
    gridSpacingPx: settings.gridSpacingPx,
    linePathEnabled: settings.linePathEnabled,
    lineSteps: settings.lineSteps,
    lineEndOffsetX: settings.lineEndOffsetX,
    lineEndOffsetY: settings.lineEndOffsetY,
    screenTriggerEnabled: settings.screenTriggerEnabled,
    screenTriggerMode: settings.screenTriggerMode,
    screenTriggerX: settings.screenTriggerX,
    screenTriggerY: settings.screenTriggerY,
    screenTriggerWidth: settings.screenTriggerWidth,
    screenTriggerHeight: settings.screenTriggerHeight,
    screenTriggerRefR: settings.screenTriggerRefR,
    screenTriggerRefG: settings.screenTriggerRefG,
    screenTriggerRefB: settings.screenTriggerRefB,
    screenTriggerTolerance: settings.screenTriggerTolerance,
    screenTriggerChangeSensitivity: settings.screenTriggerChangeSensitivity,
    screenTriggerHasReference: settings.screenTriggerHasReference,
  };
}

export function applyPresetSnapshot(
  base: Settings,
  snapshot: PresetSnapshot,
): Settings {
  return {
    ...base,
    ...snapshot,
  };
}

export function createPresetDefinition(
  name: string,
  settings: Settings,
): PresetDefinition {
  const now = new Date().toISOString();
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    name: sanitizePresetName(name),
    createdAt: now,
    updatedAt: now,
    settings: buildPresetSnapshot(settings),
  };
}

function sanitizePresetSnapshot(
  input: unknown,
  defaults: PresetSnapshot,
): PresetSnapshot {
  const saved = (input ?? {}) as Partial<PresetSnapshot>;

  return {
    ...defaults,
    clickSpeed: clampNumber(
      saved.clickSpeed,
      defaults.clickSpeed,
      SETTINGS_LIMITS.clickSpeed.min,
      SETTINGS_LIMITS.clickSpeed.max,
    ),
    clickInterval:
      saved.clickInterval === "m" ||
      saved.clickInterval === "h" ||
      saved.clickInterval === "d"
        ? saved.clickInterval
        : defaults.clickInterval,
    mouseButton:
      saved.mouseButton === "Middle" || saved.mouseButton === "Right"
        ? saved.mouseButton
        : defaults.mouseButton,
    mode: saved.mode === "Hold" ? "Hold" : defaults.mode,
    dutyCycleEnabled: sanitizeBoolean(
      saved.dutyCycleEnabled,
      defaults.dutyCycleEnabled,
    ),
    dutyCycle: clampNumber(
      saved.dutyCycle,
      defaults.dutyCycle,
      SETTINGS_LIMITS.dutyCycle.min,
      SETTINGS_LIMITS.dutyCycle.max,
    ),
    speedVariationEnabled: sanitizeBoolean(
      saved.speedVariationEnabled,
      defaults.speedVariationEnabled,
    ),
    speedVariation: clampNumber(
      saved.speedVariation,
      defaults.speedVariation,
      SETTINGS_LIMITS.speedVariation.min,
      SETTINGS_LIMITS.speedVariation.max,
    ),
    doubleClickEnabled: sanitizeBoolean(
      saved.doubleClickEnabled,
      defaults.doubleClickEnabled,
    ),
    doubleClickDelay: clampNumber(
      saved.doubleClickDelay,
      defaults.doubleClickDelay,
      SETTINGS_LIMITS.doubleClickDelay.min,
      SETTINGS_LIMITS.doubleClickDelay.max,
    ),
    clickLimitEnabled: sanitizeBoolean(
      saved.clickLimitEnabled,
      defaults.clickLimitEnabled,
    ),
    clickLimit: clampNumber(
      saved.clickLimit,
      defaults.clickLimit,
      SETTINGS_LIMITS.clickLimit.min,
      SETTINGS_LIMITS.clickLimit.max,
    ),
    timeLimitEnabled: sanitizeBoolean(
      saved.timeLimitEnabled,
      defaults.timeLimitEnabled,
    ),
    timeLimit: clampNumber(
      saved.timeLimit,
      defaults.timeLimit,
      SETTINGS_LIMITS.timeLimit.min,
    ),
    timeLimitUnit:
      saved.timeLimitUnit === "m" || saved.timeLimitUnit === "h"
        ? saved.timeLimitUnit
        : defaults.timeLimitUnit,
    cornerStopEnabled: sanitizeBoolean(
      saved.cornerStopEnabled,
      defaults.cornerStopEnabled,
    ),
    cornerStopTL: clampNumber(
      saved.cornerStopTL,
      defaults.cornerStopTL,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    cornerStopTR: clampNumber(
      saved.cornerStopTR,
      defaults.cornerStopTR,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    cornerStopBL: clampNumber(
      saved.cornerStopBL,
      defaults.cornerStopBL,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    cornerStopBR: clampNumber(
      saved.cornerStopBR,
      defaults.cornerStopBR,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopEnabled: sanitizeBoolean(
      saved.edgeStopEnabled,
      defaults.edgeStopEnabled,
    ),
    edgeStopTop: clampNumber(
      saved.edgeStopTop,
      defaults.edgeStopTop,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopBottom: clampNumber(
      saved.edgeStopBottom,
      defaults.edgeStopBottom,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopLeft: clampNumber(
      saved.edgeStopLeft,
      defaults.edgeStopLeft,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopRight: clampNumber(
      saved.edgeStopRight,
      defaults.edgeStopRight,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    burstModeEnabled: sanitizeBoolean(
      saved.burstModeEnabled,
      defaults.burstModeEnabled,
    ),
    burstClicksBeforeRest: clampNumber(
      saved.burstClicksBeforeRest,
      defaults.burstClicksBeforeRest,
      SETTINGS_LIMITS.burstClicksBeforeRest.min,
      SETTINGS_LIMITS.burstClicksBeforeRest.max,
    ),
    burstRestMs: clampNumber(
      saved.burstRestMs,
      defaults.burstRestMs,
      SETTINGS_LIMITS.burstRestMs.min,
      SETTINGS_LIMITS.burstRestMs.max,
    ),
    rampUpSeconds: clampNumber(
      saved.rampUpSeconds,
      defaults.rampUpSeconds,
      SETTINGS_LIMITS.rampSeconds.min,
      SETTINGS_LIMITS.rampSeconds.max,
    ),
    rampDownSeconds: clampNumber(
      saved.rampDownSeconds,
      defaults.rampDownSeconds,
      SETTINGS_LIMITS.rampSeconds.min,
      SETTINGS_LIMITS.rampSeconds.max,
    ),
    scheduleEnabled: sanitizeBoolean(
      saved.scheduleEnabled,
      defaults.scheduleEnabled,
    ),
    schedulePhase1Seconds: clampNumber(
      saved.schedulePhase1Seconds,
      defaults.schedulePhase1Seconds,
      SETTINGS_LIMITS.schedulePhaseSeconds.min,
      SETTINGS_LIMITS.schedulePhaseSeconds.max,
    ),
    schedulePhase1SpeedMult: clampNumber(
      saved.schedulePhase1SpeedMult,
      defaults.schedulePhase1SpeedMult,
      SETTINGS_LIMITS.speedMultiplier.min,
      SETTINGS_LIMITS.speedMultiplier.max,
    ),
    schedulePhase2Seconds: clampNumber(
      saved.schedulePhase2Seconds,
      defaults.schedulePhase2Seconds,
      SETTINGS_LIMITS.schedulePhaseSeconds.min,
      SETTINGS_LIMITS.schedulePhaseSeconds.max,
    ),
    schedulePhase2SpeedMult: clampNumber(
      saved.schedulePhase2SpeedMult,
      defaults.schedulePhase2SpeedMult,
      SETTINGS_LIMITS.speedMultiplier.min,
      SETTINGS_LIMITS.speedMultiplier.max,
    ),
    fixedHoldEnabled: sanitizeBoolean(
      saved.fixedHoldEnabled,
      defaults.fixedHoldEnabled,
    ),
    fixedHoldMs: clampNumber(
      saved.fixedHoldMs,
      defaults.fixedHoldMs,
      SETTINGS_LIMITS.fixedHoldMs.min,
      SETTINGS_LIMITS.fixedHoldMs.max,
    ),
    clicksPerGesture: migrateClicksPerGesture(saved, defaults),
    alternateButtonsEnabled: sanitizeBoolean(
      saved.alternateButtonsEnabled,
      defaults.alternateButtonsEnabled,
    ),
    cursorJitterPx: clampNumber(
      saved.cursorJitterPx,
      defaults.cursorJitterPx,
      SETTINGS_LIMITS.cursorJitterPx.min,
      SETTINGS_LIMITS.cursorJitterPx.max,
    ),
    oneShotEnabled: sanitizeBoolean(
      saved.oneShotEnabled,
      defaults.oneShotEnabled,
    ),
    oneShotClickCount: clampNumber(
      saved.oneShotClickCount,
      defaults.oneShotClickCount,
      SETTINGS_LIMITS.oneShotClickCount.min,
      SETTINGS_LIMITS.oneShotClickCount.max,
    ),
    clickWithCtrl: sanitizeBoolean(
      saved.clickWithCtrl,
      defaults.clickWithCtrl,
    ),
    clickWithShift: sanitizeBoolean(
      saved.clickWithShift,
      defaults.clickWithShift,
    ),
    clickWithAlt: sanitizeBoolean(saved.clickWithAlt, defaults.clickWithAlt),
    gridClickEnabled: sanitizeBoolean(
      saved.gridClickEnabled,
      defaults.gridClickEnabled,
    ),
    gridCols: clampNumber(
      saved.gridCols,
      defaults.gridCols,
      SETTINGS_LIMITS.gridDimension.min,
      SETTINGS_LIMITS.gridDimension.max,
    ),
    gridRows: clampNumber(
      saved.gridRows,
      defaults.gridRows,
      SETTINGS_LIMITS.gridDimension.min,
      SETTINGS_LIMITS.gridDimension.max,
    ),
    gridSpacingPx: clampNumber(
      saved.gridSpacingPx,
      defaults.gridSpacingPx,
      SETTINGS_LIMITS.gridSpacingPx.min,
      SETTINGS_LIMITS.gridSpacingPx.max,
    ),
    linePathEnabled: sanitizeBoolean(
      saved.linePathEnabled,
      defaults.linePathEnabled,
    ),
    lineSteps: clampNumber(
      saved.lineSteps,
      defaults.lineSteps,
      SETTINGS_LIMITS.lineSteps.min,
      SETTINGS_LIMITS.lineSteps.max,
    ),
    lineEndOffsetX: clampNumber(
      saved.lineEndOffsetX,
      defaults.lineEndOffsetX,
      SETTINGS_LIMITS.lineOffset.min,
      SETTINGS_LIMITS.lineOffset.max,
    ),
    lineEndOffsetY: clampNumber(
      saved.lineEndOffsetY,
      defaults.lineEndOffsetY,
      SETTINGS_LIMITS.lineOffset.min,
      SETTINGS_LIMITS.lineOffset.max,
    ),
    screenTriggerEnabled: sanitizeBoolean(
      saved.screenTriggerEnabled,
      defaults.screenTriggerEnabled,
    ),
    screenTriggerMode: sanitizeScreenTriggerMode(saved.screenTriggerMode),
    screenTriggerX: clampNumber(saved.screenTriggerX, defaults.screenTriggerX),
    screenTriggerY: clampNumber(saved.screenTriggerY, defaults.screenTriggerY),
    screenTriggerWidth: clampNumber(
      saved.screenTriggerWidth,
      defaults.screenTriggerWidth,
      SETTINGS_LIMITS.screenTriggerRegionSize.min,
      SETTINGS_LIMITS.screenTriggerRegionSize.max,
    ),
    screenTriggerHeight: clampNumber(
      saved.screenTriggerHeight,
      defaults.screenTriggerHeight,
      SETTINGS_LIMITS.screenTriggerRegionSize.min,
      SETTINGS_LIMITS.screenTriggerRegionSize.max,
    ),
    screenTriggerRefR: clampNumber(saved.screenTriggerRefR, defaults.screenTriggerRefR, 0, 255),
    screenTriggerRefG: clampNumber(saved.screenTriggerRefG, defaults.screenTriggerRefG, 0, 255),
    screenTriggerRefB: clampNumber(saved.screenTriggerRefB, defaults.screenTriggerRefB, 0, 255),
    screenTriggerTolerance: clampNumber(
      saved.screenTriggerTolerance,
      defaults.screenTriggerTolerance,
      SETTINGS_LIMITS.screenTriggerTolerance.min,
      SETTINGS_LIMITS.screenTriggerTolerance.max,
    ),
    screenTriggerChangeSensitivity: clampNumber(
      saved.screenTriggerChangeSensitivity,
      defaults.screenTriggerChangeSensitivity,
      SETTINGS_LIMITS.screenTriggerChangeSensitivity.min,
      SETTINGS_LIMITS.screenTriggerChangeSensitivity.max,
    ),
    screenTriggerHasReference: sanitizeBoolean(
      saved.screenTriggerHasReference,
      defaults.screenTriggerHasReference,
    ),
  };
}

function sanitizeRateInputMode(value: unknown): RateInputMode {
  return value === "duration" ? "duration" : "rate";
}

function sanitizeScreenTriggerMode(value: unknown): ScreenTriggerMode {
  return value === "onAppear" || value === "onDisappear" || value === "onChange"
    ? value
    : "whileMatch";
}

function sanitizeSequencePoints(value: unknown): SequencePoint[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((point) => {
      if (!point || typeof point !== "object") return null;
      const candidate = point as Partial<SequencePoint>;
      const id =
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id.trim()
          : createSequencePointId();
      const x = typeof candidate.x === "number" && Number.isFinite(candidate.x) ? Math.trunc(candidate.x) : null;
      const y = typeof candidate.y === "number" && Number.isFinite(candidate.y) ? Math.trunc(candidate.y) : null;
      const clicks =
        typeof candidate.clicks === "number" &&
        Number.isFinite(candidate.clicks)
          ? Math.trunc(candidate.clicks)
          : 1;
      if (x === null || y === null) return null;
      return {
        id,
        x,
        y,
        clicks: clampNumber(
          clicks,
          1,
          SETTINGS_LIMITS.sequencePointClicks.min,
          SETTINGS_LIMITS.sequencePointClicks.max,
        ),
      };
    })
    .filter((point): point is SequencePoint => point !== null);
}

function sanitizePresets(input: unknown, defaults: Settings): PresetDefinition[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const defaultSnapshot = buildPresetSnapshot(defaults);

  return input
    .slice(0, MAX_PRESETS)
    .map((preset, index) => {
      if (!preset || typeof preset !== "object") {
        return null;
      }

      const saved = preset as Partial<PresetDefinition>;
      const name = sanitizePresetName(saved.name);
      if (!name) {
        return null;
      }

      const now = new Date().toISOString();

      return {
        id:
          typeof saved.id === "string" && saved.id.trim()
            ? saved.id.trim()
            : createFallbackPresetId(index),
        name,
        createdAt:
          typeof saved.createdAt === "string" && saved.createdAt
            ? saved.createdAt
            : now,
        updatedAt:
          typeof saved.updatedAt === "string" && saved.updatedAt
            ? saved.updatedAt
            : now,
        settings: sanitizePresetSnapshot(saved.settings, defaultSnapshot),
      } satisfies PresetDefinition;
    })
    .filter((preset): preset is PresetDefinition => preset !== null);
}

export function sanitizeSettings(
  input: Partial<Settings> | null | undefined,
  version: string,
): Settings {
  const defaults = createDefaultSettings(version);
  const saved = (input ?? {}) as Partial<Settings> & {
    speedVariationMax?: unknown;
    telemetryEnabled?: unknown;
  };
  const legacySpeedVariation = clampNumber(
    saved.speedVariationMax,
    defaults.speedVariation,
    SETTINGS_LIMITS.speedVariation.min,
    SETTINGS_LIMITS.speedVariation.max,
  );
  const presets = sanitizePresets(saved.presets, defaults);
  const sequenceEnabled = sanitizeBoolean(saved.sequenceEnabled, defaults.sequenceEnabled);

  return {
    ...defaults,
    ...saved,
    version,
    language: isLanguage(saved.language) ? saved.language : defaults.language,
    clickSpeed: clampNumber(
      saved.clickSpeed,
      defaults.clickSpeed,
      SETTINGS_LIMITS.clickSpeed.min,
      SETTINGS_LIMITS.clickSpeed.max,
    ),
    dutyCycleEnabled: sanitizeBoolean(
      saved.dutyCycleEnabled,
      defaults.dutyCycleEnabled,
    ),
    dutyCycle: clampNumber(
      saved.dutyCycle,
      defaults.dutyCycle,
      SETTINGS_LIMITS.dutyCycle.min,
      SETTINGS_LIMITS.dutyCycle.max,
    ),
    speedVariationEnabled: sanitizeBoolean(
      saved.speedVariationEnabled,
      defaults.speedVariationEnabled,
    ),
    speedVariation: clampNumber(
      saved.speedVariation,
      legacySpeedVariation,
      SETTINGS_LIMITS.speedVariation.min,
      SETTINGS_LIMITS.speedVariation.max,
    ),
    doubleClickEnabled: sanitizeBoolean(
      saved.doubleClickEnabled,
      defaults.doubleClickEnabled,
    ),
    doubleClickDelay: clampNumber(
      saved.doubleClickDelay,
      defaults.doubleClickDelay,
      SETTINGS_LIMITS.doubleClickDelay.min,
      SETTINGS_LIMITS.doubleClickDelay.max,
    ),
    clickLimitEnabled: sanitizeBoolean(
      saved.clickLimitEnabled,
      defaults.clickLimitEnabled,
    ),
    clickLimit: clampNumber(
      saved.clickLimit,
      defaults.clickLimit,
      SETTINGS_LIMITS.clickLimit.min,
      SETTINGS_LIMITS.clickLimit.max,
    ),
    timeLimitEnabled: sanitizeBoolean(
      saved.timeLimitEnabled,
      defaults.timeLimitEnabled,
    ),
    timeLimit: clampNumber(
      saved.timeLimit,
      defaults.timeLimit,
      SETTINGS_LIMITS.timeLimit.min,
    ),
    cornerStopEnabled: sanitizeBoolean(
      saved.cornerStopEnabled,
      defaults.cornerStopEnabled,
    ),
    cornerStopTL: clampNumber(
      saved.cornerStopTL,
      defaults.cornerStopTL,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    cornerStopTR: clampNumber(
      saved.cornerStopTR,
      defaults.cornerStopTR,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    cornerStopBL: clampNumber(
      saved.cornerStopBL,
      defaults.cornerStopBL,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    cornerStopBR: clampNumber(
      saved.cornerStopBR,
      defaults.cornerStopBR,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopEnabled: sanitizeBoolean(
      saved.edgeStopEnabled,
      defaults.edgeStopEnabled,
    ),
    edgeStopTop: clampNumber(
      saved.edgeStopTop,
      defaults.edgeStopTop,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopBottom: clampNumber(
      saved.edgeStopBottom,
      defaults.edgeStopBottom,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopLeft: clampNumber(
      saved.edgeStopLeft,
      defaults.edgeStopLeft,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    edgeStopRight: clampNumber(
      saved.edgeStopRight,
      defaults.edgeStopRight,
      SETTINGS_LIMITS.stopBoundary.min,
      SETTINGS_LIMITS.stopBoundary.max,
    ),
    burstModeEnabled: sanitizeBoolean(
      saved.burstModeEnabled,
      defaults.burstModeEnabled,
    ),
    burstClicksBeforeRest: clampNumber(
      saved.burstClicksBeforeRest,
      defaults.burstClicksBeforeRest,
      SETTINGS_LIMITS.burstClicksBeforeRest.min,
      SETTINGS_LIMITS.burstClicksBeforeRest.max,
    ),
    burstRestMs: clampNumber(
      saved.burstRestMs,
      defaults.burstRestMs,
      SETTINGS_LIMITS.burstRestMs.min,
      SETTINGS_LIMITS.burstRestMs.max,
    ),
    rampUpSeconds: clampNumber(
      saved.rampUpSeconds,
      defaults.rampUpSeconds,
      SETTINGS_LIMITS.rampSeconds.min,
      SETTINGS_LIMITS.rampSeconds.max,
    ),
    rampDownSeconds: clampNumber(
      saved.rampDownSeconds,
      defaults.rampDownSeconds,
      SETTINGS_LIMITS.rampSeconds.min,
      SETTINGS_LIMITS.rampSeconds.max,
    ),
    scheduleEnabled: sanitizeBoolean(
      saved.scheduleEnabled,
      defaults.scheduleEnabled,
    ),
    schedulePhase1Seconds: clampNumber(
      saved.schedulePhase1Seconds,
      defaults.schedulePhase1Seconds,
      SETTINGS_LIMITS.schedulePhaseSeconds.min,
      SETTINGS_LIMITS.schedulePhaseSeconds.max,
    ),
    schedulePhase1SpeedMult: clampNumber(
      saved.schedulePhase1SpeedMult,
      defaults.schedulePhase1SpeedMult,
      SETTINGS_LIMITS.speedMultiplier.min,
      SETTINGS_LIMITS.speedMultiplier.max,
    ),
    schedulePhase2Seconds: clampNumber(
      saved.schedulePhase2Seconds,
      defaults.schedulePhase2Seconds,
      SETTINGS_LIMITS.schedulePhaseSeconds.min,
      SETTINGS_LIMITS.schedulePhaseSeconds.max,
    ),
    schedulePhase2SpeedMult: clampNumber(
      saved.schedulePhase2SpeedMult,
      defaults.schedulePhase2SpeedMult,
      SETTINGS_LIMITS.speedMultiplier.min,
      SETTINGS_LIMITS.speedMultiplier.max,
    ),
    fixedHoldEnabled: sanitizeBoolean(
      saved.fixedHoldEnabled,
      defaults.fixedHoldEnabled,
    ),
    fixedHoldMs: clampNumber(
      saved.fixedHoldMs,
      defaults.fixedHoldMs,
      SETTINGS_LIMITS.fixedHoldMs.min,
      SETTINGS_LIMITS.fixedHoldMs.max,
    ),
    clicksPerGesture: migrateClicksPerGesture(saved, defaults),
    alternateButtonsEnabled: sanitizeBoolean(
      saved.alternateButtonsEnabled,
      defaults.alternateButtonsEnabled,
    ),
    cursorJitterPx: clampNumber(
      saved.cursorJitterPx,
      defaults.cursorJitterPx,
      SETTINGS_LIMITS.cursorJitterPx.min,
      SETTINGS_LIMITS.cursorJitterPx.max,
    ),
    oneShotEnabled: sanitizeBoolean(
      saved.oneShotEnabled,
      defaults.oneShotEnabled,
    ),
    oneShotClickCount: clampNumber(
      saved.oneShotClickCount,
      defaults.oneShotClickCount,
      SETTINGS_LIMITS.oneShotClickCount.min,
      SETTINGS_LIMITS.oneShotClickCount.max,
    ),
    clickWithCtrl: sanitizeBoolean(
      saved.clickWithCtrl,
      defaults.clickWithCtrl,
    ),
    clickWithShift: sanitizeBoolean(
      saved.clickWithShift,
      defaults.clickWithShift,
    ),
    clickWithAlt: sanitizeBoolean(saved.clickWithAlt, defaults.clickWithAlt),
    gridClickEnabled: sanitizeBoolean(
      saved.gridClickEnabled,
      defaults.gridClickEnabled,
    ),
    gridCols: clampNumber(
      saved.gridCols,
      defaults.gridCols,
      SETTINGS_LIMITS.gridDimension.min,
      SETTINGS_LIMITS.gridDimension.max,
    ),
    gridRows: clampNumber(
      saved.gridRows,
      defaults.gridRows,
      SETTINGS_LIMITS.gridDimension.min,
      SETTINGS_LIMITS.gridDimension.max,
    ),
    gridSpacingPx: clampNumber(
      saved.gridSpacingPx,
      defaults.gridSpacingPx,
      SETTINGS_LIMITS.gridSpacingPx.min,
      SETTINGS_LIMITS.gridSpacingPx.max,
    ),
    linePathEnabled: sanitizeBoolean(
      saved.linePathEnabled,
      defaults.linePathEnabled,
    ),
    lineSteps: clampNumber(
      saved.lineSteps,
      defaults.lineSteps,
      SETTINGS_LIMITS.lineSteps.min,
      SETTINGS_LIMITS.lineSteps.max,
    ),
    lineEndOffsetX: clampNumber(
      saved.lineEndOffsetX,
      defaults.lineEndOffsetX,
      SETTINGS_LIMITS.lineOffset.min,
      SETTINGS_LIMITS.lineOffset.max,
    ),
    lineEndOffsetY: clampNumber(
      saved.lineEndOffsetY,
      defaults.lineEndOffsetY,
      SETTINGS_LIMITS.lineOffset.min,
      SETTINGS_LIMITS.lineOffset.max,
    ),
    screenTriggerEnabled: sanitizeBoolean(
      saved.screenTriggerEnabled,
      defaults.screenTriggerEnabled,
    ),
    screenTriggerMode: sanitizeScreenTriggerMode(saved.screenTriggerMode),
    screenTriggerX: clampNumber(saved.screenTriggerX, defaults.screenTriggerX),
    screenTriggerY: clampNumber(saved.screenTriggerY, defaults.screenTriggerY),
    screenTriggerWidth: clampNumber(
      saved.screenTriggerWidth,
      defaults.screenTriggerWidth,
      SETTINGS_LIMITS.screenTriggerRegionSize.min,
      SETTINGS_LIMITS.screenTriggerRegionSize.max,
    ),
    screenTriggerHeight: clampNumber(
      saved.screenTriggerHeight,
      defaults.screenTriggerHeight,
      SETTINGS_LIMITS.screenTriggerRegionSize.min,
      SETTINGS_LIMITS.screenTriggerRegionSize.max,
    ),
    screenTriggerRefR: clampNumber(saved.screenTriggerRefR, defaults.screenTriggerRefR, 0, 255),
    screenTriggerRefG: clampNumber(saved.screenTriggerRefG, defaults.screenTriggerRefG, 0, 255),
    screenTriggerRefB: clampNumber(saved.screenTriggerRefB, defaults.screenTriggerRefB, 0, 255),
    screenTriggerTolerance: clampNumber(
      saved.screenTriggerTolerance,
      defaults.screenTriggerTolerance,
      SETTINGS_LIMITS.screenTriggerTolerance.min,
      SETTINGS_LIMITS.screenTriggerTolerance.max,
    ),
    screenTriggerChangeSensitivity: clampNumber(
      saved.screenTriggerChangeSensitivity,
      defaults.screenTriggerChangeSensitivity,
      SETTINGS_LIMITS.screenTriggerChangeSensitivity.min,
      SETTINGS_LIMITS.screenTriggerChangeSensitivity.max,
    ),
    screenTriggerHasReference: sanitizeBoolean(
      saved.screenTriggerHasReference,
      defaults.screenTriggerHasReference,
    ),
    pauseHotkey:
      typeof saved.pauseHotkey === "string" ? saved.pauseHotkey : defaults.pauseHotkey,
    rateInputMode: sanitizeRateInputMode(saved.rateInputMode),
    durationHours: clampNumber(saved.durationHours, defaults.durationHours, SETTINGS_LIMITS.durationHours.min, SETTINGS_LIMITS.durationHours.max),
    durationMinutes: clampNumber(saved.durationMinutes, defaults.durationMinutes, SETTINGS_LIMITS.durationMinutes.min),
    durationSeconds: clampNumber(saved.durationSeconds, defaults.durationSeconds, SETTINGS_LIMITS.durationSeconds.min, SETTINGS_LIMITS.durationSeconds.max),
    durationMilliseconds: clampNumber(saved.durationMilliseconds, defaults.durationMilliseconds, SETTINGS_LIMITS.durationMilliseconds.min, SETTINGS_LIMITS.durationMilliseconds.max),
    sequenceEnabled,
    sequencePoints: sanitizeSequencePoints(saved.sequencePoints),
    customStopZoneEnabled: sanitizeBoolean(saved.customStopZoneEnabled, defaults.customStopZoneEnabled),
    customStopZoneX: clampNumber(saved.customStopZoneX, defaults.customStopZoneX),
    customStopZoneY: clampNumber(saved.customStopZoneY, defaults.customStopZoneY),
    customStopZoneWidth: clampNumber(saved.customStopZoneWidth, defaults.customStopZoneWidth, SETTINGS_LIMITS.stopZoneDimension.min),
    customStopZoneHeight: clampNumber(saved.customStopZoneHeight, defaults.customStopZoneHeight, SETTINGS_LIMITS.stopZoneDimension.min),
    disableScreenshots: false,
    lastPanel: sanitizeSavedPanel(saved.lastPanel),
    theme: sanitizeTheme(saved.theme),
    strictHotkeyModifiers: sanitizeBoolean(saved.strictHotkeyModifiers, defaults.strictHotkeyModifiers),
    minimizeToTray: sanitizeBoolean(saved.minimizeToTray, defaults.minimizeToTray),
    showSessionClickCountInTitle: sanitizeBoolean(
      saved.showSessionClickCountInTitle,
      defaults.showSessionClickCountInTitle,
    ),
    showSessionElapsedInTitle: sanitizeBoolean(
      saved.showSessionElapsedInTitle,
      defaults.showSessionElapsedInTitle,
    ),
    alwaysOnTop: sanitizeBoolean(saved.alwaysOnTop, defaults.alwaysOnTop),
    accentColor: sanitizeHexColor(saved.accentColor, defaults.accentColor),
    presets,
    activePresetId:
      typeof saved.activePresetId === "string" &&
      presets.some((preset) => preset.id === saved.activePresetId)
        ? saved.activePresetId
        : null,
  };
}
