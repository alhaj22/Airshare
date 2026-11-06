export type DeviceOS = 'windows' | 'macos' | 'linux';

export type ScreenArrangementType =
  | 'host_left_client_right'
  | 'host_right_client_left'
  | 'host_top_client_bottom'
  | 'host_bottom_client_top';

export type AppMode = 'idle' | 'hosting' | 'client' | 'connected';

export type ActiveScreenType = 'host' | 'client';

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
