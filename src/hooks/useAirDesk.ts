import { useCallback, useEffect, useState } from 'react';
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
      await api.joinConnection(hostIp, pin);
      const currStatus = await api.getConnectionStatus();
      setStatus(currStatus);
      showNotification('Connected successfully! Mouse and keyboard sharing active.', 'success');
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
  const updateArrangement = async (arr: ScreenArrangementType) => {
    setScreenArrangement(arr);
    await api.setScreenArrangement(arr);
    showNotification('Screen layout updated', 'info');
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
