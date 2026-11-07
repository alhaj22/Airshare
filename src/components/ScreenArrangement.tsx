import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ConnectionStatus, DiscoveredDevice, ScreenArrangementType, SystemInfo } from '../types';
import {
  Monitor,
  MousePointer2,
  Move,
  ChevronRight,
  Info,
  Check,
  Eye,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
} from 'lucide-react';

interface ScreenArrangementProps {
  status: ConnectionStatus;
  systemInfo: SystemInfo | null;
  arrangement: ScreenArrangementType;
  onArrangementChange: (arr: ScreenArrangementType, vOffsetRatio?: number, hOffsetRatio?: number) => void;
  onSimulateEdgeCross: () => void;
  onDeviceDrop?: (device: DiscoveredDevice) => void;
}

function getOsIcon(os?: string) {
  const o = (os || '').toLowerCase();
  if (o.includes('mac')) return '🍎';
  if (o.includes('win')) return '🪟';
  if (o.includes('linux')) return '🐧';
  return '💻';
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

  // Read saved offsets from localStorage if available
  const initialOffsets = (() => {
    try {
      const saved = localStorage.getItem('airdesk_arrangement');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          v: typeof parsed?.vOffset === 'number' ? parsed.vOffset * 100 : 0,
          h: typeof parsed?.hOffset === 'number' ? parsed.hOffset * 100 : 0,
        };
      }
    } catch {
      // ignore
    }
    return { v: 0, h: 0 };
  })();

  const [vOffsetPx, setVOffsetPx] = useState(initialOffsets.v);
  const [hOffsetPx, setHOffsetPx] = useState(initialOffsets.h);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showIdentify, setShowIdentify] = useState(false);
  const [snapGuide, setSnapGuide] = useState<'top' | 'center' | 'bottom' | 'left' | 'right' | null>(null);

  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartOffset = useRef<{ v: number; h: number }>({ v: 0, h: 0 });
  const currentArrangementRef = useRef<ScreenArrangementType>(arrangement);
  currentArrangementRef.current = arrangement;

  const hostName = systemInfo?.device_name || 'DESKTOP-H6EVCSJ';
  const hostOs = systemInfo?.os || 'Windows';
  const hostW = systemInfo?.screen_width || 1920;
  const hostH = systemInfo?.screen_height || 1080;

  const clientName = status.peer_device || (isConnected ? "Alhaj's MacBook Air" : 'Remote Display');
  const clientOs = status.peer_os || 'macos';
  const clientW = status.peer_screen_width || 1440;
  const clientH = status.peer_screen_height || 900;

  // Proportional sizing matching Windows Display Settings
  const hostAspect = hostW / hostH;
  const clientAspect = clientW / clientH;

  const SCREEN_A_W = 180;
  const SCREEN_A_H = Math.round(SCREEN_A_W / hostAspect); // e.g. 101px for 16:9

  const SCREEN_B_W = Math.round(180 * (clientW / hostW));
  const SCREEN_B_H = Math.round(SCREEN_B_W / clientAspect);

  const CANVAS_W = 540;
  const CANVAS_H = 260;

  // Reference center for Monitor A
  const hostCenterPos = {
    x: Math.round((CANVAS_W - SCREEN_A_W) / 2),
    y: Math.round((CANVAS_H - SCREEN_A_H) / 2),
  };

  const isHorizontal =
    arrangement === 'host_left_client_right' || arrangement === 'host_right_client_left';

  // Compute positions of Monitor A and Monitor B
  let hostPos = { ...hostCenterPos };
  let clientPos = { x: 0, y: 0 };

  switch (arrangement) {
    case 'host_left_client_right':
      clientPos = {
        x: hostPos.x + SCREEN_A_W,
        y: hostPos.y + vOffsetPx,
      };
      break;
    case 'host_right_client_left':
      clientPos = {
        x: hostPos.x - SCREEN_B_W,
        y: hostPos.y + vOffsetPx,
      };
      break;
    case 'host_top_client_bottom':
      clientPos = {
        x: hostPos.x + hOffsetPx,
        y: hostPos.y + SCREEN_A_H,
      };
      break;
    case 'host_bottom_client_top':
      clientPos = {
        x: hostPos.x + hOffsetPx,
        y: hostPos.y - SCREEN_B_H,
      };
      break;
  }

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = { v: vOffsetPx, h: hOffsetPx };
  };

  // Handle 2D Dragging with automatic quadrant detection & magnetic snapping
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      let nextArr = currentArrangementRef.current;
      let nextV = dragStartOffset.current.v;
      let nextH = dragStartOffset.current.h;
      let guide: 'top' | 'center' | 'bottom' | 'left' | 'right' | null = null;

      // 2D Direction Switching based on movement threshold
      if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        if (deltaX > 0) nextArr = 'host_left_client_right';
        else nextArr = 'host_right_client_left';
      } else if (Math.abs(deltaY) > 70 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
        if (deltaY > 0) nextArr = 'host_top_client_bottom';
        else nextArr = 'host_bottom_client_top';
      }

      if (nextArr === 'host_left_client_right' || nextArr === 'host_right_client_left') {
        let rawV = dragStartOffset.current.v + deltaY;
        const maxOffset = SCREEN_A_H - 20;
        const minOffset = -(SCREEN_B_H - 20);

        rawV = Math.max(minOffset, Math.min(maxOffset, rawV));

        // Magnetic snap points
        // 1. Top align (y = 0)
        if (Math.abs(rawV) < 8) {
          rawV = 0;
          guide = 'top';
        }
        // 2. Center align
        const centerOffset = Math.round((SCREEN_A_H - SCREEN_B_H) / 2);
        if (Math.abs(rawV - centerOffset) < 8) {
          rawV = centerOffset;
          guide = 'center';
        }
        // 3. Bottom align
        const bottomOffset = SCREEN_A_H - SCREEN_B_H;
        if (Math.abs(rawV - bottomOffset) < 8) {
          rawV = bottomOffset;
          guide = 'bottom';
        }

        nextV = rawV;
        setVOffsetPx(nextV);
        setSnapGuide(guide);

        const vRatio = nextV / SCREEN_A_H;
        onArrangementChange(nextArr, vRatio, 0);
      } else {
        let rawH = dragStartOffset.current.h + deltaX;
        const maxOffset = SCREEN_A_W - 20;
        const minOffset = -(SCREEN_B_W - 20);

        rawH = Math.max(minOffset, Math.min(maxOffset, rawH));

        // Magnetic snap points for horizontal
        if (Math.abs(rawH) < 8) {
          rawH = 0;
          guide = 'left';
        }
        const centerHOffset = Math.round((SCREEN_A_W - SCREEN_B_W) / 2);
        if (Math.abs(rawH - centerHOffset) < 8) {
          rawH = centerHOffset;
          guide = 'center';
        }
        const rightOffset = SCREEN_A_W - SCREEN_B_W;
        if (Math.abs(rawH - rightOffset) < 8) {
          rawH = rightOffset;
          guide = 'right';
        }

        nextH = rawH;
        setHOffsetPx(nextH);
        setSnapGuide(guide);

        const hRatio = nextH / SCREEN_A_W;
        onArrangementChange(nextArr, 0, hRatio);
      }

      currentArrangementRef.current = nextArr;
    },
    [isDragging, SCREEN_A_H, SCREEN_B_H, SCREEN_A_W, SCREEN_B_W, onArrangementChange]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setSnapGuide(null);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  }, [isDragging]);

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

  // Flash Identify Badges
  const triggerIdentify = () => {
    setShowIdentify(true);
    setTimeout(() => setShowIdentify(false), 3000);
  };

  // Quick alignment setters
  const applyAlignment = (type: 'top' | 'center' | 'bottom' | 'left' | 'right') => {
    if (isHorizontal) {
      let v = 0;
      if (type === 'top') v = 0;
      else if (type === 'center') v = Math.round((SCREEN_A_H - SCREEN_B_H) / 2);
      else if (type === 'bottom') v = SCREEN_A_H - SCREEN_B_H;
      setVOffsetPx(v);
      onArrangementChange(arrangement, v / SCREEN_A_H, 0);
    } else {
      let h = 0;
      if (type === 'left') h = 0;
      else if (type === 'center') h = Math.round((SCREEN_A_W - SCREEN_B_W) / 2);
      else if (type === 'right') h = SCREEN_A_W - SCREEN_B_W;
      setHOffsetPx(h);
      onArrangementChange(arrangement, 0, h / SCREEN_A_W);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const edgeGuide = {
    host_left_client_right: `Move mouse off the RIGHT edge of "${hostName}" to enter "${clientName}"`,
    host_right_client_left: `Move mouse off the LEFT edge of "${hostName}" to enter "${clientName}"`,
    host_top_client_bottom: `Move mouse off the BOTTOM edge of "${hostName}" to enter "${clientName}"`,
    host_bottom_client_top: `Move mouse off the TOP edge of "${hostName}" to enter "${clientName}"`,
  }[arrangement];

  return (
    <div className="card p-5 space-y-4">
      {/* ─── Top Control Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)' }}
          >
            <Monitor className="h-4 w-4" style={{ color: '#0ea5e9' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight" style={{ color: '#f1f5f9' }}>
                Virtual Monitor Arrangement
              </span>
              {isSaved && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Drag monitor <strong className="text-yellow-300">B</strong> to position relative to <strong className="text-sky-300">A</strong> (Windows Display Settings)
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Identify Button */}
          <button
            onClick={triggerIdentify}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            title="Identify displays on screen"
          >
            <Eye className="h-3.5 w-3.5 text-sky-400" />
            <span>Identify</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Quick preset positions */}
          <button
            onClick={() => {
              onArrangementChange('host_left_client_right', vOffsetPx / SCREEN_A_H, 0);
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 2000);
            }}
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-medium ${
              arrangement === 'host_left_client_right'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
            }`}
            title="A on Left, B on Right"
          >
            A ⟷ B
          </button>

          <button
            onClick={() => {
              onArrangementChange('host_right_client_left', vOffsetPx / SCREEN_A_H, 0);
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 2000);
            }}
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-medium ${
              arrangement === 'host_right_client_left'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
            }`}
            title="B on Left, A on Right"
          >
            B ⟷ A
          </button>

          <button
            onClick={() => {
              onArrangementChange('host_top_client_bottom', 0, hOffsetPx / SCREEN_A_W);
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 2000);
            }}
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-medium ${
              arrangement === 'host_top_client_bottom'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
            }`}
            title="A on Top, B on Bottom"
          >
            A ↕ B
          </button>

          <button
            onClick={() => {
              onArrangementChange('host_bottom_client_top', 0, hOffsetPx / SCREEN_A_W);
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 2000);
            }}
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-medium ${
              arrangement === 'host_bottom_client_top'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
            }`}
            title="B on Top, A on Bottom"
          >
            B ↕ A
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Alignment Buttons */}
          {isHorizontal ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyAlignment('top')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Align Top"
              >
                <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('center')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Align Center"
              >
                <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('bottom')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Align Bottom"
              >
                <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyAlignment('left')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Align Left"
              >
                <AlignHorizontalJustifyStart className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('center')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Align Center"
              >
                <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('right')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Align Right"
              >
                <AlignHorizontalJustifyEnd className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Windows Display Settings Canvas ─── */}
      <div
        className="relative rounded-xl overflow-hidden select-none"
        style={{
          width: '100%',
          height: `${CANVAS_H}px`,
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        {/* Subtle dot grid */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Magnetic Snap Alignment Guide Line */}
        {snapGuide && (
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              left:
                snapGuide === 'top' || snapGuide === 'center' || snapGuide === 'bottom'
                  ? '0px'
                  : `${hostPos.x}px`,
              top:
                snapGuide === 'top'
                  ? `${hostPos.y}px`
                  : snapGuide === 'center' && isHorizontal
                  ? `${hostPos.y + Math.round(SCREEN_A_H / 2)}px`
                  : snapGuide === 'bottom'
                  ? `${hostPos.y + SCREEN_A_H}px`
                  : snapGuide === 'center' && !isHorizontal
                  ? '0px'
                  : '0px',
              width:
                snapGuide === 'top' || snapGuide === 'center' || snapGuide === 'bottom'
                  ? '100%'
                  : '1px',
              height:
                snapGuide === 'left' || snapGuide === 'right'
                  ? '100%'
                  : '1px',
              borderTop: isHorizontal ? '1px dashed #38bdf8' : 'none',
              borderLeft: !isHorizontal ? '1px dashed #38bdf8' : 'none',
              opacity: 0.8,
            }}
          />
        )}

        {/* ─── Monitor A (Host / Primary) ─── */}
        <div
          style={{
            position: 'absolute',
            left: `${hostPos.x}px`,
            top: `${hostPos.y}px`,
            width: `${SCREEN_A_W}px`,
            height: `${SCREEN_A_H}px`,
            zIndex: 1,
          }}
        >
          <div
            className={`w-full h-full rounded shadow-md flex flex-col justify-between p-2.5 transition-all relative ${
              !isClientActive
                ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#0d1117]'
                : 'border border-blue-900/60'
            }`}
            style={{
              background: '#5d7ac9', // Authentic Windows Display Settings blue
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            }}
          >
            {/* Top row: Label + OS icon */}
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-white/90">
              <span className="flex items-center gap-1">
                <span>{getOsIcon(hostOs)}</span>
                <span>PRIMARY</span>
              </span>
              <span className="text-[9px] opacity-80">{hostW}×{hostH}</span>
            </div>

            {/* Center: Large circular "A" badge */}
            <div className="flex items-center justify-center">
              <div
                className={`flex items-center justify-center rounded-full bg-black text-white font-extrabold shadow-md transition-transform ${
                  showIdentify ? 'scale-125 ring-4 ring-yellow-400' : 'scale-100'
                }`}
                style={{
                  width: '38px',
                  height: '38px',
                  fontSize: '18px',
                }}
              >
                A
              </div>
            </div>

            {/* Bottom: Device Name */}
            <div className="text-center">
              <span className="text-[10px] font-semibold text-white/95 truncate block max-w-[160px] mx-auto tracking-tight">
                {hostName}
              </span>
            </div>

            {/* Active cursor indicator on Host */}
            {!isClientActive && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 text-[9px] text-sky-200">
                <MousePointer2 className="h-3 w-3 text-sky-300" />
                <span>Active</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Monitor B (Client / Remote) ─── Draggable */}
        <div
          style={{
            position: 'absolute',
            left: `${clientPos.x}px`,
            top: `${clientPos.y}px`,
            width: `${SCREEN_B_W}px`,
            height: `${SCREEN_B_H}px`,
            zIndex: 2,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'box-shadow 0.2s',
          }}
          onMouseDown={handleMouseDown}
        >
          <div
            className={`w-full h-full rounded shadow-md flex flex-col justify-between p-2.5 transition-all relative ${
              isClientActive
                ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0d1117]'
                : isDragging
                ? 'ring-2 ring-yellow-300 shadow-2xl'
                : 'border border-yellow-800/60'
            }`}
            style={{
              background: '#98a306', // Authentic Windows Display Settings olive/yellow-green
              boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.35)',
              opacity: isConnected ? 1 : 0.8,
            }}
          >
            {/* Top row: Label + OS icon */}
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-white/90">
              <span className="flex items-center gap-1">
                <span>{getOsIcon(clientOs)}</span>
                <span>{isConnected ? 'REMOTE' : 'CLIENT'}</span>
              </span>
              <span className="text-[9px] opacity-80">{clientW}×{clientH}</span>
            </div>

            {/* Center: Large circular "B" badge */}
            <div className="flex items-center justify-center relative">
              <div
                className={`flex items-center justify-center rounded-full bg-black text-white font-extrabold shadow-md transition-transform ${
                  showIdentify ? 'scale-125 ring-4 ring-yellow-400' : 'scale-100'
                }`}
                style={{
                  width: '38px',
                  height: '38px',
                  fontSize: '18px',
                }}
              >
                B
              </div>
            </div>

            {/* Bottom: Device Name */}
            <div className="text-center">
              <span className="text-[10px] font-semibold text-white/95 truncate block max-w-[160px] mx-auto tracking-tight">
                {clientName}
              </span>
            </div>

            {/* Drag Handle Indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 text-[9px] text-yellow-200">
              {isClientActive ? (
                <>
                  <MousePointer2 className="h-3 w-3 text-emerald-300" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <Move className="h-2.5 w-2.5" />
                  <span>Drag</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Touching Contact Seam Glowing Highlight ─── */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left:
              arrangement === 'host_left_client_right'
                ? `${hostPos.x + SCREEN_A_W - 1}px`
                : arrangement === 'host_right_client_left'
                ? `${hostPos.x - 1}px`
                : arrangement === 'host_top_client_bottom'
                ? `${Math.max(hostPos.x, clientPos.x)}px`
                : `${Math.max(hostPos.x, clientPos.x)}px`,
            top:
              arrangement === 'host_top_client_bottom'
                ? `${hostPos.y + SCREEN_A_H - 1}px`
                : arrangement === 'host_bottom_client_top'
                ? `${hostPos.y - 1}px`
                : `${Math.max(hostPos.y, clientPos.y)}px`,
            width: isHorizontal
              ? '3px'
              : `${Math.min(hostPos.x + SCREEN_A_W, clientPos.x + SCREEN_B_W) - Math.max(hostPos.x, clientPos.x)}px`,
            height: isHorizontal
              ? `${Math.min(hostPos.y + SCREEN_A_H, clientPos.y + SCREEN_B_H) - Math.max(hostPos.y, clientPos.y)}px`
              : '3px',
            background: 'linear-gradient(to right, #38bdf8, #10b981)',
            boxShadow: '0 0 10px #38bdf8',
            borderRadius: '2px',
          }}
        />
      </div>

      {/* ─── Bottom Status & Quick Switch ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
          <Info className="h-4 w-4 text-sky-400 flex-shrink-0" />
          <span>{edgeGuide}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Offset readout */}
          <div className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-white/5">
            {isHorizontal ? (
              <span>
                Vertical offset:{' '}
                <strong className={vOffsetPx === 0 ? 'text-sky-400' : 'text-yellow-400'}>
                  {vOffsetPx === 0 ? '0px (Aligned)' : `${vOffsetPx > 0 ? `+${vOffsetPx}` : vOffsetPx}px`}
                </strong>
              </span>
            ) : (
              <span>
                Horizontal offset:{' '}
                <strong className={hOffsetPx === 0 ? 'text-sky-400' : 'text-yellow-400'}>
                  {hOffsetPx === 0 ? '0px (Aligned)' : `${hOffsetPx > 0 ? `+${hOffsetPx}` : hOffsetPx}px`}
                </strong>
              </span>
            )}
          </div>

          {/* Quick toggle screen button */}
          <button
            onClick={onSimulateEdgeCross}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition-all cursor-pointer shadow-md"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{isClientActive ? 'Return to Host (A)' : 'Switch to Remote (B)'}</span>
          </button>
        </div>
      </div>

      <div className="text-[11px] font-mono text-center text-slate-500">
        Emergency Return Hotkey: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">Ctrl + Alt + Esc</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">Pause</kbd>
      </div>
    </div>
  );
};
