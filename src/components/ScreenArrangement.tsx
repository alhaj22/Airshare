import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Monitor,
  Laptop,
  ArrowLeftRight,
  ArrowUpDown,
  MousePointer2,
  Sliders,
  CheckCircle2,
  Move,
  RotateCcw,
  AlignVerticalJustifyCenter,
  Sparkles,
} from 'lucide-react';
import type { ConnectionStatus, DiscoveredDevice, ScreenArrangementType, SystemInfo } from '../types';

interface ScreenArrangementProps {
  status: ConnectionStatus;
  systemInfo: SystemInfo | null;
  arrangement: ScreenArrangementType;
  onArrangementChange: (arr: ScreenArrangementType, offsetRatio?: number) => void;
  onSimulateEdgeCross: () => void;
  onDeviceDrop?: (device: DiscoveredDevice) => void;
}

export const ScreenArrangement: React.FC<ScreenArrangementProps> = ({
  status,
  systemInfo,
  arrangement,
  onArrangementChange,
  onSimulateEdgeCross,
  onDeviceDrop,
}) => {
  const isClientActive = status.active_screen === 'client';
  const isConnected = status.mode === 'connected';

  // Offset in pixels for fine alignment (-80px to +80px)
  const [offsetPx, setOffsetPx] = useState<number>(30);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDropOver, setIsDropOver] = useState<boolean>(false);

  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartOffset = useRef<number>(30);
  const currentArrangementRef = useRef<ScreenArrangementType>(arrangement);
  currentArrangementRef.current = arrangement;

  // Host and Client display metadata
  const hostName = systemInfo?.device_name || 'DESKTOP-H6EVCSJ';
  const hostWidth = systemInfo?.screen_width || 1366;
  const hostHeight = systemInfo?.screen_height || 768;
  const hostOs = systemInfo?.os || 'Windows';

  const clientName = status.peer_device || (isConnected ? "Alhaj's MacBook Air" : 'Remote Display B');
  const clientWidth = status.peer_screen_width || 1440;
  const clientHeight = status.peer_screen_height || 900;
  const clientOs = status.peer_os ? status.peer_os.toUpperCase() : 'macOS';

  // Determine current placement side
  const isHorizontal =
    arrangement === 'host_left_client_right' || arrangement === 'host_right_client_left';
  const isHostLeft = arrangement === 'host_left_client_right';
  const isHostTop = arrangement === 'host_top_client_bottom';

  // Start 2D drag of Screen B
  const handleMouseDown = (e: React.MouseEvent) => {
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

      let nextArrangement = currentArrangementRef.current;
      let nextOffset = dragStartOffset.current;

      // Detect 2D directional quadrant switch
      if (Math.abs(deltaX) > 120 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && nextArrangement === 'host_right_client_left') {
          nextArrangement = 'host_left_client_right';
        } else if (deltaX < 0 && nextArrangement === 'host_left_client_right') {
          nextArrangement = 'host_right_client_left';
        }
      } else if (Math.abs(deltaY) > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY > 0 && nextArrangement === 'host_bottom_client_top') {
          nextArrangement = 'host_top_client_bottom';
        } else if (deltaY < 0 && nextArrangement === 'host_top_client_bottom') {
          nextArrangement = 'host_bottom_client_top';
        }
      }

      // Compute fine continuous offset
      if (nextArrangement === 'host_left_client_right' || nextArrangement === 'host_right_client_left') {
        nextOffset = Math.max(-80, Math.min(80, dragStartOffset.current + deltaY));
      } else {
        nextOffset = Math.max(-80, Math.min(80, dragStartOffset.current + deltaX));
      }

      setOffsetPx(nextOffset);
      const ratio = nextOffset / 160;
      onArrangementChange(nextArrangement, ratio);
    },
    [isDragging, onArrangementChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  // HTML5 Drag and Drop Handlers for Device Pairing
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDropOver) setIsDropOver(true);
  };

  const handleDragLeave = () => {
    setIsDropOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data && onDeviceDrop) {
        const device: DiscoveredDevice = JSON.parse(data);
        onDeviceDrop(device);
      }
    } catch (err) {
      console.warn('Failed to parse dropped device', err);
    }
  };

  // Preset positioning actions
  const setPreset = (arr: ScreenArrangementType, offset = 0) => {
    setOffsetPx(offset);
    onArrangementChange(arr, offset / 160);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Display Layout & Edge Alignment
              </h2>
              {isConnected ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected & Synchronized
                </span>
              ) : (
                <span className="rounded-full bg-slate-800 border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                  Ready to Position
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag Monitor B in 2D to arrange displays. Move your mouse off the edge to cross screens.
            </p>
          </div>
        </div>

        {/* Quick Presets Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPreset('host_left_client_right', offsetPx)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
              arrangement === 'host_left_client_right'
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-700'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Left ↔ Right</span>
          </button>

          <button
            onClick={() => setPreset('host_right_client_left', offsetPx)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
              arrangement === 'host_right_client_left'
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-700'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Right ↔ Left</span>
          </button>

          <button
            onClick={() => setPreset('host_top_client_bottom', 0)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
              arrangement === 'host_top_client_bottom'
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-700'
            }`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Top ↕ Bottom</span>
          </button>

          <button
            onClick={() => setPreset(arrangement, 0)}
            title="Center display edges"
            className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 border border-white/10 transition cursor-pointer"
          >
            <AlignVerticalJustifyCenter className="h-3.5 w-3.5 text-emerald-400" />
            <span>Center</span>
          </button>

          <button
            onClick={() => setPreset('host_left_client_right', 30)}
            title="Reset to ShareMouse default position"
            className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 border border-white/10 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>Default</span>
          </button>
        </div>
      </div>

      {/* ShareMouse-style Interactive 2D Canvas */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative mt-6 flex min-h-[380px] items-center justify-center rounded-2xl border transition-all duration-200 overflow-hidden select-none ${
          isDropOver
            ? 'border-cyan-400 bg-cyan-950/30 ring-4 ring-cyan-500/30'
            : 'border-white/10 bg-gradient-to-b from-slate-950 to-slate-900/90'
        }`}
      >
        {/* Subtle architectural blueprint grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Drop zone guidance overlay if dragging a device from Wi-Fi list */}
        {isDropOver && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-cyan-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <Sparkles className="h-10 w-10 text-cyan-300 animate-bounce mb-2" />
            <span className="text-base font-bold text-white">Drop here to pair & start session!</span>
            <span className="text-xs text-cyan-200">Zero configuration connection</span>
          </div>
        )}

        {/* 2D Arrangement Container */}
        <div
          className={`relative z-10 flex items-center justify-center gap-1 transition-all ${
            isHorizontal ? 'flex-row' : 'flex-col'
          }`}
        >
          {/* Monitor A (Host / Local Machine - Slate Blue) */}
          <div
            style={{
              order: isHorizontal ? (isHostLeft ? 1 : 3) : isHostTop ? 1 : 3,
            }}
            className={`relative flex flex-col items-center justify-between w-64 sm:w-72 h-44 rounded-xl shadow-2xl transition-all duration-150 ${
              !isClientActive
                ? 'ring-4 ring-cyan-400 shadow-cyan-500/40 scale-[1.02]'
                : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div
              className="relative w-full h-full rounded-xl flex flex-col items-center justify-between p-3.5 border"
              style={{
                backgroundColor: '#5871b5',
                borderColor: '#3c5288',
              }}
            >
              {/* Header: OS & Resolution */}
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-white/90">
                <span className="flex items-center gap-1.5 font-bold">
                  <Monitor className="h-3.5 w-3.5 text-cyan-200" />
                  {hostOs}
                </span>
                <span className="bg-black/30 px-2 py-0.5 rounded text-[10px]">
                  {hostWidth} × {hostHeight}
                </span>
              </div>

              {/* Center Black Circle Badge: "A" */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-black shadow-2xl ring-2 ring-white/10">
                  <span className="text-2xl font-black text-white tracking-wider">A</span>
                </div>
                {!isClientActive && (
                  <span className="mt-1.5 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow">
                    <MousePointer2 className="h-2.5 w-2.5" />
                    Active Cursor
                  </span>
                )}
              </div>

              {/* Bottom Label: Exact Machine Name */}
              <div className="w-full text-center">
                <span className="text-xs font-bold text-white tracking-wide truncate max-w-[210px] inline-block drop-shadow">
                  {hostName}
                </span>
                <div className="text-[10px] text-white/70 font-mono">This Computer</div>
              </div>
            </div>
          </div>

          {/* Interactive Shared Edge Seam with Quick Jump Control */}
          <div
            style={{ order: 2 }}
            className={`relative z-20 flex items-center justify-center self-stretch ${
              isHorizontal ? 'px-1' : 'py-1'
            }`}
          >
            <button
              onClick={onSimulateEdgeCross}
              title="Click to jump cursor across computers"
              className="group flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-black/90 px-2.5 py-1.5 text-cyan-400 border border-cyan-400/30 transition cursor-pointer backdrop-blur-md shadow-lg hover:scale-105"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 group-hover:rotate-180 transition duration-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white group-hover:text-cyan-300">
                Switch
              </span>
            </button>
          </div>

          {/* Monitor B (Remote Client Machine - Olive Green, Draggable) */}
          <div
            style={{
              order: isHorizontal ? (isHostLeft ? 3 : 1) : isHostTop ? 3 : 1,
              transform: isHorizontal
                ? `translateY(${offsetPx}px)`
                : `translateX(${offsetPx}px)`,
            }}
            onMouseDown={handleMouseDown}
            className={`relative flex flex-col items-center justify-between w-64 sm:w-72 h-44 rounded-xl shadow-2xl cursor-grab active:cursor-grabbing transition-transform duration-75 ${
              isClientActive
                ? 'ring-4 ring-emerald-400 shadow-emerald-500/40 scale-[1.02]'
                : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div
              className="relative w-full h-full rounded-xl flex flex-col items-center justify-between p-3.5 border"
              style={{
                backgroundColor: '#8e9d1c',
                borderColor: '#63700e',
              }}
            >
              {/* Header: OS & Drag Hint */}
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-white/90">
                <span className="flex items-center gap-1.5 font-bold">
                  <Laptop className="h-3.5 w-3.5 text-yellow-200" />
                  {clientOs}
                </span>
                <span className="flex items-center gap-1 text-[10px] bg-black/35 rounded px-2 py-0.5">
                  <Move className="h-2.5 w-2.5" />
                  Drag to Move
                </span>
              </div>

              {/* Center Black Circle Badge: "B" */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-black shadow-2xl ring-2 ring-white/10">
                  <span className="text-2xl font-black text-white tracking-wider">B</span>
                </div>
                {isClientActive && (
                  <span className="mt-1.5 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow">
                    <MousePointer2 className="h-2.5 w-2.5" />
                    Active Cursor
                  </span>
                )}
              </div>

              {/* Bottom Label: Exact Peer Name */}
              <div className="w-full text-center">
                <span className="text-xs font-bold text-white tracking-wide truncate max-w-[210px] inline-block drop-shadow">
                  {clientName}
                </span>
                <div className="text-[10px] text-white/70 font-mono">
                  {isConnected ? `${clientWidth} × ${clientHeight}` : 'Drag or Pair to connect'}
                </div>
              </div>
            </div>

            {/* Offset floating badge */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/85 px-2.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-white/10 shadow-lg">
              Offset: {offsetPx > 0 ? `+${offsetPx}px` : `${offsetPx}px`}
            </div>
          </div>
        </div>
      </div>

      {/* Guide & Controls Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>
            {isHostLeft
              ? `Move cursor off the Right edge of ${hostName} to control ${clientName}.`
              : arrangement === 'host_right_client_left'
              ? `Move cursor off the Left edge of ${hostName} to control ${clientName}.`
              : arrangement === 'host_top_client_bottom'
              ? `Move cursor off the Bottom edge of ${hostName} to control ${clientName}.`
              : `Move cursor off the Top edge of ${hostName} to control ${clientName}.`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-mono text-cyan-300 border border-white/10 shadow-sm">
            Emergency Escape: Ctrl + Alt + Shift + Esc or Pause
          </span>
        </div>
      </div>
    </div>
  );
};
