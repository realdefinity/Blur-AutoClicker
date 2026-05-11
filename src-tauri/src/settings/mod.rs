#[derive(Clone, serde::Deserialize, serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SequencePoint {
    pub x: i32,
    pub y: i32,
    #[serde(default = "default_sequence_point_clicks")]
    pub clicks: u16,
}

fn default_sequence_point_clicks() -> u16 {
    1
}

#[derive(Clone, serde::Deserialize, serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ClickerSettings {
    pub version: u32,
    pub click_speed: f64,
    pub click_interval: String,
    pub rate_input_mode: String,
    pub duration_hours: u32,
    pub duration_minutes: u32,
    pub duration_seconds: u32,
    pub duration_milliseconds: u32,
    pub mouse_button: String,
    pub mode: String,
    pub hotkey: String,
    #[serde(default)]
    pub pause_hotkey: String,
    pub duty_cycle_enabled: bool,
    pub duty_cycle: f64,
    pub speed_variation_enabled: bool,
    pub speed_variation: f64,
    #[serde(default = "default_smart_performance_enabled")]
    pub smart_performance_enabled: bool,
    pub double_click_enabled: bool,
    pub double_click_delay: u32,
    pub click_limit_enabled: bool,
    pub click_limit: i32,
    pub time_limit_enabled: bool,
    pub time_limit: f64,
    pub time_limit_unit: String,
    pub corner_stop_enabled: bool,
    #[serde(rename = "cornerStopTL")]
    pub corner_stop_tl: i32,
    #[serde(rename = "cornerStopTR")]
    pub corner_stop_tr: i32,
    #[serde(rename = "cornerStopBL")]
    pub corner_stop_bl: i32,
    #[serde(rename = "cornerStopBR")]
    pub corner_stop_br: i32,
    pub edge_stop_enabled: bool,
    pub edge_stop_top: i32,
    pub edge_stop_right: i32,
    pub edge_stop_bottom: i32,
    pub edge_stop_left: i32,
    pub sequence_enabled: bool,
    pub sequence_points: Vec<SequencePoint>,
    pub custom_stop_zone_enabled: bool,
    pub custom_stop_zone_x: i32,
    pub custom_stop_zone_y: i32,
    pub custom_stop_zone_width: i32,
    pub custom_stop_zone_height: i32,
    pub disable_screenshots: bool,
    pub advanced_settings_enabled: bool,
    pub last_panel: String,
    pub show_stop_reason: bool,
    pub show_stop_overlay: bool,
    pub strict_hotkey_modifiers: bool,
    #[serde(default)]
    pub burst_mode_enabled: bool,
    #[serde(default = "default_burst_clicks_before_rest")]
    pub burst_clicks_before_rest: u32,
    #[serde(default = "default_burst_rest_ms")]
    pub burst_rest_ms: u32,
    #[serde(default)]
    pub ramp_up_seconds: f64,
    #[serde(default)]
    pub ramp_down_seconds: f64,
    #[serde(default)]
    pub schedule_enabled: bool,
    #[serde(default = "default_schedule_phase1_seconds")]
    pub schedule_phase1_seconds: f64,
    #[serde(default = "default_schedule_phase1_mult")]
    pub schedule_phase1_speed_mult: f64,
    #[serde(default = "default_schedule_phase2_seconds")]
    pub schedule_phase2_seconds: f64,
    #[serde(default = "default_schedule_phase2_mult")]
    pub schedule_phase2_speed_mult: f64,
    #[serde(default)]
    pub fixed_hold_enabled: bool,
    #[serde(default = "default_fixed_hold_ms")]
    pub fixed_hold_ms: u32,
    #[serde(default = "default_clicks_per_gesture")]
    pub clicks_per_gesture: u8,
    #[serde(default)]
    pub alternate_buttons_enabled: bool,
    #[serde(default)]
    pub cursor_jitter_px: i32,
    #[serde(default)]
    pub one_shot_enabled: bool,
    #[serde(default = "default_one_shot_clicks")]
    pub one_shot_click_count: i32,
    #[serde(default)]
    pub click_with_ctrl: bool,
    #[serde(default)]
    pub click_with_shift: bool,
    #[serde(default)]
    pub click_with_alt: bool,
    #[serde(default)]
    pub grid_click_enabled: bool,
    #[serde(default = "default_grid_cols")]
    pub grid_cols: u32,
    #[serde(default = "default_grid_rows")]
    pub grid_rows: u32,
    #[serde(default = "default_grid_spacing")]
    pub grid_spacing_px: i32,
    #[serde(default)]
    pub line_path_enabled: bool,
    #[serde(default = "default_line_steps")]
    pub line_steps: u32,
    #[serde(default = "default_line_end_x")]
    pub line_end_offset_x: i32,
    #[serde(default)]
    pub line_end_offset_y: i32,
    #[serde(default)]
    pub screen_trigger_enabled: bool,
    #[serde(default = "default_screen_trigger_mode")]
    pub screen_trigger_mode: String,
    #[serde(default)]
    pub screen_trigger_x: i32,
    #[serde(default)]
    pub screen_trigger_y: i32,
    #[serde(default = "default_screen_trigger_dim")]
    pub screen_trigger_width: i32,
    #[serde(default = "default_screen_trigger_dim")]
    pub screen_trigger_height: i32,
    #[serde(default)]
    pub screen_trigger_ref_r: u8,
    #[serde(default)]
    pub screen_trigger_ref_g: u8,
    #[serde(default)]
    pub screen_trigger_ref_b: u8,
    #[serde(default = "default_screen_trigger_tolerance")]
    pub screen_trigger_tolerance: f64,
    #[serde(default = "default_screen_trigger_change")]
    pub screen_trigger_change_sensitivity: f64,
    #[serde(default)]
    pub screen_trigger_has_reference: bool,
}

