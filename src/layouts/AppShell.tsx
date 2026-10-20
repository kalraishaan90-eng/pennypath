import React from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Plus,
  Compass,
  TrendingUp,
  MoreHorizontal,
  QrCode,
  Globe,
  PieChart,
  BellRing,
  BookOpen,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { NetworkOfflineBanner } from '../components/common/NetworkOfflineBanner';
import { usePitch } from '../context/PitchContext';

export const AppShell: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const currentLang = i18n.language.startsWith('hi') ? 'hi' : 'en';
  const { handleLogoTap } = usePitch();

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const navItems = [
    { to: '/', label: t('nav.home', 'Home'), icon: Home },
    { to: '/plan', label: t('nav.plan', 'Plan'), icon: Compass },
    { to: '/reminders', label: t('nav.reminders', 'Reminders'), icon: BellRing },
    { to: '/insights', label: t('nav.insights', 'Insights'), icon: PieChart },
    { to: '/add', label: t('nav.add', 'Add'), icon: Plus, isCta: true },
    { to: '/invest', label: t('nav.invest', 'Invest'), icon: TrendingUp },
    { to: '/more', label: t('nav.more', 'More'), icon: MoreHorizontal },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col antialiased selection:bg-sand selection:text-ink">
      {/* Top Awning Stripe Band */}
      <div className="awning-stripe-banner sticky top-0 z-50 shadow-xs" />

      {/* Network Offline Resilience Banner */}
      <NetworkOfflineBanner />

      {/* Desktop Layout Container */}
      <div className="flex flex-1 w-full">
        {/* Left Sidebar for Desktop (>= 1024px) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 border-r border-ink-10 bg-paper/50 p-6 fixed top-2 bottom-0 left-0 z-30 justify-between">
          <div>
            {/* Logo & Branding (5 taps activates Pitch Mode) */}
            <div className="mb-8">
              <button
                type="button"
                onClick={handleLogoTap}
                className="inline-flex items-center gap-2 group text-left cursor-pointer"
                title="Pennypath (5 taps toggles Pitch Mode)"
                aria-label="Pennypath - 5 taps toggles Pitch Mode"
              >
                <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center text-paper font-fraunces text-xl font-bold shadow-sm group-hover:bg-ink-light transition-colors">
                  ₹
                </div>
                <div>
                  <h1 className="font-fraunces text-2xl font-bold text-ink tracking-tight leading-none">
                    {t('app.name')}
                  </h1>
                  <span className="text-[10px] tracking-wider uppercase font-semibold text-accent block mt-1">
                    Bharat Edition
                  </span>
                </div>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5" aria-label="Desktop Main Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isAdd = item.isCta;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `
                      touch-target flex items-center gap-3.5 px-4 py-3 rounded-btn font-medium text-sm transition-all duration-150
                      ${
                        isAdd
                          ? 'bg-ink text-paper hover:bg-ink-light active:bg-ink-dark my-2 shadow-sm font-semibold'
                          : isActive
                            ? 'bg-sand-20 text-ink font-semibold border border-sand-40 shadow-xs'
                            : 'text-ink/75 hover:bg-ink-10 hover:text-ink'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isAdd ? 'text-sky' : ''}`} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              <div className="pt-4 mt-4 border-t border-ink-10 space-y-1">
                {/* UPI Scan & Pay Link */}
                <NavLink
                  to="/pay"
                  className={({ isActive }) => `
                    touch-target flex items-center justify-between px-4 py-2.5 rounded-btn text-xs font-semibold uppercase tracking-wider transition-colors
                    ${
                      isActive
                        ? 'bg-ink text-paper shadow-xs font-bold'
                        : 'text-ink/80 hover:bg-ink-10 hover:text-ink'
                    }
                  `}
                >
                  <div className="flex items-center gap-3.5">
                    <QrCode className="w-4 h-4 shrink-0 text-accent" />
                    <span>{t('nav.pay', 'Scan & Pay')}</span>
                  </div>
                  <Badge variant="accent" size="sm">
                    UPI
                  </Badge>
                </NavLink>

                <NavLink
                  to="/lessons"
                  className={({ isActive }) => `
                    touch-target flex items-center gap-3.5 px-4 py-2.5 rounded-btn text-xs font-semibold uppercase tracking-wider transition-colors
                    ${
                      isActive
                        ? 'bg-ink text-paper shadow-xs font-bold'
                        : 'text-ink/75 hover:bg-ink-10 hover:text-ink'
                    }
                  `}
                >
                  <BookOpen className="w-4 h-4 shrink-0 text-accent" />
                  <span>{t('nav.lessons', 'Learn')}</span>
                </NavLink>
              </div>
            </nav>
          </div>

          {/* Desktop Sidebar Footer with Language Switcher */}
          <div className="pt-6 border-t border-ink-10 space-y-3">
            <button
              onClick={toggleLanguage}
              type="button"
              className="w-full touch-target flex items-center justify-between px-3.5 py-2.5 rounded-btn bg-paper border border-ink-20 hover:border-ink hover:bg-sand-10 text-xs font-semibold text-ink transition-colors"
              aria-label="Toggle language between English and Hindi"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-ink/70" />
                <span>{currentLang === 'en' ? 'English (EN)' : 'हिन्दी (HI)'}</span>
              </div>
              <Badge variant="awning" size="sm">
                {currentLang === 'en' ? 'हिं' : 'EN'}
              </Badge>
            </button>
            <p className="text-[11px] text-ink/50 text-center font-mono">
              PennyPath v1.0 • Envelope FinEngine
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-64 xl:ml-72 flex flex-col min-h-screen">
          {/* Top Header for Mobile & Tablet (< 1024px) */}
          <header className="lg:hidden flex items-center justify-between px-4 sm:px-6 py-3 border-b border-ink-10 bg-paper/80 backdrop-blur-md sticky top-2 z-20">
            <button
              type="button"
              onClick={handleLogoTap}
              className="flex items-center gap-2 text-left cursor-pointer"
              title="Pennypath (5 taps toggles Pitch Mode)"
              aria-label="Pennypath - 5 taps toggles Pitch Mode"
            >
              <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center text-paper font-fraunces text-lg font-bold shadow-xs">
                ₹
              </div>
              <div>
                <span className="font-fraunces text-xl font-bold text-ink tracking-tight block leading-none">
                  {t('app.name')}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-accent block">
                  Bharat
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <Link
                to="/pay"
                className="touch-target p-2 text-ink/80 hover:text-ink rounded-btn hover:bg-ink-10 flex items-center gap-1.5"
                title="Scan & Pay (UPI)"
                aria-label="Scan & Pay (UPI)"
              >
                <QrCode className="w-5 h-5 text-accent" />
              </Link>
              <button
                type="button"
                onClick={toggleLanguage}
                className="touch-target px-2.5 py-1.5 rounded-lg border border-ink-20 hover:border-ink bg-paper text-xs font-bold text-ink flex items-center gap-1.5 transition-colors"
                aria-label="Toggle language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{currentLang === 'en' ? 'हिन्दी' : 'English'}</span>
              </button>
            </div>
          </header>

          {/* Page Outlet Container */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper/95 backdrop-blur-md border-t border-ink-10 px-2 py-1 shadow-lg pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCta = item.isCta;
            const isActive = location.pathname === item.to;

            if (isCta) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="touch-target -mt-5 flex flex-col items-center justify-center group"
                  aria-label={item.label}
                >
                  <div className="w-13 h-13 rounded-full bg-ink text-paper shadow-card flex items-center justify-center p-3 border-2 border-paper group-hover:bg-ink-light group-active:scale-95 transition-all">
                    <Icon className="w-6 h-6 text-sky" />
                  </div>
                  <span className="text-[11px] font-semibold text-ink mt-0.5">
                    {item.label}
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive: active }) => `
                  touch-target flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors
                  ${
                    active
                      ? 'text-ink font-semibold'
                      : 'text-ink/60 hover:text-ink'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-accent stroke-[2.2]' : ''}`} />
                <span className={`text-[11px] mt-0.5 ${isActive ? 'text-ink font-bold' : ''}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
