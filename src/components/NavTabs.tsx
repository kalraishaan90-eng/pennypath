import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  Wallet,
  Target,
  Calculator,
  BellRing,
  TrendingUp,
  BookOpen,
} from 'lucide-react';

export const NavTabs: React.FC = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useApp();

  const tabs: {
    id: 'budget' | 'goals' | 'calculators' | 'reminders' | 'invest' | 'lessons';
    labelKey: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'budget', labelKey: 'nav.budget', icon: <Wallet className="w-4 h-4" /> },
    { id: 'goals', labelKey: 'nav.goals', icon: <Target className="w-4 h-4" /> },
    { id: 'calculators', labelKey: 'nav.calculators', icon: <Calculator className="w-4 h-4" /> },
    { id: 'reminders', labelKey: 'nav.reminders', icon: <BellRing className="w-4 h-4" /> },
    { id: 'invest', labelKey: 'nav.invest', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'lessons', labelKey: 'nav.lessons', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <nav
      className="bg-paper border-b border-ink/15 py-2 px-4 sticky top-[108px] sm:top-[92px] z-20 backdrop-blur-xs shadow-xs"
      aria-label="App Navigation"
    >
      <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`touch-target px-3.5 py-2 rounded-btn text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 ${
                  isActive
                    ? 'bg-ink text-paper shadow-sm ring-1 ring-ink'
                    : 'text-ink/80 hover:text-ink hover:bg-sand/40 border border-transparent hover:border-ink/15'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.icon}
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
