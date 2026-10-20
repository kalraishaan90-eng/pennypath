/**
 * Pure TypeScript Budgeting and Envelope Financial Engine.
 */

export type UserMode = 'student' | 'household' | 'earner';

export interface BudgetEnvelope {
  id: string;
  categoryKey: string; // i18n key for category name
  allocated: number;
  spent: number;
  icon: string;
  type: 'need' | 'want' | 'goal' | 'buffer';
}

export interface BudgetStatus {
  remaining: number;
  percentageSpent: number;
  isOverBudget: boolean;
  status: 'good' | 'warning' | 'alert';
}

export interface PersonaBudgetProfile {
  name: string;
  monthlyIncome: number;
  recommendedSplit: {
    needs: number; // percentage (e.g. 50)
    wants: number; // percentage (e.g. 30)
    goals: number; // percentage (e.g. 20)
  };
  defaultEnvelopes: Omit<BudgetEnvelope, 'id'>[];
}

export const PERSONA_CONFIGS: Record<UserMode, PersonaBudgetProfile> = {
  student: {
    name: 'Student',
    monthlyIncome: 12000,
    recommendedSplit: { needs: 50, wants: 30, goals: 20 },
    defaultEnvelopes: [
      { categoryKey: 'budget.cat.tuition_books', allocated: 3500, spent: 2800, icon: 'GraduationCap', type: 'need' },
      { categoryKey: 'budget.cat.food_mess', allocated: 2500, spent: 2400, icon: 'Utensils', type: 'need' },
      { categoryKey: 'budget.cat.canteen_fun', allocated: 2000, spent: 1850, icon: 'Coffee', type: 'want' },
      { categoryKey: 'budget.cat.transport', allocated: 1500, spent: 1200, icon: 'Bus', type: 'need' },
      { categoryKey: 'budget.cat.laptop_goal', allocated: 2400, spent: 2400, icon: 'Target', type: 'goal' },
    ],
  },
  household: {
    name: 'Household',
    monthlyIncome: 45000,
    recommendedSplit: { needs: 60, wants: 20, goals: 20 },
    defaultEnvelopes: [
      { categoryKey: 'budget.cat.groceries_ration', allocated: 14000, spent: 12800, icon: 'ShoppingBag', type: 'need' },
      { categoryKey: 'budget.cat.utilities_bills', allocated: 6000, spent: 5400, icon: 'Zap', type: 'need' },
      { categoryKey: 'budget.cat.kids_education', allocated: 8000, spent: 8000, icon: 'BookOpen', type: 'need' },
      { categoryKey: 'budget.cat.household_buffer', allocated: 4000, spent: 2500, icon: 'Shield', type: 'buffer' },
      { categoryKey: 'budget.cat.diwali_gold_fund', allocated: 5000, spent: 5000, icon: 'Sparkles', type: 'goal' },
      { categoryKey: 'budget.cat.family_dining', allocated: 4000, spent: 4300, icon: 'UtensilsCrossed', type: 'want' },
      { categoryKey: 'budget.cat.emergency_stash', allocated: 4000, spent: 4000, icon: 'Lock', type: 'goal' },
    ],
  },
  earner: {
    name: 'First-Job Earner',
    monthlyIncome: 38000,
    recommendedSplit: { needs: 50, wants: 30, goals: 20 },
    defaultEnvelopes: [
      { categoryKey: 'budget.cat.pg_rent', allocated: 12000, spent: 12000, icon: 'Home', type: 'need' },
      { categoryKey: 'budget.cat.food_groceries', allocated: 7000, spent: 6200, icon: 'Utensils', type: 'need' },
      { categoryKey: 'budget.cat.commute', allocated: 3000, spent: 2700, icon: 'Navigation', type: 'need' },
      { categoryKey: 'budget.cat.weekend_hangouts', allocated: 4500, spent: 5100, icon: 'PartyPopper', type: 'want' },
      { categoryKey: 'budget.cat.gadgets_shopping', allocated: 3500, spent: 3000, icon: 'Smartphone', type: 'want' },
      { categoryKey: 'budget.cat.emergency_sip', allocated: 5000, spent: 5000, icon: 'Coins', type: 'goal' },
      { categoryKey: 'budget.cat.upskilling_courses', allocated: 3000, spent: 2500, icon: 'Award', type: 'goal' },
    ],
  },
};

