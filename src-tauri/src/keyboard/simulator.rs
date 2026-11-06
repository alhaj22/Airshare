#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_KEYBOARD, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, KEYBDINPUT,
};

pub struct KeyboardSimulator;

impl KeyboardSimulator {
    pub fn new() -> Self {
        Self
    }

    pub fn key_event(&self, vk_code: u32, is_down: bool, key_char: Option<&str>) {
        #[cfg(windows)]
        unsafe {
            if let Some(ch) = key_char {
                // Unicode character input
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
            } else {
                // Virtual key code input
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
            }
        }

        #[cfg(target_os = "macos")]
        {
            // macOS CoreGraphics keyboard simulation
            // CGEventCreateKeyboardEvent(NULL, (CGKeyCode)vk_code, is_down);
        }
    }
}
