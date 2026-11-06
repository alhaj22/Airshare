import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Monitor,
  Laptop,
  ArrowLeftRight,
  MousePointer2,
  Sliders,
  CheckCircle2,
  MoveVertical,
  RotateCcw,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
} from 'lucide-react';
import type { ConnectionStatus, ScreenArrangementType, SystemInfo } from '../types';

interface ScreenArrangementProps {
  status: ConnectionStatus;
  systemInfo: SystemInfo | null;
  arrangement: ScreenArrangementType;
  onArrangementChange: (arr: ScreenArrangementType, verticalOffset?: number) => void;
  onSimulateEdgeCross: () => void;
}

export const ScreenArrangement: React.FC<ScreenArrangementProps> = ({
  status,
  systemInfo,
  arrangement,
  onArrangementChange,
  onSimulateEdgeCross,
}) => {
  const isClientActive = status.active_screen === 'client';
  const isConnected = status.mode === 'connected';

  // Arrangement side: is Host on the Left?
  const isHostLeft = arrangement === 'host_left_client_right' || arrangement === 'host_top_client_bottom';

  // Vertical offset for Display B (-100px to +100px, default +38px matching ShareMouse screenshot)
  const [verticalOffset, setVerticalOffset] = useState<number>(38);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartY = useRef<number>(0);
  const dragStartOffset = useRef<number>(38);
  const containerRef = useRef<HTMLDivElement>(null);

  // Host and Client display names from actual system state
  const hostName = systemInfo?.device_name || 'DESKTOP-H6EVCSJ';
  const clientName = status.peer_device || "Alhaj's MacBook Air";

  // Mouse drag handlers to adjust vertical display shift in real-time
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = verticalOffset;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = e.clientY - dragStartY.current;
      const newOffset = Math.max(-70, Math.min(70, dragStartOffset.current + deltaY));
      setVerticalOffset(newOffset);
      // Normalized offset ratio (-0.5 to +0.5)
      const ratio = newOffset / 140;
      onArrangementChange(arrangement, ratio);
    },
    [isDragging, arrangement, onArrangementChange]
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

  // Quick alignment helpers
  const alignTops = () => {
    setVerticalOffset(0);
    onArrangementChange(arrangement, 0);
  };

  const alignCenters = () => {
    setVerticalOffset(15);
    onArrangementChange(arrangement, 15 / 140);
  };

  const resetToShareMouseDefault = () => {
    setVerticalOffset(38);
    onArrangementChange('host_left_client_right', 38 / 140);
  };

  const swapSides = () => {
    const nextArr = isHostLeft ? 'host_right_client_left' : 'host_left_client_right';
    onArrangementChange(nextArr, verticalOffset / 140);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Display Arrangement & Edge Alignment
              </h2>
              {isConnected ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Connected & Synced
                </span>
              ) : (
                <span className="rounded-full bg-slate-800 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  Drag screens to align
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Drag Display B up or down to match your desk height. Move cursor across the touching edge.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={swapSides}
            title="Swap Left / Right position"
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-white/10 transition cursor-pointer"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-400" />
            <span>Swap Sides</span>
          </button>

          <button
            onClick={alignTops}
            title="Align top edges"
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-white/10 transition cursor-pointer"
          >
            <AlignVerticalJustifyStart className="h-3.5 w-3.5 text-indigo-400" />
            <span>Top</span>
          </button>

          <button
            onClick={alignCenters}
            title="Align vertical centers"
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-white/10 transition cursor-pointer"
          >
            <AlignVerticalJustifyCenter className="h-3.5 w-3.5 text-emerald-400" />
            <span>Center</span>
          </button>

          <button
            onClick={resetToShareMouseDefault}
            title="Reset to ShareMouse layout"
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-white/10 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>Default</span>
          </button>
        </div>
      </div>

      {/* ShareMouse-style Interactive Canvas */}
      <div
        ref={containerRef}
        className="relative mt-6 flex min-h-[320px] items-center justify-center rounded-xl border border-white/10 bg-[#eef1f6] dark:bg-slate-950 p-8 overflow-hidden select-none"
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Display Arrangement Area */}
        <div className="relative z-10 flex items-start justify-center transition-all duration-75">
          {/* Card A (Host Display - Slate Blue) */}
          <div
            style={{ order: isHostLeft ? 1 : 2 }}
            className={`relative flex flex-col items-center justify-between w-64 sm:w-72 h-44 rounded-md shadow-xl transition-shadow ${
              !isClientActive
                ? 'ring-4 ring-cyan-400/80 shadow-cyan-500/30'
                : 'opacity-95'
            }`}
          >
            {/* Display Body */}
            <div
              className="relative w-full h-full rounded-md flex flex-col items-center justify-between p-3 border"
              style={{
                backgroundColor: '#6882c4',
                borderColor: '#3b528a',
              }}
            >
              {/* Top Bar / Resolution tag */}
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-white/80">
                <span className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  {systemInfo?.os || 'Windows'}
                </span>
                <span>
                  {systemInfo?.screen_width || 1366} × {systemInfo?.screen_height || 768}
                </span>
              </div>

              {/* Center Black Circle Badge: "A" */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black shadow-lg">
                  <span className="text-xl font-black text-white tracking-wider">A</span>
                </div>
                {!isClientActive && (
                  <span className="mt-1 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                    <MousePointer2 className="h-2.5 w-2.5" />
                    Active Cursor
                  </span>
                )}
              </div>

              {/* Bottom Label: Exact Machine Name */}
              <div className="w-full text-center">
                <span className="text-xs font-semibold text-white tracking-wide truncate max-w-[200px] inline-block drop-shadow-sm">
                  {hostName}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Boundary Crossing Divider */}
          <div
            style={{ order: 1.5 }}
            className="relative z-20 flex flex-col items-center justify-center self-stretch px-0.5"
          >
            <button
              onClick={onSimulateEdgeCross}
              title="Click to jump cursor across laptops"
              className="group flex flex-col items-center gap-1 rounded-full bg-black/40 hover:bg-black/80 px-1 py-3 text-cyan-400 transition cursor-pointer backdrop-blur-sm -mx-3"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 group-hover:scale-125 transition" />
              <span className="text-[9px] font-bold uppercase tracking-wider [writing-mode:vertical-lr] text-white/70 group-hover:text-cyan-300">
                Edge Cross
              </span>
            </button>
          </div>

          {/* Card B (Client Display - Olive Green / Draggable) */}
          <div
            style={{
              order: isHostLeft ? 2 : 1,
              transform: `translateY(${verticalOffset}px)`,
            }}
            onMouseDown={handleMouseDown}
            className={`relative flex flex-col items-center justify-between w-64 sm:w-72 h-44 rounded-md shadow-xl cursor-grab active:cursor-grabbing transition-transform duration-75 ${
              isClientActive
                ? 'ring-4 ring-emerald-400/90 shadow-emerald-500/30'
                : 'opacity-95'
            }`}
          >
            {/* Display Body */}
            <div
              className="relative w-full h-full rounded-md flex flex-col items-center justify-between p-3 border"
              style={{
                backgroundColor: '#96aa16',
                borderColor: '#66750e',
              }}
            >
              {/* Top Bar / Drag Hint & Resolution */}
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-white/80">
                <span className="flex items-center gap-1">
                  <Laptop className="h-3 w-3" />
                  macOS
                </span>
                <span className="flex items-center gap-1 text-[10px] bg-black/30 rounded px-1.5 py-0.5">
                  <MoveVertical className="h-2.5 w-2.5" />
                  Drag Vertically
                </span>
              </div>

              {/* Center Black Circle Badge: "B" */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black shadow-lg">
                  <span className="text-xl font-black text-white tracking-wider">B</span>
                </div>
                {isClientActive && (
                  <span className="mt-1 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    <MousePointer2 className="h-2.5 w-2.5" />
                    Active Cursor
                  </span>
                )}
              </div>

              {/* Bottom Label: Exact Client Machine Name */}
              <div className="w-full text-center">
                <span className="text-xs font-semibold text-white tracking-wide truncate max-w-[200px] inline-block drop-shadow-sm">
                  {clientName}
                </span>
              </div>
            </div>

            {/* Vertical Offset floating indicator */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-mono text-white/90 shadow-md">
              Offset: {verticalOffset > 0 ? `+${verticalOffset}px (Lower)` : verticalOffset < 0 ? `${verticalOffset}px (Higher)` : '0px (Aligned)'}
            </div>
          </div>
        </div>
      </div>

      {/* Guide footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>
            {isHostLeft
              ? `Move mouse off the Right edge of ${hostName} to enter ${clientName}.`
              : `Move mouse off the Left edge of ${hostName} to enter ${clientName}.`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-cyan-300 border border-white/10">
            Emergency Recall: Ctrl + Alt + Shift + Esc or Pause key
          </span>
        </div>
      </div>
    </div>
  );
};
