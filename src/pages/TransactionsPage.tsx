import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { repository } from '../repository';
import { Transaction, PaymentMode } from '../types';
import { BudgetEnvelope } from '../engine/budget';
import { formatINR, parseINR } from '../engine/currency';
import { parseUPISMS, SAMPLE_UPI_SMS, ParsedSMSResult } from '../utils/smsParser';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { AddExpenseSheet } from '../components/home/AddExpenseSheet';
import {
  Plus,
  ArrowUpRight,
  ClipboardPaste,
  Search,
  Filter,
  Trash2,
  Edit2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Calendar,
  Smartphone,
  Banknote,
  CreditCard,
  MoreHorizontal,
  Mail,
  Wallet,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

const ANCHOR_TODAY = '2026-10-20';

export const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const appContext = useApp();

  const mode = appContext?.mode || 'earner';
  const profile = appContext?.profile;
  const envelopes = appContext?.envelopes || [];

  // Internal state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');

  // View modes
  // Student: weekly view toggle
  const [studentWeeklyOnly, setStudentWeeklyOnly] = useState(false);
  // Household: envelope view toggle
  const [householdViewMode, setHouseholdViewMode] = useState<'envelopes' | 'transactions'>('transactions');

  // Modals & Sheets
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [sheetInitialMode, setSheetInitialMode] = useState<'expense' | 'income'>('expense');
  const [selectedEnvelopeForAdd, setSelectedEnvelopeForAdd] = useState<string | undefined>(undefined);

  // Edit Modal State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryKey, setEditCategoryKey] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode>('upi');
  const [editDate, setEditDate] = useState('');

  // Delete Confirm Modal State
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  // Undo Toast State
  const [undoTx, setUndoTx] = useState<{
    tx: Transaction;
    envelopeId?: string;
    message: string;
  } | null>(null);

  // SMS Box State (Stretch feature)
  const [showSMSBox, setShowSMSBox] = useState(false);
  const [smsInput, setSmsInput] = useState('');
  const [parsedSMS, setParsedSMS] = useState<ParsedSMSResult | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsCategoryKey, setSmsCategoryKey] = useState<string>('');

  // Pagination (handles 500+ rows smoothly)
  const [pageSize, setPageSize] = useState(30);

  // Load transactions
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const txs = await repository.getTransactions(mode);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [mode]);

  // Auto-dismiss undo after 6 seconds
  useEffect(() => {
    if (!undoTx) return;
    const timer = setTimeout(() => {
      setUndoTx(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [undoTx]);

  // Handle SMS parse
  const handleParseSMS = (text: string) => {
    setSmsInput(text);
    setSmsError(null);
    if (!text.trim()) {
      setParsedSMS(null);
      return;
    }
    const result = parseUPISMS(text);
    if (result) {
      setParsedSMS(result);
      setSmsCategoryKey(result.suggestedCategoryKey);
    } else {
      setParsedSMS(null);
      setSmsError(t('tx.sms.parse_failed', { defaultValue: 'Could not extract debit amount. Please paste a valid bank debit SMS.' }));
    }
  };

  // Confirm and Save SMS Expense (Never auto-saved!)
  const handleConfirmSMSExpense = async () => {
    if (!parsedSMS) return;

    // Match envelope
    const matchEnv = envelopes.find((e) => e.categoryKey === smsCategoryKey) || envelopes[0];
    const newTx = await repository.addTransaction(
      {
        amount: parsedSMS.amount,
        type: 'expense',
        categoryKey: smsCategoryKey || matchEnv?.categoryKey || 'budget.cat.food_groceries',
        description: parsedSMS.merchant,
        date: parsedSMS.date,
        envelopeId: matchEnv?.id,
        paymentMode: 'upi',
      },
      mode
    );

    // Refresh state
    await loadTransactions();
    await appContext?.refreshData();

    // Trigger undo toast
    setUndoTx({
      tx: newTx,
      envelopeId: matchEnv?.id,
      message: t('tx.expense_added_toast', {
        amount: formatINR(parsedSMS.amount),
        category: matchEnv ? t(matchEnv.categoryKey) : parsedSMS.merchant,
        defaultValue: `Added ₹${parsedSMS.amount} to ${parsedSMS.merchant}`,
      }),
    });

    // Reset SMS box
    setSmsInput('');
    setParsedSMS(null);
    setShowSMSBox(false);
  };

  // Student mode calculations: Weekly budget & pocket money left this week
  const studentMetrics = useMemo(() => {
    if (mode !== 'student') return null;
    const monthlyIncome = profile?.monthlyIncome || 12000;
    // Weekly pocket money budget (approx 4 weeks per month)
    const weeklyBudget = Math.round(monthlyIncome / 4);

    // Filter current week transactions (Oct 19 - Oct 25, 2026)
    const weekStart = '2026-10-19';
    const weekEnd = '2026-10-25';
    const weekExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.date >= weekStart && t.date <= weekEnd
    );
    const spentThisWeek = weekExpenses.reduce((sum, t) => sum + t.amount, 0);
    const pocketMoneyLeft = Math.max(0, weeklyBudget - spentThisWeek);
    const percentUsed = Math.min(100, Math.round((spentThisWeek / weeklyBudget) * 100));

    // Remaining days in current week (from Tuesday 20 Oct to Sunday 25 Oct = 6 days inclusive)
    const daysLeftInWeek = 6;
    const safeDailySpend = Math.max(0, Math.round(pocketMoneyLeft / daysLeftInWeek));

    return {
      weeklyBudget,
      spentThisWeek,
      pocketMoneyLeft,
      percentUsed,
      daysLeftInWeek,
      safeDailySpend,
    };
  }, [mode, profile, transactions]);

  // Filtering transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Student weekly view toggle filter
    if (mode === 'student' && studentWeeklyOnly) {
      list = list.filter((t) => t.date >= '2026-10-19' && t.date <= '2026-10-25');
    }

    // Search query (matches description or note)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => (t.description || '').toLowerCase().includes(q));
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(
        (t) => t.categoryKey === selectedCategory || t.envelopeId === selectedCategory
      );
    }

    // Date filter
    if (selectedDateFilter === 'today') {
      list = list.filter((t) => t.date === ANCHOR_TODAY);
    } else if (selectedDateFilter === 'week') {
      list = list.filter((t) => t.date >= '2026-10-19' && t.date <= '2026-10-25');
    } else if (selectedDateFilter === 'month') {
      list = list.filter((t) => t.date.startsWith('2026-10'));
    }

    // Payment mode filter
    if (selectedPaymentMode !== 'all') {
      list = list.filter((t) => (t.paymentMode || 'upi') === selectedPaymentMode);
    }

    // Sort descending by date so newest transactions always appear first
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return list;
  }, [
    transactions,
    mode,
    studentWeeklyOnly,
    searchQuery,
    selectedCategory,
    selectedDateFilter,
    selectedPaymentMode,
  ]);

  // Paginated list for smooth 500+ row rendering
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, pageSize);
  }, [filteredTransactions, pageSize]);

  // Group transactions by day
  const groupedByDay = useMemo(() => {
    const groups: {
      date: string;
      label: string;
      totalSpent: number;
      totalIncome: number;
      items: Transaction[];
    }[] = [];

    const map = new Map<string, Transaction[]>();
    for (const tx of paginatedTransactions) {
      const d = tx.date || ANCHOR_TODAY;
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(tx);
    }

    // Sort dates descending
    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    for (const d of sortedDates) {
      const items = map.get(d)!;
      let label = d;
      if (d === ANCHOR_TODAY) {
        label = `Today, 20 Oct 2026`;
      } else if (d === '2026-10-19') {
        label = `Yesterday, 19 Oct 2026`;
      } else {
        const parts = d.split('-');
        if (parts.length === 3) {
          const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          label = dateObj.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      }

      const totalSpent = items
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalIncome = items
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      groups.push({
        date: d,
        label,
        totalSpent,
        totalIncome,
        items,
      });
    }

    return groups;
  }, [paginatedTransactions]);

  // Add Expense Handler from AddExpenseSheet
  const handleAddExpense = async (
    envelopeId: string,
    amount: number,
    note: string,
    paymentMode: PaymentMode = 'upi',
    date: string = ANCHOR_TODAY
  ) => {
    const env = envelopes.find((e) => e.id === envelopeId);
    const catName = env ? t(env.categoryKey) : 'Expense';
    const newTx = await repository.addTransaction(
      {
        date,
        amount,
        type: 'expense',
        categoryKey: env?.categoryKey || 'budget.cat.food_groceries',
        description: note || catName,
        envelopeId,
        paymentMode,
      },
      mode
    );

    await loadTransactions();
    await appContext?.refreshData();

    setUndoTx({
      tx: newTx,
      envelopeId,
      message: t('tx.expense_added_toast', {
        amount: formatINR(amount),
        category: catName,
        defaultValue: `Added ₹${amount} to ${catName}`,
      }),
    });
  };

  // Add Income Handler from AddExpenseSheet
  const handleAddIncome = async (
    amount: number,
    description: string,
    paymentMode: PaymentMode = 'upi',
    date: string = ANCHOR_TODAY
  ) => {
    const newTx = await repository.addTransaction(
      {
        date,
        amount,
        type: 'income',
        categoryKey: 'budget.cat.income',
        description: description || 'Bonus / Gift',
        paymentMode,
      },
      mode
    );

    await loadTransactions();
    await appContext?.refreshData();

    setUndoTx({
      tx: newTx,
      message: t('tx.income_added_toast', {
        amount: formatINR(amount),
        description: description || 'Income',
        defaultValue: `Added income ₹${amount} (${description})`,
      }),
    });
  };

  // Undo Action Handler
  const handleUndo = async () => {
    if (!undoTx) return;
    try {
      await repository.deleteTransaction(undoTx.tx.id, mode);
      await loadTransactions();
      await appContext?.refreshData();
    } catch (err) {
      console.error('Failed to undo transaction:', err);
    } finally {
      setUndoTx(null);
    }
  };

  // Edit Action Handler
  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(tx.amount.toString());
    setEditDescription(tx.description || '');
    setEditCategoryKey(tx.categoryKey || '');
    setEditPaymentMode(tx.paymentMode || 'upi');
    setEditDate(tx.date || ANCHOR_TODAY);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const amountNum = parseINR(editAmount);
    if (amountNum <= 0) return;

    const updated: Transaction = {
      ...editingTx,
      amount: amountNum,
      description: editDescription,
      categoryKey: editCategoryKey,
      paymentMode: editPaymentMode,
      date: editDate,
    };

    await repository.updateTransaction(updated, mode);
    setEditingTx(null);
    await loadTransactions();
    await appContext?.refreshData();
  };

  // Delete Action Handler
  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    await repository.deleteTransaction(deletingTx.id, mode);
    setDeletingTx(null);
    await loadTransactions();
    await appContext?.refreshData();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Bar with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-ink/10">
        <div>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t('tx.title', { defaultValue: 'Transactions & Fast Entry' })}
          </h1>
          <p className="text-xs sm:text-sm text-ink/70 mt-1">
            {t('tx.subtitle', { defaultValue: 'Track daily expenses, envelopes, and income' })}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSheetInitialMode('expense');
              setSelectedEnvelopeForAdd(undefined);
              setIsAddSheetOpen(true);
            }}
            className="touch-target px-4 py-2 bg-accent hover:bg-accent-dark text-paper font-bold text-xs sm:text-sm rounded-btn shadow-sm flex items-center gap-1.5 transition-all"
            aria-label={t('tx.add_expense', { defaultValue: 'Add Expense' })}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('tx.add_expense', { defaultValue: 'Add Expense' })}</span>
          </button>

          <button
            onClick={() => {
              setSheetInitialMode('income');
              setIsAddSheetOpen(true);
            }}
            className="touch-target px-3.5 py-2 bg-ink text-paper hover:bg-ink-light font-bold text-xs sm:text-sm rounded-btn shadow-sm flex items-center gap-1.5 transition-all"
          >
            <ArrowUpRight className="w-4 h-4 text-sky" />
            <span>{t('tx.quick_income', { defaultValue: 'Quick Income' })}</span>
          </button>

          <button
            onClick={() => setShowSMSBox((prev) => !prev)}
            className={`touch-target px-3 py-2 border rounded-btn text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
              showSMSBox
                ? 'bg-sand/40 border-ink text-ink font-bold'
                : 'bg-paper border-ink/20 text-ink/80 hover:bg-ink/5'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-accent" />
            <span>{t('tx.paste_sms', { defaultValue: 'Paste SMS' })}</span>
          </button>
        </div>
      </div>

      {/* 2. Mode-Specific Banners: Student Mode vs Household Mode */}
      {/* A. STUDENT MODE: Weekly View Toggle & Pocket Money Left This Week */}
      {mode === 'student' && studentMetrics && (
        <section aria-label="Student Pocket Money Card" className="bg-sand/15 border-2 border-sand-dark/40 rounded-card p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded">
                  Student Mode • Aarav
                </span>
                <span className="text-xs text-ink/60 font-medium">
                  {t('tx.student.days_left', { count: studentMetrics.daysLeftInWeek, defaultValue: `${studentMetrics.daysLeftInWeek} days left in week` })}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-fraunces text-ink mt-1">
                {t('tx.student.pocket_money_left', { defaultValue: 'Pocket money left this week' })}
              </h2>
            </div>

            {/* Weekly View Toggle */}
            <div className="flex items-center bg-paper p-1 rounded-btn border border-ink/15 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStudentWeeklyOnly(false)}
                className={`touch-target px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  !studentWeeklyOnly
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-ink/70 hover:text-ink'
                }`}
              >
                {t('tx.student.all_view', { defaultValue: 'All Transactions' })}
              </button>
              <button
                type="button"
                onClick={() => setStudentWeeklyOnly(true)}
                className={`touch-target px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  studentWeeklyOnly
                    ? 'bg-accent text-paper shadow-xs'
                    : 'text-ink/70 hover:text-ink'
                }`}
              >
                {t('tx.student.weekly_view', { defaultValue: 'This Week' })}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-ink/10">
            {/* Pocket Money Left Big Card */}
            <div className="sm:col-span-2 bg-paper rounded-btn p-3.5 border border-ink/10 flex flex-col justify-between">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs font-semibold text-ink/70 uppercase tracking-wider">
                    Remaining Weekly Allowance
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-fraunces text-ink mt-0.5">
                    {formatINR(studentMetrics.pocketMoneyLeft)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-ink/60">
                    Budget: {formatINR(studentMetrics.weeklyBudget)}
                  </span>
                  <div className="text-[11px] font-bold text-accent mt-0.5">
                    Spent: {formatINR(studentMetrics.spentThisWeek)} ({studentMetrics.percentUsed}%)
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-sand/30 rounded-full h-2.5 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    studentMetrics.percentUsed > 90
                      ? 'bg-accent'
                      : studentMetrics.percentUsed > 75
                        ? 'bg-sand-dark'
                        : 'bg-ink'
                  }`}
                  style={{ width: `${studentMetrics.percentUsed}%` }}
                />
              </div>
            </div>

            {/* Safe Daily Burn Card */}
            <div className="bg-paper rounded-btn p-3.5 border border-ink/10 flex flex-col justify-center">
              <span className="text-xs font-semibold text-ink/70 uppercase tracking-wider">
                Safe Daily Spend
              </span>
              <div className="text-xl sm:text-2xl font-bold font-fraunces text-ink mt-0.5">
                {formatINR(studentMetrics.safeDailySpend)}
                <span className="text-xs font-normal text-ink/60 font-sans"> / day</span>
              </div>
              <p className="text-[11px] text-ink/60 mt-1">
                Pacing for remaining {studentMetrics.daysLeftInWeek} days of this week.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* B. HOUSEHOLD MODE: "Envelope" View Toggle & Cards */}
      {mode === 'household' && (
        <section aria-label="Household Envelope View" className="bg-sand/15 border border-ink/15 rounded-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded">
                Household Mode • Meena
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-fraunces text-ink mt-1">
                {householdViewMode === 'envelopes'
                  ? t('tx.household.envelope_view', { defaultValue: 'Category Envelopes (Cash Remaining)' })
                  : 'Household Transactions'}
              </h2>
            </div>

            {/* Household View Mode Switcher */}
            <div className="flex items-center bg-paper p-1 rounded-btn border border-ink/15 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setHouseholdViewMode('envelopes')}
                className={`touch-target px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  householdViewMode === 'envelopes'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-ink/70 hover:text-ink'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-sky" />
                <span>{t('tx.household.envelope_view', { defaultValue: 'Envelope View' })}</span>
              </button>
              <button
                type="button"
                onClick={() => setHouseholdViewMode('transactions')}
                className={`touch-target px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  householdViewMode === 'transactions'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-ink/70 hover:text-ink'
                }`}
              >
                {t('tx.household.transactions_view', { defaultValue: 'All Transactions' })}
              </button>
            </div>
          </div>

          {/* Envelope View Grid */}
          {householdViewMode === 'envelopes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-2">
              {envelopes.map((env) => {
                const remaining = Math.max(0, env.allocated - env.spent);
                const percentSpent = env.allocated > 0 ? Math.round((env.spent / env.allocated) * 100) : 0;
                const isOverspent = env.spent > env.allocated;

                return (
                  <div
                    key={env.id}
                    className="relative bg-paper rounded-card border-2 border-sand-dark/40 shadow-xs p-4 flex flex-col justify-between hover:border-ink/40 transition-all overflow-hidden"
                  >
                    {/* Visual Envelope Top Flap Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent/70" />

                    <div>
                      {/* Header with Icon and Category */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-sand/30 flex items-center justify-center shrink-0">
                            <CategoryIcon name={env.icon} className="w-4 h-4 text-ink" />
                          </div>
                          <h3 className="font-bold text-xs sm:text-sm text-ink truncate">
                            {t(env.categoryKey)}
                          </h3>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isOverspent
                              ? 'bg-accent/15 text-accent border border-accent/30'
                              : percentSpent >= 80
                                ? 'bg-sand text-ink'
                                : 'bg-ink/10 text-ink'
                          }`}
                        >
                          {isOverspent ? 'Over' : `${percentSpent}%`}
                        </span>
                      </div>

                      {/* Cash Remaining Highlight */}
                      <div className="my-2 p-2.5 rounded-btn bg-sand/15 border border-ink/10">
                        <div className="text-[10px] uppercase font-bold text-ink/60">
                          {t('tx.household.remaining_cash', { defaultValue: 'Remaining Cash' })}
                        </div>
                        <div className={`text-xl font-bold font-fraunces ${isOverspent ? 'text-accent' : 'text-ink'}`}>
                          {formatINR(remaining)}
                        </div>
                        <div className="text-[11px] text-ink/60 mt-0.5 flex justify-between">
                          <span>Allocated: {formatINR(env.allocated)}</span>
                          <span>Spent: {formatINR(env.spent)}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-sand/30 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverspent
                              ? 'bg-accent'
                              : percentSpent >= 80
                                ? 'bg-sand-dark'
                                : 'bg-ink'
                          }`}
                          style={{ width: `${Math.min(100, percentSpent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Add Expense button for this envelope */}
                    <div className="mt-3 pt-2.5 border-t border-ink/10 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(env.categoryKey);
                          setHouseholdViewMode('transactions');
                        }}
                        className="text-[11px] font-semibold text-ink/70 hover:text-ink underline"
                      >
                        View items
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEnvelopeForAdd(env.id);
                          setSheetInitialMode('expense');
                          setIsAddSheetOpen(true);
                        }}
                        className="touch-target px-2.5 py-1 text-xs font-bold bg-ink text-paper rounded-btn shadow-xs hover:bg-ink-light flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('tx.household.add_spent', { defaultValue: 'Add Expense' })}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. STRETCH FEATURE: "Paste SMS" Box (Never auto-saves) */}
      {showSMSBox && (
        <section aria-label="Paste SMS Parser Box" className="bg-sand/20 border-2 border-accent/40 rounded-card p-4 sm:p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-ink/10">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-accent" />
              <div>
                <h2 className="text-base font-bold font-fraunces text-ink">
                  {t('tx.sms.title', { defaultValue: 'Paste UPI Debit SMS' })}
                </h2>
                <p className="text-xs text-ink/70">
                  {t('tx.sms.subtitle', { defaultValue: 'Parses amount, merchant & date. Never auto-saves.' })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSMSBox(false)}
              className="touch-target p-1 text-ink/60 hover:text-ink rounded-full"
              aria-label="Close SMS Box"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sample quick buttons for user test */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-bold text-ink/70">Test with samples:</span>
            <button
              type="button"
              onClick={() => handleParseSMS(SAMPLE_UPI_SMS.hdfc)}
              className="touch-target px-2.5 py-1 text-xs font-semibold bg-paper border border-ink/20 rounded-btn hover:bg-sand/30"
            >
              {t('tx.sms.sample_hdfc', { defaultValue: 'Sample HDFC' })}
            </button>
            <button
              type="button"
              onClick={() => handleParseSMS(SAMPLE_UPI_SMS.sbi)}
              className="touch-target px-2.5 py-1 text-xs font-semibold bg-paper border border-ink/20 rounded-btn hover:bg-sand/30"
            >
              {t('tx.sms.sample_sbi', { defaultValue: 'Sample SBI' })}
            </button>
            <button
              type="button"
              onClick={() => handleParseSMS(SAMPLE_UPI_SMS.icici)}
              className="touch-target px-2.5 py-1 text-xs font-semibold bg-paper border border-ink/20 rounded-btn hover:bg-sand/30"
            >
              {t('tx.sms.sample_icici', { defaultValue: 'Sample ICICI' })}
            </button>
          </div>

          {/* SMS Textarea */}
          <div className="mt-3">
            <textarea
              rows={3}
              value={smsInput}
              onChange={(e) => handleParseSMS(e.target.value)}
              placeholder={t('tx.sms.placeholder', { defaultValue: 'Paste bank debit SMS here...' })}
              className="w-full p-3 text-xs sm:text-sm bg-paper text-ink border border-ink/25 rounded-btn focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </div>

          {/* Error Message */}
          {smsError && (
            <div className="mt-2 p-2 rounded-btn bg-accent/15 text-accent text-xs font-semibold">
              {smsError}
            </div>
          )}

          {/* Preview Card before saving (NEVER auto-saved!) */}
          {parsedSMS && (
            <div className="mt-3 bg-paper rounded-btn border border-ink/20 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-ink/10">
                <span className="text-xs font-extrabold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {t('tx.sms.preview', { defaultValue: 'Preview Parsed Transaction' })}
                </span>
                <span className="text-[10px] text-ink/60 italic font-medium">
                  Review before confirming
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-ink/60 font-semibold block">{t('tx.sms.amount', { defaultValue: 'Amount' })}</span>
                  <span className="text-lg font-bold font-fraunces text-ink">
                    {formatINR(parsedSMS.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-ink/60 font-semibold block">{t('tx.sms.merchant', { defaultValue: 'Merchant / Note' })}</span>
                  <span className="font-bold text-ink">{parsedSMS.merchant}</span>
                </div>
                <div>
                  <span className="text-ink/60 font-semibold block">{t('tx.sms.date', { defaultValue: 'Date' })}</span>
                  <span className="font-bold text-ink">{parsedSMS.date}</span>
                </div>
                <div>
                  <span className="text-ink/60 font-semibold block">{t('tx.sms.category', { defaultValue: 'Envelope Category' })}</span>
                  <select
                    value={smsCategoryKey}
                    onChange={(e) => setSmsCategoryKey(e.target.value)}
                    className="w-full mt-1 p-1.5 text-xs font-semibold bg-sand/15 border border-ink/20 rounded-btn text-ink"
                  >
                    {envelopes.map((env) => (
                      <option key={env.id} value={env.categoryKey}>
                        {t(env.categoryKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmSMSExpense}
                  className="touch-target px-4 py-2 bg-accent hover:bg-accent-dark text-paper text-xs sm:text-sm font-bold rounded-btn shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('tx.sms.confirm_save', { defaultValue: 'Confirm & Save Expense' })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmsInput('');
                    setParsedSMS(null);
                  }}
                  className="touch-target px-3 py-2 text-xs font-semibold text-ink/70 hover:bg-ink/5 rounded-btn"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. Filters & Search Control Bar */}
      <section aria-label="Transaction Filters" className="bg-sand/10 border border-ink/15 rounded-card p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tx.search_placeholder', { defaultValue: 'Search note or merchant...' })}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-paper border border-ink/20 rounded-btn text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink touch-target p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="touch-target px-3 py-2 text-xs font-semibold bg-paper text-ink border border-ink/20 rounded-btn"
            aria-label="Filter by Category"
          >
            <option value="all">{t('tx.filter_all_categories', { defaultValue: 'All Categories' })}</option>
            {envelopes.map((env) => (
              <option key={env.id} value={env.categoryKey}>
                {t(env.categoryKey)}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value as any)}
            className="touch-target px-3 py-2 text-xs font-semibold bg-paper text-ink border border-ink/20 rounded-btn"
            aria-label="Filter by Date"
          >
            <option value="all">{t('tx.filter_all_time', { defaultValue: 'All Time' })}</option>
            <option value="today">{t('tx.filter_today', { defaultValue: 'Today' })}</option>
            <option value="week">{t('tx.filter_this_week', { defaultValue: 'This Week' })}</option>
            <option value="month">{t('tx.filter_this_month', { defaultValue: 'This Month' })}</option>
          </select>

          {/* Payment Mode Filter */}
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="touch-target px-3 py-2 text-xs font-semibold bg-paper text-ink border border-ink/20 rounded-btn"
            aria-label="Filter by Payment Mode"
          >
            <option value="all">{t('tx.filter_all_modes', { defaultValue: 'All Modes' })}</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Showing count indicator */}
        <div className="flex items-center justify-between text-[11px] text-ink/60 px-1">
          <span>
            {t('tx.showing_count', {
              count: paginatedTransactions.length,
              total: filteredTransactions.length,
              defaultValue: `Showing ${paginatedTransactions.length} of ${filteredTransactions.length} transactions`,
            })}
          </span>
          {(searchQuery || selectedCategory !== 'all' || selectedDateFilter !== 'all' || selectedPaymentMode !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedDateFilter('all');
                setSelectedPaymentMode('all');
              }}
              className="text-accent font-semibold hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </section>

      {/* 5. Transactions List Grouped by Day */}
      <section aria-label="Transactions List" className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink/60 font-medium">
            Loading transactions...
          </div>
        ) : groupedByDay.length === 0 ? (
          <div className="p-10 text-center bg-sand/10 border border-ink/15 rounded-card">
            <p className="text-sm font-semibold text-ink/70">
              {t('tx.empty', { defaultValue: 'No transactions found matching your filters.' })}
            </p>
          </div>
        ) : (
          groupedByDay.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Day Group Header */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-ink/10">
                <span className="text-xs font-bold font-fraunces text-ink">
                  {group.label}
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {group.totalSpent > 0 && (
                    <span className="text-accent">-{formatINR(group.totalSpent)}</span>
                  )}
                  {group.totalIncome > 0 && (
                    <span className="text-emerald-700">+{formatINR(group.totalIncome)}</span>
                  )}
                </div>
              </div>

              {/* Transactions in Day */}
              <div className="space-y-2">
                {group.items.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const env = envelopes.find((e) => e.categoryKey === tx.categoryKey || e.id === tx.envelopeId);
                  const iconName = env?.icon || (isIncome ? 'Coins' : 'Receipt');

                  return (
                    <div
                      key={tx.id}
                      className="group touch-target bg-paper border border-ink/15 hover:border-ink/40 rounded-card p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-xs transition-all"
                    >
                      {/* Left: Category Icon + Description */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-sand/30 text-ink'
                          }`}
                        >
                          <CategoryIcon name={iconName} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-ink truncate">
                            {tx.description || t(tx.categoryKey, { defaultValue: 'Expense' })}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-medium text-ink/60">
                              {t(tx.categoryKey, { defaultValue: 'General' })}
                            </span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-ink/5 border border-ink/10 text-ink/70">
                              {tx.paymentMode || 'upi'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className={`text-sm sm:text-base font-extrabold font-fraunces ${
                            isIncome ? 'text-emerald-700' : 'text-ink'
                          }`}
                        >
                          {isIncome ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                        </div>

                        {/* Edit and Delete Actions */}
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(tx)}
                            className="touch-target p-1.5 text-ink/60 hover:text-ink rounded-full hover:bg-ink/5 transition-colors"
                            title="Edit transaction"
                            aria-label={`Edit ${tx.description}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingTx(tx)}
                            className="touch-target p-1.5 text-accent/70 hover:text-accent rounded-full hover:bg-accent/10 transition-colors"
                            title="Delete transaction"
                            aria-label={`Delete ${tx.description}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Load more button for pagination */}
        {filteredTransactions.length > pageSize && (
          <div className="text-center pt-2">
            <button
              onClick={() => setPageSize((prev) => prev + 30)}
              className="touch-target px-4 py-2 bg-sand/30 hover:bg-sand/60 text-ink font-bold text-xs sm:text-sm rounded-btn border border-ink/20 transition-all"
            >
              {t('tx.load_more', { defaultValue: 'Load More Transactions' })}
            </button>
          </div>
        )}
      </section>

      {/* 6. Edit Transaction Modal */}
      {editingTx && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4"
        >
          <div className="bg-paper rounded-card border border-ink/20 shadow-2xl p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <h2 className="font-fraunces text-lg font-bold text-ink">
                {t('tx.edit_title', { defaultValue: 'Edit Transaction' })}
              </h2>
              <button
                onClick={() => setEditingTx(null)}
                className="touch-target p-1 text-ink/60 hover:text-ink rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-[11px] font-bold uppercase text-ink/70 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-bold font-fraunces border border-ink/20 rounded-btn text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-ink/70 mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-ink/20 rounded-btn text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-ink/70 mb-1">
                  Envelope / Category
                </label>
                <select
                  value={editCategoryKey}
                  onChange={(e) => setEditCategoryKey(e.target.value)}
                  className="w-full px-3 py-2 border border-ink/20 rounded-btn text-ink font-semibold"
                >
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.categoryKey}>
                      {t(env.categoryKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink/70 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 border border-ink/20 rounded-btn text-ink font-semibold"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-ink/70 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-ink/20 rounded-btn text-ink font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="touch-target flex-1 py-2 text-xs font-semibold text-ink/70 border border-ink/20 rounded-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="touch-target flex-1 py-2 text-xs font-bold text-paper bg-ink hover:bg-ink-light rounded-btn"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deletingTx && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4"
        >
          <div className="bg-paper rounded-card border border-accent/40 shadow-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2.5 text-accent">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="font-fraunces text-base font-bold">
                {t('tx.delete_title', { defaultValue: 'Delete Transaction' })}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-ink/80 leading-relaxed">
              {t('tx.delete_confirm', {
                defaultValue: `Are you sure you want to delete "${deletingTx.description}" (${formatINR(deletingTx.amount)})?`,
              })}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="touch-target flex-1 py-2 text-xs font-semibold text-ink/70 border border-ink/20 rounded-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="touch-target flex-1 py-2 text-xs font-bold text-paper bg-accent hover:bg-accent-dark rounded-btn shadow-xs"
              >
                {t('tx.delete_btn', { defaultValue: 'Delete' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add Expense / Income Sheet */}
      <AddExpenseSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        envelopes={envelopes}
        initialMode={sheetInitialMode}
        onAddExpense={handleAddExpense}
        onAddIncome={handleAddIncome}
      />

      {/* 9. Interactive Undo Toast Notification */}
      {undoTx && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-ink text-paper rounded-card shadow-modal border border-ink/40 max-w-sm sm:max-w-md w-[92vw] animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-sky shrink-0" />
            <div className="text-xs sm:text-sm font-semibold truncate">
              {undoTx.message}
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
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
