use crate::platform::{detect_linux_display_server, LinuxDisplayServer, SystemHardwareMetrics};

pub fn get_hardware() -> SystemHardwareMetrics {
    // 1. CPU
    let mut cpu_name = "Linux Processor".to_string();
    let mut cpu_cores = 1;
    if let Ok(content) = std::fs::read_to_string("/proc/cpuinfo") {
        let mut count = 0;
        for line in content.lines() {
            if line.starts_with("model name") {
                if let Some(pos) = line.find(':') {
                    cpu_name = line[pos + 1..].trim().to_string();
                }
                count += 1;
            }
        }
        if count > 0 {
            cpu_cores = count;
        }
    }

    // 2. RAM
    let mut total_ram = 8192;
    let mut avail_ram = 4096;
    if let Ok(content) = std::fs::read_to_string("/proc/meminfo") {
        for line in content.lines() {
            if line.starts_with("MemTotal:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(kb) = parts[1].parse::<u64>() {
                        total_ram = kb / 1024;
                    }
                }
            } else if line.starts_with("MemAvailable:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(kb) = parts[1].parse::<u64>() {
                        avail_ram = kb / 1024;
                    }
                }
            }
        }
    }

    // 3. Battery
    let mut battery_pct: Option<u8> = None;
    let mut is_charging: Option<bool> = None;
    if let Ok(entries) = std::fs::read_dir("/sys/class/power_supply") {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("BAT") {
                let cap_path = entry.path().join("capacity");
                if let Ok(s) = std::fs::read_to_string(cap_path) {
                    if let Ok(pct) = s.trim().parse::<u8>() {
                        battery_pct = Some(pct);
                    }
                }
                let st_path = entry.path().join("status");
                if let Ok(s) = std::fs::read_to_string(st_path) {
                    is_charging = Some(s.trim().eq_ignore_ascii_case("Charging"));
                }
                break;
            }
        }
    }

    // 4. OS Version from /etc/os-release
    let mut os_ver = "Linux".to_string();
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        for line in content.lines() {
            if line.starts_with("PRETTY_NAME=") {
                os_ver = line.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string();
                break;
            }
        }
    }

    let display_server_name = match detect_linux_display_server() {
        LinuxDisplayServer::Wayland => "Wayland",
        LinuxDisplayServer::X11 => "X11",
        LinuxDisplayServer::None => "Console/Headless",
    };

    SystemHardwareMetrics {
        cpu_name,
        cpu_cores,
        total_ram_mb: total_ram,
        available_ram_mb: avail_ram,
        gpu_name: "Linux GPU Driver".to_string(),
        battery_percentage: battery_pct,
        is_charging,
        os_name: "Linux".to_string(),
        os_version: os_ver,
        architecture: std::env::consts::ARCH.to_string(),
        display_server: Some(display_server_name.to_string()),
    }
}
