pub mod hook;
pub mod simulator;

pub use hook::{
    clear_mouse_hook_sender, get_current_active_screen, set_current_active_screen,
    set_remote_screen_size, ActiveScreen, MouseEdgeMonitor, ScreenArrangement,
};
pub use simulator::MouseSimulator;
