import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../engine/currency';
import {
  computeCategoryBreakdown,
  computeMonthOverMonth,
  computeWhereYouCanSave,
  computeSpendingPace,
  computeHealthScoreDetail,
  computeWeeklySummary,
} from '../../engine/insightsEngine';
import { CategoryBreakdownCard } from './CategoryBreakdownCard';
import { MonthOverMonthBarsCard } from './MonthOverMonthBarsCard';
import { WhereYouCanSaveCards } from './WhereYouCanSaveCards';
import { SpendingPaceLineCard } from './SpendingPaceLineCard';
import { HealthScoreDetailPage } from './HealthScoreDetailPage';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { ContextualLessonCard } from '../home/ContextualLessonCard';
import { Card, CardContent } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  PieChart,
  BarChart3,
  Sparkles,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Award,
} from 'lucide-react';

interface InsightsScreenProps {
  defaultTab?: 'overview' | 'health';
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  defaultTab = 'overview',
}) => {
  const { t } = useTranslation();
  const {
    profile,
    envelopes,
    reminders,
    transactions,
    isLoading,
    refreshData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'health'>(defaultTab);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  // Anchor simulated reference date for consistent mid-month demonstrations (20 Oct 2026)
  const simDate = useMemo(() => new Date('2026-10-20T10:30:00+05:30'), []);

  // Compute all metrics via pure TypeScript insightsEngine
  const categoryBreakdown = useMemo(() => {
    return computeCategoryBreakdown(transactions, selectedMonth, envelopes);
  }, [transactions, selectedMonth, envelopes]);

  const monthOverMonth = useMemo(() => {
    return computeMonthOverMonth(transactions, profile?.monthlyIncome || 0);
  }, [transactions, profile?.monthlyIncome]);

  const whereYouCanSave = useMemo(() => {
    return computeWhereYouCanSave(transactions, selectedMonth, envelopes);
  }, [transactions, selectedMonth, envelopes]);

  const totalMonthlyBudget = useMemo(() => {
    const allocated = envelopes.reduce((s, e) => s + e.allocated, 0);
    return allocated > 0 ? allocated : (profile?.monthlyIncome || 38000);
  }, [envelopes, profile?.monthlyIncome]);

  const spendingPace = useMemo(() => {
    return computeSpendingPace(transactions, selectedMonth, totalMonthlyBudget, simDate);
  }, [transactions, selectedMonth, totalMonthlyBudget, simDate]);

  const healthScoreDetail = useMemo(() => {
    const income = profile?.monthlyIncome || 0;
    return computeHealthScoreDetail(income, envelopes, reminders);
  }, [profile?.monthlyIncome, envelopes, reminders]);

  const weeklySummary = useMemo(() => {
    return computeWeeklySummary(transactions, simDate);
  }, [transactions, simDate]);

  // Available months from transactions
  const availableMonths = useMemo(() => {
    const set = new Set<string>(['2026-10', '2026-09']);
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        set.add(tx.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  return (
    <div className="space-y-6 pb-20 selection:bg-sand selection:text-ink">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink/15">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t('insights.title', 'Financial Insights')}
            </h1>
            <Badge variant="awning" size="sm">Bharat Analytics</Badge>
          </div>
          <p className="text-xs sm:text-sm text-ink/70 mt-1">
            {t(
              'insights.subtitle',
              'Deep analytics across envelopes, spending pace, savings opportunities, and health score'
            )}
          </p>
        </div>

        {/* Month selector & tab switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector dropdown */}
          <div className="flex items-center gap-1.5 bg-paper border border-ink/20 rounded-btn px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-ink/60" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-ink focus:outline-hidden cursor-pointer"
              aria-label="Select insight month"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m === '2026-10' ? 'October 2026' : m === '2026-09' ? 'September 2026' : m}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={refreshData}
            title="Refresh Insights"
            className="touch-target p-2 rounded-btn border border-ink/20 hover:border-ink hover:bg-sand/20 text-ink/70 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Primary View Tabs: Insights vs Health Score Detail */}
      <div className="flex items-center justify-center sm:justify-start gap-1 p-1 rounded-btn bg-sand/20 border border-sand/40 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 touch-target px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-ink text-paper shadow-sm'
              : 'text-ink/70 hover:text-ink hover:bg-sand/40'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>{t('insights.tabs.trends', 'Trends & Savings')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`flex-1 touch-target px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'health'
              ? 'bg-ink text-paper shadow-sm'
              : 'text-ink/70 hover:text-ink hover:bg-sand/40'
          }`}
        >
          <Activity className="w-4 h-4 text-accent" />
          <span>{t('insights.tabs.health_detail', 'Health Detail & +10 Pts')}</span>
          <span className="w-2 h-2 rounded-full bg-accent" />
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Contextual Micro-Lesson Insight Card */}
          <ContextualLessonCard />

          {/* 1. Weekly Summary Card */}
          <WeeklySummaryCard data={weeklySummary} />

          {/* 2. Category breakdown (donut + ranked list) */}
          <CategoryBreakdownCard
            data={categoryBreakdown}
            selectedMonth={selectedMonth}
          />

          {/* 3. Spending pace line vs ideal pace */}
          <SpendingPaceLineCard data={spendingPace} />

          {/* 4. Month-over-month bars (spend vs income vs saved) */}
          <MonthOverMonthBarsCard data={monthOverMonth} />

          {/* 5. "Where you can save" cards (engine-derived with sipFutureValue) */}
          <WhereYouCanSaveCards data={whereYouCanSave} />

          {/* Quick jump banner to Health Score Detail */}
          <div
            onClick={() => setActiveTab('health')}
            className="p-4 rounded-card bg-paper border border-ink/15 hover:border-ink shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center font-bold font-fraunces text-base shadow-xs">
                {healthScoreDetail.totalScore}
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-ink font-fraunces group-hover:text-accent transition-colors">
                  View Full Health Score Detail & +10 Point Suggestions
                </h4>
                <p className="text-xs text-ink/70 mt-0.5">
                  See the 4 underlying pillars with step-by-step advice to improve your score.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="touch-target px-4 py-2 rounded-btn bg-sand/30 hover:bg-sand/50 text-ink text-xs font-bold transition-colors flex items-center gap-1.5 self-end sm:self-auto shrink-0"
            >
              <span>Explore Health Pillars</span>
              <ArrowRight className="w-3.5 h-3.5 text-accent" />
            </button>
          </div>
        </div>
      ) : (
        <HealthScoreDetailPage data={healthScoreDetail} />
      )}
    </div>
  );
};
