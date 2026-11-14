import React, { useState } from 'react';
import { Search, ArrowRight, Loader2, Globe, AlertCircle, Wifi } from 'lucide-react';
import type { ConnectionStatus, DiscoveredDevice } from '../types';
import { OsIcon } from './OsIcon';

interface JoinSectionProps {
  status: ConnectionStatus;
  discoveredDevices: DiscoveredDevice[];
  onJoin: (hostIp: string, pin: string) => Promise<void>;
  onSimulateConnect?: (device: DiscoveredDevice) => void;
}

function getOsLabel(os: string) {
  const o = os.toLowerCase();
  if (o.includes('mac')) return 'macOS';
  if (o.includes('win')) return 'Windows';
  return 'Linux';
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

  const isConnected = status.mode === 'connected' && status.role === 'client';

  const handleJoin = async (ip?: string, autoPin?: string) => {
    const targetIp = ip || hostIp.trim();
    const targetPin = autoPin || pin.trim();

    if (!targetIp) {
      setError('Please enter host IP address');
      return;
    }
    if (!targetPin && targetPin !== 'auto_connect') {
      setError('Please enter 6-digit pairing PIN');
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
      handleJoin(device.ip, 'auto_connect');
    } else if (onSimulateConnect) {
      onSimulateConnect(device);
    }
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
              <Globe className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                Join Remote Host
              </h3>
              <p className="text-[11px] text-zinc-500">
                Connect using host IP and 6-digit PIN
              </p>
            </div>
          </div>

          {isConnected && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Joined
            </span>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                Host IP Address
              </label>
              <input
                type="text"
                value={hostIp}
                onChange={(e) => setHostIp(e.target.value)}
                placeholder="192.168.1.100"
                className="glass-input"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                6-Digit PIN
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="glass-input tracking-widest text-center"
                maxLength={6}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin();
                }}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={() => handleJoin()}
            disabled={loading}
            className="btn-action w-full justify-center !py-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Connect to Host</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Discovered Local Devices */}
        {discoveredDevices.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
                <span>Discovered Peers on LAN</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-white/[0.08] text-zinc-400">
                {discoveredDevices.length} found
              </span>
            </div>

            <div className="space-y-1.5">
              {discoveredDevices.map((device) => {
                const label = getOsLabel(device.os);
                return (
                  <div
                    key={device.device_id}
                    onClick={() => handleDeviceClick(device)}
                    className="glass-card p-2.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 flex-shrink-0">
                        <OsIcon os={device.os} className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">
                          {device.device_name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {label} • {device.ip}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {device.is_host ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-blue-500/30 bg-blue-500/10 text-blue-300">
                          Host
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-white/[0.08] text-zinc-400">
                          Peer
                        </span>
                      )}
                      <button className="text-[11px] text-zinc-300 hover:text-white px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08]">
                        Pair
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Note */}
      <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Wifi className="h-3 w-3" />
          Subnet: 255.255.255.0
        </span>
        <span>AES-GCM Authenticated</span>
      </div>
    </div>
  );
};
