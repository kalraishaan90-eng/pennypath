import React from 'react';
import { BudgetEnvelope } from '../../engine/budget';
import { PlanScreen } from '../plan/PlanScreen';

interface PlanScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopes?: BudgetEnvelope[];
  monthlyIncome?: number;
}

export const PlanScreenModal: React.FC<PlanScreenModalProps> = ({
  isOpen,
  onClose,
  monthlyIncome,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-screen-title"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-paper rounded-card border border-ink/20 shadow-2xl p-2 sm:p-4 z-10 max-h-[95vh] overflow-y-auto">
        <PlanScreen isModal={true} onClose={onClose} initialIncome={monthlyIncome} />
      </div>
    </div>
  );
};
