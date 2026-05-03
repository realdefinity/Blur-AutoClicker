use std::f64::consts::PI;
use std::sync::atomic::Ordering;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager};

use crate::engine::start_clicker as engine_start;
use crate::engine::stats::{print_run_stats, record_run};
use crate::ClickerSettings;
use crate::ClickerState;
use crate::ClickerStatusPayload;
use crate::STATUS_EVENT;

use super::failsafe::should_stop_for_failsafe;
use super::mouse::{
    get_button_flags, get_cursor_pos, move_mouse, send_batch, send_physical_clicks, smooth_move,
    VirtualScreenRect,
};
use super::PathMode;
use super::rng::SmallRng;
use super::ClickerConfig;
use super::NtSetTimerResolution;
use super::RunOutcome;
use super::SequenceTarget;
use super::CLICK_COUNT;

// -- CPU measurement --
// changed from normal cpu measurement because it was not accurately
// showing cpu usage for short clicker run times.

windows_targets::link!(
    "kernel32.dll" "system" fn QueryThreadCycleTime(thread: *mut core::ffi::c_void, cycles: *mut u64) -> i32
);
windows_targets::link!(
    "kernel32.dll" "system" fn GetCurrentThread() -> *mut core::ffi::c_void
);

#[inline]
fn thread_cycles() -> u64 {
    let mut cycles: u64 = 0;
    unsafe {
        QueryThreadCycleTime(GetCurrentThread(), &mut cycles);
    }
    cycles
}

impl ClickerConfig {
    pub fn use_sequence(&self) -> bool {
        self.path_mode == PathMode::Sequence && !self.sequence_points.is_empty()
    }
}

// Calibrates the CPU cycle frequency
fn calibrate_cycle_freq() -> f64 {
    let start_cycles = thread_cycles();
    let start = Instant::now();

    // Spin for ~5ms
    while start.elapsed().as_millis() < 5 {
        std::hint::spin_loop();
    }

    let cycle_delta = thread_cycles().saturating_sub(start_cycles);
    let wall_secs = start.elapsed().as_secs_f64();

    if wall_secs > 0.0 && cycle_delta > 0 {
        let freq = cycle_delta as f64 / wall_secs;
        log::info!("CPU: calibrated at {:.0} MHz", freq / 1_000_000.0);
        freq
    } else {
        3_000_000_000.0 // fallback 3 GHz
    }
}

#[derive(Clone)]
pub struct RunControl {
    app: AppHandle,
    expected_generation: u64,
}

impl RunControl {
    pub fn new(app: AppHandle, expected_generation: u64) -> Self {
        Self {
            app,
            expected_generation,
        }
    }

    pub fn is_current_generation(&self) -> bool {
        self.app
            .state::<ClickerState>()
            .run_generation
            .load(Ordering::SeqCst)
            == self.expected_generation
    }

    /// Session is still "on" (worker thread should keep looping) — not stopped by user.
    pub fn session_alive(&self) -> bool {
        let state = self.app.state::<ClickerState>();
        state.running.load(Ordering::SeqCst)
            && state.run_generation.load(Ordering::SeqCst) == self.expected_generation
    }

    /// Clicks and holds should proceed (not paused).
    pub fn is_active(&self) -> bool {
        let state = self.app.state::<ClickerState>();
        self.session_alive() && !state.paused.load(Ordering::SeqCst)
    }

    pub fn sleep_for_session(&self, remaining: Duration) {
        let tick = Duration::from_millis(5);
        let mut acc = Duration::ZERO;
        while self.session_alive() && acc < remaining {
            while self.session_alive() && !self.is_active() {
                std::thread::sleep(Duration::from_millis(12));
            }
            if !self.session_alive() {
                return;
            }
            let slice = tick.min(remaining.saturating_sub(acc));
            if slice.is_zero() {
                return;
            }
            std::thread::sleep(slice);
            acc += slice;
        }
    }
}

