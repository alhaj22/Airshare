import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Shield, Clock, Wifi, Users } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface HostSectionProps {
  status: ConnectionStatus;
  onStartHost: () => void;
  onDisconnect: () => void;
}

export const HostSection: React.FC<HostSectionProps> = ({ status, onStartHost, onDisconnect }) => {
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
    <div className="card p-5 h-full flex flex-col">
      {/* Card Header */}
      <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)' }}
        >
          <Shield className="h-4 w-4" style={{ color: '#0ea5e9' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Host Mode</h2>
          <p className="text-xs" style={{ color: '#64748b' }}>Generate a key to allow another device to connect</p>
        </div>

        <div className="ml-auto">
          {isHosting && (
            <span className="badge badge-warning">
              <span className="dot-pulse mr-1" style={{ background: '#f59e0b', width: '6px', height: '6px', display: 'inline-block', borderRadius: '50%' }} />
              Waiting…
            </span>
          )}
          {isConnected && status.role === 'host' && (
            <span className="badge badge-success">
              <span className="dot-pulse mr-1" style={{ background: '#10b981', width: '6px', height: '6px', display: 'inline-block', borderRadius: '50%' }} />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {!isHosting && !isConnected ? (
          /* Idle state */
          <div className="flex flex-col items-center justify-center flex-1 py-6 text-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}
            >
              <Wifi className="h-8 w-8" style={{ color: '#334155' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Not hosting</p>
              <p className="text-xs mt-1 max-w-[200px]" style={{ color: '#475569' }}>
                Start hosting to generate a secure 6-digit pairing key
              </p>
            </div>
            <button onClick={onStartHost} className="btn-primary">
              <RefreshCw className="h-4 w-4" />
              Start Hosting
            </button>
          </div>
        ) : isHosting ? (
          /* Hosting — PIN display */
          <div className="flex flex-col gap-5">
            {/* PIN Digits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                  Pairing Key
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#f59e0b' }}>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires {timeFormatted}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                {pin.split('').map((digit, idx) => (
                  <div key={idx} className="pin-digit">
                    {digit}
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div
                className="mt-3 h-1 w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #0ea5e9, #f59e0b)',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="btn-secondary flex-1"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Key'}
              </button>
              <button onClick={onStartHost} className="btn-secondary">
                <RefreshCw className="h-3.5 w-3.5" />
                New Key
              </button>
            </div>

            <div className="text-xs text-center" style={{ color: '#475569' }}>
              👉 Enter this key on the other computer to connect
            </div>
          </div>
        ) : (
          /* Connected as host */
          <div className="flex flex-col gap-4">
            <div
              className="flex items-center gap-3 rounded-lg p-3"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.12)' }}
              >
                <Users className="h-5 w-5" style={{ color: '#10b981' }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#f1f5f9' }}>
                  {status.peer_device || 'Remote Device'}
                </p>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {status.peer_ip} • {status.peer_os?.toUpperCase() || 'Unknown OS'}
                </p>
              </div>
            </div>

            <button onClick={onDisconnect} className="btn-danger w-full">
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
