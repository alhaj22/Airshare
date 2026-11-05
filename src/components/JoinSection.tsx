import React, { useRef, useState } from 'react';
import { LogIn, Wifi, Laptop, Monitor, Sparkles, Loader2 } from 'lucide-react';
import type { DiscoveredDevice } from '../types';

interface JoinSectionProps {
  discoveredDevices: DiscoveredDevice[];
  onJoin: (hostIp: string, pin: string) => Promise<void>;
  onSimulateConnect?: (dev: DiscoveredDevice) => void;
  isConnecting?: boolean;
}

export const JoinSection: React.FC<JoinSectionProps> = ({
  discoveredDevices,
  onJoin,
  onSimulateConnect,
}) => {
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [manualIp, setManualIp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric digits
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned && val !== '') return;

    const newDigits = [...pinDigits];
    newDigits[index] = cleaned.slice(-1);
    setPinDigits(newDigits);
    setErrorMsg(null);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...pinDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setPinDigits(newDigits);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  };

  const handleConnect = async () => {
    const fullPin = pinDigits.join('');
    if (fullPin.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the Connection Key');
      return;
    }

    const targetIp = selectedIp || manualIp || '192.168.1.102';
    setLoading(true);
    setErrorMsg(null);

    try {
      await onJoin(targetIp, fullPin);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <LogIn className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Join Connection</h2>
          <p className="text-xs text-slate-400">
            Connect to Host laptop using the 6-digit key
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {/* Discovered Devices on Wi-Fi */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Discovered Devices on Wi-Fi
            </span>
            <span className="flex items-center gap-1 text-[11px] text-cyan-400">
              <Wifi className="h-3 w-3" />
              <span>Auto-detect active</span>
            </span>
          </div>

          <div className="space-y-2">
            {discoveredDevices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                Scanning local Wi-Fi for nearby AirDesk laptops...
              </div>
            ) : (
              discoveredDevices.map((dev) => (
                <div
                  key={dev.device_id}
                  onClick={() => setSelectedIp(dev.ip)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                    selectedIp === dev.ip
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-white/5 bg-slate-950/40 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                      {dev.os === 'macos' ? (
                        <Laptop className="h-4 w-4 text-purple-400" />
                      ) : (
                        <Monitor className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {dev.device_name}
                        </span>
                        {dev.is_host && (
                          <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                            Host Ready
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {dev.ip}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSimulateConnect && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSimulateConnect(dev);
                        }}
                        title="Simulate quick connection in preview"
                        className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span>Pair</span>
                      </button>
                    )}
                    <span
                      className={`text-xs font-medium ${
                        selectedIp === dev.ip ? 'text-indigo-400' : 'text-slate-500'
                      }`}
                    >
                      {selectedIp === dev.ip ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 6-Digit PIN Entry */}
        <div>
          <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Enter 6-Digit Connection Key
          </label>
          <div
            className="flex items-center justify-center gap-2 sm:gap-3"
            onPaste={handlePaste}
          >
            {pinDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-white/10 bg-slate-950/80 text-center font-mono text-xl sm:text-2xl font-bold text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            ))}
          </div>

          {errorMsg && (
            <p className="mt-2 text-center text-xs font-medium text-rose-400">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Manual Host IP (Optional) */}
        {!selectedIp && (
          <div>
            <label className="block mb-1 text-xs text-slate-400">
              Host IP Address (Optional / Manual):
            </label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.102"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {/* Connect Action Button */}
        <button
          onClick={handleConnect}
          disabled={loading || pinDigits.join('').length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying & Connecting...</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Connect to Host</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
