import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CategoryBreakdownResult, CategoryBreakdownItem } from '../../engine/insightsEngine';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatINR } from '../../engine/currency';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { PieChart as PieChartIcon, Filter, Layers } from 'lucide-react';

interface CategoryBreakdownCardProps {
  data: CategoryBreakdownResult;
  selectedMonth: string;
}

export const CategoryBreakdownCard: React.FC<CategoryBreakdownCardProps> = ({
  data,
  selectedMonth,
}) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<'all' | 'need' | 'want'>('all');
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);

  const displayedItems = data.items.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const chartData = displayedItems.map((item) => ({
    name: t(item.categoryKey, { defaultValue: item.categoryKey.replace('budget.cat.', '') }),
    value: item.totalSpent,
    color: item.color,
    percentage: item.percentage,
    categoryKey: item.categoryKey,
    symbol: item.symbol,
    icon: item.icon,
  }));

  const isEmpty = displayedItems.length === 0 || data.totalExpenses === 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-ink" />
            <CardTitle>{t('insights.category_breakdown.title', 'Category Breakdown')}</CardTitle>
          </div>
          <CardDescription>
            {t('insights.category_breakdown.subtitle', 'Ranked spending & envelope distribution')}
          </CardDescription>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-sand/30 p-1 rounded-btn text-xs font-semibold self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors min-h-[32px] ${
              filterType === 'all'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-ink/70 hover:text-ink hover:bg-sand/40'
            }`}
          >
            {t('insights.filters.all', 'All')}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('need')}
            className={`px-2.5 py-1 rounded-lg transition-colors min-h-[32px] ${
              filterType === 'need'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-ink/70 hover:text-ink hover:bg-sand/40'
            }`}
          >
            {t('insights.filters.needs', 'Needs')} ({data.needsPercentage}%)
          </button>
          <button
            type="button"
            onClick={() => setFilterType('want')}
            className={`px-2.5 py-1 rounded-lg transition-colors min-h-[32px] ${
              filterType === 'want'
                ? 'bg-ink text-paper shadow-xs'
                : 'text-ink/70 hover:text-ink hover:bg-sand/40'
            }`}
          >
            {t('insights.filters.wants', 'Wants')} ({data.wantsPercentage}%)
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isEmpty ? (
          <div className="py-12 text-center text-ink/60 bg-paper/50 rounded-xl border border-dashed border-ink/20">
            <PieChartIcon className="w-10 h-10 mx-auto text-ink/30 mb-2" />
            <p className="font-semibold text-sm">
              {t('insights.category_breakdown.no_data', 'No expense transactions recorded')}
            </p>
            <p className="text-xs text-ink/50 mt-1">
              Add transactions or select a different month to explore breakdown.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Donut Chart Container (Readable at 360px) */}
            <div
              role="region"
              aria-label="Category Spending Breakdown Donut Chart"
              className="md:col-span-5 flex flex-col items-center justify-center relative min-h-[220px] w-full"
            >
              <div className="sr-only">
                Category spending breakdown: {displayedItems.map((i) => `${t(i.categoryKey)}: ${formatINR(i.totalSpent)} (${i.percentage}%)`).join(', ')}.
              </div>
              <div className="w-full h-56 max-w-[240px] relative" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-paper border-2 border-ink/30 rounded-xl p-2.5 shadow-lg text-xs font-sans">
                              <p className="font-bold text-ink">{item.name}</p>
                              <p className="text-accent font-semibold tabular-nums mt-0.5">
                                {formatINR(item.value)} ({item.percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="#EFE8DF"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.categoryKey}-${index}`}
                          fill={entry.color}
                          stroke="#EFE8DF"
                          strokeWidth={activeCategoryKey === entry.categoryKey ? 3 : 1}
                          className="transition-all cursor-pointer hover:opacity-90"
                          onClick={() =>
                            setActiveCategoryKey(
                              activeCategoryKey === entry.categoryKey ? null : entry.categoryKey
                            )
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Inner Donut Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-semibold text-ink/60 uppercase tracking-wider">
                    {t('insights.category_breakdown.total_spent', 'Total Spent')}
                  </span>
                  <span className="text-xl font-bold font-fraunces text-ink tabular-nums">
                    {formatINR(data.totalExpenses, { compact: true })}
                  </span>
                  <span className="text-[10px] text-ink/50 font-medium">
                    {displayedItems.length} {t('insights.category_breakdown.categories', 'Categories')}
                  </span>
                </div>
              </div>

              {/* Colorblind Legend hint */}
              <p className="text-[11px] text-ink/60 text-center mt-2 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                <span>Ranked by share with accessible symbol markers</span>
              </p>
            </div>

            {/* Ranked List & Legend with Icon + Text */}
            <div className="md:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-ink/60 pb-1 border-b border-ink/10 uppercase tracking-wider">
                <span>{t('insights.category_breakdown.rank_category', 'Category')}</span>
                <span>{t('insights.category_breakdown.amount_share', 'Amount & Share')}</span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {displayedItems.map((item) => {
                  const isSelected = activeCategoryKey === item.categoryKey;
                  const localizedTitle = t(item.categoryKey, {
                    defaultValue: item.categoryKey.replace('budget.cat.', '').replace('_', ' '),
                  });

                  return (
                    <div
                      key={item.categoryKey}
                      onClick={() =>
                        setActiveCategoryKey(isSelected ? null : item.categoryKey)
                      }
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-ink bg-sand/30 shadow-xs'
                          : 'border-ink/10 bg-paper/60 hover:bg-sand/20 hover:border-ink/20'
                      }`}
                    >
                      {/* Left: Rank badge, Icon, Text & Accessibility Symbol */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {/* Rank Badge */}
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-paper shrink-0"
                          style={{ backgroundColor: item.color }}
                          title={`Rank #${item.rank}`}
                        >
                          <span className="sr-only">Rank #{item.rank}</span>
                          <span aria-hidden="true">{item.rank}</span>
                        </span>

                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: `${item.color}15`,
                            borderColor: `${item.color}35`,
                            color: item.color,
                          }}
                        >
                          <CategoryIcon name={item.icon} className="w-4 h-4" />
                        </div>

                        {/* Text & Symbol */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-mono text-xs font-bold shrink-0 text-ink/70"
                              title={`Pattern marker: ${item.symbol}`}
                            >
                              {item.symbol}
                            </span>
                            <span className="font-semibold text-xs sm:text-sm text-ink truncate capitalize">
                              {localizedTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-ink/60 mt-0.5">
                            <span className="capitalize font-medium">{item.type}</span>
                            <span>•</span>
                            <span>{item.transactionCount} transactions</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Percentage */}
                      <div className="text-right shrink-0">
                        <span className="font-bold font-fraunces text-xs sm:text-sm text-ink tabular-nums block">
                          {formatINR(item.totalSpent)}
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] font-semibold text-ink/70 tabular-nums">
                            {item.percentage}%
                          </span>
                          <div
                            className="w-12 h-1.5 bg-ink/10 rounded-full overflow-hidden hidden sm:block"
                            role="progressbar"
                            aria-valuenow={item.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, item.percentage)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
