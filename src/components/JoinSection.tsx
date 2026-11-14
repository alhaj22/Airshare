import React, { useState } from 'react';
import { Search, ArrowRight, Loader2, KeyRound, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ConnectionStatus, DiscoveredDevice } from '../types';
import { OsIcon } from './OsIcon';

interface JoinSectionProps {
  status: ConnectionStatus;
  discoveredDevices: DiscoveredDevice[];
  onJoin: (pin: string, hostIp?: string) => Promise<void>;
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
  const [pin, setPin] = useState('');
  const [customIp, setCustomIp] = useState('');
  const [showAdvancedIp, setShowAdvancedIp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isConnected = status.mode === 'connected' && status.role === 'client';

  const handleJoin = async (targetPinOverride?: string, ipOverride?: string) => {
    const targetPin = (targetPinOverride || pin).trim();
    const targetIp = (ipOverride || customIp).trim() || undefined;

    if (!targetPin && targetPin !== 'auto_connect') {
      setError('Please enter the 6-digit pairing PIN');
      return;
    }

    if (targetPin.length !== 6 && targetPin !== 'auto_connect') {
      setError('Pairing PIN must be exactly 6 digits');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onJoin(targetPin, targetIp);
    } catch (err: unknown) {
      setError((err as Error).message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceClick = (device: DiscoveredDevice) => {
    if (device.host_pin) {
      setPin(device.host_pin);
      handleJoin(device.host_pin, device.ip);
    } else if (device.is_host) {
      handleJoin('auto_connect', device.ip);
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
              <KeyRound className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                Connect with 6-Digit PIN
              </h3>
              <p className="text-[11px] text-zinc-500">
                Direct peer-to-peer pairing without typing IP addresses
              </p>
            </div>
          </div>

          {isConnected && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          )}
        </div>

        {/* 6-Digit PIN Input Form */}
        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-400">
                Enter Host 6-Digit Pairing Key
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {pin.length}/6 Digits
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPin(cleaned);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 6) {
                    handleJoin();
                  }
                }}
                placeholder="••••••"
                className="glass-input tracking-[0.55em] text-center font-mono font-bold text-xl !py-3 shadow-inner"
                disabled={loading}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
              Type the 6-digit key generated on the host computer. Devices locate and authenticate each other automatically.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={() => handleJoin()}
            disabled={loading || pin.length !== 6}
            className="btn-action w-full justify-center !py-2.5 text-xs font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Pairing with Host...</span>
              </>
            ) : (
              <>
                <span>Connect with PIN</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Optional Collapsed Advanced IP Section */}
        <div className="mt-4 pt-3 border-t border-white/[0.05]">
          <button
            type="button"
            onClick={() => setShowAdvancedIp(!showAdvancedIp)}
            className="flex items-center justify-between w-full text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <span>Advanced: Manual IP Override (Optional)</span>
            {showAdvancedIp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showAdvancedIp && (
            <div className="mt-2 space-y-1.5">
              <input
                type="text"
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                placeholder="192.168.1.100 (Leave blank for automatic lookup)"
                className="glass-input text-xs font-mono !py-1.5"
              />
              <p className="text-[10px] text-zinc-500">
                Only needed if your host is on a separate routed subnet or custom VPN.
              </p>
            </div>
          )}
        </div>

        {/* Discovered Nearby Devices */}
        {discoveredDevices.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
                <span>Detected Devices on Network</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-white/[0.08] text-zinc-400">
                {discoveredDevices.length} available
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-zinc-200 truncate">
                            {device.device_name}
                          </p>
                          {device.host_pin && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                              PIN Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="text-[11px] text-zinc-300 hover:text-white px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] font-medium transition-colors">
                        Connect
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
        <span>AES-256 Key Exchange</span>
        <span>Zero External Relay</span>
      </div>
    </div>
  );
};
