import React from 'react';
import {
  Monitor,
  Laptop,
  ArrowLeftRight,
  MousePointer2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import type { ConnectionStatus, ScreenArrangementType } from '../types';

interface ScreenArrangementProps {
  status: ConnectionStatus;
  arrangement: ScreenArrangementType;
  onArrangementChange: (arr: ScreenArrangementType) => void;
  onSimulateEdgeCross: () => void;
}

export const ScreenArrangement: React.FC<ScreenArrangementProps> = ({
  status,
  arrangement,
  onArrangementChange,
  onSimulateEdgeCross,
}) => {
  const isClientScreen = status.active_screen === 'client';

  const isHostLeft =
    arrangement === 'host_left_client_right' ||
    arrangement === 'host_top_client_bottom';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Screen Arrangement & Edge Crossing
            </h2>
            <p className="text-xs text-slate-400">
              Move your mouse to the screen edge to automatically transfer control
            </p>
          </div>
        </div>

        {/* Arrangement Mode Selector */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/60 p-1 border border-white/10">
          <button
            onClick={() => onArrangementChange('host_left_client_right')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              arrangement === 'host_left_client_right'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Windows (Left) • Mac (Right)
          </button>

          <button
            onClick={() => onArrangementChange('host_right_client_left')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              arrangement === 'host_right_client_left'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mac (Left) • Windows (Right)
          </button>
        </div>
      </div>

      {/* Visual Canvas of Two Screens */}
      <div className="relative mt-6 flex min-h-[260px] items-center justify-center rounded-xl border border-white/5 bg-slate-950/80 p-6 overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {/* First Screen */}
          <div
            className={`relative flex flex-col items-center justify-center w-56 sm:w-64 h-36 sm:h-40 rounded-xl border-2 transition-all duration-300 ${
              (!isClientScreen && isHostLeft) || (isClientScreen && !isHostLeft)
                ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20 ring-4 ring-cyan-500/10'
                : 'border-slate-800 bg-slate-900/60 opacity-70'
            }`}
          >
            {isHostLeft ? (
              <>
                <Monitor className="h-8 w-8 text-blue-400 mb-1" />
                <span className="text-sm font-bold text-white">Windows PC</span>
                <span className="text-[11px] font-mono text-slate-400">1920 × 1080 • Host</span>
              </>
            ) : (
              <>
                <Laptop className="h-8 w-8 text-purple-400 mb-1" />
                <span className="text-sm font-bold text-white">MacBook Air M1</span>
                <span className="text-[11px] font-mono text-slate-400">2560 × 1600 • Client</span>
              </>
            )}

            {/* Active cursor badge */}
            {((!isClientScreen && isHostLeft) || (isClientScreen && !isHostLeft)) && (
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/40">
                <MousePointer2 className="h-2.5 w-2.5" />
                <span>Active Cursor</span>
              </div>
            )}
          </div>

          {/* Interactive Edge Barrier Line */}
          <div className="flex flex-col items-center justify-center py-2">
            <button
              onClick={onSimulateEdgeCross}
              title="Click to simulate moving mouse across edge boundary"
              className="group flex flex-col items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-1">
                <span className="h-10 w-0.5 bg-gradient-to-b from-transparent via-cyan-400 to-transparent group-hover:scale-y-125 transition" />
                <ArrowLeftRight className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition" />
                <span className="h-10 w-0.5 bg-gradient-to-b from-transparent via-cyan-400 to-transparent group-hover:scale-y-125 transition" />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-cyan-300">
                Crossing Edge
              </span>
            </button>
          </div>

          {/* Second Screen */}
          <div
            className={`relative flex flex-col items-center justify-center w-56 sm:w-64 h-36 sm:h-40 rounded-xl border-2 transition-all duration-300 ${
              (isClientScreen && isHostLeft) || (!isClientScreen && !isHostLeft)
                ? 'border-purple-400 bg-purple-950/30 shadow-lg shadow-purple-500/20 ring-4 ring-purple-500/10'
                : 'border-slate-800 bg-slate-900/60 opacity-70'
            }`}
          >
            {isHostLeft ? (
              <>
                <Laptop className="h-8 w-8 text-purple-400 mb-1" />
                <span className="text-sm font-bold text-white">MacBook Air M1</span>
                <span className="text-[11px] font-mono text-slate-400">2560 × 1600 • Client</span>
              </>
            ) : (
              <>
                <Monitor className="h-8 w-8 text-blue-400 mb-1" />
                <span className="text-sm font-bold text-white">Windows PC</span>
                <span className="text-[11px] font-mono text-slate-400">1920 × 1080 • Host</span>
              </>
            )}

            {/* Active cursor badge */}
            {((isClientScreen && isHostLeft) || (!isClientScreen && !isHostLeft)) && (
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/40">
                <MousePointer2 className="h-2.5 w-2.5" />
                <span>Active Cursor</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide & Instructions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>
            {arrangement === 'host_left_client_right'
              ? 'Move mouse to Windows right edge to seamlessly control MacBook.'
              : 'Move mouse to Windows left edge to seamlessly control MacBook.'}
          </span>
        </div>

        <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-mono text-slate-300">
          Emergency Release: Ctrl + Alt + Shift + Esc
        </span>
      </div>
    </div>
  );
};
