use std::os::raw::c_void;
use crate::platform::MonitorInfo;
use windows_sys::Win32::Foundation::{BOOL, LPARAM, RECT};
use windows_sys::Win32::Graphics::Gdi::{
    EnumDisplayMonitors, EnumDisplaySettingsExW, GetMonitorInfoW,
    DEVMODEW, HDC, HMONITOR, MONITORINFOEXW,
};

const MONITORINFOF_PRIMARY: u32 = 1;

#[repr(C)]
struct PhysicalMonitor {
    h_physical_monitor: *mut c_void,
    sz_physical_monitor_description: [u16; 128],
}

type GetNumberOfPhysicalMonitorsFromHMONITOR = unsafe extern "system" fn(HMONITOR, *mut u32) -> BOOL;
type GetPhysicalMonitorsFromHMONITOR = unsafe extern "system" fn(HMONITOR, u32, *mut PhysicalMonitor) -> BOOL;
type DestroyPhysicalMonitors = unsafe extern "system" fn(u32, *mut PhysicalMonitor) -> BOOL;
type GetMonitorBrightness = unsafe extern "system" fn(*mut c_void, *mut u32, *mut u32, *mut u32) -> BOOL;
type SetMonitorBrightness = unsafe extern "system" fn(*mut c_void, u32) -> BOOL;
type GetVCPFeatureAndVCPFeatureReply = unsafe extern "system" fn(*mut c_void, u8, *mut u32, *mut u32, *mut u32) -> BOOL;
type SetVCPFeature = unsafe extern "system" fn(*mut c_void, u8, u32) -> BOOL;

struct Dxva2Api {
    lib: isize,
    get_num_monitors: GetNumberOfPhysicalMonitorsFromHMONITOR,
    get_physical_monitors: GetPhysicalMonitorsFromHMONITOR,
    destroy_monitors: DestroyPhysicalMonitors,
    get_brightness: GetMonitorBrightness,
    set_brightness: SetMonitorBrightness,
    get_vcp: GetVCPFeatureAndVCPFeatureReply,
    set_vcp: SetVCPFeature,
}

impl Dxva2Api {
    fn load() -> Option<Self> {
        unsafe {
            use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryA};
            let lib = LoadLibraryA(b"dxva2.dll\0".as_ptr());
            if lib == 0 {
                return None;
            }
            let get_num = GetProcAddress(lib, b"GetNumberOfPhysicalMonitorsFromHMONITOR\0".as_ptr())?;
            let get_phys = GetProcAddress(lib, b"GetPhysicalMonitorsFromHMONITOR\0".as_ptr())?;
            let destroy = GetProcAddress(lib, b"DestroyPhysicalMonitors\0".as_ptr())?;
            let get_bright = GetProcAddress(lib, b"GetMonitorBrightness\0".as_ptr())?;
            let set_bright = GetProcAddress(lib, b"SetMonitorBrightness\0".as_ptr())?;
            let get_vcp = GetProcAddress(lib, b"GetVCPFeatureAndVCPFeatureReply\0".as_ptr())?;
            let set_vcp = GetProcAddress(lib, b"SetVCPFeature\0".as_ptr())?;

            Some(Self {
                lib,
                get_num_monitors: std::mem::transmute(get_num),
                get_physical_monitors: std::mem::transmute(get_phys),
                destroy_monitors: std::mem::transmute(destroy),
                get_brightness: std::mem::transmute(get_bright),
                set_brightness: std::mem::transmute(set_bright),
                get_vcp: std::mem::transmute(get_vcp),
                set_vcp: std::mem::transmute(set_vcp),
            })
        }
    }
}

impl Drop for Dxva2Api {
    fn drop(&mut self) {
        unsafe {
            use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, GetModuleHandleA};
            let k32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
            if k32 != 0 {
                if let Some(free_lib) = GetProcAddress(k32, b"FreeLibrary\0".as_ptr()) {
                    let func: unsafe extern "system" fn(isize) -> BOOL = std::mem::transmute(free_lib);
                    if self.lib != 0 {
                        func(self.lib);
                    }
                }
            }
        }
    }
}

type GetDpiForMonitorFn = unsafe extern "system" fn(HMONITOR, i32, *mut u32, *mut u32) -> i32;

