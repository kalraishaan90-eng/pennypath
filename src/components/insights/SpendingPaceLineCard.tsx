import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { SpendingPaceResult } from '../../engine/insightsEngine';
import { formatINR } from '../../engine/currency';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Activity, Compass, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

interface SpendingPaceLineCardProps {
  data: SpendingPaceResult;
}

export const SpendingPaceLineCard: React.FC<SpendingPaceLineCardProps> = ({ data }) => {
  const { t } = useTranslation();
  const isEmpty = data.dataPoints.length === 0 || data.totalBudget === 0;

  const currentPoint = data.dataPoints.find((p) => p.isCurrentDay);

  const getPaceBadgeVariant = () => {
    if (data.paceStatus === 'ahead_of_pace') return 'maroon';
    if (data.paceStatus === 'under_pace') return 'sand';
    return 'default';
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-ink" />
            <CardTitle>{t('insights.pace.title', 'Spending Pace vs Ideal Pace')}</CardTitle>
          </div>
          <CardDescription>
            {t(
              'insights.pace.subtitle',
              'Cumulative daily expenditure compared against linear budget run-rate'
            )}
          </CardDescription>
        </div>

        {!isEmpty && (
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                data.paceStatus === 'ahead_of_pace'
                  ? 'bg-accent/10 text-accent border border-accent/25'
                  : data.paceStatus === 'under_pace'
                  ? 'bg-ink/10 text-ink border border-ink/25'
                  : 'bg-sand/30 text-ink border border-sand-dark/30'
              }`}
            >
              {data.paceStatus === 'ahead_of_pace' ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{data.paceStatusLabel}</span>
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="py-12 text-center text-ink/60 bg-paper/50 rounded-xl border border-dashed border-ink/20">
            <Compass className="w-10 h-10 mx-auto text-ink/30 mb-2" />
            <p className="font-semibold text-sm">
              {t('insights.pace.no_data', 'No budget pace available')}
            </p>
            <p className="text-xs text-ink/50 mt-1">
              Set up envelopes or add transactions to plot monthly pace.
            </p>
          </div>
        ) : (
          <div>
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-xl bg-paper border border-ink/10 text-xs">
              <div>
                <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                  Current Spend (Day {data.currentDay})
                </span>
                <span className="text-sm font-bold font-fraunces text-ink tabular-nums">
                  {formatINR(data.currentActualSpend)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                  Ideal Run-Rate Target
                </span>
                <span className="text-sm font-bold font-fraunces text-ink/80 tabular-nums">
                  {formatINR(data.currentIdealSpend)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                  Pace Variance
                </span>
                <span
                  className={`text-sm font-bold font-fraunces tabular-nums ${
                    data.paceVariance > 0 ? 'text-accent' : 'text-ink'
                  }`}
                >
                  {data.paceVariance > 0 ? '+' : ''}
                  {formatINR(data.paceVariance)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-ink/60 uppercase font-semibold block">
                  Projected Month-End
                </span>
                <span className="text-sm font-bold font-fraunces text-ink tabular-nums">
                  {formatINR(data.projectedMonthEndSpend)}
                </span>
              </div>
            </div>

            {/* Line Chart (Readable at 360px) */}
            <div
              role="region"
              aria-label="Monthly Spending Pace Line Chart"
              className="w-full h-64 sm:h-72"
            >
              <div className="sr-only">
                {`Spending pace summary: Current spend at day ${data.currentDay} is ${formatINR(data.currentActualSpend)} vs ideal target of ${formatINR(data.currentIdealSpend)}. Pace status is ${data.paceStatusLabel} with projected month-end spend of ${formatINR(data.projectedMonthEndSpend)}.`}
              </div>
              <div className="w-full h-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.dataPoints}
                  margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(15, 65, 74, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#0F414A', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(15, 65, 74, 0.2)' }}
                    tickLine={false}
                    tickFormatter={(d) => `D${d}`}
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
                        const point = payload[0].payload;
                        return (
                          <div className="bg-paper border-2 border-ink/25 rounded-xl p-3 shadow-lg text-xs font-sans min-w-[180px]">
                            <p className="font-bold text-ink border-b border-ink/10 pb-1 mb-1.5 font-fraunces">
                              Day {point.day} ({point.date})
                            </p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-ink/70">
                                  <span className="w-2.5 h-0.5 bg-sand-dark inline-block border-t border-dashed border-sand-dark" />
                                  <span>Ideal Pace:</span>
                                </span>
                                <span className="font-bold text-ink tabular-nums">
                                  {formatINR(point.idealPace)}
                                </span>
                              </div>

                              {point.actualCumulative !== null ? (
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-accent font-semibold">
                                    <span className="w-2.5 h-1 bg-accent inline-block" />
                                    <span>Actual Spend:</span>
                                  </span>
                                  <span className="font-bold text-accent tabular-nums">
                                    {formatINR(point.actualCumulative)}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-ink/50 italic mt-1">
                                  Future days in month
                                </p>
                              )}

                              {point.dailySpend > 0 && (
                                <div className="flex items-center justify-between pt-1 border-t border-ink/10 text-[11px]">
                                  <span className="text-ink/60">Day Outflow:</span>
                                  <span className="font-semibold text-ink tabular-nums">
                                    {formatINR(point.dailySpend)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Ideal Pace Line: Dashed Sand-Dark / Ink */}
                  <Line
                    type="linear"
                    dataKey="idealPace"
                    name="Ideal Pace (लीनियर गति)"
                    stroke="#C29D74"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                  />
                  {/* Actual Spend Line: Solid Accent Maroon with Dots */}
                  <Line
                    type="monotone"
                    dataKey="actualCumulative"
                    name="Actual Spend (वास्तविक खर्च)"
                    stroke="#7F0303"
                    strokeWidth={3}
                    dot={{ fill: '#7F0303', r: 3, stroke: '#EFE8DF', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#7F0303' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* Accessible Colorblind Legend with Texture & Line Patterns */}
            <div className="pt-3 border-t border-ink/10 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-ink/80">
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-[#C29D74] inline-block" />
                <span>Ideal Pace (Dashed • Linear ₹{Math.round(data.totalBudget / data.daysInMonth)}/day)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-1 bg-[#7F0303] inline-block rounded-xs" />
                <span>Actual Spend (Solid Line • To Date)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
