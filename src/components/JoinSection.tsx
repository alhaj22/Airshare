import React, { useState } from 'react';
import { Search, Zap, Wifi, ArrowRight, Loader2, Globe } from 'lucide-react';
import type { ConnectionStatus, DiscoveredDevice } from '../types';

interface JoinSectionProps {
  status: ConnectionStatus;
  discoveredDevices: DiscoveredDevice[];
  onJoin: (hostIp: string, pin: string) => Promise<void>;
  onSimulateConnect?: (device: DiscoveredDevice) => void;
}

function getOsLabel(os: string) {
  const o = os.toLowerCase();
  if (o.includes('mac')) return { icon: '🍎', label: 'macOS' };
  if (o.includes('win')) return { icon: '🪟', label: 'Windows' };
  return { icon: '🐧', label: 'Linux' };
}

export const JoinSection: React.FC<JoinSectionProps> = ({
  status,
  discoveredDevices,
  onJoin,
  onSimulateConnect,
}) => {
  const [hostIp, setHostIp] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isConnected = status.mode === 'connected';
  const isClient = status.role === 'client';

  const handleJoin = async (ip?: string, autoPin?: string) => {
    const targetIp = ip || hostIp.trim();
    const targetPin = autoPin || pin.trim();

    if (!targetIp) {
      setError('Enter the host IP address');
      return;
    }
    if (!targetPin && targetPin !== 'auto_connect') {
      setError('Enter the 6-digit pairing key');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onJoin(targetIp, targetPin);
    } catch (err: unknown) {
      setError((err as Error).message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceClick = (device: DiscoveredDevice) => {
    if (device.is_host) {
      // Auto-connect to host device
      onJoin(device.ip, 'auto_connect').catch(() => {});
    } else if (onSimulateConnect) {
      onSimulateConnect(device);
    }
  };

  return (
    <div className="card p-5 h-full flex flex-col">
      {/* Card Header */}
      <div
        className="flex items-center gap-3 pb-4 mb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <Globe className="h-4 w-4" style={{ color: '#10b981' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Join Host</h2>
          <p className="text-xs" style={{ color: '#64748b' }}>
            Enter host details or select a discovered device
          </p>
        </div>

        {isConnected && isClient && (
          <span className="ml-auto badge badge-success">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'dot-pulse-anim 2s infinite', marginRight: '4px' }} />
            Active
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Manual connect form */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#64748b' }}>
              Host IP Address
            </label>
            <input
              type="text"
              value={hostIp}
              onChange={(e) => setHostIp(e.target.value)}
              placeholder="192.168.1.100"
              className="input-field"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#64748b' }}>
              6-Digit Pairing Key
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="input-field tracking-[0.4em] text-center text-lg font-bold"
              maxLength={6}
              disabled={loading}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#f87171' }}>⚠ {error}</p>
          )}

          <button
            onClick={() => handleJoin()}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Connect
              </>
            )}
          </button>
        </div>

        {/* Discovered devices */}
        {discoveredDevices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-3.5 w-3.5" style={{ color: '#475569' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                Nearby Devices
              </span>
              <span className="ml-auto badge badge-muted">{discoveredDevices.length}</span>
            </div>

            <div className="space-y-2">
              {discoveredDevices.map((device) => {
                const { icon, label } = getOsLabel(device.os);
                return (
                  <button
                    key={device.device_id}
                    onClick={() => handleDeviceClick(device)}
                    className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-all duration-150 cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    }}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 text-lg"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
                        {device.device_name}
                      </p>
                      <p className="text-xs" style={{ color: '#64748b' }}>
                        {label} • {device.ip}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {device.is_host ? (
                        <span className="badge badge-info">
                          <Zap className="h-2.5 w-2.5" />
                          Host
                        </span>
                      ) : (
                        <span className="badge badge-muted">
                          <Wifi className="h-2.5 w-2.5" />
                          Peer
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