pub fn start_clicker_inner(app: &AppHandle) -> Result<ClickerStatusPayload, String> {
    let state = app.state::<ClickerState>();
    if state.running.load(Ordering::SeqCst) {
        return Err(String::from("Clicker is already running"));
    }

    {
        *state.last_error.lock().unwrap() = None;
        *state.stop_reason.lock().unwrap() = None;
    }

    state.paused.store(false, Ordering::SeqCst);

    let settings = state.settings.lock().unwrap().clone();
    let config = build_config(&settings)?;
    if config.use_sequence() {
        state.active_sequence_index.store(0, Ordering::SeqCst);
    }
    let expected_generation = state.run_generation.fetch_add(1, Ordering::SeqCst) + 1;
    state.running.store(true, Ordering::SeqCst);
    let control = RunControl::new(app.clone(), expected_generation);
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let outcome = engine_start(config, control.clone());

        print_run_stats(outcome.click_count, outcome.elapsed_secs, outcome.avg_cpu);
        record_run(outcome.click_count, outcome.elapsed_secs, outcome.avg_cpu);

        if !control.is_current_generation() {
            return;
        }

        let state = app_handle.state::<ClickerState>();
        state.running.store(false, Ordering::SeqCst);
        state.active_sequence_index.store(-1, Ordering::SeqCst);

        *state.stop_reason.lock().unwrap() = Some(outcome.stop_reason.clone());
        *state.last_error.lock().unwrap() = None;
        emit_status(&app_handle);
    });

    let payload = current_status(app);
    emit_status(app);
    Ok(payload)
}
pub fn stop_clicker_inner(
    app: &AppHandle,
    stop_reason: Option<String>,
) -> Result<ClickerStatusPayload, String> {
    let state = app.state::<ClickerState>();
    state.paused.store(false, Ordering::SeqCst);
    state.running.store(false, Ordering::SeqCst);
    state.active_sequence_index.store(-1, Ordering::SeqCst);
    state.run_generation.fetch_add(1, Ordering::SeqCst);
    if let Some(reason) = stop_reason {
        *state.stop_reason.lock().unwrap() = Some(reason);
    }
    let payload = current_status(app);
    emit_status(app);
    Ok(payload)
}

fn duration_interval_secs(settings: &ClickerSettings) -> f64 {
    let total_millis = u64::from(settings.duration_hours) * 3_600_000
        + u64::from(settings.duration_minutes) * 60_000
        + u64::from(settings.duration_seconds) * 1_000
        + u64::from(settings.duration_milliseconds);
    (total_millis.max(1) as f64) / 1000.0
}

fn interval_secs_from_settings(settings: &ClickerSettings) -> Result<f64, String> {
    if settings.rate_input_mode == "duration" {
        return Ok(duration_interval_secs(settings));
    }

    if settings.click_speed <= 0.0 {
        return Err(String::from("Click speed must be greater than zero"));
    }

    Ok(match settings.click_interval.as_str() {
        "m" => 60.0 / settings.click_speed,
        "h" => 3600.0 / settings.click_speed,
        "d" => 86400.0 / settings.click_speed,
        _ => 1.0 / settings.click_speed,
    })
}

fn current_cycle_target(config: &ClickerConfig, sequence_index: usize) -> SequenceTarget {
    if config.use_sequence() {
        let safe_index = sequence_index % config.sequence_points.len();
        config.sequence_points[safe_index]
    } else {
        let (x, y) = get_cursor_pos();
        SequenceTarget { x, y, clicks: 1 }
    }
}

fn effective_clicks_per_gesture(settings: &ClickerSettings) -> u8 {
    let mut cpg = settings.clicks_per_gesture.max(1).min(5);
    if cpg == 1 && settings.double_click_enabled {
        cpg = 2;
    }
    cpg
}

fn path_mode_from_settings(settings: &ClickerSettings) -> PathMode {
    if settings.sequence_enabled && !settings.sequence_points.is_empty() {
        PathMode::Sequence
    } else if settings.grid_click_enabled {
        PathMode::Grid
    } else if settings.line_path_enabled {
        PathMode::Line
    } else {
        PathMode::None
    }
}

fn merge_click_limit(settings: &ClickerSettings) -> i32 {
    let mut limit = if settings.click_limit_enabled {
        settings.click_limit.max(0)
    } else {
        0
    };
    if settings.one_shot_enabled {
        let cap = settings.one_shot_click_count.max(1);
        limit = if limit == 0 {
            cap
        } else {
            limit.min(cap)
        };
    }
    limit
}

