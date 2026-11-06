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

  // Feature Toggles
  const [mouseSharing, setMouseSharing] = useState<boolean>(true);
  const [keyboardSharing, setKeyboardSharing] = useState<boolean>(true);
  const [clipboardSharing, setClipboardSharing] = useState<boolean>(true);

  // Status message / toast
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

  // Load initial system info
  useEffect(() => {
    api.getSystemInfo().then(setSystemInfo);
  }, []);

  // Reactive Event Listeners for Session Start and End
  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenEnd: (() => void) | undefined;

    api.onSessionStarted((session) => {
      setStatus({
        mode: 'connected',
        session,
        peer_device: session.peer_name,
        peer_ip: session.peer_ip,
        peer_os: (session.peer_os.toLowerCase().includes('mac')
          ? 'macos'
          : session.peer_os.toLowerCase().includes('win')
          ? 'windows'
          : 'linux'),
        role: session.role,
        active_screen: 'host',
      });
      showNotification(`Session connected with ${session.peer_name}!`, 'success');
    }).then((unsub) => {
      unlistenStart = unsub;
    });

    api.onSessionEnded(() => {
      setStatus({
        mode: 'idle',
        active_screen: 'host',
      });
      autoConnectAttempted.current = false;
      showNotification('Session ended. Keyboard and mouse sharing stopped.', 'info');
    }).then((unsub) => {
      unlistenEnd = unsub;
    });

    return () => {
      if (unlistenStart) unlistenStart();
      if (unlistenEnd) unlistenEnd();
    };
  }, [showNotification]);

  // Poll connection status and discovery
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

  // Auto-Connect for trusted devices on local Wi-Fi
  const autoConnectAttempted = useRef<boolean>(false);

  useEffect(() => {
    if (status.mode === 'connected' || status.mode === 'client' || autoConnectAttempted.current) {
      return;
    }

    if (discoveredDevices.length > 0 && status.mode === 'idle') {
      const hostDev = discoveredDevices.find((d) => d.is_host);
      if (hostDev) {
        autoConnectAttempted.current = true;
        showNotification(`Auto-connecting with ${hostDev.device_name}...`, 'info');
        joinHost(hostDev.ip, 'auto_connect').catch(() => {
          autoConnectAttempted.current = false;
        });
      }
    }
  }, [discoveredDevices, status.mode]);

  // Action: Create connection as Host
  const startHost = async () => {
    try {
      const res = await api.createConnectionPin();
      setStatus((prev) => ({
        ...prev,
        mode: 'hosting',
        pin: res.pin,
        pin_remaining_seconds: res.expires_in_seconds,
      }));
      showNotification(`6-Digit Key Generated: ${res.pin}`, 'success');
    } catch (err: unknown) {
      showNotification(`Failed to host: ${(err as Error).message}`, 'error');
    }
  };

  // Action: Join connection as Client
  const joinHost = async (hostIp: string, pin: string) => {
    try {
      showNotification('Verifying 6-Digit Key and connecting...', 'info');
      const session = await api.joinConnection(hostIp, pin);
      setStatus({
        mode: 'connected',
        session,
        peer_device: session.peer_name,
        peer_ip: session.peer_ip,
        peer_os: (session.peer_os.toLowerCase().includes('mac')
          ? 'macos'
          : session.peer_os.toLowerCase().includes('win')
          ? 'windows'
          : 'linux'),
        role: session.role,
        active_screen: 'host',
      });
      showNotification(`Connected with ${session.peer_name}! Mouse and keyboard sharing active.`, 'success');
    } catch (err: unknown) {
      showNotification(`Connection failed: ${(err as Error).message}`, 'error');
      throw err;
    }
  };

  // Action: Disconnect
  const disconnect = async () => {
    try {
      await api.disconnectAll();
      setStatus({
        mode: 'idle',
        active_screen: 'host',
      });
      showNotification('Disconnected', 'info');
    } catch (err: unknown) {
      showNotification(`Failed to disconnect: ${(err as Error).message}`, 'error');
    }
  };

  // Action: Switch arrangement
  const updateArrangement = async (arr: ScreenArrangementType, vOffset?: number) => {
    setScreenArrangement(arr);
    await api.setScreenArrangement(arr, vOffset);
  };

  // Cursor switch (switches control to remote computer or back to local computer)
  const toggleActiveScreen = async () => {
    try {
      const next = await api.toggleActiveScreen();
      setStatus((prev) => ({ ...prev, active_screen: next }));
      showNotification(
        next === 'client'
          ? 'Switched control to remote device! Move mouse or type.'
          : 'Returned control to this laptop.',
        'info'
      );
    } catch (err: unknown) {
      console.error('Failed to toggle screen:', err);
    }
  };

  // Simulate remote connection (for web preview)
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
