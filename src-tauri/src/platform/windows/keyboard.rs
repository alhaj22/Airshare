use crate::platform::KeyboardDeviceInfo;
use std::os::raw::c_void;
use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetKeyboardLayoutNameA;

#[repr(C)]
struct RawInputDeviceList {
    h_device: isize,
    dw_type: u32,
}

const RIM_TYPEKEYBOARD: u32 = 1;
const RIDI_DEVICENAME: u32 = 0x20000007;

type GetRawInputDeviceListFn = unsafe extern "system" fn(*mut RawInputDeviceList, *mut u32, u32) -> u32;
type GetRawInputDeviceInfoWFn = unsafe extern "system" fn(isize, u32, *mut c_void, *mut u32) -> u32;

pub fn get_keyboards() -> Vec<KeyboardDeviceInfo> {
    let mut keyboards = Vec::new();

    // 1. Get current active layout name
    let active_layout = unsafe {
        let mut buf = [0u8; 9];
        if GetKeyboardLayoutNameA(buf.as_mut_ptr()) != 0 {
            let name = String::from_utf8_lossy(&buf[..8]).to_string();
            match name.as_str() {
                "00000409" => "US (QWERTY)".to_string(),
                "00000809" => "UK (QWERTY)".to_string(),
                "00000407" => "German (QWERTZ)".to_string(),
                "0000040C" => "French (AZERTY)".to_string(),
                "00000411" => "Japanese (JIS)".to_string(),
                "00000419" => "Russian (JCUKEN)".to_string(),
                "00000410" => "Italian (QWERTY)".to_string(),
                "0000040A" => "Spanish (QWERTY)".to_string(),
                _ => format!("Layout ({})", name),
            }
        } else {
            "US (QWERTY)".to_string()
        }
    };

    // 2. Query Raw Input Device List dynamically via User32
    unsafe {
        let u32_lib = GetModuleHandleA(b"user32.dll\0".as_ptr());
        if u32_lib != 0 {
            let get_list_addr = GetProcAddress(u32_lib, b"GetRawInputDeviceList\0".as_ptr());
            let get_info_addr = GetProcAddress(u32_lib, b"GetRawInputDeviceInfoW\0".as_ptr());

            if let (Some(list_ptr), Some(info_ptr)) = (get_list_addr, get_info_addr) {
                let get_list: GetRawInputDeviceListFn = std::mem::transmute(list_ptr);
                let get_info: GetRawInputDeviceInfoWFn = std::mem::transmute(info_ptr);

                let mut num_devices: u32 = 0;
                let item_size = std::mem::size_of::<RawInputDeviceList>() as u32;

                if get_list(std::ptr::null_mut(), &mut num_devices, item_size) == 0 && num_devices > 0 {
                    let mut device_list: Vec<RawInputDeviceList> = Vec::with_capacity(num_devices as usize);
                    device_list.resize_with(num_devices as usize, || std::mem::zeroed());

                    let count = get_list(device_list.as_mut_ptr(), &mut num_devices, item_size);
                    if count != u32::MAX {
                        for dev in device_list.iter().take(count as usize) {
                            if dev.dw_type == RIM_TYPEKEYBOARD {
                                let mut name_len: u32 = 0;
                                get_info(dev.h_device, RIDI_DEVICENAME, std::ptr::null_mut(), &mut name_len);

                                if name_len > 0 {
                                    let mut name_buf: Vec<u16> = Vec::with_capacity(name_len as usize);
                                    name_buf.resize(name_len as usize, 0);

                                    if get_info(dev.h_device, RIDI_DEVICENAME, name_buf.as_mut_ptr() as _, &mut name_len) != u32::MAX {
                                        let dev_path = String::from_utf16_lossy(&name_buf)
                                            .trim_matches('\0')
                                            .to_string();

                                        let (vid, pid) = parse_vid_pid(&dev_path);
                                        let is_apple = vid == 0x05AC;

                                        let connection_type = if dev_path.contains("BTH") || dev_path.contains("Bluetooth") {
                                            "Bluetooth".to_string()
                                        } else if dev_path.contains("USB") {
                                            "USB".to_string()
                                        } else if dev_path.contains("ACPI") || dev_path.contains("Root#RDP") {
                                            "Internal".to_string()
                                        } else {
                                            "WirelessDongle".to_string()
                                        };

                                        let _layout_type = if is_apple {
                                            if active_layout.contains("JIS") {
                                                "JIS".to_string()
                                            } else if active_layout.contains("UK") || active_layout.contains("German") || active_layout.contains("French") {
                                                "ISO".to_string()
                                            } else {
                                                "ANSI".to_string()
                                            }
                                        } else {
                                            "Standard".to_string()
                                        };

                                        let name = if is_apple {
                                            match pid {
                                                0x026C | 0x029C => "Apple Magic Keyboard".to_string(),
                                                0x029F | 0x0267 => "Apple Magic Keyboard with Numeric Keypad".to_string(),
                                                0x024F => "Apple Wireless Keyboard".to_string(),
                                                _ => "Apple Keyboard".to_string(),
                                            }
                                        } else if dev_path.contains("ACPI") {
                                            "Built-in Laptop Keyboard".to_string()
                                        } else {
                                            let gaming_ident = crate::keyboard::gaming_adapters::GamingDeviceAdapter::identify_gaming_device(vid, pid, "");
                                            if gaming_ident.brand != crate::keyboard::gaming_adapters::GamingBrand::Standard {
                                                gaming_ident.model_name
                                            } else {
                                                format!("External Keyboard ({:04X}:{:04X})", vid, pid)
                                            }
                                        };

                                        let detected_layout = if is_apple {
                                            if active_layout.contains("JIS") {
                                                "JIS".to_string()
                                            } else if active_layout.contains("UK") || active_layout.contains("German") || active_layout.contains("French") {
                                                "ISO".to_string()
                                            } else {
                                                "ANSI".to_string()
                                            }
                                        } else if active_layout.contains("JIS") {
                                            "JIS".to_string()
                                        } else if active_layout.contains("UK") || active_layout.contains("German") || active_layout.contains("French") || active_layout.contains("Spanish") {
                                            "ISO".to_string()
                                        } else {
                                            "ANSI".to_string()
                                        };

                                        keyboards.push(KeyboardDeviceInfo {
                                            device_id: format!("KBD-{:04X}-{:04X}-{}", vid, pid, dev.h_device as usize),
                                            name,
                                            vendor_id: vid,
                                            product_id: pid,
                                            is_mac_keyboard: is_apple,
                                            layout_type: detected_layout,
                                            connection_type,
                                            active_language_layout: active_layout.clone(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if keyboards.is_empty() {
        // Fallback default
        keyboards.push(KeyboardDeviceInfo {
            device_id: "KBD-DEFAULT-PRIMARY".to_string(),
            name: "Standard Keyboard".to_string(),
            vendor_id: 0,
            product_id: 0,
            is_mac_keyboard: false,
            layout_type: "Standard".to_string(),
            connection_type: "Internal".to_string(),
            active_language_layout: active_layout,
        });
    }

    keyboards
}

fn parse_vid_pid(path: &str) -> (u16, u16) {
    let upper = path.to_uppercase();
    let mut vid = 0;
    let mut pid = 0;

    if let Some(vid_idx) = upper.find("VID_") {
        let sub = &upper[vid_idx + 4..];
        if sub.len() >= 4 {
            if let Ok(val) = u16::from_str_radix(&sub[..4], 16) {
                vid = val;
            }
        }
    }

    if let Some(pid_idx) = upper.find("PID_") {
        let sub = &upper[pid_idx + 4..];
        if sub.len() >= 4 {
            if let Ok(val) = u16::from_str_radix(&sub[..4], 16) {
                pid = val;
            }
        }
    }

    (vid, pid)
}
