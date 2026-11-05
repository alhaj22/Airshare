use log::error;

#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_MOUSE, MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN,
    MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_WHEEL, MOUSEINPUT,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

pub struct MouseSimulator {
    screen_width: u32,
    screen_height: u32,
}

impl MouseSimulator {
    pub fn new(screen_width: u32, screen_height: u32) -> Self {
        Self {
            screen_width,
            screen_height,
        }
    }

    pub fn move_relative(&self, dx: i32, dy: i32) {
        #[cfg(windows)]
        unsafe {
            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx,
                        dy,
                        mouseData: 0,
                        dwFlags: MOUSEEVENTF_MOVE,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }

        #[cfg(target_os = "macos")]
        {
            // macOS CoreGraphics simulation
            // In macOS: CGEventCreateMouseEvent with kCGEventMouseMoved
        }
    }

    pub fn move_absolute(&self, x: i32, y: i32) {
        #[cfg(windows)]
        unsafe {
            let screen_w = GetSystemMetrics(SM_CXSCREEN) as f64;
            let screen_h = GetSystemMetrics(SM_CYSCREEN) as f64;

            // Normalized coordinates (0 to 65535)
            let norm_x = ((x as f64 / screen_w) * 65535.0) as i32;
            let norm_y = ((y as f64 / screen_h) * 65535.0) as i32;

            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: norm_x,
                        dy: norm_y,
                        mouseData: 0,
                        dwFlags: MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }

        #[cfg(target_os = "macos")]
        {
            // macOS CoreGraphics CGWarpMouseCursorPosition
        }
    }

    pub fn button_event(&self, button: u8, is_down: bool) {
        #[cfg(windows)]
        unsafe {
            let flags = match (button, is_down) {
                (0, true) => MOUSEEVENTF_LEFTDOWN,
                (0, false) => MOUSEEVENTF_LEFTUP,
                (1, true) => MOUSEEVENTF_RIGHTDOWN,
                (1, false) => MOUSEEVENTF_RIGHTUP,
                (2, true) => MOUSEEVENTF_MIDDLEDOWN,
                (2, false) => MOUSEEVENTF_MIDDLEUP,
                _ => return,
            };

            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: 0,
                        dy: 0,
                        mouseData: 0,
                        dwFlags: flags,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }

        #[cfg(target_os = "macos")]
        {
            // macOS CoreGraphics mouse button event post
        }
    }

    pub fn scroll(&self, _delta_x: i32, delta_y: i32) {
        #[cfg(windows)]
        unsafe {
            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: 0,
                        dy: 0,
                        mouseData: (delta_y * 120) as u32,
                        dwFlags: MOUSEEVENTF_WHEEL,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }

        #[cfg(target_os = "macos")]
        {
            // macOS CoreGraphics scroll wheel event post
        }
    }
}
