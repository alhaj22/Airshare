#![allow(unused_imports)]
pub mod hid_types;
pub mod hid_manager;
pub mod state_manager;
pub mod layout_engine;
pub mod gaming_adapters;
pub mod mapping;
pub mod hook;
pub mod simulator;

pub use hid_types::*;
pub use hid_manager::{HidDeviceInfo, HidDeviceManager, GLOBAL_HID_MANAGER};
pub use state_manager::InputStateManager;
pub use layout_engine::{KeyboardLayoutEngine, KeyboardLayoutProfile, LayoutCalibrationData, PhysicalLayoutType};
pub use gaming_adapters::{GamingBrand, GamingDeviceAdapter, GamingKeyboardCapabilities, RgbLightingMode};
pub use mapping::{
    get_custom_config, get_mapping_mode, set_custom_config, set_mapping_mode,
    CustomModifierConfig, KeyboardMappingEngine, MappingMode,
};
pub use hook::{clear_keyboard_hook_sender, set_keyboard_active_screen, KeyboardHookManager};
pub use simulator::KeyboardSimulator;

#[cfg(test)]
mod tests;
