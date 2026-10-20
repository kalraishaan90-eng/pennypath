import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { formatINR, parseINR } from '../engine/currency';
import {
  classifyReminders,
  getReminderAlertStatus,
  downloadIcsFile,
  detectEnvelopeCategoryKey,
} from '../engine/remindersEngine';
import { DueReminder } from '../types';
import {
  CheckCircle2,
  Clock,
  Plus,
  AlertTriangle,
  Calendar,
  X,
  Repeat,
  CalendarPlus,
  Bell,
  BellOff,
  Clock3,
  Check,
} from 'lucide-react';

export const RemindersScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    reminders,
    toggleReminderPaid,
    markReminderPaid,
    snoozeReminder,
    addReminder,
    envelopes,
  } = useApp();

  // Active filter tab: 'all' (Overdue, Next 7, Later) | 'overdue' | 'next7' | 'later' | 'paid'
  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'next7' | 'later' | 'paid'>('all');
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  // Form states for creating custom due date
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState<'bill' | 'fee' | 'sip' | 'subscription' | 'loan'>('bill');
  const [newRecurring, setNewRecurring] = useState(true);

  // Mark Paid Confirmation Dialog
  const [paidModalReminder, setPaidModalReminder] = useState<DueReminder | null>(null);
  const [logExpense, setLogExpense] = useState(true);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('');

  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Reference date: 20 Oct 2026 for consistent demo alignment
  const refDate = new Date('2026-10-20T10:30:00+05:30');

  // Check notification status on mount WITHOUT requesting permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // Classify all reminders using pure engine
  const classified = classifyReminders(reminders, refDate);

  // Notification permission request handler (plain language explanation flow)
  const handleEnableNotifications = async () => {
    setShowNotificationPrompt(false);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch {
        setNotificationPermission('denied');
      }
    }
  };

  const handleDismissNotificationPrompt = () => {
    setShowNotificationPrompt(false);
  };

  // Add Reminder submit handler
  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseINR(newAmount);
    if (newTitle.trim() && amount > 0 && newDueDate) {
      await addReminder({
        titleKey: newTitle.trim(),
        customTitle: newTitle.trim(),
        amount,
        dueDate: newDueDate,
        category: newCategory,
        isPaid: false,
        isRecurring: newRecurring,
        obligationType: newCategory === 'loan' ? 'emi' : 'other',
      });

      setIsAddingReminder(false);
      setNewTitle('');
      setNewAmount('');
      setNewDueDate('');

      // Per requirement 3: Browser Notification permission flow asked ONLY AFTER adding a due date
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        setShowNotificationPrompt(true);
      }
    }
  };

  // Open mark-paid dialog
  const handleOpenMarkPaidModal = (reminder: DueReminder) => {
    setPaidModalReminder(reminder);
    setLogExpense(true);
    const suggestedCategory = detectEnvelopeCategoryKey(reminder, envelopes);
    setSelectedCategoryKey(suggestedCategory);
  };

  // Confirm mark paid
  const handleConfirmMarkPaid = async () => {
    if (!paidModalReminder) return;
    await markReminderPaid(paidModalReminder.id, {
      logTransaction: logExpense,
      categoryKey: selectedCategoryKey,
    });
    setPaidModalReminder(null);
  };

  // Quick mark paid / unmark paid toggle
  const handleQuickToggle = async (reminder: DueReminder) => {
    if (reminder.isPaid) {
      await toggleReminderPaid(reminder.id);
    } else {
      handleOpenMarkPaidModal(reminder);
    }
  };

  // Snooze handler
  const handleSnooze = async (reminderId: string, days: 1 | 3) => {
    await snoozeReminder(reminderId, days);
  };

  // Calendar download
  const handleAddToCalendar = (reminder: DueReminder) => {
    downloadIcsFile(reminder);
  };

  // Render a reminder card
  const renderReminderCard = (rem: DueReminder, isOverdueSection = false) => {
    const alert = getReminderAlertStatus(rem, refDate);
    const isEmi = rem.obligationType === 'emi' || rem.category === 'loan';

    return (
      <div
        key={rem.id}
        data-testid={`reminder-card-${rem.id}`}
        className={`p-4 rounded-card bg-paper border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          rem.isPaid
            ? 'border-ink/10 opacity-70 bg-paper/60'
            : isOverdueSection
            ? 'border-accent/60 bg-accent/5 ring-1 ring-accent/30 shadow-xs'
            : alert.status === 'due_in_3_days' || alert.status === 'due_tomorrow' || alert.status === 'due_today'
            ? 'border-ink/30 bg-sand/10 shadow-xs'
            : 'border-ink/15 hover:border-ink/30'
        }`}
      >
        {/* Left: Checkmark + Details */}
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={() => handleQuickToggle(rem)}
            className={`touch-target w-7 h-7 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
              rem.isPaid
                ? 'bg-ink text-paper border-ink'
                : 'border-ink/30 hover:border-ink hover:bg-ink/5'
            }`}
            title={rem.isPaid ? t('reminders.mark_unpaid') : t('reminders.mark_paid')}
            aria-label={rem.isPaid ? t('reminders.mark_unpaid') : t('reminders.mark_paid')}
          >
            {rem.isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-3.5 h-3.5 text-ink/40" />}
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={`text-sm font-semibold ${
                  rem.isPaid ? 'line-through text-ink/60' : isOverdueSection ? 'text-accent font-bold' : 'text-ink'
                }`}
              >
                {rem.customTitle || t(rem.titleKey, { defaultValue: rem.titleKey })}
              </h4>

              {isEmi && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-accent/15 text-accent border border-accent/25">
                  EMI
                </span>
              )}

              {rem.isRecurring && (
                <span className="text-[10px] text-ink/60 flex items-center gap-0.5" title="Monthly Recurring">
                  <Repeat className="w-3 h-3" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-ink/70 mt-1 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-ink/60" />
                {rem.dueDate}
              </span>

              {/* Status Tag */}
              {isOverdueSection ? (
                <span className="text-accent font-bold flex items-center gap-1 text-[11px] bg-accent/10 px-2 py-0.5 rounded-full border border-accent/30 animate-pulse">
                  <Clock className="w-3 h-3 text-accent" />
                  {t('reminders.overdue')} ({Math.abs(alert.daysLeft)}d ago)
                </span>
              ) : alert.daysLeft === 0 ? (
                <span className="text-ink font-bold flex items-center gap-1 text-[11px] bg-sand px-2 py-0.5 rounded-full border border-sand-dark">
                  <Clock className="w-3 h-3" />
                  {t('dues.chip.due_today')}
                </span>
              ) : alert.daysLeft === 1 ? (
                <span className="text-ink font-semibold flex items-center gap-1 text-[11px] bg-sand/40 px-2 py-0.5 rounded-full border border-sand-dark/40">
                  <Clock className="w-3 h-3" />
                  {t('dues.chip.days_left_one')}
                </span>
              ) : alert.daysLeft === 2 ? (
                <span className="text-ink font-semibold flex items-center gap-1 text-[11px] bg-sand/30 px-2 py-0.5 rounded-full border border-ink/20">
                  <Clock className="w-3 h-3 text-ink/70" />
                  Due in 2 days
                </span>
              ) : alert.daysLeft === 3 ? (
                <span className="text-ink font-semibold flex items-center gap-1 text-[11px] bg-sand/30 px-2 py-0.5 rounded-full border border-ink/20">
                  <Clock className="w-3 h-3 text-ink/70" />
                  Due in 3 days
                </span>
              ) : null}

              <span className="uppercase text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-ink/5 text-ink/70">
                {rem.category}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions, Snooze, Calendar, Amount */}
        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-ink/10 flex-wrap">
          <span
            className={`font-fraunces text-base sm:text-lg font-bold ${
              rem.isPaid ? 'text-ink/60' : isOverdueSection ? 'text-accent' : 'text-ink'
            }`}
          >
            {formatINR(rem.amount)}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Add to Calendar Button */}
            <button
              type="button"
              onClick={() => handleAddToCalendar(rem)}
              className="touch-target p-1.5 rounded-btn text-ink/70 hover:text-ink hover:bg-sand/30 border border-ink/15 text-xs font-medium flex items-center gap-1 transition-colors"
              title={t('reminders.add_to_calendar')}
              aria-label={t('reminders.add_to_calendar')}
            >
              <CalendarPlus className="w-3.5 h-3.5 text-ink/80" />
              <span className="hidden md:inline text-[11px] font-semibold">{t('reminders.add_to_calendar')}</span>
            </button>

            {/* Snooze 1d / 3d Buttons (Only for unpaid) */}
            {!rem.isPaid && (
              <div className="flex items-center border border-ink/20 rounded-btn overflow-hidden bg-paper">
                <button
                  type="button"
                  onClick={() => handleSnooze(rem.id, 1)}
                  className="px-2 py-1 text-[11px] font-medium text-ink/80 hover:bg-sand/30 hover:text-ink transition-colors flex items-center gap-0.5 border-r border-ink/10"
                  title="Snooze 1 day"
                >
                  <Clock3 className="w-3 h-3 text-ink/60" />
                  <span>+1d</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSnooze(rem.id, 3)}
                  className="px-2 py-1 text-[11px] font-medium text-ink/80 hover:bg-sand/30 hover:text-ink transition-colors"
                  title="Snooze 3 days"
                >
                  <span>+3d</span>
                </button>
              </div>
            )}

            {/* Mark Paid Button */}
            <button
              type="button"
              onClick={() => handleQuickToggle(rem)}
              className={`touch-target px-3 py-1.5 rounded-btn text-xs font-semibold transition-colors flex items-center gap-1 ${
                rem.isPaid
                  ? 'bg-sand/30 hover:bg-sand/60 text-ink border border-ink/15'
                  : isOverdueSection
                  ? 'bg-accent hover:bg-accent/90 text-paper shadow-sm'
                  : 'bg-ink hover:bg-ink-light text-paper shadow-sm'
              }`}
            >
              {rem.isPaid ? t('reminders.status_paid') : t('reminders.mark_paid')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. In-App Banner Fallback when Notification Permission is Denied */}
      {notificationPermission === 'denied' && !bannerDismissed && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-card bg-accent/10 border-l-4 border-accent text-accent-dark flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <BellOff className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-accent mr-1">Notifications Blocked:</span>
              <span className="text-ink/85">{t('reminders.notifications_denied_banner')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="p-1 text-ink/60 hover:text-ink shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-fraunces font-bold text-ink">
            {t('reminders.title')}
          </h2>
          <p className="text-sm text-ink/75">
            {t('reminders.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingReminder(true)}
          className="touch-target px-3.5 py-2 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('reminders.add_reminder')}</span>
        </button>
      </div>

      {/* 3. Urgent Overdue Alert Header if any */}
      {classified.overdue.length > 0 && (
        <div
          role="alert"
          className="p-4 rounded-card bg-accent/10 border-l-4 border-accent text-accent-dark flex items-start gap-3 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-accent">
              {classified.overdue.length} payment(s) are overdue!
            </p>
            <p className="text-xs text-ink/80 mt-0.5">
              Clear pending EMIs and dues promptly to protect your credit score and avoid late penalty charges.
            </p>
          </div>
        </div>
      )}

      {/* 4. Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`touch-target px-3 py-1.5 rounded-btn text-xs font-semibold border transition-colors whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-ink text-paper border-ink'
              : 'bg-sand/20 text-ink/80 border-ink/15 hover:bg-sand/40'
          }`}
        >
          {t('reminders.filter_all')} ({reminders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('overdue')}
          className={`touch-target px-3 py-1.5 rounded-btn text-xs font-semibold border transition-colors whitespace-nowrap ${
            activeFilter === 'overdue'
              ? 'bg-accent text-paper border-accent'
              : 'bg-sand/20 text-accent border-accent/30 hover:bg-accent/10'
          }`}
        >
          {t('reminders.overdue')} ({classified.overdue.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('next7')}
          className={`touch-target px-3 py-1.5 rounded-btn text-xs font-semibold border transition-colors whitespace-nowrap ${
            activeFilter === 'next7'
              ? 'bg-ink text-paper border-ink'
              : 'bg-sand/20 text-ink/80 border-ink/15 hover:bg-sand/40'
          }`}
        >
          {t('reminders.next_7_days')} ({classified.next7Days.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('later')}
          className={`touch-target px-3 py-1.5 rounded-btn text-xs font-semibold border transition-colors whitespace-nowrap ${
            activeFilter === 'later'
              ? 'bg-ink text-paper border-ink'
              : 'bg-sand/20 text-ink/80 border-ink/15 hover:bg-sand/40'
          }`}
        >
          {t('reminders.later')} ({classified.later.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('paid')}
          className={`touch-target px-3 py-1.5 rounded-btn text-xs font-semibold border transition-colors whitespace-nowrap ${
            activeFilter === 'paid'
              ? 'bg-ink text-paper border-ink'
              : 'bg-sand/20 text-ink/80 border-ink/15 hover:bg-sand/40'
          }`}
        >
          {t('reminders.filter_paid')} ({classified.paid.length})
        </button>
      </div>

      {/* 5. Reminders Section Lists */}
      <div className="space-y-6">
        {/* SECTION 1: Overdue (maroon) */}
        {(activeFilter === 'all' || activeFilter === 'overdue') && classified.overdue.length > 0 && (
          <section aria-labelledby="section-overdue-title" className="space-y-3">
            <div className="flex items-center gap-2 text-accent font-bold text-sm tracking-wide uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <h3 id="section-overdue-title" className="text-accent">
                {t('reminders.overdue')} ({classified.overdue.length})
              </h3>
            </div>
            <div className="space-y-2.5">
              {classified.overdue.map((rem) => renderReminderCard(rem, true))}
            </div>
          </section>
        )}

        {/* SECTION 2: Next 7 Days */}
        {(activeFilter === 'all' || activeFilter === 'next7') && (
          <section aria-labelledby="section-next7-title" className="space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold text-sm tracking-wide uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-sand-dark" />
              <h3 id="section-next7-title">
                {t('reminders.next_7_days')} ({classified.next7Days.length})
              </h3>
            </div>
            {classified.next7Days.length === 0 ? (
              <div className="p-4 text-center rounded-card bg-paper border border-ink/10 text-ink/60 text-xs">
                No dues in the next 7 days.
              </div>
            ) : (
              <div className="space-y-2.5">
                {classified.next7Days.map((rem) => renderReminderCard(rem, false))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 3: Later */}
        {(activeFilter === 'all' || activeFilter === 'later') && (
          <section aria-labelledby="section-later-title" className="space-y-3">
            <div className="flex items-center gap-2 text-ink/70 font-semibold text-sm tracking-wide uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-ink/30" />
              <h3 id="section-later-title">
                {t('reminders.later')} ({classified.later.length})
              </h3>
            </div>
            {classified.later.length === 0 ? (
              <div className="p-4 text-center rounded-card bg-paper border border-ink/10 text-ink/60 text-xs">
                No upcoming dues scheduled later.
              </div>
            ) : (
              <div className="space-y-2.5">
                {classified.later.map((rem) => renderReminderCard(rem, false))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 4: Paid / Completed */}
        {(activeFilter === 'all' || activeFilter === 'paid') && classified.paid.length > 0 && (
          <section aria-labelledby="section-paid-title" className="space-y-3 pt-4 border-t border-ink/10">
            <div className="flex items-center gap-2 text-ink/60 font-semibold text-sm tracking-wide uppercase">
              <CheckCircle2 className="w-4 h-4 text-ink/60" />
              <h3 id="section-paid-title">
                {t('reminders.paid_history')} ({classified.paid.length})
              </h3>
            </div>
            <div className="space-y-2.5">
              {classified.paid.map((rem) => renderReminderCard(rem, false))}
            </div>
          </section>
        )}
      </div>

      {/* 6. Notification Permission Pre-Prompt Modal (Plain Language Flow) */}
      {showNotificationPrompt && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper rounded-card border border-ink/20 p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-full bg-sand/40 border border-sand-dark/40 flex items-center justify-center mx-auto text-ink">
              <Bell className="w-6 h-6 text-accent" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-fraunces font-bold text-ink">
                {t('reminders.notifications_permission_title')}
              </h3>
              <p className="text-xs text-ink/75 leading-relaxed">
                {t('reminders.notifications_permission_body')}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDismissNotificationPrompt}
                className="touch-target px-4 py-2 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-xs font-semibold"
              >
                {t('reminders.notifications_skip_btn')}
              </button>
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs font-semibold shadow-sm"
              >
                {t('reminders.notifications_enable_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Mark Paid Confirmation Modal (Optionally logs to expense category) */}
      {paidModalReminder && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper rounded-card border border-ink/20 p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-fraunces font-bold text-ink">
                {t('reminders.mark_paid_modal_title')}
              </h3>
              <button
                type="button"
                onClick={() => setPaidModalReminder(null)}
                className="p-1 text-ink/60 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-btn bg-sand/20 border border-ink/15 space-y-1">
              <div className="text-sm font-semibold text-ink">
                {paidModalReminder.customTitle || t(paidModalReminder.titleKey)}
              </div>
              <div className="text-xl font-fraunces font-bold text-ink">
                {formatINR(paidModalReminder.amount)}
              </div>
              <div className="text-xs text-ink/60">
                Due: {paidModalReminder.dueDate}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logExpense}
                  onChange={(e) => setLogExpense(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-ink rounded"
                />
                <span className="text-xs font-semibold text-ink">
                  {t('reminders.mark_paid_log_expense_prompt')}
                </span>
              </label>

              {logExpense && (
                <div>
                  <label htmlFor="modal-category-select" className="block text-xs font-semibold uppercase tracking-wider text-ink/80 mb-1">
                    {t('reminders.mark_paid_category_label')}
                  </label>
                  <select
                    id="modal-category-select"
                    value={selectedCategoryKey}
                    onChange={(e) => setSelectedCategoryKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-paper border border-ink/30 text-ink text-xs focus:border-ink"
                  >
                    {envelopes.map((env) => (
                      <option key={env.id} value={env.categoryKey}>
                        {t(env.categoryKey)} ({formatINR(env.spent)} / {formatINR(env.allocated)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaidModalReminder(null)}
                className="touch-target px-3 py-2 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink text-xs font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkPaid}
                className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light text-paper text-xs font-semibold shadow-sm"
              >
                {logExpense ? t('reminders.mark_paid_confirm_btn') : t('reminders.mark_paid_only_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add Due Date / Reminder Modal */}
      {isAddingReminder && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper rounded-card border border-ink/20 p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-fraunces font-bold text-ink">
                {t('reminders.add_reminder')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingReminder(false)}
                className="p-1 text-ink/60 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label htmlFor="rem-title-input" className="block text-xs font-semibold uppercase tracking-wider text-ink/80 mb-1">
                  Title
                </label>
                <input
                  id="rem-title-input"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-btn bg-paper border border-ink/30 text-ink text-sm focus:border-ink"
                  placeholder="e.g. Bike EMI, Broadband Bill"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="rem-amount-input" className="block text-xs font-semibold uppercase tracking-wider text-ink/80 mb-1">
                  Amount (₹)
                </label>
                <input
                  id="rem-amount-input"
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-btn bg-paper border border-ink/30 text-ink text-sm focus:border-ink"
                  placeholder="e.g. 3200"
                  required
                />
              </div>

              <div>
                <label htmlFor="rem-due-date-input" className="block text-xs font-semibold uppercase tracking-wider text-ink/80 mb-1">
                  Due Date
                </label>
                <input
                  id="rem-due-date-input"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-btn bg-paper border border-ink/30 text-ink text-sm focus:border-ink"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rem-category-select" className="block text-xs font-semibold uppercase tracking-wider text-ink/80 mb-1">
                    Category
                  </label>
                  <select
                    id="rem-category-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-btn bg-paper border border-ink/30 text-ink text-sm focus:border-ink"
                  >
                    <option value="loan">Loan / EMI</option>
                    <option value="bill">Utility Bill / Rent</option>
                    <option value="subscription">Subscription</option>
                    <option value="fee">College / School Fee</option>
                    <option value="sip">Mutual Fund SIP</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={newRecurring}
                      onChange={(e) => setNewRecurring(e.target.checked)}
                      className="w-4 h-4 accent-ink rounded"
                    />
                    <span>Monthly Recurring</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingReminder(false)}
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
    </div>
  );
};
