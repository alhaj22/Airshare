#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_KEYBOARD, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, KEYBDINPUT,
};

#[cfg(target_os = "macos")]
mod macos {
    use std::os::raw::c_void;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        pub fn CGEventCreateKeyboardEvent(
            source: *mut c_void,
            virtualKey: u16,
            keyDown: bool,
        ) -> *mut c_void;
        pub fn CGEventKeyboardSetUnicodeString(
            event: *mut c_void,
            stringLength: usize,
            unicodeString: *const u16,
        );
        pub fn CGEventSetFlags(event: *mut c_void, flags: u64);
        pub fn CGEventPost(tap: u32, event: *mut c_void);
        pub fn CFRelease(cf: *mut c_void);
    }

    pub fn win_vk_to_mac_key(vk: u32) -> u16 {
        match vk {
            // Letters A-Z
            0x41 => 0,   // A
            0x42 => 11,  // B
            0x43 => 8,   // C
            0x44 => 2,   // D
            0x45 => 14,  // E
            0x46 => 3,   // F
            0x47 => 5,   // G
            0x48 => 4,   // H
            0x49 => 34,  // I
            0x4A => 38,  // J
            0x4B => 40,  // K
            0x4C => 37,  // L
            0x4D => 46,  // M
            0x4E => 45,  // N
            0x4F => 31,  // O
            0x50 => 35,  // P
            0x51 => 12,  // Q
            0x52 => 15,  // R
            0x53 => 1,   // S
            0x54 => 17,  // T
            0x55 => 32,  // U
            0x56 => 9,   // V
            0x57 => 13,  // W
            0x58 => 7,   // X
            0x59 => 16,  // Y
            0x5A => 6,   // Z

            // Numbers 0-9
            0x30 => 29,  // 0
            0x31 => 18,  // 1
            0x32 => 19,  // 2
            0x33 => 20,  // 3
            0x34 => 21,  // 4
            0x35 => 23,  // 5
            0x36 => 22,  // 6
            0x37 => 26,  // 7
            0x38 => 28,  // 8
            0x39 => 25,  // 9

            // Controls & Whitespace
            0x08 => 51,  // Backspace -> Mac Delete
            0x09 => 48,  // Tab
            0x0D => 36,  // Enter / Return
            0x1B => 53,  // Escape
            0x20 => 49,  // Spacebar

            // Arrows
            0x25 => 123, // Left
            0x26 => 126, // Up
            0x27 => 124, // Right
            0x28 => 125, // Down

            // Modifiers: Windows Ctrl maps to Mac Command for natural shortcuts (Cmd+C/V/Z)
            0x11 | 0xA2 | 0xA3 => 55, // VK_CONTROL -> Mac Command
            0x5B | 0x5C => 55,        // VK_LWIN / VK_RWIN -> Mac Command
            0x10 | 0xA0 | 0xA1 => 56, // VK_SHIFT -> Mac Shift
            0x12 | 0xA4 | 0xA5 => 58, // VK_MENU / Alt -> Mac Option

            // Common keys
            0x2E => 117, // Delete -> Forward Delete
            0x24 => 115, // Home
            0x23 => 119, // End
            0x21 => 116, // PageUp
            0x22 => 121, // PageDown

            // Symbols & Punctuation
            0xBA => 41, // ;
            0xBB => 24, // =
            0xBC => 43, // ,
            0xBD => 27, // -
            0xBE => 47, // .
            0xBF => 44, // /
            0xC0 => 50, // `
            0xDB => 33, // [
            0xDC => 42, // \
            0xDD => 30, // ]
            0xDE => 39, // '

            _ => 0xFFFF,
        }
    }
}

pub struct KeyboardSimulator;

impl KeyboardSimulator {
    pub fn new() -> Self {
        Self
    }

    pub fn key_event(&self, vk_code: u32, is_down: bool, key_char: Option<&str>) {
        #[cfg(windows)]
        unsafe {
            if vk_code > 0 {
                let flags = if is_down { 0 } else { KEYEVENTF_KEYUP };
                let mut input = INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk_code as u16,
                            wScan: 0,
                            dwFlags: flags,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
            } else if let Some(ch) = key_char {
                for c in ch.encode_utf16() {
                    let flags = if is_down { KEYEVENTF_UNICODE } else { KEYEVENTF_UNICODE | KEYEVENTF_KEYUP };
                    let mut input = INPUT {
                        r#type: INPUT_KEYBOARD,
                        Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                            ki: KEYBDINPUT {
                                wVk: 0,
                                wScan: c,
                                dwFlags: flags,
                                time: 0,
                                dwExtraInfo: 0,
                            },
                        },
                    };
                    SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
                }
            }
        }

        #[cfg(target_os = "macos")]
        unsafe {
            use macos::*;
            let mac_code = win_vk_to_mac_key(vk_code);
            let code_to_use = if mac_code != 0xFFFF { mac_code } else { 0 };

            let evt = CGEventCreateKeyboardEvent(std::ptr::null_mut(), code_to_use, is_down);
            if !evt.is_null() {
                if let Some(ch) = key_char {
                    let utf16: Vec<u16> = ch.encode_utf16().collect();
                    CGEventKeyboardSetUnicodeString(evt, utf16.len(), utf16.as_ptr());
                }
                // Post to both SessionEventTap (1) and HIDEventTap (0)
                CGEventPost(1 /* kCGSessionEventTap */, evt);
                CGEventPost(0 /* kCGHIDEventTap */, evt);
                CFRelease(evt);
            }
        }
    }
}
