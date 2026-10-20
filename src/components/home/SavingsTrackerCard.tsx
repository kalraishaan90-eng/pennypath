import React from 'react';
import { useTranslation } from 'react-i18next';
import { PiggyBank, ArrowRight, AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { formatINR } from '../../engine/currency';
import { ProjectedMonthEndResult } from '../../engine/homeEngine';
import { CardLoadingState, CardErrorState, CardEmptyState } from '../common/CardStates';

interface SavingsTrackerCardProps {
  data: ProjectedMonthEndResult | null;
  onNavigateToPlan: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const SavingsTrackerCard: React.FC<SavingsTrackerCardProps> = ({
  data,
  onNavigateToPlan,
  loading = false,
  error = null,
  onRetry,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-paper border border-ink/15 rounded-card shadow-sm p-4 sm:p-5">
        <CardLoadingState rows={3} />
      </div>
    );
  }

  if (error) {
    return <CardErrorState onRetry={onRetry} message={error} />;
  }

  if (!data) {
    return <CardEmptyState message={t('common.empty')} />;
  }

  const isBelowTarget = data.isProjectedBelowTarget;

  return (
    <article
      className={`rounded-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-all border relative overflow-hidden flex flex-col justify-between ${
        isBelowTarget
          ? 'bg-paper border-accent/40 ring-1 ring-accent/20'
          : 'bg-paper border-ink/15'
      }`}
      aria-label={t('savings.title')}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink/70 uppercase">
            <PiggyBank className={`w-4 h-4 ${isBelowTarget ? 'text-accent' : 'text-ink'}`} />
            <span>{t('savings.title')}</span>
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isBelowTarget
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-ink/10 text-ink border border-ink/20'
            }`}
          >
            {isBelowTarget ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t('savings.below_target')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('savings.on_track')}</span>
              </>
            )}
          </span>
        </div>

        {/* Saved so far vs Target Grid */}
        <div className="grid grid-cols-2 gap-3 py-2 border-b border-ink/10 tabular-nums">
          <div>
            <div className="text-[11px] font-medium text-ink/60 uppercase">
              {t('savings.saved_so_far')}
            </div>
            <div className="text-xl sm:text-2xl font-bold font-fraunces text-ink mt-0.5 break-words tabular-nums">
              {formatINR(data.savedSoFar)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-ink/60 uppercase">
              {t('savings.target')}
            </div>
            <div className="text-xl sm:text-2xl font-bold font-fraunces text-ink/80 mt-0.5 break-words tabular-nums">
              {formatINR(data.targetSavings)}
            </div>
          </div>
        </div>

        {/* Projected Month-End */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2 tabular-nums">
          <div>
            <span className="text-xs text-ink/70 block">{t('savings.projected')}</span>
            <span
              className={`text-lg sm:text-xl font-bold font-fraunces flex items-center gap-1 tabular-nums ${
                isBelowTarget ? 'text-accent' : 'text-ink'
              }`}
            >
              {isBelowTarget ? (
                <TrendingDown className="w-4 h-4 text-accent inline" />
              ) : (
                <TrendingUp className="w-4 h-4 text-ink inline" />
              )}
              {formatINR(data.projectedMonthEnd)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium text-ink/60 block">
              {isBelowTarget ? 'Deficit' : 'Surplus'}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded tabular-nums ${
                isBelowTarget
                  ? 'bg-accent/10 text-accent'
                  : 'bg-ink/10 text-ink'
              }`}
            >
              {isBelowTarget ? '-' : '+'}
              {formatINR(Math.abs(data.projectedShortfallOrSurplus))}
            </span>
          </div>
        </div>

        {/* Warning or Success message */}
        <p
          className={`text-xs mt-2.5 font-medium ${
            isBelowTarget ? 'text-accent' : 'text-ink/70'
          }`}
        >
          {isBelowTarget ? t('savings.warning_msg') : t('savings.ahead_msg')}
        </p>
      </div>

      {/* One tap -> Plan Screen Button */}
      <div className="mt-4 pt-3 border-t border-ink/10">
        <button
          onClick={onNavigateToPlan}
          className={`w-full touch-target flex items-center justify-center gap-2 py-2 px-4 rounded-btn text-xs sm:text-sm font-semibold transition-all ${
            isBelowTarget
              ? 'bg-accent hover:bg-accent-dark text-paper shadow-sm'
              : 'bg-ink hover:bg-ink-dark text-paper'
          }`}
          aria-label={t('savings.view_plan')}
        >
          <span>{t('savings.view_plan')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
};
