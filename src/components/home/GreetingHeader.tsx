import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Globe, Sparkles, RefreshCcw, Eye } from 'lucide-react';
import { UserProfile } from '../../types';

interface GreetingHeaderProps {
  profile: UserProfile | null;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onResetDemo: () => void;
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({
  profile,
  selectedMonth,
  onMonthChange,
  reducedMotion,
  onToggleReducedMotion,
  onResetDemo,
}) => {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('hi') ? 'en' : 'hi';
    i18n.changeLanguage(nextLang);
  };

  // Determine time of day for greeting
  const getGreetingKey = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'greeting.morning';
    if (hour < 17) return 'greeting.afternoon';
    if (hour < 21) return 'greeting.evening';
    return 'greeting.night';
  };

  const name = profile?.name || 'Rohan';

  return (
    <header className="w-full bg-paper border-b border-ink/10 pb-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Greeting & Persona */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sand/30 text-ink border border-sand/40">
              <Sparkles className="w-3 h-3 text-ink" />
              {t('greeting.persona')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-ink/10 text-ink">
              {t('common.demo_badge')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-fraunces font-bold text-ink mt-1 truncate">
            {t(getGreetingKey(), { name })}
          </h1>
        </div>

        {/* Right: Controls (Month selector, Language toggle, Motion toggle) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month selector */}
          <div className="relative inline-flex items-center">
            <label htmlFor="month-select" className="sr-only">
              Select Month
            </label>
            <Calendar className="w-4 h-4 text-ink absolute left-2.5 pointer-events-none" />
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="touch-target pl-8 pr-4 py-1.5 text-xs sm:text-sm font-semibold bg-paper text-ink border border-ink/20 rounded-btn hover:border-ink/50 focus:outline-none focus:ring-2 focus:ring-ink transition-all appearance-none cursor-pointer"
            >
              <option value="2026-10">{t('month.october_2026')}</option>
              <option value="2026-11">{t('month.november_2026')}</option>
              <option value="2026-12">{t('month.december_2026')}</option>
            </select>
          </div>

          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold bg-sand/20 hover:bg-sand/40 text-ink border border-sand/50 rounded-btn transition-colors"
            title="Switch Language"
            aria-label="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-ink" />
            <span>{t('greeting.switch_lang')}</span>
          </button>

          {/* Reduced Motion Toggle Button */}
          <button
            onClick={onToggleReducedMotion}
            className={`touch-target inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border rounded-btn transition-colors ${
              reducedMotion
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper text-ink font-semibold border-ink/25 hover:border-ink/50'
            }`}
            title={`${t('common.reduced_motion')}: ${reducedMotion ? 'ON' : 'OFF'}`}
            aria-label={`${t('common.reduced_motion')}: ${reducedMotion ? 'ON' : 'OFF'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{t('common.reduced_motion')}</span>
            <span className="text-[10px] font-bold uppercase">{reducedMotion ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemo}
            className="touch-target inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-ink/60 hover:text-ink border border-ink/15 hover:border-ink/40 rounded-btn transition-colors"
            title="Reset Rohan Demo Data"
            aria-label="Reset Rohan Demo Data"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
