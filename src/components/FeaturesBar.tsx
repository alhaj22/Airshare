import React from 'react';
import { Mouse, Keyboard, Clipboard, Check } from 'lucide-react';

interface FeaturesBarProps {
  mouseSharing: boolean;
  setMouseSharing: (v: boolean) => void;
  keyboardSharing: boolean;
  setKeyboardSharing: (v: boolean) => void;
  clipboardSharing: boolean;
  setClipboardSharing: (v: boolean) => void;
}

export const FeaturesBar: React.FC<FeaturesBarProps> = ({
  mouseSharing,
  setMouseSharing,
  keyboardSharing,
  setKeyboardSharing,
  clipboardSharing,
  setClipboardSharing,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Mouse Feature Card */}
      <div
        onClick={() => setMouseSharing(!mouseSharing)}
        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
          mouseSharing
            ? 'border-cyan-500/40 bg-cyan-950/20'
            : 'border-white/5 bg-slate-900/40 opacity-60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Mouse className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Mouse Sharing</h3>
            <p className="text-xs text-slate-400">Pointer, Clicks, Smooth Scroll</p>
          </div>
        </div>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
            mouseSharing
              ? 'border-cyan-500 bg-cyan-500 text-white'
              : 'border-slate-700 bg-slate-800'
          }`}
        >
          {mouseSharing && <Check className="h-3.5 w-3.5" />}
        </div>
      </div>

      {/* Keyboard Feature Card */}
      <div
        onClick={() => setKeyboardSharing(!keyboardSharing)}
        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
          keyboardSharing
            ? 'border-blue-500/40 bg-blue-950/20'
            : 'border-white/5 bg-slate-900/40 opacity-60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Keyboard Sharing</h3>
            <p className="text-xs text-slate-400">Typing & Modifier Shortcuts</p>
          </div>
        </div>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
            keyboardSharing
              ? 'border-blue-500 bg-blue-500 text-white'
              : 'border-slate-700 bg-slate-800'
          }`}
        >
          {keyboardSharing && <Check className="h-3.5 w-3.5" />}
        </div>
      </div>

      {/* Clipboard Feature Card */}
      <div
        onClick={() => setClipboardSharing(!clipboardSharing)}
        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
          clipboardSharing
            ? 'border-emerald-500/40 bg-emerald-950/20'
            : 'border-white/5 bg-slate-900/40 opacity-60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Clipboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Clipboard Sharing</h3>
            <p className="text-xs text-slate-400">Ctrl+C & Cmd+V Sync</p>
          </div>
        </div>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
            clipboardSharing
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-700 bg-slate-800'
          }`}
        >
          {clipboardSharing && <Check className="h-3.5 w-3.5" />}
        </div>
      </div>
    </div>
  );
};