fn get_monitor_dpi(hmonitor: HMONITOR) -> f32 {
    unsafe {
        use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryA, GetModuleHandleA};
        let shcore = LoadLibraryA(b"Shcore.dll\0".as_ptr());
        if shcore != 0 {
            if let Some(get_dpi) = GetProcAddress(shcore, b"GetDpiForMonitor\0".as_ptr()) {
                let func: GetDpiForMonitorFn = std::mem::transmute(get_dpi);
                let mut dpi_x: u32 = 96;
                let mut dpi_y: u32 = 96;
                if func(hmonitor, 0 /* MDT_EFFECTIVE_DPI */, &mut dpi_x, &mut dpi_y) == 0 {
                    let k32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
                    if k32 != 0 {
                        if let Some(free_lib) = GetProcAddress(k32, b"FreeLibrary\0".as_ptr()) {
                            let free_fn: unsafe extern "system" fn(isize) -> BOOL = std::mem::transmute(free_lib);
                            free_fn(shcore);
                        }
                    }
                    return dpi_x as f32 / 96.0;
                }
            }
            let k32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
            if k32 != 0 {
                if let Some(free_lib) = GetProcAddress(k32, b"FreeLibrary\0".as_ptr()) {
                    let free_fn: unsafe extern "system" fn(isize) -> BOOL = std::mem::transmute(free_lib);
                    free_fn(shcore);
                }
            }
        }
    }
    1.0
}

struct MonitorEnumContext {
    monitors: Vec<MonitorInfo>,
    dxva: Option<Dxva2Api>,
}

unsafe extern "system" fn monitor_enum_proc(
    hmonitor: HMONITOR,
    _hdc: HDC,
    _rect: *mut RECT,
    lparam: LPARAM,
) -> BOOL {
    let ctx = &mut *(lparam as *mut MonitorEnumContext);

    let mut mi: MONITORINFOEXW = std::mem::zeroed();
    mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

    if GetMonitorInfoW(hmonitor, &mut mi as *mut _ as *mut _) != 0 {
        let device_name = String::from_utf16_lossy(&mi.szDevice)
            .trim_matches('\0')
            .to_string();

        let is_primary = (mi.monitorInfo.dwFlags & MONITORINFOF_PRIMARY) != 0;
        let x = mi.monitorInfo.rcMonitor.left;
        let y = mi.monitorInfo.rcMonitor.top;
        let width = (mi.monitorInfo.rcMonitor.right - mi.monitorInfo.rcMonitor.left) as u32;
        let height = (mi.monitorInfo.rcMonitor.bottom - mi.monitorInfo.rcMonitor.top) as u32;

        let scale = get_monitor_dpi(hmonitor);

        let mut devmode: DEVMODEW = std::mem::zeroed();
        devmode.dmSize = std::mem::size_of::<DEVMODEW>() as u16;

        let mut refresh_rate = 60;
        let mut orientation = "Landscape".to_string();

        if EnumDisplaySettingsExW(
            mi.szDevice.as_ptr(),
            windows_sys::Win32::Graphics::Gdi::ENUM_CURRENT_SETTINGS,
            &mut devmode,
            0,
        ) != 0 {
            if devmode.dmDisplayFrequency > 0 {
                refresh_rate = devmode.dmDisplayFrequency;
            }
            orientation = match devmode.Anonymous1.Anonymous2.dmDisplayOrientation {
                1 => "Portrait".to_string(),
                2 => "LandscapeFlipped".to_string(),
                3 => "PortraitFlipped".to_string(),
                _ => "Landscape".to_string(),
            };
        }

        let mut ddc_supported = false;
        let mut brightness: Option<u32> = None;
        let mut contrast: Option<u32> = None;
        let mut model_name = format!("Display {}", ctx.monitors.len() + 1);

        if let Some(dxva) = &ctx.dxva {
            let mut num_phys: u32 = 0;
            if (dxva.get_num_monitors)(hmonitor, &mut num_phys) != 0 && num_phys > 0 {
                let mut phys_list = Vec::with_capacity(num_phys as usize);
                phys_list.resize_with(num_phys as usize, || std::mem::zeroed::<PhysicalMonitor>());

                if (dxva.get_physical_monitors)(hmonitor, num_phys, phys_list.as_mut_ptr()) != 0 {
                    let hphys = phys_list[0].h_physical_monitor;
                    let desc = String::from_utf16_lossy(&phys_list[0].sz_physical_monitor_description)
                        .trim_matches('\0')
                        .to_string();
                    if !desc.is_empty() {
                        model_name = desc;
                    }

                    let mut min_b = 0;
                    let mut cur_b = 0;
                    let mut max_b = 100;
                    if (dxva.get_brightness)(hphys, &mut min_b, &mut cur_b, &mut max_b) != 0 {
                        ddc_supported = true;
                        brightness = Some(cur_b);
                    }

                    let mut vcp_type = 0;
                    let mut cur_c = 0;
                    let mut max_c = 100;
                    if (dxva.get_vcp)(hphys, 0x12 /* Contrast */, &mut vcp_type, &mut cur_c, &mut max_c) != 0 {
                        ddc_supported = true;
                        contrast = Some(cur_c);
                    }

                    (dxva.destroy_monitors)(num_phys, phys_list.as_mut_ptr());
                }
            }
        }

        ctx.monitors.push(MonitorInfo {
            id: device_name.clone(),
            name: model_name.clone(),
            is_primary,
            x,
            y,
            width,
            height,
            refresh_rate,
            scale_factor: scale,
            orientation,
            manufacturer: "Generic/PlugPlay".to_string(),
            model: model_name,
            serial_number: format!("SN-{}", hmonitor as usize),
            ddc_ci_supported: ddc_supported,
            current_brightness: brightness,
            current_contrast: contrast,
        });
    }

    1
}

