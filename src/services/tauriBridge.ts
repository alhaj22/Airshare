import type {
  ActiveSession,
  ConnectionStatus,
  CustomModifierConfig,
  DeviceOS,
  DiscoveredDevice,
  HostPinResponse,
  KeyboardDeviceInfo,
  MappingMode,
  MonitorInfo,
  ScreenArrangementType,
  SystemHardwareMetrics,
  SystemInfo,
} from '../types';

// Check if running inside Tauri runtime
const isTauri =
  typeof window !== 'undefined' &&
  (Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__) ||
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__));

// Simulated in-memory state for development & browser testing
let mockMappingMode: MappingMode = 'smart_universal';
let mockCustomConfig: CustomModifierConfig = {
  swap_ctrl_alt: false,
  swap_cmd_alt: false,
  capslock_as_ctrl: false,
  enabled: true,
};

let mockMonitors: MonitorInfo[] = [
  {
    id: '\\\\.\\DISPLAY1',
    name: 'Dell UltraSharp U2723QE (Primary)',
    is_primary: true,
    x: 0,
    y: 0,
    width: 3840,
    height: 2160,
    refresh_rate: 60,
    scale_factor: 1.5,
    orientation: 'landscape',
    manufacturer: 'Dell Inc.',
    model: 'U2723QE 4K IPS Black',
    serial_number: 'CN-08K75P-74261',
    ddc_ci_supported: true,
    current_brightness: 72,
    current_contrast: 50,
  },
  {
    id: '\\\\.\\DISPLAY2',
    name: 'Built-in Display / Secondary',
    is_primary: false,
    x: 3840,
    y: 0,
    width: 1920,
    height: 1080,
    refresh_rate: 144,
    scale_factor: 1.0,
    orientation: 'landscape',
    manufacturer: 'Lenovo',
    model: 'ColorMaster FHD IPS',
    serial_number: 'LEN-88294-FHD',
    ddc_ci_supported: true,
    current_brightness: 80,
    current_contrast: 55,
  },
];

let mockKeyboards: KeyboardDeviceInfo[] = [
  {
    device_id: 'kb_apple_magic_bt',
    name: 'Apple Magic Keyboard with Touch ID',
    vendor_id: 0x004c,
    product_id: 0x029c,
    is_mac_keyboard: true,
    layout_type: 'ANSI',
    connection_type: 'Bluetooth',
    active_language_layout: 'US (QWERTY)',
  },
  {
    device_id: 'kb_internal_laptop',
    name: 'ThinkPad UltraNav Keyboard',
    vendor_id: 0x17ef,
    product_id: 0x6047,
    is_mac_keyboard: false,
    layout_type: 'ANSI',
    connection_type: 'Internal',
    active_language_layout: 'US (QWERTY)',
  },
];

const mockState: {
  mode: 'idle' | 'hosting' | 'client' | 'connected';
  pin?: string;
  pinExpires?: number;
  peerDevice?: string;
  peerIp?: string;
  peerOs?: DeviceOS;
  activeScreen: 'host' | 'client';
  arrangement: ScreenArrangementType;
  discoveredDevices: DiscoveredDevice[];
} = {
  mode: 'idle',
  activeScreen: 'host',
  arrangement: 'host_left_client_right',
  discoveredDevices: [
    {
      device_id: 'dev_macbook_pro',
      device_name: 'MacBook Pro 16″ (M3 Max)',
      os: 'macos',
      ip: '192.168.1.45',
      port: 42426,
      is_host: false,
    },
    {
      device_id: 'dev_ubuntu_box',
      device_name: 'Ubuntu Dev Workstation (24.04)',
      os: 'linux',
      ip: '192.168.1.89',
      port: 42426,
      is_host: false,
    },
    {
      device_id: 'dev_thinkpad_win',
      device_name: 'ThinkPad X1 Yoga (Windows 11)',
      os: 'windows',
      ip: '192.168.1.105',
      port: 42426,
      is_host: false,
    },
  ],
};

