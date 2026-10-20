import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatINR } from '../../engine/currency';
import { DailySafeToSpendResult } from '../../engine/homeEngine';
import { CardLoadingState, CardErrorState, CardEmptyState } from '../common/CardStates';

interface HeroSafeToSpendCardProps {
  data: DailySafeToSpendResult | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const HeroSafeToSpendCard: React.FC<HeroSafeToSpendCardProps> = ({
  data,
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

  const isExhausted = data.variableRemaining <= 0;

  return (
    <article
      className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      aria-label={t('hero.title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink uppercase">
          <ShieldCheck className="w-4 h-4 text-ink" />
          <span>{t('hero.title')}</span>
        </div>
        <span className="text-[11px] font-semibold text-ink bg-sand/30 border border-ink/15 px-2 py-0.5 rounded-full">
          {t('hero.daily_label')}
        </span>
      </div>

      {/* Big Hero Number */}
      <div className="my-2">
        <div className="text-4xl sm:text-5xl font-bold font-fraunces text-ink tracking-tight break-words tabular-nums">
          {formatINR(data.dailySafeToSpend)}
        </div>
        <p className="text-xs sm:text-sm font-medium text-ink/80 mt-1 tabular-nums">
          {t('hero.subtext', {
            amount: formatINR(data.variableRemaining),
            days: data.daysRemaining,
          })}
        </p>
      </div>

      {/* Progress for Variable Budget Used */}
      <div className="mt-4 pt-3 border-t border-ink/10">
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-ink/75 tabular-nums">
          <span>{t('hero.variable_used', { percent: data.variablePercentUsed })}</span>
          <span>
            {formatINR(data.variableSpent)} / {formatINR(data.variableAllocated)}
          </span>
        </div>

        {/* Progress track */}
        <div
          className="w-full h-3.5 bg-sand/30 rounded-full overflow-hidden p-0.5 border border-ink/15 relative"
          role="progressbar"
          aria-valuenow={data.variablePercentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('hero.variable_used', { percent: data.variablePercentUsed })}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isExhausted ? 'bg-accent' : data.variablePercentUsed > 80 ? 'bg-sand-dark' : 'bg-ink'
            }`}
            style={{
              width: `${Math.min(100, Math.max(2, data.variablePercentUsed))}%`,
            }}
          />
        </div>
      </div>

      {/* Depleted Alert if over variable budget */}
      {isExhausted && (
        <div className="mt-3 p-2.5 rounded-btn bg-accent/10 border border-accent/30 flex items-center gap-2 text-accent text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t('hero.depleted_alert')}</span>
        </div>
      )}
    </article>
  );
};