fn build_screen_trigger(settings: &ClickerSettings) -> crate::engine::screen_trigger::ScreenTriggerConfig {
    let mode = crate::engine::screen_trigger::ScreenTriggerMode::from_settings(
        settings.screen_trigger_mode.as_str(),
    )
    .unwrap_or(crate::engine::screen_trigger::ScreenTriggerMode::WhileMatch);
    let tol_scale =
        (settings.screen_trigger_tolerance.clamp(0.0, 100.0) / 100.0) * 441.67_f64;
    let chg_scale = (settings.screen_trigger_change_sensitivity.clamp(0.0, 100.0) / 100.0)
        * 441.67_f64;
    crate::engine::screen_trigger::ScreenTriggerConfig {
        enabled: settings.screen_trigger_enabled,
        has_reference: settings.screen_trigger_has_reference,
        mode,
        x: settings.screen_trigger_x,
        y: settings.screen_trigger_y,
        width: settings.screen_trigger_width,
        height: settings.screen_trigger_height,
        ref_r: settings.screen_trigger_ref_r,
        ref_g: settings.screen_trigger_ref_g,
        ref_b: settings.screen_trigger_ref_b,
        tolerance_distance: tol_scale.max(0.5),
        change_min_distance: chg_scale.max(1.0),
    }
}

fn interval_scale_at_elapsed(config: &ClickerConfig, elapsed: f64) -> f64 {
    let mut scale = 1.0_f64;

    if config.ramp_up_seconds > f64::EPSILON {
        let p = (elapsed / config.ramp_up_seconds).clamp(0.0, 1.0);
        let mult = 0.15 + 0.85 * p;
        scale /= mult.max(0.05);
    }

    if config.schedule_enabled {
        let p1 = config.schedule_phase1_seconds.max(0.0);
        let p2 = config.schedule_phase2_seconds.max(0.0);
        let cycle = p1 + p2;
        if cycle > f64::EPSILON {
            let t = elapsed.rem_euclid(cycle);
            let sm = if t < p1 {
                config.schedule_phase1_mult
            } else {
                config.schedule_phase2_mult
            };
            scale /= sm.max(0.05);
        }
    }

    if config.ramp_down_seconds > f64::EPSILON && config.time_limit > f64::EPSILON {
        let end = config.time_limit;
        if elapsed > end - config.ramp_down_seconds {
            let remain = (end - elapsed).max(0.0);
            let mult = 0.15 + 0.85 * (remain / config.ramp_down_seconds).clamp(0.0, 1.0);
            scale /= mult.max(0.05);
        }
    }

    scale
}

