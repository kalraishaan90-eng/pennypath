import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { repository } from '../../repository';
import { UserMode, BudgetEnvelope } from '../../engine/budget';
import { DueReminder, UserProfile, PaymentMode, Transaction } from '../../types';
import { computeHomeDashboard, HomeDashboardData } from '../../engine/homeEngine';
import { formatINR } from '../../engine/currency';
import { GreetingHeader } from './GreetingHeader';
import { HeroSafeToSpendCard } from './HeroSafeToSpendCard';
import { SavingsTrackerCard } from './SavingsTrackerCard';
import { FinancialHealthScoreCard } from './FinancialHealthScoreCard';
import { CategoryCapsCard } from './CategoryCapsCard';
import { Next7DaysDuesStrip } from './Next7DaysDuesStrip';
import { ContextualLessonCard } from './ContextualLessonCard';
import { QuickAddFAB } from './QuickAddFAB';
import { AddExpenseSheet } from './AddExpenseSheet';
import { PlanScreenModal } from './PlanScreenModal';
import { DemoTransactionSimulator } from './DemoTransactionSimulator';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

export const HomeDashboard: React.FC = () => {
  const { t } = useTranslation();
  const currentMode: UserMode = 'earner'; // Rohan is First-Job Earner

  // Component states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [envelopes, setEnvelopes] = useState<BudgetEnvelope[]>([]);
  const [reminders, setReminders] = useState<DueReminder[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Undo Toast state
  const [undoTx, setUndoTx] = useState<{
    id: string;
    envelopeId?: string;
    amount: number;
    title: string;
    type: 'expense' | 'income';
  } | null>(null);

  // Auto-dismiss undo after 6 seconds
  useEffect(() => {
    if (!undoTx) return;
    const timer = setTimeout(() => {
      setUndoTx(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [undoTx]);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [isPlanOpen, setIsPlanOpen] = useState<boolean>(false);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prof, envs, rems] = await Promise.all([
        repository.getProfile(currentMode),
        repository.getEnvelopes(currentMode),
        repository.getReminders(currentMode),
      ]);
      setProfile(prof);
      setEnvelopes(envs);
      setReminders(rems);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMode]);

  // Compute all dashboard metrics strictly in engine with NO MATH in UI
  const dashboardData: HomeDashboardData | null = useMemo(() => {
    if (!profile || envelopes.length === 0) return null;
    // Anchor current date for consistent demonstration: 20 Oct 2026
    const simDate = new Date('2026-10-20T10:30:00+05:30');
    return computeHomeDashboard(profile, envelopes, reminders, simDate);
  }, [profile, envelopes, reminders]);

  // Handlers
  const handleAddExpense = async (
    envelopeId: string,
    amount: number,
    note?: string,
    paymentMode?: PaymentMode,
    date?: string
  ) => {
    const targetEnv = envelopes.find((e) => e.id === envelopeId);
    const catName = targetEnv ? t(targetEnv.categoryKey) : 'Expense';
    
    // 1. Add transaction to repository (this also automatically updates envelope spent)
    const newTx = await repository.addTransaction({
      date: date || '2026-10-20',
      categoryKey: targetEnv ? targetEnv.categoryKey : 'budget.cat.food_groceries',
      description: note || catName,
      amount,
      type: 'expense',
      envelopeId,
      paymentMode: paymentMode || 'upi',
    }, currentMode);

    // 2. Refresh envelopes in state
    const updatedEnvelopes = await repository.getEnvelopes(currentMode);
    setEnvelopes(updatedEnvelopes);

    // 3. Set Undo toast
    setUndoTx({
      id: newTx.id,
      envelopeId,
      amount,
      title: catName,
      type: 'expense',
    });
  };

  const handleQuickAddIncome = async (
    amount: number,
    description: string,
    paymentMode?: PaymentMode,
    date?: string
  ) => {
    const newTx = await repository.addTransaction({
      date: date || '2026-10-20',
      categoryKey: 'budget.cat.income',
      description: description || 'Bonus / Gift',
      amount,
      type: 'income',
      paymentMode: paymentMode || 'upi',
    }, currentMode);

    setUndoTx({
      id: newTx.id,
      amount,
      title: description || 'Income',
      type: 'income',
    });
  };

  const handleUndo = async () => {
    if (!undoTx) return;
    try {
      await repository.deleteTransaction(undoTx.id, currentMode);
      const updatedEnvelopes = await repository.getEnvelopes(currentMode);
      setEnvelopes(updatedEnvelopes);
    } catch {
      // ignore
    } finally {
      setUndoTx(null);
    }
  };

  const handleSimulateChange = async (envelopeId: string, delta: number) => {
    const updated = await repository.updateEnvelopeSpent(currentMode, envelopeId, delta);
    setEnvelopes((prev) =>
      prev.map((e) => (e.id === envelopeId ? updated : e))
    );
  };

  const handleToggleDuePaid = async (reminderId: string) => {
    const res = await repository.markReminderPaid(currentMode, reminderId, { logTransaction: true });
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? res.reminder : r))
    );
    const updatedEnvelopes = await repository.getEnvelopes(currentMode);
    setEnvelopes(updatedEnvelopes);
  };

  const handleResetDemo = async () => {
    await repository.resetSeedData(currentMode);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-paper text-ink pb-24 selection:bg-sand selection:text-ink">
      {/* Container with strict 360px minimum width safety and fluid padding */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4">
        {/* 1. Greeting + Month Selector */}
        <GreetingHeader
          profile={profile}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => setReducedMotion((v) => !v)}
          onResetDemo={handleResetDemo}
        />

        {/* Demo verification strip for instant math test */}
        {envelopes.length > 0 && (
          <DemoTransactionSimulator
            envelopes={envelopes}
            onSimulateChange={handleSimulateChange}
          />
        )}

        {/* Dashboard Cards Grid (Mobile first single-col, Desktop 2-col) */}
        <main className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Col 1 on Desktop */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* 2. HERO CARD: Safe to spend today */}
            <HeroSafeToSpendCard
              data={dashboardData?.hero || null}
              loading={loading}
              error={error}
              onRetry={loadData}
            />

            {/* 5. Category Caps: Top 5 Categories */}
            <CategoryCapsCard
              categories={dashboardData?.categoryCaps || null}
              loading={loading}
              error={error}
              onRetry={loadData}
            />
          </div>

          {/* Col 2 on Desktop */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* 3. Savings Tracker Card */}
            <SavingsTrackerCard
              data={dashboardData?.savingsTracker || null}
              onNavigateToPlan={() => setIsPlanOpen(true)}
              loading={loading}
              error={error}
              onRetry={loadData}
            />

            {/* 4. Financial Health Score Card */}
            <FinancialHealthScoreCard
              data={dashboardData?.healthScore || null}
              reducedMotion={reducedMotion}
              loading={loading}
              error={error}
              onRetry={loadData}
            />
          </div>

          {/* Contextual Smart Micro-Lesson Card */}
          <div className="lg:col-span-2">
            <ContextualLessonCard />
          </div>

          {/* 6. Next 7 Days Dues Strip: Span full width on desktop */}
          <div className="lg:col-span-2">
            <Next7DaysDuesStrip
              dues={dashboardData?.upcomingDues || null}
              onTogglePaid={handleToggleDuePaid}
              loading={loading}
              error={error}
              onRetry={loadData}
            />
          </div>
        </main>
      </div>

      {/* 7. Quick-Add Floating Action Button */}
      <QuickAddFAB onClick={() => setIsAddExpenseOpen(true)} />

      {/* Add Expense Bottom Sheet / Modal */}
      <AddExpenseSheet
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        envelopes={envelopes}
        onAddExpense={handleAddExpense}
        onAddIncome={handleQuickAddIncome}
      />

      {/* Undo Toast Notification */}
      {undoTx && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-ink text-paper rounded-card shadow-modal border border-ink/40 max-w-sm sm:max-w-md w-[92vw] animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-sky shrink-0" />
            <div className="text-xs sm:text-sm font-semibold truncate">
              {undoTx.type === 'expense'
                ? t('tx.expense_added_toast', {
                    amount: formatINR(undoTx.amount),
                    category: undoTx.title,
                    defaultValue: `Added ₹${undoTx.amount} to ${undoTx.title}`,
                  })
                : t('tx.income_added_toast', {
                    amount: formatINR(undoTx.amount),
                    description: undoTx.title,
                    defaultValue: `Added income ₹${undoTx.amount} (${undoTx.title})`,
                  })}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleUndo}
              className="touch-target px-2.5 py-1 text-xs font-bold bg-accent hover:bg-accent-dark text-paper rounded-btn shadow-xs flex items-center gap-1 transition-all"
              aria-label={t('common.undo', { defaultValue: 'Undo' })}
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('common.undo', { defaultValue: 'Undo' })}</span>
            </button>
            <button
              onClick={() => setUndoTx(null)}
              className="touch-target p-1 text-paper/60 hover:text-paper rounded-full transition-colors"
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* One-Tap Plan Screen Destination */}
      <PlanScreenModal
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        envelopes={envelopes}
        monthlyIncome={profile?.monthlyIncome || 38000}
      />
    </div>
  );
};