pub fn get_monitors() -> Vec<MonitorInfo> {
    unsafe {
        let mut ctx = MonitorEnumContext {
            monitors: Vec::new(),
            dxva: Dxva2Api::load(),
        };

        EnumDisplayMonitors(
            0,
            std::ptr::null(),
            Some(monitor_enum_proc),
            &mut ctx as *mut _ as LPARAM,
        );

        if ctx.monitors.is_empty() {
            // Fallback for virtual or headless environments
            use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
            let w = GetSystemMetrics(SM_CXSCREEN) as u32;
            let h = GetSystemMetrics(SM_CYSCREEN) as u32;
            ctx.monitors.push(MonitorInfo {
                id: "\\\\.\\DISPLAY1".to_string(),
                name: "Primary Display".to_string(),
                is_primary: true,
                x: 0,
                y: 0,
                width: if w > 0 { w } else { 1920 },
                height: if h > 0 { h } else { 1080 },
                refresh_rate: 60,
                scale_factor: 1.0,
                orientation: "Landscape".to_string(),
                manufacturer: "Generic".to_string(),
                model: "Default Display".to_string(),
                serial_number: "PRIMARY-01".to_string(),
                ddc_ci_supported: false,
                current_brightness: Some(100),
                current_contrast: Some(75),
            });
        }

        ctx.monitors
    }
}

pub fn set_brightness(monitor_id: &str, val: u32) -> Result<(), String> {
    let dxva = Dxva2Api::load().ok_or_else(|| "DDC/CI DXVA2 API not available on this system".to_string())?;
    let target_val = val.clamp(0, 100);

    struct TargetContext {
        target_id: String,
        target_val: u32,
        success: bool,
        dxva: Dxva2Api,
    }

    unsafe extern "system" fn set_brightness_proc(
        hmonitor: HMONITOR,
        _hdc: HDC,
        _rect: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        let ctx = &mut *(lparam as *mut TargetContext);
        let mut mi: MONITORINFOEXW = std::mem::zeroed();
        mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

        if GetMonitorInfoW(hmonitor, &mut mi as *mut _ as *mut _) != 0 {
            let dev_name = String::from_utf16_lossy(&mi.szDevice).trim_matches('\0').to_string();
            if dev_name.eq_ignore_ascii_case(&ctx.target_id) || ctx.target_id.is_empty() {
                let mut count = 0;
                if (ctx.dxva.get_num_monitors)(hmonitor, &mut count) != 0 && count > 0 {
                    let mut list = Vec::with_capacity(count as usize);
                    list.resize_with(count as usize, || std::mem::zeroed::<PhysicalMonitor>());

                    if (ctx.dxva.get_physical_monitors)(hmonitor, count, list.as_mut_ptr()) != 0 {
                        let res = (ctx.dxva.set_brightness)(list[0].h_physical_monitor, ctx.target_val);
                        (ctx.dxva.destroy_monitors)(count, list.as_mut_ptr());
                        if res != 0 {
                            ctx.success = true;
                            return 0; // stop enumeration
                        }
                    }
                }
            }
        }
        1
    }

    let mut ctx = TargetContext {
        target_id: monitor_id.to_string(),
        target_val,
        success: false,
        dxva,
    };

    unsafe {
        EnumDisplayMonitors(0, std::ptr::null(), Some(set_brightness_proc), &mut ctx as *mut _ as LPARAM);
    }

    if ctx.success {
        Ok(())
    } else {
        Err(format!("Monitor '{}' does not support hardware DDC/CI brightness control", monitor_id))
    }
}