pub fn build_config(settings: &ClickerSettings) -> Result<ClickerConfig, String> {
    let base_interval_secs = interval_secs_from_settings(settings)?;

    let button = match settings.mouse_button.as_str() {
        "Right" => 2,
        "Middle" => 3,
        _ => 1,
    };

    let time_limit_secs = if settings.time_limit_enabled {
        Some(match settings.time_limit_unit.as_str() {
            "m" => settings.time_limit * 60.0,
            "h" => settings.time_limit * 3600.0,
            _ => settings.time_limit,
        })
    } else {
        None
    };

    let path_mode = path_mode_from_settings(settings);
    let cpg = effective_clicks_per_gesture(settings);

    Ok(ClickerConfig {
        base_interval_secs,
        variation: if settings.speed_variation_enabled {
            settings.speed_variation
        } else {
            0.0
        },
        limit: merge_click_limit(settings),
        duty: if settings.duty_cycle_enabled {
            settings.duty_cycle
        } else {
            0.01
        },
        time_limit: time_limit_secs.unwrap_or(0.0),
        button,
        double_click_enabled: settings.double_click_enabled,
        double_click_delay_ms: settings.double_click_delay,
        sequence_points: settings
            .sequence_points
            .iter()
            .map(|point| SequenceTarget {
                x: point.x,
                y: point.y,
                clicks: usize::from(point.clicks.clamp(1, 1000)),
            })
            .collect(),
        offset: 0.0,
        offset_chance: 0.0,
        smoothing: 0,
        custom_stop_zone_enabled: settings.custom_stop_zone_enabled,
        custom_stop_zone: VirtualScreenRect::new(
            settings.custom_stop_zone_x,
            settings.custom_stop_zone_y,
            settings.custom_stop_zone_width.max(1),
            settings.custom_stop_zone_height.max(1),
        ),
        corner_stop_enabled: settings.corner_stop_enabled,
        corner_stop_tl: settings.corner_stop_tl,
        corner_stop_tr: settings.corner_stop_tr,
        corner_stop_bl: settings.corner_stop_bl,
        corner_stop_br: settings.corner_stop_br,
        edge_stop_enabled: settings.edge_stop_enabled,
        edge_stop_top: settings.edge_stop_top,
        edge_stop_right: settings.edge_stop_right,
        edge_stop_bottom: settings.edge_stop_bottom,
        edge_stop_left: settings.edge_stop_left,
        path_mode,
        grid_cols: settings.grid_cols.max(1),
        grid_rows: settings.grid_rows.max(1),
        grid_spacing_px: settings.grid_spacing_px.max(1),
        line_steps: settings.line_steps.max(2),
        line_end_dx: settings.line_end_offset_x,
        line_end_dy: settings.line_end_offset_y,
        clicks_per_gesture: cpg,
        burst_mode_enabled: settings.burst_mode_enabled,
        burst_clicks_before_rest: settings.burst_clicks_before_rest.max(1),
        burst_rest_ms: settings.burst_rest_ms,
        ramp_up_seconds: settings.ramp_up_seconds.max(0.0),
        ramp_down_seconds: settings.ramp_down_seconds.max(0.0),
        schedule_enabled: settings.schedule_enabled,
        schedule_phase1_seconds: settings.schedule_phase1_seconds.max(0.0),
        schedule_phase1_mult: settings.schedule_phase1_speed_mult.clamp(0.05, 5.0),
        schedule_phase2_seconds: settings.schedule_phase2_seconds.max(0.0),
        schedule_phase2_mult: settings.schedule_phase2_speed_mult.clamp(0.05, 5.0),
        fixed_hold_enabled: settings.fixed_hold_enabled,
        fixed_hold_ms: settings.fixed_hold_ms,
        alternate_buttons: settings.alternate_buttons_enabled,
        click_with_ctrl: settings.click_with_ctrl,
        click_with_shift: settings.click_with_shift,
        click_with_alt: settings.click_with_alt,
        cursor_jitter_px: settings.cursor_jitter_px.clamp(0, 80),
        screen_trigger: build_screen_trigger(settings),
    })
}

pub fn current_status(app: &AppHandle) -> ClickerStatusPayload {
    let state = app.state::<ClickerState>();
    let last_error = state.last_error.lock().unwrap().clone();
    let stop_reason = state.stop_reason.lock().unwrap().clone();
    let active_sequence_index = state.active_sequence_index.load(Ordering::SeqCst);

    ClickerStatusPayload {
        running: state.running.load(Ordering::SeqCst),
        paused: state.paused.load(Ordering::SeqCst),
        click_count: get_click_count(),
        last_error,
        stop_reason,
        active_sequence_index: if active_sequence_index >= 0 {
            Some(active_sequence_index as usize)
        } else {
            None
        },
    }
}

pub fn emit_status(app: &AppHandle) {
    let _ = app.emit(STATUS_EVENT, current_status(app));
}

pub fn toggle_clicker_inner(app: &AppHandle) -> Result<ClickerStatusPayload, String> {
    let state = app.state::<ClickerState>();
    if state.running.load(Ordering::SeqCst) {
        stop_clicker_inner(app, Some(String::from("Stopped from hotkey")))
    } else {
        start_clicker_inner(app)
    }
}

pub fn now_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// -- Engine loop --

