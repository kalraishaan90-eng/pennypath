import React from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, AlertCircle, AlertTriangle, Check } from 'lucide-react';
import { formatINR } from '../../engine/currency';
import { CategoryCapItem } from '../../engine/homeEngine';
import { CategoryIcon } from '../common/CategoryIcon';
import { CardLoadingState, CardErrorState, CardEmptyState } from '../common/CardStates';

interface CategoryCapsCardProps {
  categories: CategoryCapItem[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const CategoryCapsCard: React.FC<CategoryCapsCardProps> = ({
  categories,
  loading = false,
  error = null,
  onRetry,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-paper border border-ink/15 rounded-card shadow-sm p-4 sm:p-5">
        <CardLoadingState rows={5} />
      </div>
    );
  }

  if (error) {
    return <CardErrorState onRetry={onRetry} message={error} />;
  }

  if (!categories || categories.length === 0) {
    return <CardEmptyState message={t('common.empty')} />;
  }

  const getBarBg = (statusColor: 'ink' | 'sand' | 'maroon') => {
    switch (statusColor) {
      case 'maroon':
        return 'bg-accent';
      case 'sand':
        return 'bg-sand-dark';
      case 'ink':
      default:
        return 'bg-ink';
    }
  };

  const getStatusBadge = (status: 'fine' | 'near_limit' | 'over') => {
    switch (status) {
      case 'over':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded">
            <AlertCircle className="w-3 h-3" />
            {t('categories.over_limit')}
          </span>
        );
      case 'near_limit':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ink bg-sand/40 border border-sand-dark/40 px-1.5 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" />
            {t('categories.near_limit')}
          </span>
        );
      case 'fine':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ink bg-ink/10 border border-ink/20 px-1.5 py-0.5 rounded">
            <Check className="w-3 h-3" />
            {t('categories.fine')}
          </span>
        );
    }
  };

  return (
    <article
      className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
      aria-label={t('categories.title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink/70 uppercase">
          <PieChart className="w-4 h-4 text-ink" />
          <span>{t('categories.title')}</span>
        </div>
        <span className="text-[11px] text-ink/60 font-medium">
          {t('categories.subtitle')}
        </span>
      </div>

      {/* Top 5 Category Bars */}
      <div className="space-y-3.5 mt-2">
        {categories.map((cat) => {
          const isOver = cat.status === 'over';
          const visualWidth = Math.min(100, Math.max(3, cat.percentageSpent));

          return (
            <div key={cat.id} className="text-xs">
              {/* Category Info Row */}
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-sand/30 flex items-center justify-center shrink-0 text-ink">
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-ink truncate text-xs sm:text-sm">
                    {t(cat.categoryKey)}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(cat.status)}
                  <span className="font-medium text-ink/80 text-[11px] sm:text-xs">
                    <span className={isOver ? 'font-bold text-accent' : 'font-semibold text-ink'}>
                      {formatINR(cat.spent)}
                    </span>
                    <span className="text-ink/40"> / </span>
                    <span>{formatINR(cat.cap)}</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div
                className="w-full h-2.5 bg-ink/10 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={cat.percentageSpent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${t(cat.categoryKey)}: ${cat.percentageSpent}%`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarBg(
                    cat.statusColor
                  )}`}
                  style={{ width: `${visualWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};
