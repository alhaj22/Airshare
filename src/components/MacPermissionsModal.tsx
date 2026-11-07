import React from 'react';
import { X, Apple, Shield, Terminal } from 'lucide-react';

interface MacPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MacPermissionsModal: React.FC<MacPermissionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Open System Settings',
      desc: 'Go to Apple Menu → System Settings (or System Preferences on older macOS)',
      icon: <Apple className="h-4 w-4" />,
    },
    {
      num: 2,
      title: 'Privacy & Security → Accessibility',
      desc: 'Scroll down in the left sidebar to Privacy & Security, then click Accessibility',
      icon: <Shield className="h-4 w-4" />,
    },
    {
      num: 3,
      title: 'Enable AirDesk',
      desc: 'Click the + button, navigate to the AirDesk app, and toggle it ON. Enter your password if prompted.',
      icon: <Terminal className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)' }}
            >
              <Apple className="h-5 w-5" style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>macOS Permissions Setup</h2>
              <p className="text-xs" style={{ color: '#64748b' }}>Required for input capture to work</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer"
            style={{ color: '#475569' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#94a3b8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#475569')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Important warning */}
        <div
          className="rounded-lg p-3 mb-5 text-xs"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: '#fcd34d',
          }}
        >
          ⚠️ AirDesk requires <strong>Accessibility permission</strong> on macOS to capture and simulate keyboard/mouse input. Without this, input sharing will not work.
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-4">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: 'rgba(14,165,233,0.12)',
                  border: '1px solid rgba(14,165,233,0.2)',
                  color: '#38bdf8',
                }}
              >
                {step.num}
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: '#e2e8f0' }}>
                  {step.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Done button */}
        <button onClick={onClose} className="btn-primary w-full mt-6">
          Got it, done!
        </button>
      </div>
    </div>
  );
};