fn wait_visual_trigger(
    st: &crate::engine::screen_trigger::ScreenTriggerConfig,
    state: &mut crate::engine::screen_trigger::VisualTriggerState,
    control: &RunControl,
) -> bool {
    use crate::engine::screen_trigger::{
        capture_screen_region_mean_rgb, mean_matches_reference, rgb_distance, ScreenTriggerMode,
    };
    if !st.enabled || !st.has_reference {
        return true;
    }
    loop {
        if !control.session_alive() {
            return false;
        }
        while control.session_alive() && !control.is_active() {
            std::thread::sleep(Duration::from_millis(12));
        }
        if !control.session_alive() {
            return false;
        }
        let mean = match capture_screen_region_mean_rgb(st.x, st.y, st.width, st.height) {
            Some(m) => m,
            None => {
                std::thread::sleep(Duration::from_millis(25));
                continue;
            }
        };
        let cur_match = mean_matches_reference(mean, st);
        let proceed = match st.mode {
            ScreenTriggerMode::WhileMatch => cur_match,
            ScreenTriggerMode::OnAppear => {
                let rising = cur_match && !state.prev_match;
                state.prev_match = cur_match;
                rising
            }
            ScreenTriggerMode::OnDisappear => {
                let falling = !cur_match && state.prev_match;
                state.prev_match = cur_match;
                falling
            }
            ScreenTriggerMode::OnChange => {
                if let Some(last) = state.last_mean {
                    let d = rgb_distance(mean, last);
                    state.last_mean = Some(mean);
                    d >= st.change_min_distance
                } else {
                    state.last_mean = Some(mean);
                    false
                }
            }
        };
        if proceed {
            return true;
        }
        std::thread::sleep(Duration::from_millis(16));
    }
}

fn grid_xy(
    anchor_x: i32,
    anchor_y: i32,
    idx: usize,
    cols: u32,
    rows: u32,
    spacing: i32,
) -> (i32, i32) {
    let cols = cols.max(1) as usize;
    let rows = rows.max(1) as usize;
    let total = cols.saturating_mul(rows).max(1);
    let i = idx % total;
    let col = i % cols;
    let row = i / cols;
    (
        anchor_x + col as i32 * spacing,
        anchor_y + row as i32 * spacing,
    )
}

fn line_xy(
    anchor_x: i32,
    anchor_y: i32,
    step: u32,
    steps: u32,
    dx: i32,
    dy: i32,
) -> (i32, i32) {
    let steps = steps.max(2);
    let si = step.min(steps - 1) as f64;
    let t = si / (steps as f64 - 1.0);
    (
        anchor_x + (dx as f64 * t).round() as i32,
        anchor_y + (dy as f64 * t).round() as i32,
    )
}

fn jitter_xy(x: i32, y: i32, px: i32, rng: &mut SmallRng) -> (i32, i32) {
    if px <= 0 {
        return (x, y);
    }
    let jx = ((rng.next_f64() * 2.0 - 1.0) * px as f64).round() as i32;
    let jy = ((rng.next_f64() * 2.0 - 1.0) * px as f64).round() as i32;
    (x + jx, y + jy)
}