fn default_burst_clicks_before_rest() -> u32 {
    5
}

fn default_smart_performance_enabled() -> bool {
    true
}

fn default_burst_rest_ms() -> u32 {
    200
}

fn default_schedule_phase1_seconds() -> f64 {
    10.0
}

fn default_schedule_phase1_mult() -> f64 {
    0.5
}

fn default_schedule_phase2_seconds() -> f64 {
    60.0
}

fn default_schedule_phase2_mult() -> f64 {
    1.0
}

fn default_fixed_hold_ms() -> u32 {
    40
}

fn default_clicks_per_gesture() -> u8 {
    1
}

fn default_one_shot_clicks() -> i32 {
    100
}

fn default_grid_cols() -> u32 {
    3
}

fn default_grid_rows() -> u32 {
    3
}

fn default_grid_spacing() -> i32 {
    40
}

fn default_line_steps() -> u32 {
    10
}

fn default_line_end_x() -> i32 {
    200
}

fn default_screen_trigger_mode() -> String {
    "whileMatch".to_string()
}

fn default_screen_trigger_dim() -> i32 {
    32
}

fn default_screen_trigger_tolerance() -> f64 {
    18.0
}

fn default_screen_trigger_change() -> f64 {
    12.0
}

impl Default for ClickerSettings {
    fn default() -> Self {
        Self {
            version: 10,
            click_speed: 25.0,
            click_interval: "s".to_string(),
            rate_input_mode: "rate".to_string(),
            duration_hours: 0,
            duration_minutes: 0,
            duration_seconds: 0,
            duration_milliseconds: 40,
            mouse_button: "Left".to_string(),
            mode: "Toggle".to_string(),
            hotkey: "ctrl+y".to_string(),
            pause_hotkey: String::new(),
            duty_cycle_enabled: true,
            duty_cycle: 45.0,
            speed_variation_enabled: true,
            speed_variation: 35.0,
            smart_performance_enabled: true,
            double_click_enabled: false,
            double_click_delay: 40,
            click_limit_enabled: false,
            click_limit: 1000,
            time_limit_enabled: false,
            time_limit: 60.0,
            time_limit_unit: "s".to_string(),
            corner_stop_enabled: true,
            corner_stop_tl: 50,
            corner_stop_tr: 50,
            corner_stop_bl: 50,
            corner_stop_br: 50,
            edge_stop_enabled: true,
            edge_stop_top: 40,
            edge_stop_right: 40,
            edge_stop_bottom: 40,
            edge_stop_left: 40,
            sequence_enabled: false,
            sequence_points: Vec::new(),
            custom_stop_zone_enabled: false,
            custom_stop_zone_x: 0,
            custom_stop_zone_y: 0,
            custom_stop_zone_width: 100,
            custom_stop_zone_height: 100,
            disable_screenshots: false,
            advanced_settings_enabled: true,
            last_panel: "simple".to_string(),
            show_stop_reason: true,
            show_stop_overlay: true,
            strict_hotkey_modifiers: false,
            burst_mode_enabled: false,
            burst_clicks_before_rest: default_burst_clicks_before_rest(),
            burst_rest_ms: default_burst_rest_ms(),
            ramp_up_seconds: 0.0,
            ramp_down_seconds: 0.0,
            schedule_enabled: false,
            schedule_phase1_seconds: default_schedule_phase1_seconds(),
            schedule_phase1_speed_mult: default_schedule_phase1_mult(),
            schedule_phase2_seconds: default_schedule_phase2_seconds(),
            schedule_phase2_speed_mult: default_schedule_phase2_mult(),
            fixed_hold_enabled: false,
            fixed_hold_ms: default_fixed_hold_ms(),
            clicks_per_gesture: default_clicks_per_gesture(),
            alternate_buttons_enabled: false,
            cursor_jitter_px: 0,
            one_shot_enabled: false,
            one_shot_click_count: default_one_shot_clicks(),
            click_with_ctrl: false,
            click_with_shift: false,
            click_with_alt: false,
            grid_click_enabled: false,
            grid_cols: default_grid_cols(),
            grid_rows: default_grid_rows(),
            grid_spacing_px: default_grid_spacing(),
            line_path_enabled: false,
            line_steps: default_line_steps(),
            line_end_offset_x: default_line_end_x(),
            line_end_offset_y: 0,
            screen_trigger_enabled: false,
            screen_trigger_mode: default_screen_trigger_mode(),
            screen_trigger_x: 0,
            screen_trigger_y: 0,
            screen_trigger_width: default_screen_trigger_dim(),
            screen_trigger_height: default_screen_trigger_dim(),
            screen_trigger_ref_r: 0,
            screen_trigger_ref_g: 0,
            screen_trigger_ref_b: 0,
            screen_trigger_tolerance: default_screen_trigger_tolerance(),
            screen_trigger_change_sensitivity: default_screen_trigger_change(),
            screen_trigger_has_reference: false,
        }
    }
}
