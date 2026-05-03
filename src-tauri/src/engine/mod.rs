pub mod failsafe;
pub mod mouse;
pub mod rng;
pub mod screen_trigger;
pub mod stats;
pub mod worker;
use std::sync::atomic::AtomicI64;
pub use worker::start_clicker;

use self::mouse::VirtualScreenRect;
use self::screen_trigger::ScreenTriggerConfig;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SequenceTarget {
    pub x: i32,
    pub y: i32,
    pub clicks: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PathMode {
    None,
    Sequence,
    Grid,
    Line,
}

#[derive(Clone, Debug)]
pub struct ClickerConfig {
    pub base_interval_secs: f64,
    pub variation: f64,
    pub limit: i32,
    pub duty: f64,
    pub time_limit: f64,
    pub button: i32,
    pub double_click_enabled: bool,
    pub double_click_delay_ms: u32,
    pub sequence_points: Vec<SequenceTarget>,
    pub offset: f64,
    pub offset_chance: f64,
    pub smoothing: i32,
    pub custom_stop_zone_enabled: bool,
    pub custom_stop_zone: VirtualScreenRect,
    pub corner_stop_enabled: bool,
    pub corner_stop_tl: i32,
    pub corner_stop_tr: i32,
    pub corner_stop_bl: i32,
    pub corner_stop_br: i32,
    pub edge_stop_enabled: bool,
    pub edge_stop_top: i32,
    pub edge_stop_right: i32,
    pub edge_stop_bottom: i32,
    pub edge_stop_left: i32,
    pub path_mode: PathMode,
    pub grid_cols: u32,
    pub grid_rows: u32,
    pub grid_spacing_px: i32,
    pub line_steps: u32,
    pub line_end_dx: i32,
    pub line_end_dy: i32,
    pub clicks_per_gesture: u8,
    pub burst_mode_enabled: bool,
    pub burst_clicks_before_rest: u32,
    pub burst_rest_ms: u32,
    pub ramp_up_seconds: f64,
    pub ramp_down_seconds: f64,
    pub schedule_enabled: bool,
    pub schedule_phase1_seconds: f64,
    pub schedule_phase1_mult: f64,
    pub schedule_phase2_seconds: f64,
    pub schedule_phase2_mult: f64,
    pub fixed_hold_enabled: bool,
    pub fixed_hold_ms: u32,
    pub alternate_buttons: bool,
    pub click_with_ctrl: bool,
    pub click_with_shift: bool,
    pub click_with_alt: bool,
    pub cursor_jitter_px: i32,
    pub screen_trigger: ScreenTriggerConfig,
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct RunOutcome {
    pub stop_reason: String,
    pub click_count: i64,
    pub elapsed_secs: f64,
    pub avg_cpu: f64,
}
static CLICK_COUNT: AtomicI64 = AtomicI64::new(0);

#[link(name = "ntdll")]
extern "system" {
    fn NtSetTimerResolution(
        DesiredResolution: u32,
        SetResolution: u8,
        CurrentResolution: *mut u32,
    ) -> u32;
}