pub fn set_contrast(monitor_id: &str, val: u32) -> Result<(), String> {
    let dxva = Dxva2Api::load().ok_or_else(|| "DDC/CI DXVA2 API not available on this system".to_string())?;
    let target_val = val.clamp(0, 100);

    struct TargetContext {
        target_id: String,
        target_val: u32,
        success: bool,
        dxva: Dxva2Api,
    }

    unsafe extern "system" fn set_contrast_proc(
        hmonitor: HMONITOR,
        _hdc: HDC,
        _rect: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        let ctx = &mut *(lparam as *mut TargetContext);
        let mut mi: MONITORINFOEXW = std::mem::zeroed();
        mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

        if GetMonitorInfoW(hmonitor, &mut mi as *mut _ as *mut _) != 0 {
            let dev_name = String::from_utf16_lossy(&mi.szDevice).trim_matches('\0').to_string();
            if dev_name.eq_ignore_ascii_case(&ctx.target_id) || ctx.target_id.is_empty() {
                let mut count = 0;
                if (ctx.dxva.get_num_monitors)(hmonitor, &mut count) != 0 && count > 0 {
                    let mut list = Vec::with_capacity(count as usize);
                    list.resize_with(count as usize, || std::mem::zeroed::<PhysicalMonitor>());

                    if (ctx.dxva.get_physical_monitors)(hmonitor, count, list.as_mut_ptr()) != 0 {
                        let res = (ctx.dxva.set_vcp)(list[0].h_physical_monitor, 0x12 /* Contrast */, ctx.target_val);
                        (ctx.dxva.destroy_monitors)(count, list.as_mut_ptr());
                        if res != 0 {
                            ctx.success = true;
                            return 0;
                        }
                    }
                }
            }
        }
        1
    }

    let mut ctx = TargetContext {
        target_id: monitor_id.to_string(),
        target_val,
        success: false,
        dxva,
    };

    unsafe {
        EnumDisplayMonitors(0, std::ptr::null(), Some(set_contrast_proc), &mut ctx as *mut _ as LPARAM);
    }

    if ctx.success {
        Ok(())
    } else {
        Err(format!("Monitor '{}' does not support hardware DDC/CI contrast control", monitor_id))
    }
}

pub fn set_input_source(monitor_id: &str, source: u32) -> Result<(), String> {
    let dxva = Dxva2Api::load().ok_or_else(|| "DDC/CI DXVA2 API not available on this system".to_string())?;

    struct TargetContext {
        target_id: String,
        source: u32,
        success: bool,
        dxva: Dxva2Api,
    }

    unsafe extern "system" fn set_input_proc(
        hmonitor: HMONITOR,
        _hdc: HDC,
        _rect: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        let ctx = &mut *(lparam as *mut TargetContext);
        let mut mi: MONITORINFOEXW = std::mem::zeroed();
        mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

        if GetMonitorInfoW(hmonitor, &mut mi as *mut _ as *mut _) != 0 {
            let dev_name = String::from_utf16_lossy(&mi.szDevice).trim_matches('\0').to_string();
            if dev_name.eq_ignore_ascii_case(&ctx.target_id) || ctx.target_id.is_empty() {
                let mut count = 0;
                if (ctx.dxva.get_num_monitors)(hmonitor, &mut count) != 0 && count > 0 {
                    let mut list = Vec::with_capacity(count as usize);
                    list.resize_with(count as usize, || std::mem::zeroed::<PhysicalMonitor>());

                    if (ctx.dxva.get_physical_monitors)(hmonitor, count, list.as_mut_ptr()) != 0 {
                        let res = (ctx.dxva.set_vcp)(list[0].h_physical_monitor, 0x60 /* Input Select */, ctx.source);
                        (ctx.dxva.destroy_monitors)(count, list.as_mut_ptr());
                        if res != 0 {
                            ctx.success = true;
                            return 0;
                        }
                    }
                }
            }
        }
        1
    }

    let mut ctx = TargetContext {
        target_id: monitor_id.to_string(),
        source,
        success: false,
        dxva,
    };

    unsafe {
        EnumDisplayMonitors(0, std::ptr::null(), Some(set_input_proc), &mut ctx as *mut _ as LPARAM);
    }

    if ctx.success {
        Ok(())
    } else {
        Err(format!("Monitor '{}' does not support DDC/CI input switching", monitor_id))
    }
}