/**
 * Calculates envelope status and warning levels
 */
export function calculateBudgetStatus(allocated: number, spent: number): BudgetStatus {
  if (allocated <= 0) {
    const isOver = spent > 0;
    return {
      remaining: -spent,
      percentageSpent: spent > 0 ? 100 : 0,
      isOverBudget: isOver,
      status: isOver ? 'alert' : 'good',
    };
  }

  const remaining = allocated - spent;
  const percentageSpent = Math.round((spent / allocated) * 100);
  const isOverBudget = spent > allocated;

  let status: 'good' | 'warning' | 'alert' = 'good';
  if (isOverBudget) {
    status = 'alert';
  } else if (percentageSpent >= 85) {
    status = 'warning';
  }

  return {
    remaining,
    percentageSpent,
    isOverBudget,
    status,
  };
}

/**
 * Calculates overall financial safety and health score (0 to 100)
 */
export function calculateSavingsHealthScore(
  income: number,
  totalExpenses: number,
  monthlyGoalCommitment: number
): { score: number; status: 'excellent' | 'fair' | 'at_risk'; messageKey: string } {
  if (income <= 0) {
    return { score: 0, status: 'at_risk', messageKey: 'health.no_income' };
  }

  const savings = income - totalExpenses;
  const savingsRate = (savings / income) * 100;
  const goalCoverage = monthlyGoalCommitment > 0 ? Math.min(100, (savings / monthlyGoalCommitment) * 100) : 100;

  let rawScore = 0;

  // 60 points based on savings rate (20% or more = full 60 points)
  if (savingsRate >= 25) {
    rawScore += 60;
  } else if (savingsRate >= 20) {
    rawScore += 50;
  } else if (savingsRate >= 10) {
    rawScore += 35;
  } else if (savingsRate > 0) {
    rawScore += 20;
  } else {
    rawScore += 0;
  }

  // 40 points based on meeting goal commitments
  rawScore += Math.round((goalCoverage / 100) * 40);

  const finalScore = Math.max(0, Math.min(100, rawScore));

  let status: 'excellent' | 'fair' | 'at_risk' = 'fair';
  let messageKey = 'health.fair_progress';

  if (finalScore >= 75) {
    status = 'excellent';
    messageKey = 'health.excellent_path';
  } else if (finalScore < 50) {
    status = 'at_risk';
    messageKey = 'health.overspending_risk';
  }

  return {
    score: finalScore,
    status,
    messageKey,
  };
}

export interface PlanInput {
  income: number;
  fixedTotal: number;
  savingsTarget: number;
  mode: UserMode;
  daysInMonth?: number;
}

export interface PlanFix {
  id: string;
  type: 'reduce_savings' | 'extend_timeline' | 'reduce_fixed' | 'increase_income';
  titleKey: string;
  descriptionKey: string;
  suggestedValue?: number;
  freedAmount?: number;
  actionTextKey: string;
}

export interface BudgetPlanResult {
  income: number;
  fixedTotal: number;
  savingsTarget: number;
  discretionaryTotal: number; // D = income - fixedTotal - savingsTarget
  dailyDiscretionary: number; // Math.floor(D / daysInMonth)
  shortfall: number; // Math.max(0, (fixedTotal + savingsTarget) - income)
  hasShortfall: boolean;
  savingsRate: number; // percentage
  fixedRatio: number; // percentage
  feasibility: 'healthy' | 'tight' | 'shortfall';
  feasibilityMessageKey: string;
  suggestedSavings: number;
  fixes: PlanFix[];
  envelopes: BudgetEnvelope[];
}

/**
 * Builds a comprehensive budget plan and computes daily discretionary allowance (D).
 * If fixed obligations + savings goal exceed income, identifies the exact shortfall
 * and proposes corrective fixes.
 */
