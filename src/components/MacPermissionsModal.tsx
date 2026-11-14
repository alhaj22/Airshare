import React, { useState } from 'react';
import { X, Apple, Shield, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/tauriBridge';

interface MacPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MacPermissionsModal: React.FC<MacPermissionsModalProps> = ({ isOpen, onClose }) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleOpenSettings = async () => {
    await api.openAccessibilitySettings();
  };

  const handleVerify = async () => {
    const trusted = await api.checkAccessibility();
    if (trusted) {
      setIsChecked(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      alert('Accessibility permission is still not granted. In macOS System Settings > Privacy & Security > Accessibility, ensure AirDesk is toggled ON.');
    }
  };

  const steps = [
    {
      num: 1,
      title: 'Open System Settings',
      desc: 'Navigate to System Settings on macOS.',
      icon: <Apple className="h-3.5 w-3.5" />,
    },
    {
      num: 2,
      title: 'Privacy & Security → Accessibility',
      desc: 'Find "AirDesk" in the list of applications.',
      icon: <Shield className="h-3.5 w-3.5" />,
    },
    {
      num: 3,
      title: 'Toggle Permission to ON',
      desc: 'Authenticate with your password/Touch ID to enable input control.',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-md p-6 border border-white/[0.12] bg-[#0c0d12]/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05] text-zinc-200">
              <Apple className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                macOS Accessibility Permissions
              </h3>
              <p className="text-[11px] text-zinc-500">
                Required for synthetic mouse & keyboard injection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2.5 rounded-lg p-3 mb-4 text-xs bg-amber-500/[0.06] border border-amber-500/20 text-amber-200/90 leading-relaxed">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <span>
            macOS security sandboxing requires explicit Accessibility approval before any application can simulate cursor movement or deliver keyboard events.
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-5">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-3 items-start">
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-bold bg-white/[0.08] text-zinc-300 border border-white/[0.1]">
                {step.num}
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-200">
                  {step.title}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleOpenSettings}
            className="btn-action w-full justify-center !py-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open macOS System Settings</span>
          </button>

          <button
            onClick={handleVerify}
            className="btn-ghost w-full justify-center !py-2 text-xs"
          >
            {isChecked ? 'Permission Confirmed!' : 'Verify Permission'}
          </button>
        </div>
      </div>
    </div>
  );
};
