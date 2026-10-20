import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Globe,
  Coins,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { usePitch } from '../context/PitchContext';

interface LandingPageProps {
  onGetStarted: () => void;
  onTryDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onTryDemo,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('hi') ? 'hi' : 'en';
  const { handleLogoTap } = usePitch();

  const toggleLanguage = () => {
    const next = currentLang === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col selection:bg-sand selection:text-ink">
      {/* Top Signature Awning Stripe Banner */}
      <div className="awning-stripe-banner sticky top-0 z-50 shadow-xs" />

      {/* Navigation Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between border-b border-ink/10">
        <button
          type="button"
          onClick={handleLogoTap}
          className="flex items-center gap-2.5 text-left cursor-pointer"
          title="Pennypath (5 taps toggles Pitch Mode)"
          aria-label="Pennypath - 5 taps toggles Pitch Mode"
        >
          <div className="w-10 h-10 rounded-xl bg-ink text-paper font-fraunces text-2xl font-bold flex items-center justify-center shadow-md">
            ₹
          </div>
          <div>
            <span className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight block leading-none">
              Pennypath
            </span>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-accent block mt-0.5">
              Bharat Edition
            </span>
          </div>
        </button>

        {/* Language Toggle & Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="touch-target px-3 py-1.5 rounded-btn border border-ink/30 hover:border-ink bg-paper text-xs font-bold text-ink flex items-center gap-1.5 transition-colors shadow-xs"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-ink/70" />
            <span>{currentLang === 'en' ? 'हिन्दी (HI)' : 'English (EN)'}</span>
          </button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onTryDemo}
            leftIcon={<Sparkles className="w-4 h-4 text-accent" />}
            className="hidden sm:inline-flex"
          >
            {t('landing.try_demo')}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center text-center">
        {/* Awning Badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sand-dark bg-sand/20 text-ink text-xs font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>Personal Finance for Indian Realities</span>
        </div>

        {/* Logo & Headline */}
        <h1 className="font-fraunces text-4xl sm:text-6xl lg:text-7xl font-bold text-ink tracking-tight leading-[1.08] max-w-3xl">
          Pennypath
        </h1>

        {/* Tagline */}
        <p className="font-fraunces text-2xl sm:text-4xl font-semibold text-accent mt-3 italic tracking-tight">
          "{t('landing.tagline')}"
        </p>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-ink/75 max-w-2xl mt-4 sm:mt-6 leading-relaxed">
          {t('landing.subheading')}
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onGetStarted}
            rightIcon={<ArrowRight className="w-5 h-5" />}
            className="w-full sm:w-auto px-8 py-4 text-base font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {t('landing.get_started')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onTryDemo}
            leftIcon={<Sparkles className="w-5 h-5 text-accent" />}
            className="w-full sm:w-auto px-6 py-4 text-base font-bold border-2 hover:bg-sand/20 transition-all"
          >
            {t('landing.try_demo')}
          </Button>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-5 rounded-card border-2 border-ink/15 bg-paper/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-fraunces text-base font-bold text-ink">
              {t('landing.features.offline')}
            </h3>
            <p className="text-xs sm:text-sm text-ink/70 leading-relaxed">
              {t('landing.features.offline_desc')}
            </p>
          </div>

          <div className="p-5 rounded-card border-2 border-ink/15 bg-paper/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-accent text-paper flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-fraunces text-base font-bold text-ink">
              {t('landing.features.envelopes')}
            </h3>
            <p className="text-xs sm:text-sm text-ink/70 leading-relaxed">
              {t('landing.features.envelopes_desc')}
            </p>
          </div>

          <div className="p-5 rounded-card border-2 border-ink/15 bg-paper/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sand-dark text-ink-dark flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="font-fraunces text-base font-bold text-ink">
              {t('landing.features.privacy')}
            </h3>
            <p className="text-xs sm:text-sm text-ink/70 leading-relaxed">
              {t('landing.features.privacy_desc')}
            </p>
          </div>
        </div>

        {/* 3 Personas Banner Preview */}
        <div className="mt-12 w-full p-4 sm:p-6 rounded-card border border-ink/15 bg-sand/15 text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-fraunces text-base font-bold text-ink">
              Tailored for 3 distinct personas:
            </h4>
            <p className="text-xs sm:text-sm text-ink/75 mt-0.5">
              Rohan (First-job Earner, ₹38k) • Meena (Homemaker, ₹55k) • Aarav (Student, ₹12k)
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onTryDemo}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Launch Demo Now
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink/10 py-6 text-center text-xs text-ink/60">
        <p>Pennypath • Bharat Personal Finance PWA • Fully Offline</p>
      </footer>
    </div>
  );
};
