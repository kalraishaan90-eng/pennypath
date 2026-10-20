import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, TrendingDown, TrendingUp } from 'lucide-react';
import { BudgetEnvelope } from '../../engine/budget';

interface DemoTransactionSimulatorProps {
  envelopes: BudgetEnvelope[];
  onSimulateChange: (envelopeId: string, delta: number) => void;
}

export const DemoTransactionSimulator: React.FC<DemoTransactionSimulatorProps> = ({
  envelopes,
  onSimulateChange,
}) => {
  const { t } = useTranslation();

  // Pick top 2 variable envelopes for quick demo toggling (e.g. food, weekend hangouts)
  const quickEnvelopes = envelopes.filter(e => e.type === 'want' || e.type === 'need').slice(0, 3);

  return (
    <aside
      data-dev-ui="true"
      className="dev-ui w-full bg-sand/15 border border-sand-dark/40 rounded-card p-3 sm:p-4 my-2 text-xs"
      aria-label="Demo Transaction Quick Controls"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 font-bold text-ink">
          <Zap className="w-4 h-4 text-accent" />
          <span>Rohan Live Interactive Demo: Instant Math Verification</span>
        </div>
        <span className="text-[11px] text-ink font-medium">
          Click any button to add/refund expenses & watch safe-to-spend and score update live!
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quickEnvelopes.map((env) => (
          <div
            key={env.id}
            className="flex items-center gap-1.5 bg-paper px-2.5 py-1.5 rounded-btn border border-ink/15 shadow-2xs"
          >
            <span className="font-semibold text-ink truncate max-w-[110px]">
              {t(env.categoryKey)}:
            </span>
            <button
              onClick={() => onSimulateChange(env.id, 200)}
              className="touch-target px-2 py-0.5 rounded bg-accent/10 hover:bg-accent/20 text-accent font-bold text-[11px] transition-colors flex items-center gap-0.5"
              title={`Add ₹200 to ${t(env.categoryKey)}`}
              aria-label={`Add ₹200 to ${t(env.categoryKey)}`}
            >
              <TrendingUp className="w-3 h-3" />
              +₹200
            </button>
            <button
              onClick={() => onSimulateChange(env.id, -200)}
              className="touch-target px-2 py-0.5 rounded bg-ink/10 hover:bg-ink/20 text-ink font-bold text-[11px] transition-colors flex items-center gap-0.5"
              title={`Refund ₹200 from ${t(env.categoryKey)}`}
              aria-label={`Refund ₹200 from ${t(env.categoryKey)}`}
            >
              <TrendingDown className="w-3 h-3" />
              -₹200
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
};