pub fn start_clicker(config: ClickerConfig, control: RunControl) -> RunOutcome {
    CLICK_COUNT.store(0, Ordering::SeqCst);

    let mut current = 0u32;
    unsafe { NtSetTimerResolution(10000, 1, &mut current) };

    let cycle_freq = calibrate_cycle_freq();
    let cpu_cycles_start = thread_cycles();
    let start_time = Instant::now();

    let mut rng = SmallRng::new();
    let mut click_count: i64 = 0;
    let cps = if config.base_interval_secs > 0.0 {
        1.0 / config.base_interval_secs
    } else {
        0.0
    };

    let mod_keys = config.click_with_ctrl || config.click_with_shift || config.click_with_alt;
    let batch_size = if config.clicks_per_gesture == 1
        && !config.double_click_enabled
        && !config.alternate_buttons
        && !mod_keys
        && !config.burst_mode_enabled
        && !config.fixed_hold_enabled
        && config.path_mode == PathMode::None
        && cps >= 50.0
    {
        2usize
    } else {
        1usize
    };

    let has_position = config.use_sequence()
        || config.path_mode == PathMode::Grid
        || config.path_mode == PathMode::Line;
    let use_smoothing = config.smoothing == 1 && cps < 50.0;

    let (anchor_x, anchor_y) = get_cursor_pos();
    let mut grid_index: usize = 0;
    let mut line_step: u32 = 0;
    let mut burst_counter: u32 = 0;
    let mut visual_state = crate::engine::screen_trigger::VisualTriggerState::default();

    let mut sequence_index = 0usize;
    let mut cycle_target = current_cycle_target(&config, sequence_index);
    let mut sequence_clicks_remaining = cycle_target.clicks.max(1);

    let (mut target_x, mut target_y) = if config.use_sequence() {
        (cycle_target.x, cycle_target.y)
    } else if config.path_mode == PathMode::Grid {
        grid_xy(
            anchor_x,
            anchor_y,
            grid_index,
            config.grid_cols,
            config.grid_rows,
            config.grid_spacing_px,
        )
    } else if config.path_mode == PathMode::Line {
        line_xy(
            anchor_x,
            anchor_y,
            line_step,
            config.line_steps,
            config.line_end_dx,
            config.line_end_dy,
        )
    } else {
        get_cursor_pos()
    };

    (target_x, target_y) = jitter_xy(target_x, target_y, config.cursor_jitter_px, &mut rng);

    let mut stop_reason = String::from("Stopped");
    let mut last_status_emit = Instant::now();
    let status_emit_interval = Duration::from_millis(100);

    println!("Clicking at: {}, {}", target_x, target_y);

    if has_position {
        move_mouse(target_x, target_y);
    }

    if config.use_sequence() {
        let state = control.app.state::<ClickerState>();
        state
            .active_sequence_index
            .store(sequence_index as i64, Ordering::SeqCst);
        emit_status(&control.app);
    }

    while control.session_alive() {
        while control.session_alive() && !control.is_active() {
            std::thread::sleep(Duration::from_millis(12));
        }
        if !control.session_alive() {
            break;
        }

        if !wait_visual_trigger(&config.screen_trigger, &mut visual_state, &control) {
            break;
        }

        if let Some(reason) = should_stop_for_failsafe(&config) {
            stop_reason = reason;
            break;
        }

        if config.limit > 0 && click_count >= config.limit as i64 {
            stop_reason = format!("Click limit reached ({})", config.limit);
            break;
        }

        if config.time_limit > 0.0 && start_time.elapsed().as_secs_f64() >= config.time_limit {
            stop_reason = format!("Time limit reached ({:.1}s)", config.time_limit);
            break;
        }

        let elapsed = start_time.elapsed().as_secs_f64();
        let scale = interval_scale_at_elapsed(&config, elapsed);
        let cycle_duration_base =
            config.base_interval_secs * scale * batch_size.max(1) as f64;

        cycle_target = current_cycle_target(&config, sequence_index);

        let (base_x, base_y) = if config.use_sequence() {
            (cycle_target.x, cycle_target.y)
        } else if config.path_mode == PathMode::Grid {
            grid_xy(
                anchor_x,
                anchor_y,
                grid_index,
                config.grid_cols,
                config.grid_rows,
                config.grid_spacing_px,
            )
        } else if config.path_mode == PathMode::Line {
            line_xy(
                anchor_x,
                anchor_y,
                line_step,
                config.line_steps,
                config.line_end_dx,
                config.line_end_dy,
            )
        } else {
            get_cursor_pos()
        };

        let (jx, jy) = jitter_xy(base_x, base_y, config.cursor_jitter_px, &mut rng);
        target_x = jx;
        target_y = jy;

        if has_position {
            if config.use_sequence() {
                if config.offset_chance > 0.0 && rng.next_f64() * 100.0 <= config.offset_chance {
                    let angle = rng.next_f64() * 2.0 * PI;
                    let radius = rng.next_f64().sqrt() * config.offset;
                    target_x = (base_x as f64 + radius * angle.cos()) as i32;
                    target_y = (base_y as f64 + radius * angle.sin()) as i32;
                }
            }

            if use_smoothing {
                let (cur_x, cur_y) = get_cursor_pos();
                if cur_x != target_x || cur_y != target_y {
                    let smooth_dur =
                        ((cycle_duration_base * (0.2 + rng.next_f64() * 0.4)) * 1000.0) as u64;
                    smooth_move(
                        cur_x,
                        cur_y,
                        target_x,
                        target_y,
                        smooth_dur.clamp(15, 200),
                        &mut rng,
                    );
                }
            } else {
                move_mouse(target_x, target_y);
            }
        }

        let cpg = config.clicks_per_gesture as usize;
        let per_tick_physical = batch_size.saturating_mul(cpg);

        let remaining_limit = if config.limit > 0 {
            (config.limit as i64 - click_count).max(0) as usize
        } else {
            usize::MAX
        };

        let requested_clicks = if config.use_sequence() {
            sequence_clicks_remaining.min(per_tick_physical)
        } else {
            per_tick_physical
        };

        let clicks_this_cycle = remaining_limit.min(requested_clicks);

        if clicks_this_cycle == 0 {
            stop_reason = format!("Click limit reached ({})", config.limit);
            break;
        }

        let batch_duration = if config.variation > 0.0 {
            let std_dev = cycle_duration_base * (config.variation / 100.0);
            rng.next_gaussian(cycle_duration_base, std_dev)
        } else {
            cycle_duration_base
        };

        let slot_secs = batch_duration / batch_size.max(1) as f64;
        let hold_ms = if config.fixed_hold_enabled {
            config.fixed_hold_ms
        } else {
            (slot_secs * (config.duty.max(0.0) / 100.0) * 1000.0) as u32
        };

        let use_gap = cpg > 1 || config.double_click_enabled;
        let gap_ms = config.double_click_delay_ms;

        let fast_batch = batch_size == 2
            && cpg == 1
            && !config.alternate_buttons
            && !mod_keys
            && !config.burst_mode_enabled
            && hold_ms == 0
            && !use_gap;

        if fast_batch {
            let (df, uf) = get_button_flags(config.button);
            send_batch(df, uf, clicks_this_cycle, hold_ms);
        } else {
            let mut sent_total = 0usize;
            while sent_total < clicks_this_cycle {
                if !control.session_alive() {
                    break;
                }
                let chunk = cpg.min(clicks_this_cycle - sent_total);
                send_physical_clicks(
                    config.button,
                    chunk,
                    hold_ms,
                    gap_ms,
                    use_gap,
                    config.alternate_buttons,
                    config.click_with_ctrl,
                    config.click_with_shift,
                    config.click_with_alt,
                    &control,
                );
                sent_total += chunk;
                if config.burst_mode_enabled && config.burst_clicks_before_rest > 0 {
                    burst_counter = burst_counter.saturating_add(chunk as u32);
                    if burst_counter >= config.burst_clicks_before_rest {
                        burst_counter = 0;
                        control.sleep_for_session(Duration::from_millis(
                            config.burst_rest_ms as u64,
                        ));
                    }
                }
            }
        }

        if !control.session_alive() {
            break;
        }

        click_count += clicks_this_cycle as i64;
        CLICK_COUNT.store(click_count, Ordering::Relaxed);

        if config.burst_mode_enabled
            && config.burst_clicks_before_rest > 0
            && fast_batch
        {
            burst_counter = burst_counter.saturating_add(clicks_this_cycle as u32);
            if burst_counter >= config.burst_clicks_before_rest {
                burst_counter = 0;
                control.sleep_for_session(Duration::from_millis(
                    config.burst_rest_ms as u64,
                ));
            }
        }

        if last_status_emit.elapsed() >= status_emit_interval {
            emit_status(&control.app);
            last_status_emit = Instant::now();
        }

        control.sleep_for_session(Duration::from_secs_f64(batch_duration.max(0.001)));

        if config.path_mode == PathMode::Grid {
            grid_index = grid_index.wrapping_add(1);
        } else if config.path_mode == PathMode::Line {
            let total = config.line_steps.max(2);
            line_step = (line_step + 1) % total;
        }

        if config.use_sequence() {
            sequence_clicks_remaining =
                sequence_clicks_remaining.saturating_sub(clicks_this_cycle);
            if sequence_clicks_remaining == 0 {
                sequence_index = (sequence_index + 1) % config.sequence_points.len();
                sequence_clicks_remaining = config.sequence_points[sequence_index].clicks.max(1);
                let state = control.app.state::<ClickerState>();
                state
                    .active_sequence_index
                    .store(sequence_index as i64, Ordering::SeqCst);
                emit_status(&control.app);
            }
        }
    }

    unsafe { NtSetTimerResolution(10000, 0, &mut current) };

    let elapsed_secs = start_time.elapsed().as_secs_f64();
    let cpu_cycles_end = thread_cycles();
    let cycle_delta = cpu_cycles_end.saturating_sub(cpu_cycles_start);

    let avg_cpu: f64 = if elapsed_secs < 0.001 {
        -1.0
    } else {
        let cpu_seconds = cycle_delta as f64 / cycle_freq;
        let pct = (cpu_seconds / elapsed_secs) * 100.0;
        if pct < 0.001 {
            -1.0
        } else {
            pct
        }
    };

    RunOutcome {
        stop_reason,
        click_count,
        elapsed_secs,
        avg_cpu,
    }
}

