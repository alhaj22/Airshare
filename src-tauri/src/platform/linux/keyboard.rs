use crate::platform::KeyboardDeviceInfo;
use std::process::Command;

pub fn get_keyboards() -> Vec<KeyboardDeviceInfo> {
    let mut keyboards = Vec::new();

    // 1. Detect layout via setxkbmap or localectl
    let mut layout_name = "US (QWERTY)".to_string();
    if let Ok(output) = Command::new("setxkbmap").args(["-query"]).output() {
        let s = String::from_utf8_lossy(&output.stdout);
        for line in s.lines() {
            if line.starts_with("layout:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    layout_name = parts[1].to_string();
                }
            }
        }
    }

    // 2. Parse /proc/bus/input/devices
    if let Ok(content) = std::fs::read_to_string("/proc/bus/input/devices") {
        let mut curr_name = String::new();
        let mut curr_bus = 3;
        let mut curr_vendor = 0;
        let mut curr_product = 0;
        let mut is_keyboard = false;
        let mut idx = 1;

        for line in content.lines() {
            if line.starts_with("I: ") {
                // e.g. I: Bus=0003 Vendor=05ac Product=026c Version=011b
                for part in line.split_whitespace() {
                    if let Some(val) = part.strip_prefix("Bus=") {
                        curr_bus = u16::from_str_radix(val, 16).unwrap_or(3);
                    } else if let Some(val) = part.strip_prefix("Vendor=") {
                        curr_vendor = u16::from_str_radix(val, 16).unwrap_or(0);
                    } else if let Some(val) = part.strip_prefix("Product=") {
                        curr_product = u16::from_str_radix(val, 16).unwrap_or(0);
                    }
                }
            } else if line.starts_with("N: Name=") {
                curr_name = line.trim_start_matches("N: Name=")
                    .trim_matches('"')
                    .to_string();
            } else if line.starts_with("H: Handlers=") {
                if line.contains("kbd") {
                    is_keyboard = true;
                }
            } else if line.is_empty() {
                if is_keyboard && !curr_name.is_empty() {
                    let is_apple = curr_vendor == 0x05AC || curr_name.to_lowercase().contains("apple");
                    let layout_type = if layout_name.contains("jp") || layout_name.contains("jis") {
                        "JIS".to_string()
                    } else if layout_name.contains("de") || layout_name.contains("fr") || layout_name.contains("gb") || layout_name.contains("es") {
                        "ISO".to_string()
                    } else {
                        "ANSI".to_string()
                    };
                    let conn = match curr_bus {
                        0x0005 => "Bluetooth".to_string(),
                        0x0003 => "USB".to_string(),
                        0x0011 | 0x0019 => "Internal".to_string(),
                        _ => "WirelessDongle".to_string(),
                    };

                    keyboards.push(KeyboardDeviceInfo {
                        device_id: format!("lnx-kbd-{}", idx),
                        name: curr_name.clone(),
                        vendor_id: curr_vendor,
                        product_id: curr_product,
                        is_mac_keyboard: is_apple,
                        layout_type,
                        connection_type: conn,
                        active_language_layout: layout_name.clone(),
                    });
                    idx += 1;
                }
                curr_name.clear();
                is_keyboard = false;
                curr_vendor = 0;
                curr_product = 0;
            }
        }
    }

    if keyboards.is_empty() {
        keyboards.push(KeyboardDeviceInfo {
            device_id: "lnx-default-kbd".to_string(),
            name: "AT Translated Set 2 keyboard".to_string(),
            vendor_id: 0x0001,
            product_id: 0x0001,
            is_mac_keyboard: false,
            layout_type: "Standard".to_string(),
            connection_type: "Internal".to_string(),
            active_language_layout: layout_name,
        });
    }

    keyboards
}
