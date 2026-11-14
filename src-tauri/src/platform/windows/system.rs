use crate::platform::SystemHardwareMetrics;
use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
use windows_sys::Win32::Graphics::Gdi::{EnumDisplayDevicesW, DISPLAY_DEVICEW};

pub fn get_hardware() -> SystemHardwareMetrics {
    // 1. RAM info
    let (total_ram, avail_ram) = unsafe {
        let mut mem: MEMORYSTATUSEX = std::mem::zeroed();
        mem.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
        if GlobalMemoryStatusEx(&mut mem) != 0 {
            (mem.ullTotalPhys / (1024 * 1024), mem.ullAvailPhys / (1024 * 1024))
        } else {
            (16384, 8192)
        }
    };

    // 2. Battery info
    let (battery_pct, is_charging) = unsafe {
        let mut pwr: SYSTEM_POWER_STATUS = std::mem::zeroed();
        if GetSystemPowerStatus(&mut pwr) != 0 && pwr.BatteryLifePercent != 255 {
            let pct = pwr.BatteryLifePercent.min(100);
            let charging = (pwr.BatteryFlag & 8) != 0 || pwr.ACLineStatus == 1;
            (Some(pct), Some(charging))
        } else {
            (None, None)
        }
    };

    // 3. CPU info
    let (cpu_name, cpu_cores) = {
        let cores = std::thread::available_parallelism()
            .map(|n| n.get() as u32)
            .unwrap_or(4);

        // Read CPU name from Windows Registry
        let mut name = "x86_64 Processor".to_string();
        use std::process::Command;
        if let Ok(output) = Command::new("cmd")
            .args(["/c", "echo %PROCESSOR_IDENTIFIER%"])
            .output()
        {
            let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !s.is_empty() {
                name = s;
            }
        }
        (name, cores)
    };

    // 4. GPU info via EnumDisplayDevicesW
    let gpu_name = unsafe {
        let mut disp: DISPLAY_DEVICEW = std::mem::zeroed();
        disp.cb = std::mem::size_of::<DISPLAY_DEVICEW>() as u32;
        let mut found_name = "Integrated Graphics Adapter".to_string();

        if EnumDisplayDevicesW(std::ptr::null(), 0, &mut disp, 0) != 0 {
            let str_val = String::from_utf16_lossy(&disp.DeviceString)
                .trim_matches('\0')
                .to_string();
            if !str_val.is_empty() {
                found_name = str_val;
            }
        }
        found_name
    };

    // 5. OS Version
    let os_ver = {
        let mut v = "Windows 10/11".to_string();
        use std::process::Command;
        if let Ok(output) = Command::new("cmd").args(["/c", "ver"]).output() {
            let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !s.is_empty() {
                v = s;
            }
        }
        v
    };

    SystemHardwareMetrics {
        cpu_name,
        cpu_cores,
        total_ram_mb: total_ram,
        available_ram_mb: avail_ram,
        gpu_name,
        battery_percentage: battery_pct,
        is_charging,
        os_name: "Windows".to_string(),
        os_version: os_ver,
        architecture: std::env::consts::ARCH.to_string(),
        display_server: None,
    }
}
