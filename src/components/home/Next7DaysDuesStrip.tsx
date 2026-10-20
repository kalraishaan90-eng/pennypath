import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatINR } from '../../engine/currency';
import { UpcomingDueItem } from '../../engine/homeEngine';
import { CardLoadingState, CardErrorState, CardEmptyState } from '../common/CardStates';

interface Next7DaysDuesStripProps {
  dues: UpcomingDueItem[] | null;
  onTogglePaid: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const Next7DaysDuesStrip: React.FC<Next7DaysDuesStripProps> = ({
  dues,
  onTogglePaid,
  loading = false,
  error = null,
  onRetry,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-paper border border-ink/15 rounded-card shadow-sm p-4 sm:p-5">
        <CardLoadingState rows={2} />
      </div>
    );
  }

  if (error) {
    return <CardErrorState onRetry={onRetry} message={error} />;
  }

  const pendingDues = (dues || []).filter((d) => !d.isPaid);

  if (!dues || pendingDues.length === 0) {
    return (
      <article
        className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-sm"
        aria-label={t('dues.title')}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink/70 uppercase">
            <CalendarClock className="w-4 h-4 text-ink" />
            <span>{t('dues.title')}</span>
          </div>
          <a
            href="/reminders"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            {t('dues.view_all')} →
          </a>
        </div>
        <CardEmptyState message={t('dues.empty')} />
      </article>
    );
  }

  const getChipBadge = (item: UpcomingDueItem) => {
    switch (item.chipStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink/80 bg-ink/10 border border-ink/20 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3 text-ink" />
            {t('dues.chip.paid')}
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/15 border border-accent/30 px-2 py-0.5 rounded-full animate-pulse">
            <AlertCircle className="w-3 h-3 text-accent" />
            {t('dues.chip.overdue')}
          </span>
        );
      case 'due_today':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-sand/60 border border-sand-dark/60 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-ink" />
            {t('dues.chip.due_today')}
          </span>
        );
      case 'days_left':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-paper border border-ink/20 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-ink/60" />
            {item.daysLeft === 1
              ? t('dues.chip.days_left_one')
              : t('dues.chip.days_left', { count: item.daysLeft })}
          </span>
        );
    }
  };

  return (
    <article
      className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
      aria-label={t('dues.title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink/70 uppercase">
          <CalendarClock className="w-4 h-4 text-ink" />
          <span>{t('dues.title')}</span>
        </div>
        <a
          href="/reminders"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
        >
          {t('dues.view_all')} →
        </a>
      </div>

      {/* Dues Cards Strip / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pendingDues.map((due) => {
          const isOverdue = due.chipStatus === 'overdue';
          const isToday = due.chipStatus === 'due_today';

          return (
            <div
              key={due.id}
              className={`p-3 rounded-btn border transition-all flex flex-col justify-between ${
                due.isPaid
                  ? 'bg-paper/60 border-ink/10 opacity-75'
                  : isOverdue
                  ? 'bg-accent/5 border-accent/40 ring-1 ring-accent/20'
                  : isToday
                  ? 'bg-sand/15 border-sand-dark/40'
                  : 'bg-paper border-ink/15 hover:border-ink/30'
              }`}
            >
              <div>
                {/* Top: Chip & Category */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  {getChipBadge(due)}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink bg-sand/30 border border-ink/15 px-1.5 py-0.5 rounded">
                    {due.category}
                  </span>
                </div>

                {/* Title & Amount */}
                <h4
                  className={`text-sm font-semibold truncate ${
                    due.isPaid ? 'line-through text-ink/50' : 'text-ink'
                  }`}
                  title={due.customTitle || t(due.titleKey)}
                >
                  {due.customTitle || t(due.titleKey)}
                </h4>

                <div className="text-lg font-bold font-fraunces text-ink mt-0.5">
                  {formatINR(due.amount)}
                </div>

                <div className="text-[11px] text-ink/60 mt-0.5">
                  Due: {due.dueDate}
                </div>
              </div>

              {/* Bottom: Pay / Paid Action Button */}
              <div className="mt-3 pt-2 border-t border-ink/10">
                <button
                  onClick={() => onTogglePaid(due.id)}
                  className="w-full touch-target text-xs font-semibold py-1.5 px-3 rounded-btn transition-colors flex items-center justify-center gap-1.5 bg-ink text-paper hover:bg-ink-dark shadow-sm"
                  aria-label={t('dues.mark_paid')}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{t('dues.mark_paid')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};
