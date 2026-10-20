import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { UserMode } from '../engine/budget';
import { AwningStripe } from './AwningStripe';
import {
  GraduationCap,
  Home,
  Briefcase,
  Languages,
  Wifi,
  WifiOff,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { mode, setMode, lang, toggleLang, isOnline, resetDemoData } = useApp();

  const handleReset = () => {
    if (window.confirm(t('app.reset_confirm'))) {
      resetDemoData();
    }
  };

  const personaOptions: { id: UserMode; labelKey: string; icon: React.ReactNode }[] = [
    { id: 'student', labelKey: 'modes.student', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'household', labelKey: 'modes.household', icon: <Home className="w-4 h-4" /> },
    { id: 'earner', labelKey: 'modes.earner', icon: <Briefcase className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-paper border-b border-ink/15 sticky top-0 z-30 shadow-xs">
      {/* Top Banner Stripe */}
      <AwningStripe />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        {/* Main Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo & Tagline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-btn bg-ink text-paper flex items-center justify-center font-fraunces text-2xl font-bold shadow-sm">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-fraunces font-bold text-ink tracking-tight">
                    {t('app.name')}
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sand/40 text-ink border border-sand">
                    {t('app.demo_mode')}
                  </span>
                </div>
                <p className="text-xs text-ink/75 font-inter">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Language & Network */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="touch-target px-2.5 py-1 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-xs font-medium border border-ink/20 flex items-center gap-1.5 transition-colors"
                aria-label={`Switch to ${lang === 'en' ? 'Hindi' : 'English'}`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
              </button>

              <div
                className={`touch-target px-2 py-1 rounded-btn text-xs font-medium flex items-center gap-1 border ${
                  isOnline ? 'bg-sky/30 text-ink border-sky-dark/40' : 'bg-sand/40 text-ink border-accent/40'
                }`}
                title={isOnline ? t('app.online_badge') : t('app.offline_badge')}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-ink" /> : <WifiOff className="w-3.5 h-3.5 text-accent" />}
              </div>
            </div>
          </div>

          {/* Desktop & Tablet Controls */}
          <div className="flex items-center gap-3">
            {/* Persona Switcher */}
            <div
              className="flex items-center bg-sand/25 p-1 rounded-card border border-ink/15 w-full sm:w-auto"
              role="radiogroup"
              aria-label="User Persona Mode"
            >
              {personaOptions.map((opt) => {
                const isActive = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    role="radio"
                    aria-checked={isActive}
                    className={`flex-1 sm:flex-initial touch-target px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-btn transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-ink text-paper shadow-sm'
                        : 'text-ink/80 hover:text-ink hover:bg-sand/50'
                    }`}
                  >
                    {opt.icon}
                    <span>{t(opt.labelKey)}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Language Toggle */}
            <button
              type="button"
              onClick={toggleLang}
              className="hidden sm:inline-flex touch-target px-3 py-1.5 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-xs sm:text-sm font-medium border border-ink/20 items-center gap-1.5 transition-colors"
              aria-label={`Switch to ${lang === 'en' ? 'Hindi' : 'English'}`}
            >
              <Languages className="w-4 h-4 text-ink" />
              <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Desktop Network Badge */}
            <div
              className={`hidden sm:inline-flex touch-target px-2.5 py-1.5 rounded-btn text-xs font-semibold items-center gap-1.5 border ${
                isOnline ? 'bg-sky/30 text-ink border-sky-dark/40' : 'bg-sand/50 text-accent-dark border-accent/40'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-accent" />}
              <span>{isOnline ? t('app.online_badge') : t('app.offline_badge')}</span>
            </div>

            {/* Reset Demo Data Button */}
            <button
              type="button"
              onClick={handleReset}
              className="hidden sm:inline-flex touch-target p-2 rounded-btn text-ink/70 hover:text-accent hover:bg-sand/30 transition-colors border border-transparent hover:border-ink/15"
              title={t('app.reset_demo')}
              aria-label={t('app.reset_demo')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Persona Context Sub-bar */}
        <div className="mt-2.5 pt-2 border-t border-ink/10 flex items-center justify-between text-xs text-ink/80">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>
              <strong>{t(`modes.${mode}`)}:</strong> {t(`modes.${mode}_desc`)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="sm:hidden text-xs text-accent hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('app.reset_demo')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
