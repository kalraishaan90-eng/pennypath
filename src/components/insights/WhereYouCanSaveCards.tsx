import React from 'react';
import { useTranslation } from 'react-i18next';
import { WhereYouCanSaveResult, WhereYouCanSaveOpportunity } from '../../engine/insightsEngine';
import { formatINR } from '../../engine/currency';
import { CategoryIcon } from '../common/CategoryIcon';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Sparkles, ArrowRight, TrendingUp, PiggyBank, ShieldCheck } from 'lucide-react';

interface WhereYouCanSaveCardsProps {
  data: WhereYouCanSaveResult;
  onApplySavings?: (opp: WhereYouCanSaveOpportunity) => void;
}

export const WhereYouCanSaveCards: React.FC<WhereYouCanSaveCardsProps> = ({
  data,
  onApplySavings,
}) => {
  const { t } = useTranslation();
  const isEmpty = data.opportunities.length === 0;

  return (
    <Card className="w-full" withAwningAccent>
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <CardTitle>{t('insights.where_to_save.title', 'Where You Can Save')}</CardTitle>
            <Badge variant="awning" size="sm">Engine Derived</Badge>
          </div>
          <CardDescription>
            {t(
              'insights.where_to_save.subtitle',
              'Smart discretionary reduction converted into 5-year compounding SIP wealth'
            )}
          </CardDescription>
        </div>

        {!isEmpty && (
          <div className="text-right self-stretch sm:self-auto bg-sand/20 border border-sand/40 p-2 sm:p-2.5 rounded-xl">
            <span className="text-[10px] text-ink/70 font-semibold uppercase tracking-wider block">
              {t('insights.where_to_save.potential_wealth', '5-Yr Wealth Potential')}
            </span>
            <span className="text-base sm:text-lg font-bold font-fraunces text-ink tabular-nums">
              +{formatINR(data.totalPotential5YearWealth)}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="py-12 text-center text-ink/60 bg-paper/50 rounded-xl border border-dashed border-ink/20">
            <PiggyBank className="w-10 h-10 mx-auto text-ink/30 mb-2" />
            <p className="font-semibold text-sm">
              {t('insights.where_to_save.no_wants', 'No discretionary want expenses logged yet')}
            </p>
            <p className="text-xs text-ink/50 mt-1">
              As discretionary spending is recorded, PennyPath will calculate high-return savings opportunities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.opportunities.map((opp) => {
              const localizedTitle = t(opp.categoryKey, {
                defaultValue: opp.categoryKey.replace('budget.cat.', '').replace('_', ' '),
              });

              return (
                <div
                  key={opp.id}
                  className="bg-paper border border-ink/15 hover:border-ink/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Top: Category Icon + Rank + Title */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sand/30 border border-sand flex items-center justify-center text-ink shrink-0 group-hover:bg-sand/50 transition-colors">
                          <CategoryIcon name={opp.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-ink capitalize font-fraunces leading-tight">
                            {localizedTitle}
                          </h4>
                          <span className="text-[11px] font-semibold text-ink/60">
                            {opp.percentOfWants}% of all wants ({formatINR(opp.currentSpend)}/mo)
                          </span>
                        </div>
                      </div>

                      <Badge variant="sand" size="sm">
                        Rank #{opp.impactRank}
                      </Badge>
                    </div>

                    {/* Engine Derived Core Formula Callout */}
                    <div className="p-3 rounded-lg bg-ink-10 border border-ink/15 text-xs text-ink space-y-1 my-2">
                      <p className="font-medium leading-relaxed">
                        <span className="font-bold text-ink">{localizedTitle}</span> is{' '}
                        <span className="font-bold text-accent">{opp.percentOfWants}% of wants</span>:
                        cutting {opp.recommendedCutPercent}% frees{' '}
                        <span className="font-bold text-ink underline decoration-sand decoration-2">
                          {formatINR(opp.monthlyFreedAmount)}/month
                        </span>{' '}
                        → adds{' '}
                        <span className="font-bold text-ink bg-sand/30 px-1 py-0.5 rounded">
                          {formatINR(opp.futureValue5Years)}
                        </span>{' '}
                        in {opp.tenureYears} years at {opp.annualReturnRate}%
                      </p>
                    </div>
                  </div>

                  {/* Metrics Footer with SIP Future Value Pill */}
                  <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-ink/60 uppercase font-semibold">
                        Monthly freed
                      </span>
                      <span className="text-sm font-bold font-fraunces text-ink tabular-nums">
                        +{formatINR(opp.monthlyFreedAmount)}
                      </span>
                    </div>

                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-ink/60 uppercase font-semibold flex items-center gap-1 justify-end">
                        <TrendingUp className="w-3 h-3 text-accent" />
                        <span>SIP 5-Yr Accumulation</span>
                      </span>
                      <span className="text-sm font-bold font-fraunces text-accent tabular-nums">
                        {formatINR(opp.futureValue5Years)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
