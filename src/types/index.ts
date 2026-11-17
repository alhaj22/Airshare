// All TypeScript types for AirDesk

export type DeviceOS = 'windows' | 'macos' | 'linux';

export type ScreenArrangementType =
  | 'host_left_client_right'
  | 'host_right_client_left'
  | 'host_top_client_bottom'
  | 'host_bottom_client_top';

export type AppMode = 'idle' | 'hosting' | 'client' | 'connected';

export type ActiveScreenType = 'host' | 'client';

export type AppPage = 'dashboard' | 'settings' | 'devices' | 'about';

export type MappingMode = 'smart_universal' | 'raw_passthrough' | 'custom';

export interface CustomModifierConfig {
  swap_ctrl_alt: boolean;
  swap_cmd_alt: boolean;
  capslock_as_ctrl: boolean;
  enabled: boolean;
}

export type ShortcutCategory =
  | 'basic'
  | 'window'
  | 'file'
  | 'screenshot'
  | 'browser'
  | 'text'
  | 'system'
  | 'multimonitor';

export interface ShortcutItem {
  id: string;
  category: ShortcutCategory;
  name: string;
  description: string;
  windows: string;
  macos: string;
  linux: string;
}

export interface DiscoveredDevice {
  device_id: string;
  device_name: string;
  os: DeviceOS;
  ip: string;
  port: number;
  is_host: boolean;
  host_pin?: string;
}

export interface SystemInfo {
  device_name: string;
  os: string;
  os_version?: string;
  architecture?: string;
  keyboard_layout?: string;
  local_ip: string;
  screen_width: number;
  screen_height: number;
}

export interface HostPinResponse {
  pin: string;
  expires_in_seconds: number;
  host_ip: string;
}

export interface ActiveSession {
  session_id: string;
  peer_device_id: string;
  peer_name: string;
  peer_os: string;
  peer_os_version?: string;
  peer_architecture?: string;
  peer_keyboard_layout?: string;
  peer_ip: string;
  peer_screen_width: number;
  peer_screen_height: number;
  role: 'host' | 'client';
  connected_at: number;
}

export interface ConnectionStatus {
  mode: AppMode;
  session?: ActiveSession;
  peer_device?: string;
  peer_ip?: string;
  peer_os?: DeviceOS;
  peer_screen_width?: number;
  peer_screen_height?: number;
  role?: 'host' | 'client';
  active_screen: ActiveScreenType;
  pin?: string;
  pin_remaining_seconds?: number;
}

export interface ClipboardItem {
  text: string;
  timestamp: number;
  source: string;
}

export interface AppSettings {
  mouseSharing: boolean;
  keyboardSharing: boolean;
  clipboardSharing: boolean;
  keyboardMapping: boolean;
  hotkey: string;
}

export interface MonitorInfo {
  id: string;
  name: string;
  is_primary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  refresh_rate: number;
  scale_factor: number;
  orientation: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  ddc_ci_supported: boolean;
  current_brightness?: number;
  current_contrast?: number;
}

export interface KeyboardDeviceInfo {
  device_id: string;
  name: string;
  vendor_id: number;
  product_id: number;
  is_mac_keyboard: boolean;
  layout_type: string;
  connection_type: string;
  active_language_layout: string;
  usage_page?: number;
  usage_id?: number;
  gaming_capabilities?: GamingCapabilities;
}

export type GamingBrandType =
  | 'logitech_g'
  | 'razer'
  | 'corsair'
  | 'steel_series'
  | 'hyper_x'
  | 'redragon'
  | 'keychron'
  | 'standard';

export type PhysicalLayoutType = 'ansi' | 'iso' | 'jis' | 'unknown';

export interface GamingCapabilities {
  brand: GamingBrandType;
  model_name: string;
  vendor_id: number;
  product_id: number;
  supports_nkro: boolean;
  max_polling_rate_hz: number;
  has_dedicated_macro_keys: boolean;
  macro_key_count: number;
  has_volume_wheel: boolean;
  has_rgb_subsystem: boolean;
  rgb_protocol?: string;
  onboard_profiles_supported: boolean;
}

export interface HidDeviceInfo {
  device_id: string;
  name: string;
  vendor_id: number;
  product_id: number;
  usage_page: number;
  usage_id: number;
  interface_number: number;
  is_connected: boolean;
  physical_layout: PhysicalLayoutType;
  gaming_capabilities?: GamingCapabilities;
}

export interface LayoutCalibrationData {
  key_0x64_present: boolean;
  enter_is_iso: boolean;
  has_ro_key: boolean;
  has_yen_key: boolean;
  detected_physical: PhysicalLayoutType;
}

export interface KeyboardLayoutProfile {
  id: string;
  name: string;
  physical: PhysicalLayoutType;
  has_altgr: boolean;
  language_code: string;
}

export type RgbLightingMode =
  | { type: 'off' }
  | { type: 'static_color'; r: number; g: number; b: number }
  | { type: 'breathing'; r: number; g: number; b: number; speed: number }
  | { type: 'rainbow_wave'; speed: number }
  | { type: 'reactive'; r: number; g: number; b: number };

export interface SystemHardwareMetrics {
  cpu_name: string;
  cpu_cores: number;
  total_ram_mb: number;
  available_ram_mb: number;
  gpu_name: string;
  battery_percentage?: number;
  is_charging?: boolean;
  os_name: string;
  os_version: string;
  architecture: string;
  display_server?: string;
}

