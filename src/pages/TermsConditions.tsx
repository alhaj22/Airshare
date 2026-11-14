import React from 'react';
import { FileText, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface TermsConditionsProps {
  onBack: () => void;
}

export const TermsConditions: React.FC<TermsConditionsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#08090a] text-zinc-300 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="ambient-background" />
      <div className="max-w-3xl mx-auto relative z-10">
        <button
          onClick={onBack}
          className="btn-ghost mb-8 text-xs !py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to AirDesk</span>
        </button>

        <div className="glass-panel p-8 sm:p-10 border border-white/[0.08]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Terms and Conditions</h1>
              <p className="text-xs text-slate-400">Effective Date: November 14, 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-400" />
                1. Acceptance of Terms
              </h2>
              <p>
                By downloading, installing, compiling, or executing AirDesk, you agree to be bound by these
                Terms and Conditions. If you do not agree with these terms, do not install or use the application.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-400" />
                2. Software License and Authorized Use
              </h2>
              <p>
                AirDesk is licensed for personal and professional workflow productivity. You may deploy the
                software across multiple personal or organizational computers operating on trusted local area
                networks. You agree not to utilize AirDesk to intercept unauthorized communications, deploy
                covert keystroke logging tools, or gain unauthorized access to remote systems.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-400" />
                3. Network and Security Responsibility
              </h2>
              <p>
                AirDesk communicates over your local area network (LAN) using direct socket connections. It is
                the user's responsibility to ensure that the local Wi-Fi or wired network environment is secure.
                The 6-digit mutual authentication PIN prevents unauthorized connection attempts from untrusted
                endpoints on the same subnet.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                4. Disclaimer of Warranty
              </h2>
              <p>
                AirDesk is provided &quot;as is&quot; and &quot;as available&quot;, without warranty of any kind,
                either express or implied. Because input synthesis interacts directly with low-level kernel and
                window server subsystems (macOS Quartz Event Services and Windows Win32 User Subsystems), the
                developers are not liable for input interruption, operating system crashes, or data loss arising
                from hardware incompatibility or network drops.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2">
                5. Intellectual Property
              </h2>
              <p>
                All rights, titles, and interests in and to the AirDesk codebase, documentation, and interface
                architecture are governed under the project&apos;s open source license agreements.
              </p>
            </section>

            <div className="pt-6 border-t border-white/10 text-xs text-slate-500">
              For queries or security review, refer to the project repository.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
