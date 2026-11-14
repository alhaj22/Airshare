import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/tauriBridge';
import type {
  ConnectionStatus,
  DiscoveredDevice,
  KeyboardDeviceInfo,
  MonitorInfo,
  ScreenArrangementType,
  SystemHardwareMetrics,
  SystemInfo,
} from '../types';

export function useAirDesk() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [keyboards, setKeyboards] = useState<KeyboardDeviceInfo[]>([]);
  const [hardwareMetrics, setHardwareMetrics] = useState<SystemHardwareMetrics | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>({
    mode: 'idle',
    active_screen: 'host',
  });
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [screenArrangement, setScreenArrangement] =
    useState<ScreenArrangementType>(() => {
      try {
        const saved = localStorage.getItem('airdesk_arrangement');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.arr) return parsed.arr;
        }
      } catch {
        // ignore
      }
      return 'host_left_client_right';
    });

  const lastSessionPeer = useRef<{ ip: string } | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  // Feature toggles
  const [mouseSharing, setMouseSharing] = useState(true);
  const [keyboardSharing, setKeyboardSharing] = useState(true);
  const [clipboardSharing, setClipboardSharing] = useState(true);
  const [keyboardMapping, setKeyboardMapping] = useState(true);

  // Toast notification
  const [notification, setNotification] = useState<{
    text: string;
    type: 'info' | 'success' | 'error';
  } | null>(null);

  const showNotification = useCallback(
    (text: string, type: 'info' | 'success' | 'error' = 'info') => {
      setNotification({ text, type });
      setTimeout(() => setNotification(null), 4000);
    },
    []
  );

  const refreshHardware = useCallback(async () => {
    try {
      const [mons, kbs, hw] = await Promise.all([
        api.getConnectedMonitors(),
        api.getConnectedKeyboards(),
        api.getHardwareSystemInfo(),
      ]);
      setMonitors(mons);
      setKeyboards(kbs);
      setHardwareMetrics(hw);
    } catch (err) {
      console.warn('Failed to refresh hardware metrics:', err);
    }
  }, []);

  // Load system info & hardware on mount
  useEffect(() => {
    api.getSystemInfo().then(setSystemInfo).catch(console.error);
    refreshHardware();
  }, [refreshHardware]);

  // Reactive event listeners for session start/end
  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenEnd: (() => void) | undefined;

    api.onSessionStarted((session) => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      lastSessionPeer.current = { ip: session.peer_ip };
      setStatus({
        mode: 'connected',
        session,
        peer_device: session.peer_name,
        peer_ip: session.peer_ip,
        peer_os: session.peer_os.toLowerCase().includes('mac')
          ? 'macos'
          : session.peer_os.toLowerCase().includes('win')
          ? 'windows'
          : 'linux',
        peer_screen_width: session.peer_screen_width,
        peer_screen_height: session.peer_screen_height,
        role: session.role,
        active_screen: 'host',
      });
      showNotification(`Connected with ${session.peer_name}!`, 'success');
    }).then((unsub) => { unlistenStart = unsub; });

    api.onSessionEnded(() => {
      setStatus({ mode: 'idle', active_screen: 'host' });
      showNotification('Session ended. Input sharing stopped.', 'info');

      // Attempt auto-reconnect ONLY if session was previously active and dropped unexpectedly
      if (lastSessionPeer.current?.ip) {
        const targetIp = lastSessionPeer.current.ip;
        showNotification('Connection lost. Reconnecting…', 'info');
        reconnectTimer.current = window.setTimeout(() => {
          joinHost(targetIp, 'auto_connect').catch(() => {
            lastSessionPeer.current = null;
          });
        }, 2000);
      }
    }).then((unsub) => { unlistenEnd = unsub; });

    return () => {
      unlistenStart?.();
      unlistenEnd?.();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [showNotification]);

  // Poll connection status and discovered devices every 1.5s
  useEffect(() => {
    const update = async () => {
      try {
        const [currStatus, devices] = await Promise.all([
          api.getConnectionStatus(),
          api.getDiscoveredDevices(),
        ]);
        setStatus(currStatus);
        setDiscoveredDevices(devices);
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    update();
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, []);

  // ─── Actions ───────────────────────────────────────────────

  const startHost = async () => {
    try {
      const res = await api.createConnectionPin();
      setStatus((prev) => ({
        ...prev,
        mode: 'hosting',
        pin: res.pin,
        pin_remaining_seconds: res.expires_in_seconds,
      }));
      showNotification(`Pairing Key: ${res.pin}`, 'success');
    } catch (err: unknown) {
      showNotification(`Failed to host: ${(err as Error).message}`, 'error');
    }
  };

  const joinHost = async (hostIp: string, pin: string) => {
    try {
      showNotification('Connecting…', 'info');
      const session = await api.joinConnection(hostIp, pin);
      lastSessionPeer.current = { ip: hostIp };
      setStatus({
        mode: 'connected',
        session,
        peer_device: session.peer_name,
        peer_ip: session.peer_ip,
        peer_os: session.peer_os.toLowerCase().includes('mac')
          ? 'macos'
          : session.peer_os.toLowerCase().includes('win')
          ? 'windows'
          : 'linux',
        peer_screen_width: session.peer_screen_width,
        peer_screen_height: session.peer_screen_height,
        role: session.role,
        active_screen: 'host',
      });
      showNotification(`Connected with ${session.peer_name}! Mouse & keyboard sharing active.`, 'success');
    } catch (err: unknown) {
      showNotification(`Connection failed: ${(err as Error).message}`, 'error');
      throw err;
    }
  };

  const disconnect = async () => {
    try {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      lastSessionPeer.current = null;
      await api.disconnectAll();
      setStatus({ mode: 'idle', active_screen: 'host' });
      showNotification('Disconnected', 'info');
    } catch (err: unknown) {
      showNotification(`Failed to disconnect: ${(err as Error).message}`, 'error');
    }
  };

  const updateArrangement = async (
    arr: ScreenArrangementType,
    vOffset?: number,
    hOffset?: number
  ) => {
    setScreenArrangement(arr);
    try {
      localStorage.setItem('airdesk_arrangement', JSON.stringify({ arr, vOffset, hOffset }));
    } catch {
      // ignore
    }
    await api.setScreenArrangement(arr, vOffset, hOffset);
  };

  const toggleActiveScreen = async () => {
    try {
      const next = await api.toggleActiveScreen();
      setStatus((prev) => ({ ...prev, active_screen: next }));
      showNotification(
        next === 'client'
          ? 'Switched to remote device. Move mouse or type.'
          : 'Returned to this computer.',
        'info'
      );
    } catch (err: unknown) {
      console.error('Failed to toggle screen:', err);
    }
  };

  const simulatePeerConnection = (device: DiscoveredDevice) => {
    api.simulatePeerConnect(device.device_name, device.os, device.ip);
    setStatus({
      mode: 'connected',
      peer_device: device.device_name,
      peer_ip: device.ip,
      peer_os: device.os,
      active_screen: 'host',
    });
    showNotification(`Connected with ${device.device_name}!`, 'success');
  };

  const updateMonitorBrightness = async (monitorId: string, brightness: number) => {
    await api.setMonitorBrightness(monitorId, brightness);
    setMonitors((prev) =>
      prev.map((m) => (m.id === monitorId ? { ...m, current_brightness: brightness } : m))
    );
  };

  const updateMonitorContrast = async (monitorId: string, contrast: number) => {
    await api.setMonitorContrast(monitorId, contrast);
    setMonitors((prev) =>
      prev.map((m) => (m.id === monitorId ? { ...m, current_contrast: contrast } : m))
    );
  };

  return {
    systemInfo,
    monitors,
    keyboards,
    hardwareMetrics,
    status,
    discoveredDevices,
    screenArrangement,
    mouseSharing,
    setMouseSharing,
    keyboardSharing,
    setKeyboardSharing,
    clipboardSharing,
    setClipboardSharing,
    keyboardMapping,
    setKeyboardMapping,
    notification,
    startHost,
    joinHost,
    disconnect,
    updateArrangement,
    toggleActiveScreen,
    simulatePeerConnection,
    updateMonitorBrightness,
    updateMonitorContrast,
    refreshHardware,
    isTauri: api.isTauriEnvironment(),
  };
}
