import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ConnectionStatus, DiscoveredDevice, ScreenArrangementType, SystemInfo } from '../types';
import { OsIcon } from './OsIcon';
import {
  Monitor,
  MousePointer2,
  Move,
  ChevronRight,
  Check,
  Eye,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  Sparkles,
} from 'lucide-react';

interface ScreenArrangementProps {
  status: ConnectionStatus;
  systemInfo: SystemInfo | null;
  arrangement: ScreenArrangementType;
  onArrangementChange: (arr: ScreenArrangementType, vOffsetRatio?: number, hOffsetRatio?: number) => void;
  onSimulateEdgeCross: () => void;
  onDeviceDrop?: (device: DiscoveredDevice) => void;
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

  const hostName = systemInfo?.device_name || 'Host Computer';
  const hostOs = systemInfo?.os || 'Windows';
  const hostW = systemInfo?.screen_width || 1920;
  const hostH = systemInfo?.screen_height || 1080;

  const clientName = status.peer_device || (isConnected ? 'Remote Device' : 'Client Display');
  const clientOs = status.peer_os || 'macos';
  const clientW = status.peer_screen_width || 1440;
  const clientH = status.peer_screen_height || 900;

  // Proportional sizing matching display dimensions
  const hostAspect = hostW / hostH;
  const clientAspect = clientW / clientH;

