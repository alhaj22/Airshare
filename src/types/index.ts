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
}

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

