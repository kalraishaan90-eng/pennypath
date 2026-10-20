import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatINR, parseINR } from '../engine/currency';
import { FinancialGoal } from '../types';
import confetti from 'canvas-confetti';
import {
  Target,
  Plus,
  Calendar,
  Sparkles,
  Trophy,
  CheckCircle,
  X,
  BookOpen,
  Calculator,
  BellRing,
  ArrowRight,
} from 'lucide-react';

export const GoalsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { goals, contributeToGoal, addGoal } = useApp();

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<FinancialGoal | null>(null);
  const [contributionInput, setContributionInput] = useState('');

  // Form states for new goal
  const [newTitle, setNewTitle] = useState('');
  const [newTargetAmount, setNewTargetAmount] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newCategory, setNewCategory] = useState<'safety' | 'asset' | 'education' | 'lifestyle'>('safety');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');

  const handleQuickContribute = async (goal: FinancialGoal, amount: number) => {
    const updatedAmount = goal.currentAmount + amount;
    if (updatedAmount >= goal.targetAmount && goal.currentAmount < goal.targetAmount) {
      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0F414A', '#7F0303', '#D8BA98', '#96C0CE'],
        });
      } catch {
        // ignore if canvas not supported
      }
    }
    await contributeToGoal(goal.id, amount);
  };

  const handleCustomContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoalForContribution) {
      const amount = parseINR(contributionInput);
      if (amount > 0) {
        await handleQuickContribute(selectedGoalForContribution, amount);
        setSelectedGoalForContribution(null);
        setContributionInput('');
      }
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseINR(newTargetAmount);
    if (newTitle.trim() && target > 0 && newTargetDate) {
      await addGoal({
        titleKey: newTitle.trim(),
        customTitle: newTitle.trim(),
        targetAmount: target,
        currentAmount: 0,
        targetDate: newTargetDate,
        category: newCategory,
        priority: newPriority,
      });
      setIsAddingGoal(false);
      setNewTitle('');
      setNewTargetAmount('');
      setNewTargetDate('');
    }
  };

  // Helper to compute months remaining and required monthly save
  const computeGoalMetrics = (goal: FinancialGoal) => {
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const monthsRemaining = Math.max(
      1,
      (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth())
    );
    const requiredMonthly = Math.ceil(remainingAmount / monthsRemaining);
    const progressPercent = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100));

    return {
      remainingAmount,
      monthsRemaining,
      requiredMonthly,
      progressPercent,
    };
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-fraunces font-bold text-ink">
            {t('goals.title')}
          </h2>
          <p className="text-sm text-ink/75">
            {t('goals.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingGoal(true)}
          className="touch-target px-3.5 py-2 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('goals.create_goal')}</span>
        </button>
      </div>

      {/* Quick Tool Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/lessons"
          className="p-3.5 rounded-card bg-paper border border-ink/15 hover:border-ink hover:bg-sand/20 transition-all flex items-center justify-between shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sand/30 flex items-center justify-center text-accent">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-ink block group-hover:text-accent transition-colors">
                {t('nav.lessons', 'Learn')}
              </span>
              <span className="text-[11px] text-ink/60">10 Micro-lessons (90s)</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink/40 group-hover:text-accent transition-colors" />
        </Link>

        <Link
          to="/calculators"
          className="p-3.5 rounded-card bg-paper border border-ink/15 hover:border-ink hover:bg-sand/20 transition-all flex items-center justify-between shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sand/30 flex items-center justify-center text-ink">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-ink block group-hover:text-accent transition-colors">
                {t('nav.calculators', 'Calculators')}
              </span>
              <span className="text-[11px] text-ink/60">SIP, EMI & Compounding</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink/40 group-hover:text-accent transition-colors" />
        </Link>

        <Link
          to="/reminders"
          className="p-3.5 rounded-card bg-paper border border-ink/15 hover:border-ink hover:bg-sand/20 transition-all flex items-center justify-between shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sand/30 flex items-center justify-center text-accent">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-ink block group-hover:text-accent transition-colors">
                {t('nav.reminders', 'Reminders')}
              </span>
              <span className="text-[11px] text-ink/60">Upcoming Dues & EMIs</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink/40 group-hover:text-accent transition-colors" />
        </Link>
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const metrics = computeGoalMetrics(goal);
          const isDone = goal.currentAmount >= goal.targetAmount;

          return (
            <div
              key={goal.id}
              className={`p-5 rounded-card bg-paper border flex flex-col justify-between transition-all duration-200 ${
                isDone
                  ? 'border-sky-dark/40 shadow-xs'
                  : goal.priority === 'high'
                  ? 'border-ink/25 shadow-xs'
                  : 'border-ink/15'
              }`}
            >
              <div>
                {/* Header: Title + Priority Tag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-btn flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-sky text-ink'
                          : goal.priority === 'high'
                          ? 'bg-accent/15 text-accent'
                          : 'bg-sand/40 text-ink'
                      }`}
                    >
                      {isDone ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-inter font-bold text-ink text-sm sm:text-base leading-snug">
                        {goal.customTitle || t(goal.titleKey, { defaultValue: goal.titleKey })}
                      </h3>
                      <span className="text-[11px] text-ink/70 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Target: {new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      goal.priority === 'high'
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'bg-sand/30 text-ink/75 border border-sand'
                    }`}
                  >
                    {t(`goals.priority_${goal.priority}`)}
                  </span>
                </div>

                {/* Progress bar and numbers */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl sm:text-2xl font-fraunces font-bold text-ink">
                        {formatINR(goal.currentAmount)}
                      </span>
                      <span className="text-xs text-ink/60 font-medium ml-1">
                        / {formatINR(goal.targetAmount)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-ink">
                      {metrics.progressPercent}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-sand/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone ? 'bg-sky-dark' : 'bg-ink'
                      }`}
                      style={{ width: `${metrics.progressPercent}%` }}
                    />
                  </div>

                  {/* Engine calculated monthly needed */}
                  {!isDone && (
                    <div className="pt-2 flex items-center justify-between text-xs text-ink/70">
                      <span>{t('goals.monthly_target_needed')}:</span>
                      <span className="font-semibold text-ink">
                        {formatINR(metrics.requiredMonthly)} / mo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-4 border-t border-ink/10 flex items-center gap-2">
                {isDone ? (
                  <div className="w-full p-2 rounded-btn bg-sky/30 text-ink font-semibold text-xs flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-ink" />
                    <span>{t('goals.goal_completed')}</span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleQuickContribute(goal, 500)}
                      className="touch-target flex-1 py-2 px-2 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-xs font-semibold transition-colors"
                    >
                      +₹500
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickContribute(goal, 1000)}
                      className="touch-target flex-1 py-2 px-2 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-xs font-semibold transition-colors"
                    >
                      +₹1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGoalForContribution(goal);
                        setContributionInput('');
                      }}
                      className="touch-target py-2 px-3 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>{t('goals.contribute')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Custom Contribution */}
      {selectedGoalForContribution && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-sm bg-paper border border-ink/20 rounded-card shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <h3 className="font-fraunces font-bold text-lg text-ink">
                {t('goals.contribute')}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedGoalForContribution(null)}
                className="text-ink/60 hover:text-ink p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink/75">
              Adding savings to{' '}
              <strong>
                {selectedGoalForContribution.customTitle ||
                  t(selectedGoalForContribution.titleKey, { defaultValue: selectedGoalForContribution.titleKey })}
              </strong>
            </p>

            <form onSubmit={handleCustomContribution} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink/80 block mb-1">
                  Amount in ₹
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2,500"
                  value={contributionInput}
                  onChange={(e) => setContributionInput(e.target.value)}
                  className="w-full p-2.5 rounded-btn border border-ink/20 text-sm font-semibold bg-sand/10 focus:bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedGoalForContribution(null)}
                  className="touch-target px-4 py-2 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-sm font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light text-paper text-sm font-semibold"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Goal */}
      {isAddingGoal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md bg-paper border border-ink/20 rounded-card shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <h3 className="font-fraunces font-bold text-lg text-ink">
                {t('goals.create_goal')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="text-ink/60 hover:text-ink p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink/80 block mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali 24K Gold Coin, Laptop, Emergency"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-btn border border-ink/20 font-medium bg-sand/10 focus:bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink/80 block mb-1">
                    {t('goals.target_amount')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50,000"
                    value={newTargetAmount}
                    onChange={(e) => setNewTargetAmount(e.target.value)}
                    className="w-full p-2.5 rounded-btn border border-ink/20 font-medium bg-sand/10 focus:bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink/80 block mb-1">
                    {t('goals.target_date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full p-2.5 rounded-btn border border-ink/20 font-medium bg-sand/10 focus:bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink/80 block mb-1">
                    {t('goals.category')}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-btn border border-ink/20 font-medium bg-sand/10 focus:bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink"
                  >
                    <option value="safety">Safety (Emergency)</option>
                    <option value="asset">Asset (Gold/FD)</option>
                    <option value="education">Education / Tech</option>
                    <option value="lifestyle">Lifestyle / Festival</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-ink/80 block mb-1">
                    {t('goals.priority')}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-btn border border-ink/20 font-medium bg-sand/10 focus:bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink"
                  >
                    <option value="high">{t('goals.priority_high')}</option>
                    <option value="medium">{t('goals.priority_medium')}</option>
                    <option value="low">{t('goals.priority_low')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="touch-target px-4 py-2 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-sm font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light text-paper text-sm font-semibold shadow-xs"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
