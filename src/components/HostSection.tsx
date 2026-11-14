import React, { useState } from 'react';
import { Copy, Check, RotateCw, Shield, Clock, Users, ArrowUpRight } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface HostSectionProps {
  status: ConnectionStatus;
  onStartHost: () => void;
  onDisconnect?: () => void;
}

export const HostSection: React.FC<HostSectionProps> = ({
  status,
  onStartHost,
  onDisconnect,
}) => {
  const [copied, setCopied] = useState(false);

  const isHosting = status.mode === 'hosting';
  const isConnected = status.mode === 'connected' && status.role === 'host';
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
    <div className="glass-panel p-5 h-full flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                Host Mode (PIN Server)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Generate secure 6-digit session pin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isHosting && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Listening
              </span>
            )}
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Host Active
              </span>
            )}
          </div>
        </div>

        {/* Dynamic State Body */}
        {!isHosting && !isConnected ? (
          <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Start hosting to allow other computers on this Wi-Fi / LAN to connect mouse and keyboard input with zero cloud relay.
            </p>
            <button onClick={onStartHost} className="btn-action mt-2">
              <RotateCw className="h-3.5 w-3.5" />
              <span>Generate Pairing PIN</span>
            </button>
          </div>
        ) : isHosting ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                Pairing PIN
              </span>
              <div className="flex items-center gap-1 text-xs font-mono text-amber-400/90">
                <Clock className="h-3 w-3" />
                <span>{timeFormatted}</span>
              </div>
            </div>

            {/* Glass Digit Tiles */}
            <div className="flex items-center justify-center gap-2">
              {pin.split('').map((digit, idx) => (
                <div key={idx} className="pin-tile">
                  {digit}
                </div>
              ))}
            </div>

            {/* Subtle Progress Bar */}
            <div className="h-0.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/40 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCopy}
                className="btn-ghost flex-1 justify-center !py-2"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy PIN'}</span>
              </button>

              <button
                onClick={onStartHost}
                className="btn-ghost !py-2 px-3"
                title="Generate new PIN"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-3 py-2">
            <div className="glass-card p-3 flex items-center justify-between border-emerald-500/20 bg-emerald-500/[0.03]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-100">
                    {status.peer_device || 'Connected Client'}
                  </h4>
                  <p className="text-[11px] font-mono text-zinc-400">
                    {status.peer_ip} • {status.peer_os?.toUpperCase()}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300">
                P2P OK
              </span>
            </div>

            {onDisconnect && (
              <button onClick={onDisconnect} className="btn-danger w-full justify-center !py-2">
                End Hosting Session
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Info Note */}
      <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500">
        <span>Port: 42426 (Direct LAN)</span>
        <span className="flex items-center gap-1 hover:text-zinc-400 transition-colors">
          End-to-End P2P <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
};