export const api = {
  isTauriEnvironment(): boolean {
    return isTauri;
  },

  async getSystemInfo(): Promise<SystemInfo> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<SystemInfo>('get_system_info');
      } catch (err) {
        console.warn('Tauri invoke failed, falling back to mock info', err);
      }
    }

    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    return {
      device_name: isMac ? 'MacBook Air M1' : 'Windows Laptop (Host)',
      os: isMac ? 'macOS' : 'Windows',
      local_ip: '192.168.1.102',
      screen_width: window.screen.width || 1920,
      screen_height: window.screen.height || 1080,
    };
  },

  async getHostOs(): Promise<DeviceOS> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const os = await invoke<string>('get_host_os');
        if (os.includes('mac')) return 'macos';
        if (os.includes('win')) return 'windows';
        return 'linux';
      } catch (err) {
        console.warn('Failed to get host OS from Tauri', err);
      }
    }
    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    return isMac ? 'macos' : 'windows';
  },

  async createConnectionPin(): Promise<HostPinResponse> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<HostPinResponse>('create_connection_pin');
      } catch (err) {
        console.warn('Tauri invoke failed, using mock PIN', err);
      }
    }

    // Generate random 6-digit key
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    mockState.mode = 'hosting';
    mockState.pin = pin;
    mockState.pinExpires = Date.now() + 300 * 1000;

    return {
      pin,
      expires_in_seconds: 300,
      host_ip: '192.168.1.102',
    };
  },

  async joinConnection(hostIp: string, pin: string): Promise<ActiveSession> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<ActiveSession>('join_connection', { hostIp, pin });
      } catch (err) {
        throw new Error(String(err));
      }
    }

    // Mock validation
    if (pin.trim().length !== 6 && pin.trim() !== 'auto_connect') {
      throw new Error('Please enter a valid 6-digit PIN');
    }

    const mockSession: ActiveSession = {
      session_id: 'mock_sess_' + Date.now(),
      peer_device_id: 'host_' + hostIp,
      peer_name: 'Windows Laptop (Host)',
      peer_os: 'windows',
      peer_ip: hostIp || '192.168.1.102',
      peer_screen_width: 1920,
      peer_screen_height: 1080,
      role: 'client',
      connected_at: Math.floor(Date.now() / 1000),
    };

    mockState.mode = 'connected';
    mockState.peerDevice = mockSession.peer_name;
    mockState.peerIp = mockSession.peer_ip;
    mockState.peerOs = 'windows';

    return mockSession;
  },

  async onSessionStarted(callback: (session: ActiveSession) => void): Promise<() => void> {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<ActiveSession>('session_started', (event) => {
          callback(event.payload);
        });
        return unlisten;
      } catch (err) {
        console.warn('Failed to listen to session_started', err);
      }
    }
    return () => {};
  },

  async onSessionEnded(callback: () => void): Promise<() => void> {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen('session_ended', () => {
          callback();
        });
        return unlisten;
      } catch (err) {
        console.warn('Failed to listen to session_ended', err);
      }
    }
    return () => {};
  },

  async getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<DiscoveredDevice[]>('get_discovered_devices');
      } catch (err) {
        console.warn('Tauri get_discovered_devices failed', err);
      }
    }
    return mockState.discoveredDevices;
  },

  async setScreenArrangement(
    arrangement: ScreenArrangementType,
    verticalOffset?: number,
    horizontalOffset?: number
  ): Promise<void> {
    mockState.arrangement = arrangement;
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_screen_arrangement', {
          arrangement,
          verticalOffset: verticalOffset !== undefined ? verticalOffset : null,
          horizontalOffset: horizontalOffset !== undefined ? horizontalOffset : null,
        });
      } catch (err) {
        console.warn('Failed to set screen arrangement', err);
      }
    }
  },

  async disconnectAll(): Promise<void> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('disconnect_all');
      } catch (err) {
        console.warn('Failed to disconnect via Tauri', err);
      }
    }
    mockState.mode = 'idle';
    mockState.pin = undefined;
    mockState.pinExpires = undefined;
    mockState.peerDevice = undefined;
    mockState.peerIp = undefined;
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<ConnectionStatus>('get_connection_status');
      } catch (err) {
        console.warn('Failed to get connection status', err);
      }
    }

    let remainingSeconds: number | undefined = undefined;
    if (mockState.pinExpires) {
      const diff = Math.floor((mockState.pinExpires - Date.now()) / 1000);
      remainingSeconds = diff > 0 ? diff : 0;
    }

    return {
      mode: mockState.mode,
      peer_device: mockState.peerDevice,
      peer_ip: mockState.peerIp,
      peer_os: mockState.peerOs,
      active_screen: mockState.activeScreen,
      pin: mockState.pin,
      pin_remaining_seconds: remainingSeconds,
    };
  },

  async toggleActiveScreen(): Promise<'host' | 'client'> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<'host' | 'client'>('toggle_active_screen');
      } catch (err) {
        console.warn('Failed to toggle active screen via Tauri', err);
      }
    }
    const next = mockState.activeScreen === 'host' ? 'client' : 'host';
    mockState.activeScreen = next;
    return next;
  },

  // Helper for mock demo to simulate peer connecting or cursor jumping
  simulatePeerConnect(name: string, os: DeviceOS, ip: string) {
    mockState.mode = 'connected';
    mockState.peerDevice = name;
    mockState.peerOs = os;
    mockState.peerIp = ip;
  },

  simulateScreenSwitch(target: 'host' | 'client') {
    mockState.activeScreen = target;
  },

  async checkAccessibility(): Promise<boolean> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<boolean>('check_accessibility');
      } catch (err) {
        console.warn('Failed to check accessibility:', err);
      }
    }
    return true;
  },

  async openAccessibilitySettings(): Promise<void> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_accessibility_settings');
      } catch (err) {
        console.warn('Failed to open accessibility settings:', err);
      }
    }
  },
  async getKeyboardMappingMode(): Promise<MappingMode> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<MappingMode>('get_keyboard_mapping_mode');
      } catch (err) {
        console.warn('Failed to get keyboard mapping mode:', err);
      }
    }
    return mockMappingMode;
  },

  async setKeyboardMappingMode(mode: MappingMode): Promise<void> {
    mockMappingMode = mode;
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_keyboard_mapping_mode', { mode });
      } catch (err) {
        console.warn('Failed to set keyboard mapping mode:', err);
      }
    }
  },

  async getCustomModifierConfig(): Promise<CustomModifierConfig> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<CustomModifierConfig>('get_custom_modifier_config');
      } catch (err) {
        console.warn('Failed to get custom modifier config:', err);
      }
    }
    return mockCustomConfig;
  },

  async setCustomModifierConfig(config: CustomModifierConfig): Promise<void> {
    mockCustomConfig = config;
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_custom_modifier_config', { config });
      } catch (err) {
        console.warn('Failed to set custom modifier config:', err);
      }
    }
  },

  async releaseStuckKeys(): Promise<void> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('release_stuck_keys');
      } catch (err) {
        console.warn('Failed to release stuck keys:', err);
      }
    }
  },

  async getConnectedMonitors(): Promise<MonitorInfo[]> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<MonitorInfo[]>('get_connected_monitors');
      } catch (err) {
        console.warn('Failed to get connected monitors via Tauri:', err);
      }
    }
    return mockMonitors;
  },

  async setMonitorBrightness(monitorId: string, brightness: number): Promise<void> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_monitor_brightness', { monitorId, brightness });
        return;
      } catch (err) {
        console.warn('Failed to set monitor brightness via Tauri:', err);
      }
    }
    const target = mockMonitors.find((m) => m.id === monitorId);
    if (target) {
      target.current_brightness = brightness;
    }
  },

  async setMonitorContrast(monitorId: string, contrast: number): Promise<void> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_monitor_contrast', { monitorId, contrast });
        return;
      } catch (err) {
        console.warn('Failed to set monitor contrast via Tauri:', err);
      }
    }
    const target = mockMonitors.find((m) => m.id === monitorId);
    if (target) {
      target.current_contrast = contrast;
    }
  },

  async setMonitorInputSource(monitorId: string, inputSource: number): Promise<void> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_monitor_input_source', { monitorId, inputSource });
      } catch (err) {
        console.warn('Failed to set monitor input source via Tauri:', err);
      }
    }
  },

  async getConnectedKeyboards(): Promise<KeyboardDeviceInfo[]> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<KeyboardDeviceInfo[]>('get_connected_keyboards');
      } catch (err) {
        console.warn('Failed to get connected keyboards via Tauri:', err);
      }
    }
    return mockKeyboards;
  },

  async getHardwareSystemInfo(): Promise<SystemHardwareMetrics> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<SystemHardwareMetrics>('get_hardware_system_info');
      } catch (err) {
        console.warn('Failed to get hardware system info via Tauri:', err);
      }
    }

    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    return {
      cpu_name: isMac ? 'Apple M3 Pro (12 Cores)' : 'Intel Core i7-13700H (14 Cores / 20 Threads)',
      cpu_cores: isMac ? 12 : 14,
      total_ram_mb: 32768,
      available_ram_mb: 19456,
      gpu_name: isMac ? 'Apple 18-Core GPU' : 'NVIDIA GeForce RTX 4070 Laptop GPU (8GB)',
      battery_percentage: 92,
      is_charging: true,
      os_name: isMac ? 'macOS' : 'Windows',
      os_version: isMac ? 'macOS 15.1 Sequoia' : 'Windows 11 Pro 23H2 (Build 22631)',
      architecture: isMac ? 'aarch64' : 'x86_64',
      display_server: undefined,
    };
  },
};
