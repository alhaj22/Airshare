use crate::platform::{detect_linux_display_server, LinuxDisplayServer, MonitorInfo};
use std::process::Command;

pub fn get_monitors() -> Vec<MonitorInfo> {
    let mut monitors = Vec::new();
    let srv = detect_linux_display_server();

    // 1. If X11 is running, query xrandr --verbose
    if srv == LinuxDisplayServer::X11 {
        if let Ok(output) = Command::new("xrandr").args(["--verbose"]).output() {
            let s = String::from_utf8_lossy(&output.stdout);
            let mut curr_name = String::new();
            let mut is_primary = false;
            let mut width = 1920;
            let mut height = 1080;
            let mut refresh = 60;
            let mut idx = 1;

            for line in s.lines() {
                if line.contains(" connected ") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if !parts.is_empty() {
                        curr_name = parts[0].to_string();
                        is_primary = line.contains("primary");

                        // Look for resolution like "1920x1080+0+0"
                        for p in &parts {
                            if p.contains('x') && p.contains('+') {
                                let dims: Vec<&str> = p.split('+').collect();
                                if !dims.is_empty() {
                                    let wh: Vec<&str> = dims[0].split('x').collect();
                                    if wh.len() >= 2 {
                                        width = wh[0].parse::<u32>().unwrap_or(1920);
                                        height = wh[1].parse::<u32>().unwrap_or(1080);
                                    }
                                }
                            }
                        }
                    }
                } else if line.contains('*') && !curr_name.is_empty() {
                    // Refresh rate line: e.g. "   1920x1080     60.00*+  50.00"
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    for p in parts {
                        if p.contains('*') {
                            let clean = p.trim_matches('*').trim_matches('+');
                            if let Ok(val) = clean.parse::<f32>() {
                                refresh = val.round() as u32;
                            }
                        }
                    }

                    monitors.push(MonitorInfo {
                        id: format!("linux-disp-{}", idx),
                        name: curr_name.clone(),
                        is_primary,
                        x: 0,
                        y: 0,
                        width,
                        height,
                        refresh_rate: refresh,
                        scale_factor: 1.0,
                        orientation: "Landscape".to_string(),
                        manufacturer: "Generic Linux Monitor".to_string(),
                        model: curr_name.clone(),
                        serial_number: format!("LNX-DISP-{:04}", idx),
                        ddc_ci_supported: true,
                        current_brightness: Some(100),
                        current_contrast: Some(75),
                    });
                    idx += 1;
                    curr_name.clear();
                }
            }
        }
    }

    // 2. Wayland or fallback to /sys/class/drm
    if monitors.is_empty() {
        if let Ok(entries) = std::fs::read_dir("/sys/class/drm") {
            let mut idx = 1;
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("card0-") && !name.ends_with("-Virtual") {
                    let status_path = entry.path().join("status");
                    if let Ok(st) = std::fs::read_to_string(status_path) {
                        if st.trim() == "connected" {
                            let clean_name = name.trim_start_matches("card0-").to_string();
                            let is_primary = idx == 1;

                            let mut w = 1920;
                            let mut h = 1080;
                            let modes_path = entry.path().join("modes");
                            if let Ok(modes) = std::fs::read_to_string(modes_path) {
                                if let Some(first_mode) = modes.lines().next() {
                                    let parts: Vec<&str> = first_mode.split('x').collect();
                                    if parts.len() >= 2 {
                                        w = parts[0].trim().parse::<u32>().unwrap_or(1920);
                                        h = parts[1].trim().parse::<u32>().unwrap_or(1080);
                                    }
                                }
                            }

                            monitors.push(MonitorInfo {
                                id: format!("linux-drm-{}", idx),
                                name: clean_name.clone(),
                                is_primary,
                                x: 0,
                                y: 0,
                                width: w,
                                height: h,
                                refresh_rate: 60,
                                scale_factor: 1.0,
                                orientation: "Landscape".to_string(),
                                manufacturer: "Linux DRM Display".to_string(),
                                model: clean_name,
                                serial_number: format!("DRM-{:04}", idx),
                                ddc_ci_supported: true,
                                current_brightness: Some(100),
                                current_contrast: Some(75),
                            });
                            idx += 1;
                        }
                    }
                }
            }
        }
    }

    if monitors.is_empty() {
        monitors.push(MonitorInfo {
            id: "linux-display-default".to_string(),
            name: "Primary Monitor".to_string(),
            is_primary: true,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            refresh_rate: 60,
            scale_factor: 1.0,
            orientation: "Landscape".to_string(),
            manufacturer: "Generic".to_string(),
            model: "Display".to_string(),
            serial_number: "LNX-DEFAULT-01".to_string(),
            ddc_ci_supported: false,
            current_brightness: Some(100),
            current_contrast: Some(75),
        });
    }

    monitors
}

pub fn set_brightness(_monitor_id: &str, val: u32) -> Result<(), String> {
    // 1. Try ddcutil if available
    let res = Command::new("ddcutil")
        .args(["setvcp", "10", &val.to_string()])
        .output();

    if let Ok(out) = res {
        if out.status.success() {
            return Ok(());
        }
    }

    // 2. Try sysfs laptop backlight
    if let Ok(entries) = std::fs::read_dir("/sys/class/backlight") {
        for entry in entries.flatten() {
            let max_path = entry.path().join("max_brightness");
            let cur_path = entry.path().join("brightness");
            if let Ok(max_str) = std::fs::read_to_string(max_path) {
                if let Ok(max_val) = max_str.trim().parse::<u32>() {
                    let target = (max_val as f32 * (val as f32 / 100.0)).round() as u32;
                    let _ = std::fs::write(cur_path, target.to_string());
                    return Ok(());
                }
            }
        }
    }

    Err("Could not set brightness on Linux (ddcutil or /sys/class/backlight write permission needed)".to_string())
}

pub fn set_contrast(_monitor_id: &str, val: u32) -> Result<(), String> {
    let _ = Command::new("ddcutil")
        .args(["setvcp", "12", &val.to_string()])
        .output();
    Ok(())
}

pub fn set_input_source(_monitor_id: &str, source: u32) -> Result<(), String> {
    let _ = Command::new("ddcutil")
        .args(["setvcp", "60", &source.to_string()])
        .output();
    Ok(())
}
