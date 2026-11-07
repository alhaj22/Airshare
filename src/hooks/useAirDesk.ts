import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/tauriBridge';
import type {
  ConnectionStatus,
  DiscoveredDevice,
  ScreenArrangementType,
  SystemInfo,
} from '../types';

export function useAirDesk() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    mode: 'idle',
    active_screen: 'host',
  });
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [screenArrangement, setScreenArrangement] =
    useState<ScreenArrangementType>('host_left_client_right');

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

  // Load system info once
  useEffect(() => {
    api.getSystemInfo().then(setSystemInfo).catch(console.error);
  }, []);

  // Reactive event listeners for session start/end
  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenEnd: (() => void) | undefined;

    api.onSessionStarted((session) => {
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
      autoConnectAttempted.current = false;
      showNotification('Session ended. Input sharing stopped.', 'info');
    }).then((unsub) => { unlistenEnd = unsub; });

    return () => {
      unlistenStart?.();
      unlistenEnd?.();
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

  // Auto-connect to discovered host
  const autoConnectAttempted = useRef(false);
  useEffect(() => {
    if (
      status.mode === 'connected' ||
      status.mode === 'client' ||
      autoConnectAttempted.current
    ) return;

    if (discoveredDevices.length > 0 && status.mode === 'idle') {
      const hostDev = discoveredDevices.find((d) => d.is_host);
      if (hostDev) {
        autoConnectAttempted.current = true;
        showNotification(`Auto-connecting to ${hostDev.device_name}…`, 'info');
        joinHost(hostDev.ip, 'auto_connect').catch(() => {
          autoConnectAttempted.current = false;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveredDevices, status.mode]);

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
      showNotification(`Key generated: ${res.pin}`, 'success');
    } catch (err: unknown) {
      showNotification(`Failed to host: ${(err as Error).message}`, 'error');
    }
  };

  const joinHost = async (hostIp: string, pin: string) => {
    try {
      showNotification('Connecting…', 'info');
      const session = await api.joinConnection(hostIp, pin);
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
      await api.disconnectAll();
      setStatus({ mode: 'idle', active_screen: 'host' });
      showNotification('Disconnected', 'info');
    } catch (err: unknown) {
      showNotification(`Failed to disconnect: ${(err as Error).message}`, 'error');
    }
  };

  const updateArrangement = async (arr: ScreenArrangementType, vOffset?: number) => {
    setScreenArrangement(arr);
    await api.setScreenArrangement(arr, vOffset);
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

  return {
    systemInfo,
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
    isTauri: api.isTauriEnvironment(),
  };
}
