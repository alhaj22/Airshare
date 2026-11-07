import React from 'react';
import { Zap, Monitor, Wifi, ChevronDown } from 'lucide-react';
import type { ConnectionStatus, SystemInfo } from '../types';

interface HeaderProps {
  systemInfo: SystemInfo | null;
  status: ConnectionStatus;
  onToggleActiveScreen: () => void;
}

function getOsIcon(os: string) {
  const o = (os || '').toLowerCase();
  if (o.includes('mac')) return '🍎';
  if (o.includes('win')) return '🪟';
  return '🐧';
}

function getStatusInfo(status: ConnectionStatus) {
  switch (status.mode) {
    case 'connected':
      return {
        dot: '#10b981',
        label: 'Connected',
        pulse: true,
      };
    case 'hosting':
      return {
        dot: '#f59e0b',
        label: 'Waiting for client…',
        pulse: true,
      };
    case 'client':
      return {
        dot: '#0ea5e9',
        label: 'Joining…',
        pulse: true,
      };
    default:
      return {
        dot: '#334155',
        label: 'Not connected',
        pulse: false,
      };
  }
}

export const Header: React.FC<HeaderProps> = ({ systemInfo, status, onToggleActiveScreen }) => {
  const { dot, label, pulse } = getStatusInfo(status);
  const isConnected = status.mode === 'connected';

  return (
    <header
      className="flex items-center justify-between px-5 py-3 select-none"
      style={{
        background: 'rgba(10,13,18,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left — Brand */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            boxShadow: '0 2px 10px rgba(14,165,233,0.4)',
          }}
        >
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold" style={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>
            AirDesk
          </span>
          <span
            className="text-[10px] font-mono rounded px-1.5 py-0.5"
            style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
          >
            KVM
          </span>
        </div>
      </div>

      {/* Center — Status */}
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            background: dot,
            boxShadow: pulse ? `0 0 6px ${dot}` : 'none',
            animation: pulse ? 'dot-pulse-anim 2s ease-in-out infinite' : 'none',
          }}
        />
        <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>

        {isConnected && (
          <>
            <span style={{ color: '#1e293b' }}>•</span>
            <button
              onClick={onToggleActiveScreen}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: status.active_screen === 'client'
                  ? 'rgba(16,185,129,0.12)'
                  : 'rgba(14,165,233,0.12)',
                color: status.active_screen === 'client' ? '#6ee7b7' : '#7dd3fc',
                border: `1px solid ${status.active_screen === 'client' ? 'rgba(16,185,129,0.25)' : 'rgba(14,165,233,0.25)'}`,
              }}
            >
              <Monitor className="h-3 w-3" />
              <span>
                {status.active_screen === 'client'
                  ? `Remote: ${status.peer_device || 'Remote'}`
                  : 'Local: This Computer'}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      {/* Right — Device info */}
      <div className="flex items-center gap-2">
        {systemInfo?.local_ip && (
          <div
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#475569',
            }}
          >
            <Wifi className="h-3 w-3" />
            <span className="font-mono">{systemInfo.local_ip}</span>
          </div>
        )}
        {systemInfo && (
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#64748b',
            }}
          >
            <span>{getOsIcon(systemInfo.os)}</span>
            <span className="max-w-[120px] truncate">{systemInfo.device_name}</span>
          </div>
        )}
      </div>
    </header>
  );
};
