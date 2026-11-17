import React, { useState } from 'react';
import type { DeskflowServerSettings, DeskflowClientSettings } from '../types';
import {
  X,
  Settings,
  Shield,
  Network,
  Computer,
  Check,
  Copy,
} from 'lucide-react';

interface DeskflowPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverSettings: DeskflowServerSettings;
  onServerSettingsChange: (settings: DeskflowServerSettings) => void;
  clientSettings: DeskflowClientSettings;
  onClientSettingsChange: (settings: DeskflowClientSettings) => void;
  serverFingerprint: string;
}

export const DeskflowPreferencesModal: React.FC<DeskflowPreferencesModalProps> = ({
  isOpen,
  onClose,
  serverSettings,
  onServerSettingsChange,
  clientSettings,
  onClientSettingsChange,
  serverFingerprint,
}) => {
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  if (!isOpen) return null;

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(serverFingerprint);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl p-6 glass-panel border border-white/[0.12] bg-[#0c0d12]/95 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] select-none">
          <div className="flex items-center gap-2.5">
            <Settings className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Deskflow Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost !p-1 text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-mono">
          {/* Network Settings */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Network className="h-3.5 w-3.5 text-blue-400" />
              <span>Network Binding & Ports</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">
                  Listening Port
                </label>
                <input
                  type="number"
                  min={1024}
                  max={65535}
                  value={serverSettings.port}
                  onChange={(e) =>
                    onServerSettingsChange({
                      ...serverSettings,
                      port: parseInt(e.target.value, 10) || 24800,
                    })
                  }
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 text-[11px]">
                  Interface Binding
                </label>
                <input
                  type="text"
                  value={serverSettings.interfaceBinding}
                  onChange={(e) =>
                    onServerSettingsChange({
                      ...serverSettings,
                      interfaceBinding: e.target.value,
                    })
                  }
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100"
                  placeholder="0.0.0.0 (All interfaces)"
                />
              </div>
            </div>
          </div>

          {/* Client Defaults */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Computer className="h-3.5 w-3.5 text-blue-400" />
              <span>Client Screen Identity</span>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1 text-[11px]">
                Default Client Screen Name
              </label>
              <input
                type="text"
                value={clientSettings.screenName}
                onChange={(e) =>
                  onClientSettingsChange({
                    ...clientSettings,
                    screenName: e.target.value,
                  })
                }
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100"
                placeholder="My-Client"
              />
            </div>
          </div>

          {/* Security & TLS Encryption */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Security & TLS Encryption</span>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={serverSettings.enableTls}
                onChange={(e) =>
                  onServerSettingsChange({
                    ...serverSettings,
                    enableTls: e.target.checked,
                  })
                }
                className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
              />
              <span className="text-zinc-200">
                Enable TLS Encryption (AES-256-GCM)
              </span>
            </label>

            <div>
              <label className="text-zinc-400 block mb-1 text-[11px]">
                Server TLS Certificate SHA-256 Fingerprint
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={serverFingerprint}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[10px] text-zinc-300 font-mono select-all"
                />
                <button
                  onClick={handleCopyFingerprint}
                  className="btn-ghost !p-2 text-zinc-400 hover:text-zinc-200"
                  title="Copy Fingerprint"
                >
                  {copiedFingerprint ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* System & Startup */}
          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Computer className="h-3.5 w-3.5 text-purple-400" />
              <span>System & Process Options</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                />
                <span className="text-zinc-200">Start Deskflow automatically on system login</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={false}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                />
                <span className="text-zinc-200">Start minimized to system notification area / tray</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                />
                <span className="text-zinc-200">Prevent system sleep during active mouse sharing</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <button onClick={onClose} className="btn-primary text-xs flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            <span>Apply & Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
