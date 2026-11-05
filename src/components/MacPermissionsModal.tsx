import React, { useState } from 'react';
import { ShieldAlert, Check, Copy, X } from 'lucide-react';

interface MacPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MacPermissionsModal: React.FC<MacPermissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const terminalCommand = 'tccutil reset Accessibility com.airdesk.app';

  const handleCopy = () => {
    navigator.clipboard.writeText(terminalCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              macOS Accessibility Permissions Guide
            </h3>
            <p className="text-xs text-slate-400">
              Required on MacBook to receive mouse & keyboard controls
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            Apple macOS requires explicit security permission for applications to simulate cursor movements and keyboard clicks:
          </p>

          <ol className="list-decimal space-y-2 pl-4 text-slate-300">
            <li>
              Open <strong className="text-white">System Settings</strong> on your MacBook.
            </li>
            <li>
              Navigate to <strong className="text-white">Privacy & Security → Accessibility</strong>.
            </li>
            <li>
              Toggle the switch next to <strong className="text-cyan-400">AirDesk</strong> to <strong className="text-emerald-400">ON</strong>.
            </li>
            <li>
              Also check <strong className="text-white">Privacy & Security → Input Monitoring</strong> and allow AirDesk.
            </li>
          </ol>

          <div className="mt-4 rounded-xl border border-white/5 bg-slate-950 p-3">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
              Terminal quick reset (if needed):
            </span>
            <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px] text-purple-300">
              <code>{terminalCommand}</code>
              <button
                onClick={handleCopy}
                className="ml-2 flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:from-cyan-400 hover:to-blue-500 transition cursor-pointer"
          >
            I Understand & Granted
          </button>
        </div>
      </div>
    </div>
  );
};
