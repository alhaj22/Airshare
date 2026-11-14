use crate::platform::SystemHardwareMetrics;
use std::process::Command;

pub fn get_hardware() -> SystemHardwareMetrics {
    // 1. CPU name & cores
    let cpu_name = Command::new("sysctl")
        .args(["-n", "machdep.cpu.brand_string"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Apple Silicon".to_string());

    let cpu_cores = Command::new("sysctl")
        .args(["-n", "hw.ncpu"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse::<u32>().ok())
        .unwrap_or(8);

    // 2. RAM
    let total_ram = Command::new("sysctl")
        .args(["-n", "hw.memsize"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse::<u64>().ok())
        .map(|bytes| bytes / (1024 * 1024))
        .unwrap_or(16384);

    let avail_ram = total_ram / 2; // Approximation on macOS

    // 3. Battery
    let mut battery_pct: Option<u8> = None;
    let mut is_charging: Option<bool> = None;
    if let Ok(output) = Command::new("pmset").args(["-g", "batt"]).output() {
        let s = String::from_utf8_lossy(&output.stdout);
        for line in s.lines() {
            if line.contains('%') {
                if let Some(pct_idx) = line.find('%') {
                    let before = &line[..pct_idx];
                    if let Some(space_idx) = before.rfind(|c: char| c.is_whitespace() || c == '\t') {
                        if let Ok(val) = before[space_idx + 1..].parse::<u8>() {
                            battery_pct = Some(val);
                        }
                    }
                }
                is_charging = Some(line.contains("charging") || line.contains("AC attached"));
            }
        }
    }

    // 4. OS Version
    let os_ver = Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .map(|o| format!("macOS {}", String::from_utf8_lossy(&o.stdout).trim()))
        .unwrap_or_else(|_| "macOS".to_string());

    SystemHardwareMetrics {
        cpu_name,
        cpu_cores,
        total_ram_mb: total_ram,
        available_ram_mb: avail_ram,
        gpu_name: "Apple Integrated GPU".to_string(),
        battery_percentage: battery_pct,
        is_charging,
        os_name: "macOS".to_string(),
        os_version: os_ver,
        architecture: std::env::consts::ARCH.to_string(),
        display_server: Some("Quartz WindowServer".to_string()),
    }
}
