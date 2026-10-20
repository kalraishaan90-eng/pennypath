import React from 'react';
import { useTranslation } from 'react-i18next';
import { WeeklySummaryResult } from '../../engine/insightsEngine';
import { formatINR } from '../../engine/currency';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  Calendar,
  TrendingDown,
  TrendingUp,
  Receipt,
  Flame,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CategoryIcon } from '../common/CategoryIcon';

interface WeeklySummaryCardProps {
  data: WeeklySummaryResult;
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({ data }) => {
  const { t } = useTranslation();
  const isEmpty = data.currentWeekSpent === 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-ink" />
            <CardTitle>{t('insights.weekly.title', 'Weekly Summary')}</CardTitle>
          </div>
          <CardDescription>
            {data.currentWeekRange} (vs prior week: {data.previousWeekRange})
          </CardDescription>
        </div>

        {!isEmpty && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              data.status === 'elevated'
                ? 'bg-accent/10 text-accent border border-accent/25'
                : data.status === 'prudent'
                ? 'bg-ink/10 text-ink border border-ink/25'
                : 'bg-sand/30 text-ink border border-sand-dark/30'
            }`}
          >
            {data.status === 'elevated' ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {data.changePercent > 0 ? `+${data.changePercent}%` : `${data.changePercent}%`} vs last week
            </span>
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="py-10 text-center text-ink/60 bg-paper/50 rounded-xl border border-dashed border-ink/20">
            <Calendar className="w-10 h-10 mx-auto text-ink/30 mb-2" />
            <p className="font-semibold text-sm">
              {t('insights.weekly.no_data', 'No transactions logged this week')}
            </p>
            <p className="text-xs text-ink/50 mt-1">
              Expenses added during the past 7 days will automatically populate weekly performance.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 3 Metric Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Metric 1: Total Spent */}
              <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                    Total Spent This Week
                  </span>
                  <span className="text-xl font-bold font-fraunces text-ink tabular-nums mt-0.5 block">
                    {formatINR(data.currentWeekSpent)}
                  </span>
                </div>
                <div className="text-[11px] text-ink/70 mt-2 pt-2 border-t border-ink/10 flex items-center justify-between">
                  <span>Prior week:</span>
                  <span className="font-semibold tabular-nums">{formatINR(data.previousWeekSpent)}</span>
                </div>
              </div>

              {/* Metric 2: Daily Average */}
              <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                    Daily Average Burn
                  </span>
                  <span className="text-xl font-bold font-fraunces text-ink tabular-nums mt-0.5 block">
                    {formatINR(data.dailyAverage)}
                    <span className="text-xs font-normal text-ink/60 ml-1">/day</span>
                  </span>
                </div>
                <div className="text-[11px] text-ink/70 mt-2 pt-2 border-t border-ink/10 flex items-center justify-between">
                  <span>7-Day window:</span>
                  <span className="font-semibold">Mon – Sun</span>
                </div>
              </div>

              {/* Metric 3: Peak Spend Day */}
              <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                    Peak Outflow Day
                  </span>
                  {data.peakSpendDay ? (
                    <span className="text-xl font-bold font-fraunces text-accent tabular-nums mt-0.5 block">
                      {formatINR(data.peakSpendDay.amount)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-ink/70 mt-1 block">No peaks</span>
                  )}
                </div>
                <div className="text-[11px] text-ink/70 mt-2 pt-2 border-t border-ink/10 flex items-center justify-between">
                  <span>Peak day:</span>
                  <span className="font-semibold text-ink">
                    {data.peakSpendDay ? data.peakSpendDay.dayName : 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Largest Expense Highlight */}
            {data.largestExpense && (
              <div className="p-3.5 rounded-xl bg-sand/15 border border-sand/35 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sand/40 border border-sand flex items-center justify-center text-ink shrink-0">
                    <Receipt className="w-5 h-5 text-ink" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-ink/60 tracking-wider block">
                      Largest Expense This Week
                    </span>
                    <p className="font-semibold text-sm text-ink truncate">
                      {data.largestExpense.description}
                    </p>
                    <span className="text-[11px] text-ink/60 font-medium">
                      {data.largestExpense.date}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold font-fraunces text-base text-accent tabular-nums block">
                    {formatINR(data.largestExpense.amount)}
                  </span>
                  <span className="text-[10px] text-ink/60 font-medium">Single transaction</span>
                </div>
              </div>
            )}

            {/* Smart Summary Tip */}
            <div className="p-3 rounded-xl bg-ink-10 border border-ink/15 flex items-start gap-2.5 text-xs text-ink">
              <Sparkles className="w-4 h-4 text-ink shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">
                <span className="font-bold">Weekly Insight: </span>
                {data.summaryTip}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
