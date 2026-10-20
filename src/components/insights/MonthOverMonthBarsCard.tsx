import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { MonthOverMonthResult } from '../../engine/insightsEngine';
import { formatINR } from '../../engine/currency';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { BarChart3, TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MonthOverMonthBarsCardProps {
  data: MonthOverMonthResult;
}

export const MonthOverMonthBarsCard: React.FC<MonthOverMonthBarsCardProps> = ({ data }) => {
  const { t } = useTranslation();
  const isEmpty = data.months.length === 0;

  const chartData = data.months.map((m) => ({
    month: m.monthLabel,
    Income: m.income,
    Spend: m.spent,
    Saved: m.saved,
    savingsRate: m.savingsRate,
  }));

  const latest = data.latestComparison;

  const chartSummaryText = `Month-over-month financial summary: ${chartData
    .map(
      (m) =>
        `${m.month} - Spend: ${formatINR(m.Spend)}, Income: ${formatINR(m.Income)}, Saved: ${formatINR(m.Saved)} (${m.savingsRate}% savings rate)`
    )
    .join('; ')}.`;

  return (
    <Card className="w-full">
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-ink" />
            <CardTitle>{t('insights.mom.title', 'Month-over-Month Comparison')}</CardTitle>
          </div>
          <CardDescription>
            {t('insights.mom.subtitle', 'Spend vs Income vs Saved across active months')}
          </CardDescription>
        </div>

        {latest && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                latest.isSpendingLower
                  ? 'bg-ink/10 text-ink border border-ink/20'
                  : 'bg-accent/10 text-accent border border-accent/20'
              }`}
            >
              {latest.isSpendingLower ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5" />
              )}
              <span>
                {Math.abs(latest.spendChangePercent)}% spend {latest.isSpendingLower ? 'reduction' : 'increase'}
              </span>
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="py-12 text-center text-ink/60 bg-paper/50 rounded-xl border border-dashed border-ink/20">
            <BarChart3 className="w-10 h-10 mx-auto text-ink/30 mb-2" />
            <p className="font-semibold text-sm">
              {t('insights.mom.no_data', 'Not enough historical data')}
            </p>
            <p className="text-xs text-ink/50 mt-1">
              Month-over-month bars appear once transactions span active billing cycles.
            </p>
          </div>
        ) : (
          <div>
            {/* Main Bar Chart (Readable at 360px) */}
            <div
              role="region"
              aria-label="Month-over-Month Comparison Bar Chart"
              className="w-full h-64 sm:h-72"
            >
              <div className="sr-only">
                {chartSummaryText}
              </div>
              <div className="w-full h-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                  barGap={4}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 65, 74, 0.08)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#0F414A', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: 'rgba(15, 65, 74, 0.2)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#0F414A', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(15, 65, 74, 0.2)' }}
                    tickLine={false}
                    tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-paper border-2 border-ink/25 rounded-xl p-3 shadow-lg text-xs font-sans min-w-[170px]">
                            <p className="font-bold text-ink border-b border-ink/10 pb-1 mb-1.5 font-fraunces">
                              {label}
                            </p>
                            {payload.map((entry) => (
                              <div
                                key={entry.name}
                                className="flex items-center justify-between gap-3 py-0.5"
                              >
                                <span className="flex items-center gap-1.5 text-ink/80 font-medium">
                                  <span
                                    className="w-2.5 h-2.5 rounded-xs"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span>{entry.name}:</span>
                                </span>
                                <span className="font-bold text-ink tabular-nums">
                                  {formatINR(entry.value as number)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Spend: Palette Accent Maroon */}
                  <Bar
                    dataKey="Spend"
                    fill="#7F0303"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  {/* Income: Palette Ink */}
                  <Bar
                    dataKey="Income"
                    fill="#0F414A"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  {/* Saved: Palette Sand Dark / Sky */}
                  <Bar
                    dataKey="Saved"
                    fill="#C29D74"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* Custom Legend with Accessible Cues & Icons */}
            <div className="pt-3 border-t border-ink/10 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 flex flex-col items-center">
                <div className="flex items-center gap-1.5 font-semibold text-accent mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-accent inline-block" />
                  <span className="text-[11px] uppercase font-bold tracking-wider">Spend (व्यय)</span>
                </div>
                <span className="text-[10px] text-ink/70">Maroon • Outflow</span>
              </div>

              <div className="p-2 rounded-lg bg-ink/10 border border-ink/20 flex flex-col items-center">
                <div className="flex items-center gap-1.5 font-semibold text-ink mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-ink inline-block" />
                  <span className="text-[11px] uppercase font-bold tracking-wider">Income (आय)</span>
                </div>
                <span className="text-[10px] text-ink/70">Dark Ink • Inflow</span>
              </div>

              <div className="p-2 rounded-lg bg-sand/20 border border-sand/40 flex flex-col items-center">
                <div className="flex items-center gap-1.5 font-semibold text-ink mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#C29D74] inline-block" />
                  <span className="text-[11px] uppercase font-bold tracking-wider">Saved (बचत)</span>
                </div>
                <span className="text-[10px] text-ink/70">Amber Sand • Net</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
