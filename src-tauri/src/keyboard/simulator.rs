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
            0x14 => 57,  // CapsLock
            0x1B => 53,  // Escape
            0x20 => 49,  // Spacebar

            // Arrows & Navigation
            0x25 => 123, // Left Arrow
            0x26 => 126, // Up Arrow
            0x27 => 124, // Right Arrow
            0x28 => 125, // Down Arrow
            0x2E => 117, // Delete -> Forward Delete
            0x24 => 115, // Home
            0x23 => 119, // End
            0x21 => 116, // PageUp
            0x22 => 121, // PageDown
            0x2D => 114, // Insert -> Help

            // Function Keys F1 - F12
            0x70 => 122, // F1
            0x71 => 120, // F2
            0x72 => 99,  // F3
            0x73 => 118, // F4
            0x74 => 96,  // F5
            0x75 => 97,  // F6
            0x76 => 98,  // F7
            0x77 => 100, // F8
            0x78 => 101, // F9
            0x79 => 109, // F10
            0x7A => 103, // F11
            0x7B => 111, // F12

            // Numpad Keys
            0x60 => 82, // Numpad 0
            0x61 => 83, // Numpad 1
            0x62 => 84, // Numpad 2
            0x63 => 85, // Numpad 3
            0x64 => 86, // Numpad 4
            0x65 => 87, // Numpad 5
            0x66 => 88, // Numpad 6
            0x67 => 89, // Numpad 7
            0x68 => 91, // Numpad 8
            0x69 => 92, // Numpad 9
            0x6A => 67, // Numpad *
            0x6B => 69, // Numpad +
            0x6D => 78, // Numpad -
            0x6E => 65, // Numpad .
            0x6F => 75, // Numpad /

            // Modifiers: Windows Ctrl maps to Mac Command for natural shortcuts (Cmd+C/V/Z)
            0x11 | 0xA2 => 55, // Left Ctrl -> Mac Command
            0xA3 => 54,        // Right Ctrl -> Mac Right Command
            0x5B | 0x5C => 59, // Windows Key -> Mac Control
            0x10 | 0xA0 => 56, // Left Shift -> Mac Left Shift
            0xA1 => 60,        // Right Shift -> Mac Right Shift
            0x12 | 0xA4 => 58, // Left Alt -> Mac Option (Alt)
            0xA5 => 61,        // Right Alt -> Mac Right Option

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

    pub fn key_event(&self, vk_code: u32, is_down: bool, key_char: Option<&str>, _modifiers: u8) {
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
            let modifiers = _modifiers;
            let mac_code = win_vk_to_mac_key(vk_code);
            let code_to_use = if mac_code != 0xFFFF { mac_code } else { 0 };

            let evt = CGEventCreateKeyboardEvent(std::ptr::null_mut(), code_to_use, is_down);
            if !evt.is_null() {
                // Map Windows modifier bitmask to macOS CoreGraphics CGEventFlags:
                // Bit 0: Shift -> kCGEventFlagMaskShift (0x00020000)
                // Bit 1: Ctrl  -> kCGEventFlagMaskCommand (0x00100000) [Windows Ctrl translates to Mac Cmd!]
                // Bit 2: Alt   -> kCGEventFlagMaskAlternate (0x00080000) [Windows Alt translates to Mac Option!]
                // Bit 3: Win   -> kCGEventFlagMaskControl (0x00040000) [Windows Key translates to Mac Ctrl!]
                let mut cg_flags: u64 = 0;
                if (modifiers & 1) != 0 {
                    cg_flags |= 0x00020000; // Shift
                }
                if (modifiers & 2) != 0 {
                    cg_flags |= 0x00100000; // Command (⌘)
                }
                if (modifiers & 4) != 0 {
                    cg_flags |= 0x00080000; // Option (⌥)
                }
                if (modifiers & 8) != 0 {
                    cg_flags |= 0x00040000; // Control (^)
                }

                if cg_flags != 0 {
                    CGEventSetFlags(evt, cg_flags);
                }

                // If virtual key wasn't directly mapped, fallback to Unicode string insertion
                if mac_code == 0xFFFF {
                    if let Some(ch) = key_char {
                        let utf16: Vec<u16> = ch.encode_utf16().collect();
                        CGEventKeyboardSetUnicodeString(evt, utf16.len(), utf16.as_ptr());
                    }
                }

                // Post exclusively to kCGHIDEventTap (0) for native system-wide hardware input
                CGEventPost(0 /* kCGHIDEventTap */, evt);
                CFRelease(evt);
            }
        }
    }
}
