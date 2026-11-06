import type {
  ConnectionStatus,
  DeviceOS,
  DiscoveredDevice,
  HostPinResponse,
  ScreenArrangementType,
  SystemInfo,
} from '../types';

// Check if running inside Tauri runtime
const isTauri =
  typeof window !== 'undefined' &&
  (Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__) ||
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__));

// Simulated in-memory state for development & browser testing
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
      device_id: 'dev_macbook_m1',
      device_name: 'MacBook Air M1 (Ali)',
      os: 'macos',
      ip: '192.168.1.45',
      port: 42426,
      is_host: false,
    },
    {
      device_id: 'dev_thinkpad_x1',
      device_name: 'ThinkPad-X1-Windows',
      os: 'windows',
      ip: '192.168.1.78',
      port: 42426,
      is_host: true,
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

  async joinConnection(hostIp: string, pin: string): Promise<string> {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<string>('join_connection', { hostIp, pin });
      } catch (err) {
        throw new Error(String(err));
      }
    }

    // Mock validation
    if (pin.trim().length !== 6) {
      throw new Error('Please enter a valid 6-digit PIN');
    }

    mockState.mode = 'connected';
    mockState.peerDevice = 'Windows Laptop (Host)';
    mockState.peerIp = hostIp || '192.168.1.102';
    mockState.peerOs = 'windows';

    return 'mock_session_token_' + Date.now();
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

  async setScreenArrangement(arrangement: ScreenArrangementType, verticalOffset?: number): Promise<void> {
    mockState.arrangement = arrangement;
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_screen_arrangement', {
          arrangement,
          verticalOffset: verticalOffset !== undefined ? verticalOffset : null,
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
};
