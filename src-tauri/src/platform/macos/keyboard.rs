use crate::platform::KeyboardDeviceInfo;
use std::process::Command;

pub fn get_keyboards() -> Vec<KeyboardDeviceInfo> {
    let mut keyboards = Vec::new();

    // 1. Detect active macOS language layout
    let mut active_layout = "US (QWERTY)".to_string();
    if let Ok(output) = Command::new("defaults")
        .args(["read", "~/Library/Preferences/com.apple.HIToolbox.plist", "AppleSelectedInputSources"])
        .output()
    {
        let s = String::from_utf8_lossy(&output.stdout);
        for line in s.lines() {
            if line.contains("KeyboardLayout Name") {
                let parts: Vec<&str> = line.split('=').collect();
                if parts.len() >= 2 {
                    let name = parts[1].trim().trim_matches(';').trim_matches('"').to_string();
                    if !name.is_empty() {
                        active_layout = name;
                        break;
                    }
                }
            }
        }
    }

    // 2. Query USB connected keyboards via system_profiler
    if let Ok(output) = Command::new("system_profiler").args(["SPUSBDataType", "-json"]).output() {
        let s = String::from_utf8_lossy(&output.stdout);
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&s) {
            parse_usb_keyboards(&val, &mut keyboards, &active_layout);
        }
    }

    // 3. Query Bluetooth connected keyboards
    if let Ok(output) = Command::new("system_profiler").args(["SPBluetoothDataType", "-json"]).output() {
        let s = String::from_utf8_lossy(&output.stdout);
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&s) {
            parse_bluetooth_keyboards(&val, &mut keyboards, &active_layout);
        }
    }

    if keyboards.is_empty() {
        keyboards.push(KeyboardDeviceInfo {
            device_id: "mac-internal-kbd".to_string(),
            name: "Apple Internal Keyboard / Trackpad".to_string(),
            vendor_id: 0x05AC,
            product_id: 0x0281,
            is_mac_keyboard: true,
            layout_type: "ANSI".to_string(),
            connection_type: "Internal".to_string(),
            active_language_layout: active_layout,
        });
    }

    keyboards
}

fn parse_usb_keyboards(
    val: &serde_json::Value,
    keyboards: &mut Vec<KeyboardDeviceInfo>,
    active_layout: &str,
) {
    if let Some(items) = val.get("SPUSBDataType").and_then(|v| v.as_array()) {
        for item in items {
            check_usb_node(item, keyboards, active_layout);
        }
    }
}

fn check_usb_node(
    node: &serde_json::Value,
    keyboards: &mut Vec<KeyboardDeviceInfo>,
    active_layout: &str,
) {
    if let Some(name) = node.get("_name").and_then(|v| v.as_str()) {
        let name_lower = name.to_lowercase();
        if name_lower.contains("keyboard") || name_lower.contains("keychron") || name_lower.contains("magic") {
            let vid = parse_hex_u16(node.get("vendor_id").and_then(|v| v.as_str()).unwrap_or(""));
            let pid = parse_hex_u16(node.get("product_id").and_then(|v| v.as_str()).unwrap_or(""));

            let is_apple = vid == 0x05AC || name_lower.contains("apple");
            keyboards.push(KeyboardDeviceInfo {
                device_id: format!("mac-usb-{:04x}-{:04x}", vid, pid),
                name: name.to_string(),
                vendor_id: vid,
                product_id: pid,
                is_mac_keyboard: is_apple,
                layout_type: if is_apple { "ANSI".to_string() } else { "Standard".to_string() },
                connection_type: "USB".to_string(),
                active_language_layout: active_layout.to_string(),
            });
        }
    }

    if let Some(subs) = node.get("_items").and_then(|v| v.as_array()) {
        for sub in subs {
            check_usb_node(sub, keyboards, active_layout);
        }
    }
}

fn parse_bluetooth_keyboards(
    val: &serde_json::Value,
    keyboards: &mut Vec<KeyboardDeviceInfo>,
    active_layout: &str,
) {
    if let Some(items) = val.get("SPBluetoothDataType").and_then(|v| v.as_array()) {
        for item in items {
            if let Some(devs) = item.get("device_connected").and_then(|v| v.as_array()) {
                for dev in devs {
                    if let Some(map) = dev.as_object() {
                        for (dev_name, dev_info) in map {
                            let name_lower = dev_name.to_lowercase();
                            let minor_type = dev_info.get("device_minorType").and_then(|v| v.as_str()).unwrap_or("");
                            if minor_type.eq_ignore_ascii_case("Keyboard") || name_lower.contains("keyboard") {
                                let vid = parse_hex_u16(dev_info.get("device_vendorID").and_then(|v| v.as_str()).unwrap_or(""));
                                let pid = parse_hex_u16(dev_info.get("device_productID").and_then(|v| v.as_str()).unwrap_or(""));
                                let is_apple = vid == 0x05AC || name_lower.contains("magic") || name_lower.contains("apple");

                                keyboards.push(KeyboardDeviceInfo {
                                    device_id: format!("mac-bt-{:04x}-{:04x}", vid, pid),
                                    name: dev_name.clone(),
                                    vendor_id: vid,
                                    product_id: pid,
                                    is_mac_keyboard: is_apple,
                                    layout_type: if is_apple { "ANSI".to_string() } else { "Standard".to_string() },
                                    connection_type: "Bluetooth".to_string(),
                                    active_language_layout: active_layout.to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
}

fn parse_hex_u16(s: &str) -> u16 {
    let clean = s.trim().trim_start_matches("0x").trim_start_matches("0X");
    u16::from_str_radix(clean, 16).unwrap_or(0)
}
