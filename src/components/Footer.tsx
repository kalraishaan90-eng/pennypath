import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { AwningStripe } from './AwningStripe';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-paper border-t border-ink/15 mt-16 text-xs text-ink/75">
      <AwningStripe />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-fraunces font-bold text-ink text-base">
                {t('app.name')}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sand/30 border border-sand text-ink">
                IIT Delhi Ideathon 2026
              </span>
            </div>
            <p className="max-w-xl text-ink/70">
              {t('app.footer_compliance')} Designed specifically for the cash-flow realities of students, homemakers, and first-job earners across Bharat.
            </p>
          </div>

          <div className="flex items-center gap-3 text-ink/80 text-[11px]">
            <div className="flex items-center gap-1.5 p-2 rounded-btn bg-sand/20 border border-ink/10">
              <Shield className="w-3.5 h-3.5 text-ink" />
              <span>Zero Broker Integration • Educational Only</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-ink/60">
          <div>
            Format: Indian Numbering System (Lakhs / Crores) • INR (₹)
          </div>
          <div>
            Built with React, TypeScript, Tailwind CSS, Recharts & PWA
          </div>
        </div>
      </div>
    </footer>
  );
};
