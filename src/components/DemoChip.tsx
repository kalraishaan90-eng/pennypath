import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { Sparkles, LogOut } from 'lucide-react';

export const DemoChip: React.FC = () => {
  const { t } = useTranslation();
  const { isDemo, demoPersona, exitDemo } = useAuth();

  if (!isDemo || !demoPersona) {
    return null;
  }

  const personaName = t(`demo.${demoPersona}.name`);
  const personaRole = t(`demo.${demoPersona}.role`);

  return (
    <div
      role="status"
      aria-live="polite"
      data-dev-ui="true"
      className="dev-ui fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-3 px-4 py-2.5 rounded-full bg-ink text-paper shadow-xl border-2 border-sand/40 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky"></span>
        </span>
        <Sparkles className="w-4 h-4 text-sand" />
        <span className="text-xs font-semibold tracking-wide">
          {t('demo.chip_label')}:{' '}
          <strong className="text-sand-light">{personaName}</strong> ({personaRole})
        </span>
      </div>

      <button
        type="button"
        onClick={exitDemo}
        className="touch-target inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent hover:bg-accent-light active:bg-accent-dark text-paper text-xs font-bold transition-all shadow-xs ml-1"
        aria-label={t('demo.exit_demo')}
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>{t('demo.exit_demo')}</span>
      </button>
    </div>
  );
};
