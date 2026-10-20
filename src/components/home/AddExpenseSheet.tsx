import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, PlusCircle, Smartphone, Banknote, CreditCard, MoreHorizontal, Delete, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BudgetEnvelope } from '../../engine/budget';
import { parseINR, formatINR } from '../../engine/currency';
import { CategoryIcon } from '../common/CategoryIcon';
import { PaymentMode } from '../../types';

export interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  envelopes: BudgetEnvelope[];
  onAddExpense: (
    envelopeId: string,
    amount: number,
    note: string,
    paymentMode?: PaymentMode,
    date?: string
  ) => Promise<void>;
  onAddIncome?: (
    amount: number,
    description: string,
    paymentMode?: PaymentMode,
    date?: string
  ) => Promise<void>;
  onUndo?: (undoFn: () => Promise<void>, message: string) => void;
  initialMode?: 'expense' | 'income';
}

const RECENT_CATEGORIES_KEY = 'pennypath_recent_categories';

export const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({
  isOpen,
  onClose,
  envelopes,
  onAddExpense,
  onAddIncome,
  onUndo,
  initialMode = 'expense',
}) => {
  const { t } = useTranslation();
  const [entryType, setEntryType] = useState<'expense' | 'income'>(initialMode);
  const [amountStr, setAmountStr] = useState<string>('250');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>(
    envelopes[0]?.id || ''
  );
  const [selectedIncomeType, setSelectedIncomeType] = useState<string>('bonus');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [note, setNote] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('2026-10-20');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load recent categories
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_CATEGORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (initialMode) {
      setEntryType(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (envelopes.length > 0 && !selectedEnvelopeId) {
      setSelectedEnvelopeId(envelopes[0].id);
    }
  }, [envelopes, selectedEnvelopeId]);

  // Sort envelopes by recent first
  const sortedEnvelopes = useMemo(() => {
    if (!envelopes || envelopes.length === 0) return [];
    const copy = [...envelopes];
    return copy.sort((a, b) => {
      const aIdx = recentCategoryIds.indexOf(a.id);
      const bIdx = recentCategoryIds.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
  }, [envelopes, recentCategoryIds]);

  if (!isOpen) return null;

  const quickPresets = [100, 250, 500, 1000];

  const updateRecentCategory = (catId: string) => {
    try {
      const updated = [catId, ...recentCategoryIds.filter(id => id !== catId)].slice(0, 10);
      setRecentCategoryIds(updated);
      localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Keypad button click
  const handleKeypadPress = (val: string) => {
    setErrorMsg(null);
    if (val === 'clear') {
      setAmountStr('');
      return;
    }
    if (val === 'backspace') {
      setAmountStr(prev => prev.slice(0, -1));
      return;
    }
    if (val === '.') {
      if (amountStr.includes('.')) return;
      setAmountStr(prev => (prev === '' ? '0.' : `${prev}.`));
      return;
    }
    if (val === '00') {
      if (amountStr === '' || amountStr === '0') return;
      if (amountStr.length >= 8) return;
      setAmountStr(prev => `${prev}00`);
      return;
    }
    // Limit to 8 digits
    if (amountStr.replace('.', '').length >= 8) return;

    if (amountStr === '0') {
      setAmountStr(val);
    } else {
      setAmountStr(prev => `${prev}${val}`);
    }
  };

  // Immediate Save for 2-Tap flow: Tap category = save (with undo toast)
  const saveExpense = async (envelopeIdToSave: string, explicitAmount?: number) => {
    const amount = explicitAmount !== undefined ? explicitAmount : parseINR(amountStr);

    if (amount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!envelopeIdToSave) {
      setErrorMsg('Please select a category envelope');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      updateRecentCategory(envelopeIdToSave);
      await onAddExpense(envelopeIdToSave, amount, note, paymentMode, dateStr);

      try {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#0F414A', '#7F0303', '#D8BA98'],
        });
      } catch {
        // ignore
      }

      const envObj = envelopes.find(e => e.id === envelopeIdToSave);
      const catName = envObj ? t(envObj.categoryKey) : 'Expense';

      if (onUndo) {
        onUndo(
          async () => {
            // Revert action handled by caller
          },
          t('tx.expense_added_toast', {
            amount: formatINR(amount),
            category: catName,
            defaultValue: `Added ₹${amount} to ${catName}`,
          })
        );
      }

      onClose();
      setAmountStr('');
      setNote('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save expense';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Immediate Save for Income
  const saveIncome = async (sourceTypeToSave: string, explicitAmount?: number) => {
    const amount = explicitAmount !== undefined ? explicitAmount : parseINR(amountStr);

    if (amount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const incomeLabel = t(`tx.income_type.${sourceTypeToSave}`, {
        defaultValue: sourceTypeToSave.toUpperCase(),
      });
      const finalNote = note.trim() ? `${incomeLabel} - ${note.trim()}` : incomeLabel;

      if (onAddIncome) {
        await onAddIncome(amount, finalNote, paymentMode, dateStr);
      }

      try {
        confetti({
          particleCount: 30,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#0F414A', '#2E7D32', '#D8BA98'],
        });
      } catch {
        // ignore
      }

      if (onUndo) {
        onUndo(
          async () => {},
          t('tx.income_added_toast', {
            amount: formatINR(amount),
            description: incomeLabel,
            defaultValue: `Added income ₹${amount} (${incomeLabel})`,
          })
        );
      }

      onClose();
      setAmountStr('');
      setNote('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save income';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryTap = async (envId: string) => {
    setSelectedEnvelopeId(envId);
    const amount = parseINR(amountStr);
    // If amount is already typed, tapping category immediately saves (2 taps total!)
    if (amount > 0) {
      await saveExpense(envId, amount);
    }
  };

  const handleIncomeSourceTap = async (sourceKey: string) => {
    setSelectedIncomeType(sourceKey);
    const amount = parseINR(amountStr);
    if (amount > 0) {
      await saveIncome(sourceKey, amount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryType === 'expense') {
      await saveExpense(selectedEnvelopeId);
    } else {
      await saveIncome(selectedIncomeType);
    }
  };

  const incomeSources = [
    { key: 'bonus', icon: 'Award', label: t('tx.income_type.bonus', { defaultValue: 'Bonus' }) },
    { key: 'gift', icon: 'Sparkles', label: t('tx.income_type.gift', { defaultValue: 'Gift / Shagun' }) },
    { key: 'freelance', icon: 'Zap', label: t('tx.income_type.freelance', { defaultValue: 'Freelance' }) },
    { key: 'allowance', icon: 'Coins', label: t('tx.income_type.allowance', { defaultValue: 'Pocket Money' }) },
    { key: 'cashback', icon: 'ArrowDownLeft', label: t('tx.income_type.cashback', { defaultValue: 'Cashback' }) },
    { key: 'other', icon: 'PlusCircle', label: t('tx.income_type.other', { defaultValue: 'Other' }) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm p-0 sm:p-4 transition-all"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-expense-title"
    >
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal Container */}
      <div className="relative w-full max-w-lg bg-paper rounded-t-card sm:rounded-card border border-ink/20 shadow-2xl p-4 sm:p-6 z-10 max-h-[95vh] overflow-y-auto">
        {/* Header & Mode Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-ink/10">
          {/* Segmented Mode Toggle (Expense / Income) */}
          <div className="flex items-center bg-ink/5 p-1 rounded-btn border border-ink/10">
            <button
              type="button"
              onClick={() => setEntryType('expense')}
              className={`touch-target px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                entryType === 'expense'
                  ? 'bg-accent text-paper shadow-xs'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>{t('tx.add_expense', { defaultValue: 'Expense' })}</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryType('income')}
              className={`touch-target px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                entryType === 'income'
                  ? 'bg-ink text-paper shadow-xs'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-sky" />
              <span>{t('tx.quick_income', { defaultValue: 'Income (Bonus/Gift)' })}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="touch-target p-1.5 rounded-full text-ink/60 hover:text-ink hover:bg-ink/5"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-btn bg-accent/10 border border-accent/30 text-accent text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          {/* 1. Large Amount Display + Numeric Keypad */}
          <div className="bg-sand/15 border border-ink/10 rounded-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70">
                {entryType === 'expense'
                  ? t('fab.amount', { defaultValue: 'Amount (₹)' })
                  : t('tx.sms.amount', { defaultValue: 'Income Amount (₹)' })}
              </span>
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="text-[11px] font-semibold text-accent hover:underline touch-target px-1"
              >
                Clear
              </button>
            </div>

            {/* Display Field */}
            <div className="flex items-center justify-between border-b border-ink/20 pb-2">
              <div className="flex items-baseline gap-1 text-ink">
                <span className="text-2xl font-bold font-fraunces text-ink/60">₹</span>
                <span className="text-3xl sm:text-4xl font-extrabold font-fraunces tracking-tight">
                  {amountStr || '0'}
                </span>
              </div>
              <input
                id="expense-amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="sr-only"
                aria-label="Amount input"
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-ink/60 font-medium">Presets:</span>
              {quickPresets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmountStr(preset.toString())}
                  className="touch-target px-2 py-0.5 text-xs font-bold bg-paper hover:bg-sand/30 text-ink border border-ink/20 rounded-btn transition-colors"
                >
                  +{formatINR(preset)}
                </button>
              ))}
            </div>

            {/* Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-ink/10" aria-label="Numeric Keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className="touch-target h-11 sm:h-12 flex items-center justify-center font-fraunces text-lg sm:text-xl font-bold rounded-btn bg-paper hover:bg-sand/40 active:bg-sand/60 border border-ink/15 text-ink shadow-xs transition-colors"
                >
                  {key === 'backspace' ? <Delete className="w-5 h-5 text-accent" /> : key}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Category Chips (2 Rows, Recent First, 2-Tap Save!) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-ink/70">
                {entryType === 'expense'
                  ? t('fab.category', { defaultValue: 'Category / Envelope' })
                  : 'Income Source'}
              </label>
              <span className="text-[10px] text-ink/50 font-medium italic">
                Tap category to save instantly
              </span>
            </div>

            {entryType === 'expense' ? (
              /* Expense Categories - 2 Rows horizontal scroll or wrap */
              <div
                className="grid grid-rows-2 grid-flow-col auto-cols-[minmax(115px,140px)] gap-2 overflow-x-auto pb-2 pt-1 px-0.5 touch-pan-x"
                style={{ scrollbarWidth: 'thin' }}
              >
                {sortedEnvelopes.map((env) => {
                  const isSelected = selectedEnvelopeId === env.id;
                  return (
                    <button
                      type="button"
                      key={env.id}
                      onClick={() => handleCategoryTap(env.id)}
                      className={`touch-target p-2 rounded-card text-center border transition-all flex flex-col items-center justify-between min-h-[4.25rem] ${
                        isSelected
                          ? 'bg-ink text-paper border-ink shadow-md ring-2 ring-ink/30'
                          : 'bg-paper text-ink border-ink/20 hover:border-ink/50 hover:bg-sand/10'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-1 ${
                          isSelected ? 'bg-paper/20 text-paper' : 'bg-sand/40 text-ink'
                        }`}
                      >
                        <CategoryIcon name={env.icon} className="w-3.5 h-3.5" />
                      </div>
                      <div className="w-full">
                        <div className="font-semibold text-[11px] sm:text-xs leading-snug break-words hyphens-auto px-0.5 line-clamp-2">
                          {t(env.categoryKey)}
                        </div>
                        <div
                          className={`text-[9px] mt-0.5 font-mono ${
                            isSelected ? 'text-paper/70' : 'text-ink/60'
                          }`}
                        >
                          Spent: ₹{env.spent}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Income Sources - 2 Rows */
              <div className="grid grid-cols-3 gap-2">
                {incomeSources.map((source) => {
                  const isSelected = selectedIncomeType === source.key;
                  return (
                    <button
                      type="button"
                      key={source.key}
                      onClick={() => handleIncomeSourceTap(source.key)}
                      className={`touch-target p-2.5 rounded-card text-center border transition-all flex flex-col items-center justify-center min-h-[4rem] ${
                        isSelected
                          ? 'bg-ink text-paper border-ink shadow-md ring-2 ring-ink/30'
                          : 'bg-paper text-ink border-ink/20 hover:border-ink/40'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-snug break-words px-1">
                        {source.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Payment Mode Toggle + Date defaults today */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Mode */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/70 mb-1">
                {t('tx.filter_payment_mode', { defaultValue: 'Payment Mode' })}
              </label>
              <div className="grid grid-cols-4 gap-1 bg-ink/5 p-1 rounded-btn border border-ink/10">
                {(['upi', 'cash', 'card', 'other'] as PaymentMode[]).map((mode) => {
                  const isSelected = paymentMode === mode;
                  const icons = {
                    upi: <Smartphone className="w-3.5 h-3.5" />,
                    cash: <Banknote className="w-3.5 h-3.5" />,
                    card: <CreditCard className="w-3.5 h-3.5" />,
                    other: <MoreHorizontal className="w-3.5 h-3.5" />,
                  };
                  return (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`touch-target py-1.5 px-1 rounded-md text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                        isSelected
                          ? 'bg-ink text-paper shadow-xs'
                          : 'text-ink/70 hover:text-ink'
                      }`}
                    >
                      {icons[mode]}
                      <span>{t(`tx.payment_mode.${mode}`, { defaultValue: mode.toUpperCase() })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Defaults Today */}
            <div>
              <label htmlFor="expense-date" className="block text-[11px] font-bold uppercase tracking-wider text-ink/70 mb-1">
                {t('tx.filter_date', { defaultValue: 'Date' })}
              </label>
              <input
                id="expense-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-paper text-ink border border-ink/20 rounded-btn focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>
          </div>

          {/* 4. Optional Note Input */}
          <div>
            <label htmlFor="expense-note" className="block text-[11px] font-bold uppercase tracking-wider text-ink/70 mb-1">
              {t('fab.note', { defaultValue: 'Note / Merchant (optional)' })}
            </label>
            <input
              id="expense-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                entryType === 'expense'
                  ? t('fab.note_placeholder', { defaultValue: 'e.g., Swiggy, Chai tapri, Uber' })
                  : 'e.g., Diwali Bonus, Shagun from Dadi'
              }
              className="w-full px-3 py-2 text-xs sm:text-sm bg-paper text-ink border border-ink/20 rounded-btn focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </div>

          {/* 5. Explicit Save Button (Fallback / confirmation) */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="touch-target flex-1 py-2.5 text-xs sm:text-sm font-bold text-ink/70 bg-paper border border-ink/20 rounded-btn hover:bg-ink/5 transition-colors"
            >
              {t('fab.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`touch-target flex-1 py-2.5 text-xs sm:text-sm font-bold text-paper rounded-btn shadow-md transition-all flex items-center justify-center gap-1.5 ${
                entryType === 'expense'
                  ? 'bg-accent hover:bg-accent-dark'
                  : 'bg-ink hover:bg-ink-light'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isSubmitting
                  ? t('fab.saving', { defaultValue: 'Saving...' })
                  : entryType === 'expense'
                    ? t('fab.save', { defaultValue: 'Save Expense' })
                    : t('tx.quick_income', { defaultValue: 'Save Income' })}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
