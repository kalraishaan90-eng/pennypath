import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Lightbulb, ArrowRight } from 'lucide-react';
import { FinancialHealthScoreResult } from '../../engine/homeEngine';
import { CardLoadingState, CardErrorState, CardEmptyState } from '../common/CardStates';

interface FinancialHealthScoreCardProps {
  data: FinancialHealthScoreResult | null;
  reducedMotion?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const FinancialHealthScoreCard: React.FC<FinancialHealthScoreCardProps> = ({
  data,
  reducedMotion = false,
  loading = false,
  error = null,
  onRetry,
}) => {
  const { t } = useTranslation();
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  // Check system prefers-reduced-motion
  const systemReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldSkipAnimation = reducedMotion || systemReducedMotion;

  useEffect(() => {
    if (!data) return;

    if (shouldSkipAnimation) {
      setAnimatedScore(data.score);
      return;
    }

    // Smooth count-up animation over ~800ms
    const target = data.score;
    const duration = 800; // ms
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(eased * target);

      setAnimatedScore(nextVal);

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedScore(target);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [data?.score, shouldSkipAnimation]);

  if (loading) {
    return (
      <div className="bg-paper border border-ink/15 rounded-card shadow-sm p-4 sm:p-5">
        <CardLoadingState rows={4} />
      </div>
    );
  }

  if (error) {
    return <CardErrorState onRetry={onRetry} message={error} />;
  }

  if (!data) {
    return <CardEmptyState message={t('common.empty')} />;
  }

  // Ring geometry
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * animatedScore) / 100;

  // Color by health status
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#0F414A'; // ink
    if (score >= 50) return '#C29D74'; // sand-dark / amber
    return '#7F0303'; // accent maroon
  };

  const getSubBarBg = (status: 'good' | 'warning' | 'alert') => {
    if (status === 'good') return 'bg-ink';
    if (status === 'warning') return 'bg-sand-dark';
    return 'bg-accent';
  };

  const ringColor = getScoreColor(data.score);

  return (
    <article
      className="bg-paper border border-ink/15 rounded-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
      aria-label={t('health.title')}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink/70 uppercase">
            <Activity className="w-4 h-4 text-ink" />
            <span>{t('health.title')}</span>
          </div>

          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
            style={{
              backgroundColor: `${ringColor}15`,
              color: ringColor,
              borderColor: `${ringColor}30`,
              borderWidth: '1px',
            }}
          >
            {t(`health.${data.status}`)}
          </span>
        </div>

        {/* Top Section: Ring and Overview */}
        <div className="flex items-center gap-4 py-2">
          {/* Animated SVG Ring */}
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background track circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-ink/10"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Animated Progress ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={ringColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: shouldSkipAnimation ? 'none' : 'stroke-dashoffset 0.3s ease',
                }}
              />
            </svg>

            {/* Inner score label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-fraunces text-ink leading-none">
                {animatedScore}
              </span>
              <span className="text-[10px] text-ink/60 font-semibold uppercase mt-0.5">
                / 100
              </span>
            </div>
          </div>

          {/* Quick summary status */}
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold font-fraunces text-ink">
              {data.score >= 75
                ? 'Strong Financial Trajectory'
                : data.score >= 50
                ? 'Moderate Financial Balance'
                : 'Needs Rebalancing'}
            </h2>
            <p className="text-xs text-ink/75 mt-0.5">
              Based on savings rate, envelope discipline, goal buffer, and upcoming dues.
            </p>
          </div>
        </div>

        {/* Four Sub-bars */}
        <div className="mt-3 space-y-2.5 pt-3 border-t border-ink/10">
          {data.subBars.map((bar) => (
            <div key={bar.key} className="text-xs">
              <div className="flex items-center justify-between font-medium text-ink/80 mb-1">
                <span>{t(bar.labelKey)}</span>
                <span className="font-semibold text-ink font-mono tabular-nums">{bar.displayValue}</span>
              </div>
              <div
                className="w-full h-2 bg-ink/10 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={bar.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t(bar.labelKey)}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    shouldSkipAnimation ? 'duration-0' : 'duration-500'
                  } ${getSubBarBg(bar.status)}`}
                  style={{ width: `${Math.min(100, Math.max(4, bar.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* One Tip Line & Details Link */}
      <div className="mt-4 pt-3 border-t border-ink/10 space-y-2">
        <div className="flex items-start gap-2 bg-sand/20 border border-sand/40 rounded-btn p-2.5 text-xs text-ink">
          <Lightbulb className="w-4 h-4 text-ink shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">
            {t(data.tipKey, data.tipParams)}
          </p>
        </div>

        <a
          href="/insights/health"
          className="touch-target w-full py-2 px-3 rounded-btn bg-paper border border-ink/20 hover:border-ink hover:bg-sand/30 text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <span>View Health Score Breakdown & +10 Pts Guide</span>
          <ArrowRight className="w-3.5 h-3.5 text-accent" />
        </a>
      </div>
    </article>
  );
};