export function buildPlan(input: PlanInput): BudgetPlanResult {
  const { income, fixedTotal, savingsTarget, mode, daysInMonth = 30 } = input;

  const totalCommitted = fixedTotal + savingsTarget;
  const discretionaryTotal = income - totalCommitted;
  const shortfall = Math.max(0, totalCommitted - income);
  const hasShortfall = shortfall > 0;

  const dailyDiscretionary = daysInMonth > 0 ? Math.floor(discretionaryTotal / daysInMonth) : 0;
  const savingsRate = income > 0 ? Math.round((savingsTarget / income) * 100) : 0;
  const fixedRatio = income > 0 ? Math.round((fixedTotal / income) * 100) : 0;

  // Recommended baseline savings: 20% of income, or whatever remains after fixed if less
  const standardSavings = Math.round(income * 0.2);
  const maxFeasibleSavings = Math.max(0, income - fixedTotal);
  const suggestedSavings = Math.min(standardSavings, Math.max(0, Math.floor(maxFeasibleSavings * 0.5)));

  let feasibility: 'healthy' | 'tight' | 'shortfall' = 'healthy';
  let feasibilityMessageKey = 'feasibility.healthy';

  if (hasShortfall) {
    feasibility = 'shortfall';
    feasibilityMessageKey = 'feasibility.shortfall';
  } else if (dailyDiscretionary < 200 || discretionaryTotal < income * 0.15) {
    feasibility = 'tight';
    feasibilityMessageKey = 'feasibility.tight';
  } else if (savingsRate >= 20) {
    feasibility = 'healthy';
    feasibilityMessageKey = 'feasibility.ideal';
  }

  const fixes: PlanFix[] = [];

  if (hasShortfall) {
    // Fix 1: Reduce savings target to recommended/feasible level
    if (savingsTarget > suggestedSavings) {
      const freedBySavings = savingsTarget - suggestedSavings;
      fixes.push({
        id: 'fix-reduce-savings',
        type: 'reduce_savings',
        titleKey: 'fixes.reduce_savings.title',
        descriptionKey: 'fixes.reduce_savings.desc',
        suggestedValue: suggestedSavings,
        freedAmount: freedBySavings,
        actionTextKey: 'fixes.reduce_savings.action',
      });
    }

    // Fix 2: Review or trim flexible fixed costs (subscriptions, non-essential commitments)
    if (fixedTotal > 0) {
      const targetFixedReduction = Math.min(fixedTotal, shortfall);
      fixes.push({
        id: 'fix-reduce-fixed',
        type: 'reduce_fixed',
        titleKey: 'fixes.reduce_fixed.title',
        descriptionKey: 'fixes.reduce_fixed.desc',
        freedAmount: targetFixedReduction,
        suggestedValue: Math.max(0, fixedTotal - targetFixedReduction),
        actionTextKey: 'fixes.reduce_fixed.action',
      });
    }

    // Fix 3: Extend savings goal horizon
    fixes.push({
      id: 'fix-extend-timeline',
      type: 'extend_timeline',
      titleKey: 'fixes.extend_timeline.title',
      descriptionKey: 'fixes.extend_timeline.desc',
      actionTextKey: 'fixes.extend_timeline.action',
    });

    // Fix 4: Bridge gap through supplementary income
    fixes.push({
      id: 'fix-increase-income',
      type: 'increase_income',
      titleKey: 'fixes.increase_income.title',
      descriptionKey: 'fixes.increase_income.desc',
      suggestedValue: income + shortfall,
      freedAmount: shortfall,
      actionTextKey: 'fixes.increase_income.action',
    });
  }

  // Generate envelopes scaled from available discretionary income
  const personaConfig = PERSONA_CONFIGS[mode];
  const envelopes: BudgetEnvelope[] = personaConfig.defaultEnvelopes.map((env, index) => {
    // If we have positive discretionary, scale non-fixed/non-goal envelopes
    let allocated = env.allocated;
    if (discretionaryTotal > 0 && env.type !== 'goal') {
      const proportion = env.allocated / personaConfig.monthlyIncome;
      allocated = Math.max(100, Math.round(discretionaryTotal * proportion));
    } else if (hasShortfall) {
      // In shortfall state, keep default envelope templates but marked
      allocated = env.allocated;
    }
    return {
      ...env,
      id: `env-${mode}-${index + 1}`,
      allocated,
      spent: 0,
    };
  });

  return {
    income,
    fixedTotal,
    savingsTarget,
    discretionaryTotal,
    dailyDiscretionary,
    shortfall,
    hasShortfall,
    savingsRate,
    fixedRatio,
    feasibility,
    feasibilityMessageKey,
    suggestedSavings,
    fixes,
    envelopes,
  };
}
