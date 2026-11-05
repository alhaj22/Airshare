import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Power, Shield, Clock, Laptop } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface HostSectionProps {
  status: ConnectionStatus;
  onStartHost: () => void;
  onDisconnect: () => void;
}

export const HostSection: React.FC<HostSectionProps> = ({
  status,
  onStartHost,
  onDisconnect,
}) => {
  const [copied, setCopied] = useState(false);

  const isHosting = status.mode === 'hosting';
  const isConnected = status.mode === 'connected';
  const pin = status.pin || '';
  const remaining = status.pin_remaining_seconds ?? 300;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const progressPercent = Math.max(0, Math.min(100, (remaining / 300) * 100));

  const handleCopy = () => {
    if (pin) {
      navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Host Laptop</h2>
            <p className="text-xs text-slate-400">
              Provide connection key for other devices to control or join
            </p>
          </div>
        </div>

        {isConnected && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition cursor-pointer"
          >
            <Power className="h-3.5 w-3.5" />
            <span>Disconnect</span>
          </button>
        )}
      </div>

      <div className="mt-5">
        {!isHosting && !isConnected ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="mb-4 max-w-sm text-xs leading-relaxed text-slate-400">
              Click below to generate a temporary, secure 6-digit key. Your MacBook can use this key to connect instantly.
            </p>
            <button
              onClick={onStartHost}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Create Connection</span>
            </button>
          </div>
        ) : isHosting ? (
          <div className="space-y-5">
            {/* 6-Digit Display */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Pairing Key (6 Digits)
                </span>
                <div className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires in {timeFormatted}</span>
                </div>
              </div>

              {/* Digits Display */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-3">
                {pin.split('').map((digit, idx) => (
                  <div
                    key={idx}
                    className="flex h-14 w-11 sm:h-16 sm:w-13 items-center justify-center rounded-xl border border-cyan-500/30 bg-slate-950/80 font-mono text-2xl sm:text-3xl font-extrabold text-cyan-300 shadow-inner shadow-cyan-500/10"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              {/* Countdown progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800 mt-2">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Actions & Instructions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400">
                👉 Enter this 6-digit key on your MacBook Air M1 under <strong className="text-slate-200">Join Connection</strong>.
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onStartHost}
                  title="Generate a new key"
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Connected State */
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-300">Device Paired & Connected</p>
                <p className="text-sm font-bold text-white">
                  {status.peer_device || 'MacBook Air M1'}
                </p>
                <p className="text-xs text-slate-400 font-mono">{status.peer_ip}</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              Active Sharing
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