  const SCREEN_A_W = 180;
  const SCREEN_A_H = Math.round(SCREEN_A_W / hostAspect);

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
        if (Math.abs(rawV) < 8) {
          rawV = 0;
          guide = 'top';
        }
        const centerOffset = Math.round((SCREEN_A_H - SCREEN_B_H) / 2);
        if (Math.abs(rawV - centerOffset) < 8) {
          rawV = centerOffset;
          guide = 'center';
        }
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
    host_left_client_right: `Move cursor off the RIGHT boundary of ${hostName} to control ${clientName}`,
    host_right_client_left: `Move cursor off the LEFT boundary of ${hostName} to control ${clientName}`,
    host_top_client_bottom: `Move cursor off the BOTTOM boundary of ${hostName} to control ${clientName}`,
    host_bottom_client_top: `Move cursor off the TOP boundary of ${hostName} to control ${clientName}`,
  }[arrangement];

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* ─── Top Control Header (Linear Style) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
            <Monitor className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                Virtual Display Canvas
              </h3>
              {isSaved && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                  <Check className="h-2.5 w-2.5" /> Saved
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              Drag Display B around A to configure seamless mouse edge boundaries
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Identify Button */}
          <button
            onClick={triggerIdentify}
            className="btn-ghost !py-1 !px-2.5 text-xs"
            title="Identify displays on screen"
          >
            <Eye className="h-3 w-3 text-zinc-400" />
            <span>Identify</span>
          </button>

          <div className="h-3 w-[1px] bg-white/[0.08] mx-1" />

          {/* Quick preset positions */}
          <button
            onClick={() => {
              onArrangementChange('host_left_client_right', vOffsetPx / SCREEN_A_H, 0);
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 2000);
            }}
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-mono text-[11px] ${
              arrangement === 'host_left_client_right'
                ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
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
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-mono text-[11px] ${
              arrangement === 'host_right_client_left'
                ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
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
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-mono text-[11px] ${
              arrangement === 'host_top_client_bottom'
                ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
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
            className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer font-mono text-[11px] ${
              arrangement === 'host_bottom_client_top'
                ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
            title="B on Top, A on Bottom"
          >
            B ↕ A
          </button>

          <div className="h-3 w-[1px] bg-white/[0.08] mx-1" />

          {/* Alignment Buttons */}
          {isHorizontal ? (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => applyAlignment('top')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
                title="Align Top"
              >
                <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('center')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
                title="Align Center"
              >
                <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('bottom')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
                title="Align Bottom"
              >
                <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => applyAlignment('left')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
                title="Align Left"
              >
                <AlignHorizontalJustifyStart className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('center')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
                title="Align Center"
              >
                <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => applyAlignment('right')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
                title="Align Right"
              >
                <AlignHorizontalJustifyEnd className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Ultra-Minimal Obsidian Glass Workspace Canvas ─── */}
      <div
        className="relative rounded-xl overflow-hidden select-none"
        style={{
          width: '100%',
          height: `${CANVAS_H}px`,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(20, 24, 33, 0.6) 0%, rgba(9, 10, 14, 0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        {/* Subtle grid crosshairs */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="canvas-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#canvas-grid)" />
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
                  : '0px',
              width:
                snapGuide === 'top' || snapGuide === 'center' || snapGuide === 'bottom'
                  ? '100%'
                  : '1px',
              height:
                snapGuide === 'left' || snapGuide === 'right'
                  ? '100%'
                  : '1px',
              borderTop: isHorizontal ? '1px dashed rgba(255,255,255,0.3)' : 'none',
              borderLeft: !isHorizontal ? '1px dashed rgba(255,255,255,0.3)' : 'none',
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
            className={`w-full h-full rounded-xl flex flex-col justify-between p-2.5 transition-all relative select-none ${
              !isClientActive
                ? 'border border-blue-400/50 shadow-[0_0_24px_rgba(59,130,246,0.18)] bg-[#111319]/90'
                : 'border border-white/[0.08] bg-[#0e1015]/80'
            }`}
            style={{
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Top row: Label + OS icon */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <OsIcon os={hostOs} className="h-3 w-3" />
                <span>PRIMARY</span>
              </span>
              <span className="text-[9px] text-zinc-500">{hostW}×{hostH}</span>
            </div>

            {/* Center: Large circular "A" badge */}
            <div className="flex items-center justify-center">
              <div
                className={`flex items-center justify-center rounded-lg border text-white font-mono font-bold transition-transform ${
                  showIdentify ? 'scale-125 border-amber-400 bg-amber-400/20 text-amber-200 shadow-lg' : 'border-white/[0.12] bg-white/[0.04]'
                }`}
                style={{
                  width: '32px',
                  height: '32px',
                  fontSize: '14px',
                }}
              >
                A
              </div>
            </div>

            {/* Bottom: Device Name */}
            <div className="text-center">
              <span className="text-[10px] font-medium text-zinc-300 truncate block max-w-[150px] mx-auto">
                {hostName}
              </span>
            </div>

            {/* Active cursor indicator on Host */}
            {!isClientActive && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5 text-[9px] font-mono text-blue-300">
                <MousePointer2 className="h-2.5 w-2.5" />
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
            className={`w-full h-full rounded-xl flex flex-col justify-between p-2.5 transition-all relative select-none ${
              isClientActive
                ? 'border border-emerald-400/50 shadow-[0_0_24px_rgba(16,185,129,0.22)] bg-[#0d1613]/90'
                : isDragging
                ? 'border border-white/40 shadow-[0_12px_32px_rgba(0,0,0,0.8)] bg-[#171a22]'
                : 'border border-white/[0.08] bg-[#0e1015]/80 hover:border-white/[0.18]'
            }`}
            style={{
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Top row: Label + OS icon */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <OsIcon os={clientOs} className="h-3 w-3" />
                <span>{isConnected ? 'REMOTE' : 'TARGET'}</span>
              </span>
              <span className="text-[9px] text-zinc-500">{clientW}×{clientH}</span>
            </div>

            {/* Center: Large circular "B" badge */}
            <div className="flex items-center justify-center relative">
              <div
                className={`flex items-center justify-center rounded-lg border text-white font-mono font-bold transition-transform ${
                  showIdentify ? 'scale-125 border-amber-400 bg-amber-400/20 text-amber-200 shadow-lg' : 'border-white/[0.12] bg-white/[0.04]'
                }`}
                style={{
                  width: '32px',
                  height: '32px',
                  fontSize: '14px',
                }}
              >
                B
              </div>
            </div>

            {/* Bottom: Device Name */}
            <div className="text-center">
              <span className="text-[10px] font-medium text-zinc-300 truncate block max-w-[150px] mx-auto">
                {clientName}
              </span>
            </div>

            {/* Drag Handle Indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">
              {isClientActive ? (
                <>
                  <MousePointer2 className="h-2.5 w-2.5 text-emerald-300" />
                  <span className="text-emerald-300">Active</span>
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

        {/* ─── Touching Contact Seam Glowing Boundary Line ─── */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left:
              arrangement === 'host_left_client_right'
                ? `${hostPos.x + SCREEN_A_W - 1}px`
                : arrangement === 'host_right_client_left'
                ? `${hostPos.x - 1}px`
                : `${Math.max(hostPos.x, clientPos.x)}px`,
            top:
              arrangement === 'host_top_client_bottom'
                ? `${hostPos.y + SCREEN_A_H - 1}px`
                : arrangement === 'host_bottom_client_top'
                ? `${hostPos.y - 1}px`
                : `${Math.max(hostPos.y, clientPos.y)}px`,
            width: isHorizontal
              ? '2px'
              : `${Math.min(hostPos.x + SCREEN_A_W, clientPos.x + SCREEN_B_W) - Math.max(hostPos.x, clientPos.x)}px`,
            height: isHorizontal
              ? `${Math.min(hostPos.y + SCREEN_A_H, clientPos.y + SCREEN_B_H) - Math.max(hostPos.y, clientPos.y)}px`
              : '2px',
            background: 'linear-gradient(to bottom, #3b82f6, #10b981)',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
            borderRadius: '2px',
          }}
        />
      </div>

      {/* ─── Bottom Status & Quick Switch ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
          <span className="text-[11px]">{edgeGuide}</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Offset readout */}
          <div className="text-[11px] font-mono text-zinc-400 bg-white/[0.03] px-2 py-1 rounded border border-white/[0.08]">
            {isHorizontal ? (
              <span>
                Offset:{' '}
                <strong className={vOffsetPx === 0 ? 'text-zinc-200' : 'text-amber-400'}>
                  {vOffsetPx === 0 ? '0px (Aligned)' : `${vOffsetPx > 0 ? `+${vOffsetPx}` : vOffsetPx}px`}
                </strong>
              </span>
            ) : (
              <span>
                Offset:{' '}
                <strong className={hOffsetPx === 0 ? 'text-zinc-200' : 'text-amber-400'}>
                  {hOffsetPx === 0 ? '0px (Aligned)' : `${hOffsetPx > 0 ? `+${hOffsetPx}` : hOffsetPx}px`}
                </strong>
              </span>
            )}
          </div>

          {/* Quick toggle screen button */}
          <button
            onClick={onSimulateEdgeCross}
            className="btn-action !py-1 text-xs"
            title="Switch keyboard and mouse focus"
          >
            <span>{isClientActive ? 'Return Focus to Host (A)' : 'Switch Focus to Remote (B)'}</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
