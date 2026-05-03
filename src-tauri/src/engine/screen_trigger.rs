//! Sample screen rectangles and compare mean color to a reference (visual click gate).

use std::mem::zeroed;

use windows_sys::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BI_RGB, BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS, HGDI_OBJ,
    HGDIOBJ,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
};


#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScreenTriggerMode {
    WhileMatch,
    OnAppear,
    OnDisappear,
    OnChange,
}

impl ScreenTriggerMode {
    pub fn from_settings(s: &str) -> Option<Self> {
        match s {
            "whileMatch" => Some(Self::WhileMatch),
            "onAppear" => Some(Self::OnAppear),
            "onDisappear" => Some(Self::OnDisappear),
            "onChange" => Some(Self::OnChange),
            _ => None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct ScreenTriggerConfig {
    pub enabled: bool,
    pub has_reference: bool,
    pub mode: ScreenTriggerMode,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub ref_r: u8,
    pub ref_g: u8,
    pub ref_b: u8,
    /// Max Euclidean RGB distance (0 ~ 441).
    pub tolerance_distance: f64,
    /// Minimum mean RGB distance vs previous frame to count as "change".
    pub change_min_distance: f64,
}

impl Default for ScreenTriggerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            has_reference: false,
            mode: ScreenTriggerMode::WhileMatch,
            x: 0,
            y: 0,
            width: 32,
            height: 32,
            ref_r: 0,
            ref_g: 0,
            ref_b: 0,
            tolerance_distance: 35.0,
            change_min_distance: 18.0,
        }
    }
}

#[derive(Clone, Debug)]
pub struct VisualTriggerState {
    pub prev_match: bool,
    pub last_mean: Option<(u8, u8, u8)>,
}

impl Default for VisualTriggerState {
    fn default() -> Self {
        Self {
            prev_match: false,
            last_mean: None,
        }
    }
}

#[inline]
pub fn rgb_distance(a: (u8, u8, u8), b: (u8, u8, u8)) -> f64 {
    let dr = f64::from(a.0) - f64::from(b.0);
    let dg = f64::from(a.1) - f64::from(b.1);
    let db = f64::from(a.2) - f64::from(b.2);
    (dr * dr + dg * dg + db * db).sqrt()
}

pub fn mean_matches_reference(mean: (u8, u8, u8), cfg: &ScreenTriggerConfig) -> bool {
    rgb_distance(mean, (cfg.ref_r, cfg.ref_g, cfg.ref_b)) <= cfg.tolerance_distance
}

/// Clamp region to virtual screen and enforce max size for safety.
pub fn clamp_region(x: i32, y: i32, w: i32, h: i32) -> Option<(i32, i32, i32, i32)> {
    let vx = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
    let vy = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
    let vw = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
    let vh = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };

    let w = w.max(1).min(512);
    let h = h.max(1).min(512);
    let right = vx.saturating_add(vw);
    let bottom = vy.saturating_add(vh);

    if w > vw || h > vh {
        return None;
    }

    let x = x.max(vx).min(right - w);
    let y = y.max(vy).min(bottom - h);

    if x + w > right || y + h > bottom {
        return None;
    }

    Some((x, y, w, h))
}

/// Capture mean RGB of a screen rectangle. Returns None if GDI fails or region invalid.
pub fn capture_screen_region_mean_rgb(x: i32, y: i32, w: i32, h: i32) -> Option<(u8, u8, u8)> {
    let (x, y, w, h) = clamp_region(x, y, w, h)?;

    unsafe {
        let hdc_screen = GetDC(0);
        if hdc_screen == 0 {
            return None;
        }

        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem == 0 {
            ReleaseDC(0, hdc_screen);
            return None;
        }

        let hbmp = CreateCompatibleBitmap(hdc_screen, w, h);
        if hbmp == 0 {
            DeleteDC(hdc_mem);
            ReleaseDC(0, hdc_screen);
            return None;
        }

        let old = SelectObject(hdc_mem, hbmp as HGDIOBJ);
        let ok = BitBlt(
            hdc_mem,
            0,
            0,
            w,
            h,
            hdc_screen,
            x,
            y,
            0x00CC0020,
        );

        if ok == 0 {
            SelectObject(hdc_mem, old);
            DeleteObject(hbmp as HGDI_OBJ);
            DeleteDC(hdc_mem);
            ReleaseDC(0, hdc_screen);
            return None;
        }

        let mut bmi: BITMAPINFO = zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = w;
        bmi.bmiHeader.biHeight = -h;
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB;

        let px = (w * h) as usize;
        let mut buf: Vec<u8> = vec![0u8; px * 4];

        let lines = GetDIBits(
            hdc_mem,
            hbmp,
            0,
            h as u32,
            buf.as_mut_ptr().cast(),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        SelectObject(hdc_mem, old);
        DeleteObject(hbmp as HGDI_OBJ);
        DeleteDC(hdc_mem);
        ReleaseDC(0, hdc_screen);

        if lines == 0 || buf.is_empty() {
            return None;
        }

        let mut sr: u64 = 0;
        let mut sg: u64 = 0;
        let mut sb: u64 = 0;
        let mut n: u64 = 0;
        let mut i = 0usize;
        while i + 3 < buf.len() {
            let b = buf[i];
            let g = buf[i + 1];
            let r = buf[i + 2];
            sr += u64::from(r);
            sg += u64::from(g);
            sb += u64::from(b);
            n += 1;
            i += 4;
        }

        if n == 0 {
            return None;
        }

        Some((
            (sr / n) as u8,
            (sg / n) as u8,
            (sb / n) as u8,
        ))
    }
}

pub fn sample_reference_rgb(x: i32, y: i32, w: i32, h: i32) -> Option<(u8, u8, u8)> {
    capture_screen_region_mean_rgb(x, y, w, h)
}
