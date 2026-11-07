import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ConnectionStatus, DiscoveredDevice, ScreenArrangementType, SystemInfo } from '../types';
import { Monitor, ArrowLeftRight, ArrowUpDown, MousePointer2, Move, ChevronRight, Info } from 'lucide-react';

interface ScreenArrangementProps {
  status: ConnectionStatus;
  systemInfo: SystemInfo | null;
  arrangement: ScreenArrangementType;
  onArrangementChange: (arr: ScreenArrangementType, offsetRatio?: number) => void;
  onSimulateEdgeCross: () => void;
  onDeviceDrop?: (device: DiscoveredDevice) => void;
}

function getOsIcon(os: string) {
  const o = (os || '').toLowerCase();
  if (o.includes('mac')) return '🍎';
  if (o.includes('win')) return '🪟';
  return '🐧';
}

export const ScreenArrangement: React.FC<ScreenArrangementProps> = ({
  status,
  systemInfo,
  arrangement,
  onArrangementChange,
  onSimulateEdgeCross,
}) => {
  const isConnected = status.mode === 'connected';
  const isClientActive = status.active_screen === 'client';

  const [offsetPx, setOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartOffset = useRef(0);
  const currentArrangementRef = useRef<ScreenArrangementType>(arrangement);
  currentArrangementRef.current = arrangement;

  const hostName = systemInfo?.device_name || 'This Computer';
  const hostOs = systemInfo?.os || 'Windows';
  const hostW = systemInfo?.screen_width || 1920;
  const hostH = systemInfo?.screen_height || 1080;

  const clientName = status.peer_device || (isConnected ? 'Remote Computer' : 'Remote Display');
  const clientOs = status.peer_os || 'windows';
  const clientW = status.peer_screen_width || 1920;
  const clientH = status.peer_screen_height || 1080;

  const isHorizontal = arrangement === 'host_left_client_right' || arrangement === 'host_right_client_left';
  const isHostLeft = arrangement === 'host_left_client_right';
  const isHostTop = arrangement === 'host_top_client_bottom';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isConnected) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = offsetPx;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      let nextArr = currentArrangementRef.current;
      let nextOff = dragStartOffset.current;

      // Switch direction quadrant
      if (Math.abs(deltaX) > 100 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && nextArr === 'host_right_client_left') nextArr = 'host_left_client_right';
        else if (deltaX < 0 && nextArr === 'host_left_client_right') nextArr = 'host_right_client_left';
      } else if (Math.abs(deltaY) > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY > 0 && nextArr === 'host_bottom_client_top') nextArr = 'host_top_client_bottom';
        else if (deltaY < 0 && nextArr === 'host_top_client_bottom') nextArr = 'host_bottom_client_top';
      }

      // Fine alignment offset
      if (nextArr === 'host_left_client_right' || nextArr === 'host_right_client_left') {
        nextOff = Math.max(-60, Math.min(60, dragStartOffset.current + deltaY));
      } else {
        nextOff = Math.max(-60, Math.min(60, dragStartOffset.current + deltaX));
      }

      setOffsetPx(nextOff);
      onArrangementChange(nextArr, nextOff / 120);
    },
    [isDragging, onArrangementChange]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Arrangement quick buttons
  const arrangements: { key: ScreenArrangementType; icon: React.ReactNode; label: string }[] = [
    { key: 'host_left_client_right', icon: <ArrowLeftRight className="h-3.5 w-3.5" />, label: '← →' },
    { key: 'host_right_client_left', icon: <ArrowLeftRight className="h-3.5 w-3.5 rotate-180" />, label: '→ ←' },
    { key: 'host_top_client_bottom', icon: <ArrowUpDown className="h-3.5 w-3.5" />, label: '↑ ↓' },
    { key: 'host_bottom_client_top', icon: <ArrowUpDown className="h-3.5 w-3.5 rotate-180" />, label: '↓ ↑' },
  ];

  // Canvas layout: 2 screens side by side or stacked
  const CANVAS_W = 480;
  const CANVAS_H = 200;
  const SCREEN_W = 160;
  const SCREEN_H = 100;
  const GAP = 20;

  // Calculate positions on canvas
  let hostPos = { x: 0, y: 0 };
  let clientPos = { x: 0, y: 0 };

  if (isHorizontal) {
    const totalW = SCREEN_W * 2 + GAP;
    const startX = (CANVAS_W - totalW) / 2;
    const centerY = (CANVAS_H - SCREEN_H) / 2;
    if (isHostLeft) {
      hostPos = { x: startX, y: centerY };
      clientPos = { x: startX + SCREEN_W + GAP, y: centerY + offsetPx * 0.4 };
    } else {
      clientPos = { x: startX, y: centerY + offsetPx * 0.4 };
      hostPos = { x: startX + SCREEN_W + GAP, y: centerY };
    }
  } else {
    const totalH = SCREEN_H * 2 + GAP;
    const startY = (CANVAS_H - totalH) / 2;
    const centerX = (CANVAS_W - SCREEN_W) / 2;
    if (isHostTop) {
      hostPos = { x: centerX, y: startY };
      clientPos = { x: centerX + offsetPx * 0.4, y: startY + SCREEN_H + GAP };
    } else {
      clientPos = { x: centerX, y: startY };
      hostPos = { x: centerX + offsetPx * 0.4, y: startY + SCREEN_H + GAP };
    }
  }

  const edgeGuide = {
    'host_left_client_right': `Move mouse off the right edge of "${hostName}" to control "${clientName}"`,
    'host_right_client_left': `Move mouse off the left edge of "${hostName}" to control "${clientName}"`,
    'host_top_client_bottom': `Move mouse off the bottom edge of "${hostName}" to control "${clientName}"`,
    'host_bottom_client_top': `Move mouse off the top edge of "${hostName}" to control "${clientName}"`,
  }[arrangement];

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)' }}
          >
            <Monitor className="h-4 w-4" style={{ color: '#0ea5e9' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Screen Arrangement</span>
          {!isConnected && (
            <span className="badge badge-muted text-xs">Connect first to rearrange</span>
          )}
        </div>

        {/* Arrangement quick-select */}
        <div className="flex items-center gap-1">
          {arrangements.map((a) => (
            <button
              key={a.key}
              onClick={() => onArrangementChange(a.key, offsetPx / 120)}
              title={a.key.replace(/_/g, ' ')}
              className={`flex items-center justify-center rounded px-2 py-1 text-xs transition-all cursor-pointer ${
                arrangement === a.key
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10'
              }`}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: '100%',
          height: `${CANVAS_H + 20}px`,
          background: 'radial-gradient(ellipse at center, rgba(14,165,233,0.04) 0%, transparent 70%), #0a0d12',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Grid dots */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Responsive scaling wrapper */}
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            style={{
              position: 'relative',
              width: `${CANVAS_W}px`,
              height: `${CANVAS_H}px`,
              transform: 'scale(var(--canvas-scale, 0.9))',
            }}
          >
            {/* Host Screen */}
            <div
              style={{
                position: 'absolute',
                left: `${hostPos.x}px`,
                top: `${hostPos.y}px`,
                width: `${SCREEN_W}px`,
                height: `${SCREEN_H}px`,
                transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <div
                className={`w-full h-full rounded-lg flex flex-col items-center justify-between p-2 ${
                  !isClientActive ? 'monitor-box host-active' : 'monitor-box'
                }`}
                style={{
                  background: !isClientActive
                    ? 'linear-gradient(145deg, #0c2340 0%, #0f1a2e 100%)'
                    : 'linear-gradient(145deg, #131d2e 0%, #0f1319 100%)',
                }}
              >
                <div className="w-full flex items-center justify-between">
                  <span className="text-[9px] font-mono text-sky-400 font-bold">HOST</span>
                  <span className="text-[9px]">{getOsIcon(hostOs)}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  {!isClientActive && (
                    <MousePointer2 className="h-3.5 w-3.5 text-sky-400" />
                  )}
                  <span className="text-[8px] text-center text-slate-400 leading-tight max-w-[90px] truncate font-mono">
                    {hostName}
                  </span>
                </div>
                <div className="text-[8px] font-mono" style={{ color: '#475569' }}>
                  {hostW}×{hostH}
                </div>
              </div>
            </div>

            {/* Client Screen — Draggable */}
            <div
              style={{
                position: 'absolute',
                left: `${clientPos.x}px`,
                top: `${clientPos.y}px`,
                width: `${SCREEN_W}px`,
                height: `${SCREEN_H}px`,
                transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                cursor: isConnected ? (isDragging ? 'grabbing' : 'grab') : 'default',
                zIndex: 2,
              }}
              onMouseDown={handleMouseDown}
            >
              <div
                className={`w-full h-full rounded-lg flex flex-col items-center justify-between p-2 ${
                  isClientActive ? 'monitor-box client-active' : 'monitor-box'
                }`}
                style={{
                  background: isConnected
                    ? isClientActive
                      ? 'linear-gradient(145deg, #0a2a1c 0%, #0d1f17 100%)'
                      : 'linear-gradient(145deg, #1a2030 0%, #131720 100%)'
                    : 'linear-gradient(145deg, #111520 0%, #0d1018 100%)',
                  opacity: isConnected ? 1 : 0.4,
                }}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className="text-[9px] font-mono font-bold"
                    style={{ color: isConnected ? '#10b981' : '#475569' }}
                  >
                    {isConnected ? 'CLIENT' : 'OFFLINE'}
                  </span>
                  <span className="text-[9px]">{isConnected ? getOsIcon(clientOs) : '⚫'}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  {isClientActive && (
                    <MousePointer2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  {isConnected && (
                    <Move className="h-2.5 w-2.5 text-slate-500" />
                  )}
                  <span className="text-[8px] text-center text-slate-400 leading-tight max-w-[90px] truncate font-mono">
                    {isConnected ? clientName : 'Not Connected'}
                  </span>
                </div>
                <div className="text-[8px] font-mono" style={{ color: '#475569' }}>
                  {isConnected ? `${clientW}×${clientH}` : '— ×—'}
                </div>
              </div>
            </div>

            {/* Connection bridge line */}
            {isConnected && (
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {isHorizontal ? (
                  <>
                    <line
                      x1={isHostLeft ? hostPos.x + SCREEN_W : clientPos.x + SCREEN_W}
                      y1={isHostLeft ? hostPos.y + SCREEN_H / 2 : clientPos.y + SCREEN_H / 2}
                      x2={isHostLeft ? clientPos.x : hostPos.x}
                      y2={isHostLeft ? clientPos.y + SCREEN_H / 2 : hostPos.y + SCREEN_H / 2}
                      stroke="rgba(14,165,233,0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  </>
                ) : (
                  <>
                    <line
                      x1={isHostTop ? hostPos.x + SCREEN_W / 2 : clientPos.x + SCREEN_W / 2}
                      y1={isHostTop ? hostPos.y + SCREEN_H : clientPos.y + SCREEN_H}
                      x2={isHostTop ? clientPos.x + SCREEN_W / 2 : hostPos.x + SCREEN_W / 2}
                      y2={isHostTop ? clientPos.y : hostPos.y}
                      stroke="rgba(14,165,233,0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  </>
                )}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Guide + switch button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs" style={{ color: '#64748b' }}>
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-sky-500" />
          <span>
            {isConnected
              ? edgeGuide
              : 'Connect two computers to arrange their screens and enable seamless mouse movement.'}
          </span>
        </div>

        {isConnected && (
          <button
            onClick={onSimulateEdgeCross}
            className="btn-secondary whitespace-nowrap text-xs px-3 py-1.5"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            {isClientActive ? 'Return to Host' : 'Switch to Remote'}
          </button>
        )}
      </div>

      {isConnected && (
        <div className="text-xs font-mono text-center" style={{ color: '#334155' }}>
          Offset: {offsetPx > 0 ? `+${offsetPx}px` : `${offsetPx}px`} •
          Emergency return: <kbd className="px-1 rounded bg-slate-800 text-slate-400">Ctrl+Alt+Esc</kbd>
        </div>
      )}
    </div>
  );
};