pub fn get_click_count() -> i64 {
    CLICK_COUNT.load(Ordering::Relaxed)
}

pub fn sleep_interruptible(remaining: Duration, control: &RunControl) {
    let tick = Duration::from_millis(5);
    let start = Instant::now();
    while control.is_active() && start.elapsed() < remaining {
        let left = remaining.saturating_sub(start.elapsed());
        std::thread::sleep(left.min(tick));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_settings() -> ClickerSettings {
        ClickerSettings::default()
    }

    fn sample_config() -> ClickerConfig {
        ClickerConfig {
            base_interval_secs: 0.04,
            variation: 0.0,
            limit: 0,
            duty: 45.0,
            time_limit: 0.0,
            button: 1,
            double_click_enabled: false,
            double_click_delay_ms: 40,
            sequence_points: Vec::new(),
            offset: 0.0,
            offset_chance: 0.0,
            smoothing: 0,
            custom_stop_zone_enabled: false,
            custom_stop_zone: VirtualScreenRect::new(0, 0, 100, 100),
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
            path_mode: PathMode::None,
            grid_cols: 3,
            grid_rows: 3,
            grid_spacing_px: 40,
            line_steps: 10,
            line_end_dx: 200,
            line_end_dy: 0,
            clicks_per_gesture: 1,
            burst_mode_enabled: false,
            burst_clicks_before_rest: 5,
            burst_rest_ms: 200,
            ramp_up_seconds: 0.0,
            ramp_down_seconds: 0.0,
            schedule_enabled: false,
            schedule_phase1_seconds: 10.0,
            schedule_phase1_mult: 0.5,
            schedule_phase2_seconds: 60.0,
            schedule_phase2_mult: 1.0,
            fixed_hold_enabled: false,
            fixed_hold_ms: 40,
            alternate_buttons: false,
            click_with_ctrl: false,
            click_with_shift: false,
            click_with_alt: false,
            cursor_jitter_px: 0,
            screen_trigger: crate::engine::screen_trigger::ScreenTriggerConfig::default(),
        }
    }

    #[test]
    fn duration_mode_interval_calculation_uses_one_millisecond_minimum() {
        let mut settings = sample_settings();
        settings.rate_input_mode = "duration".to_string();
        settings.duration_hours = 0;

        let interval = interval_secs_from_settings(&settings).expect("duration should work");
        assert!((interval - 0.040).abs() < f64::EPSILON);

        settings.duration_milliseconds = 0;
        let minimum_interval =
            interval_secs_from_settings(&settings).expect("duration should work");
        assert!((minimum_interval - 0.001).abs() < f64::EPSILON);
    }

    #[test]
    fn duration_mode_interval_calculation_handles_multi_part_duration() {
        let mut settings = sample_settings();
        settings.rate_input_mode = "duration".to_string();
        settings.duration_hours = 0;
        settings.duration_minutes = 1;
        settings.duration_seconds = 35;
        settings.duration_milliseconds = 250;

        let interval = interval_secs_from_settings(&settings).expect("duration should work");
        assert!((interval - 95.25).abs() < f64::EPSILON);
    }

    #[test]
    fn sequence_point_rotation_is_round_robin() {
        let mut config = sample_config();
        config.path_mode = PathMode::Sequence;
        config.sequence_points = vec![
            SequenceTarget {
                x: 10,
                y: 10,
                clicks: 1,
            },
            SequenceTarget {
                x: 20,
                y: 20,
                clicks: 1,
            },
        ];

        assert_eq!(
            current_cycle_target(&config, 0),
            SequenceTarget {
                x: 10,
                y: 10,
                clicks: 1
            }
        );
        assert_eq!(
            current_cycle_target(&config, 1),
            SequenceTarget {
                x: 20,
                y: 20,
                clicks: 1
            }
        );
        assert_eq!(
            current_cycle_target(&config, 2),
            SequenceTarget {
                x: 10,
                y: 10,
                clicks: 1
            }
        );
    }
}
