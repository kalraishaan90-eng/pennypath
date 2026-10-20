/**
 * Pure TypeScript Financial Engine for the Home Dashboard.
 * 
 * Strict architectural rule:
 * NO MATH in UI components. All calculations, projections, health scores,
 * status checks, and day counting are performed here using engine functions.
 */

import { BudgetEnvelope } from './budget';
import { DueReminder, UserProfile } from '../types';
import {
  dailySafeToSpend as financeDailySafeToSpend,
  projectMonthEnd as financeProjectMonthEnd,
  financialHealthScore as financeHealthScore,
} from './finance';

export interface DailySafeToSpendResult {
  dailySafeToSpend: number;
  variableRemaining: number;
  variableAllocated: number;
  variableSpent: number;
  variablePercentUsed: number;
  daysRemaining: number;
  totalDaysInMonth: number;
  currentDay: number;
}

export interface ProjectedMonthEndResult {
  savedSoFar: number;
  targetSavings: number;
  projectedMonthEnd: number;
  projectedExpenses: number;
  isProjectedBelowTarget: boolean;
  savingsRatePercent: number;
  projectedShortfallOrSurplus: number;
}

export interface HealthSubBar {
  key: string;
  labelKey: string;
  score: number; // 0 to 100
  weight: number;
  status: 'good' | 'warning' | 'alert';
  displayValue: string;
}

export interface FinancialHealthScoreResult {
  score: number; // 0 to 100
  status: 'excellent' | 'fair' | 'at_risk';
  tipKey: string;
  tipParams?: Record<string, string | number>;
  subBars: [HealthSubBar, HealthSubBar, HealthSubBar, HealthSubBar];
}

export interface CategoryCapItem {
  id: string;
  categoryKey: string;
  icon: string;
  type: BudgetEnvelope['type'];
  spent: number;
  cap: number; // allocated
  remaining: number;
  percentageSpent: number;
  status: 'fine' | 'near_limit' | 'over';
  statusColor: 'ink' | 'sand' | 'maroon';
}

export interface UpcomingDueItem {
  id: string;
  titleKey: string;
  customTitle?: string;
  amount: number;
  dueDate: string;
  category: DueReminder['category'];
  isPaid: boolean;
  isRecurring: boolean;
  daysLeft: number;
  chipStatus: 'due_today' | 'days_left' | 'overdue' | 'paid';
  chipTextKey: string;
}

export interface HomeDashboardData {
  hero: DailySafeToSpendResult;
  savingsTracker: ProjectedMonthEndResult;
  healthScore: FinancialHealthScoreResult;
  categoryCaps: CategoryCapItem[];
  upcomingDues: UpcomingDueItem[];
}

/**
 * Returns total days in a given month (1-indexed month: 1=Jan, 12=Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates days remaining in the month starting from the given date (inclusive of today).
 */
export function getDaysRemainingInMonth(currentDate: Date = new Date()): {
  currentDay: number;
  totalDaysInMonth: number;
  daysRemaining: number;
} {
  const currentDay = currentDate.getDate();
  const totalDaysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

  return { currentDay, totalDaysInMonth, daysRemaining };
}

/**
 * Calculates "Safe to spend today" using the engine dailySafeToSpend function.
 */
export function calculateHeroSafeToSpend(
  envelopes: BudgetEnvelope[],
  daysRemaining: number,
  totalDaysInMonth: number,
  currentDay: number
): DailySafeToSpendResult {
  const variableEnvelopes = envelopes.filter(e => e.type !== 'goal');
  const variableAllocated = variableEnvelopes.reduce((sum, e) => sum + e.allocated, 0);
  const variableSpent = variableEnvelopes.reduce((sum, e) => sum + e.spent, 0);
  const variableRemaining = Math.max(0, variableAllocated - variableSpent);

  const safeDays = Math.max(1, daysRemaining);
  const safeToday = financeDailySafeToSpend(variableAllocated, variableSpent, safeDays);

  const variablePercentUsed = variableAllocated > 0
    ? Math.min(100, Math.round((variableSpent / variableAllocated) * 100))
    : 0;

  return {
    dailySafeToSpend: safeToday,
    variableRemaining,
    variableAllocated,
    variableSpent,
    variablePercentUsed,
    daysRemaining: safeDays,
    totalDaysInMonth,
    currentDay,
  };
}

/**
 * Calculates current and projected month-end savings using the engine projectMonthEnd function.
 */
export function calculateProjectedMonthEnd(
  income: number,
  envelopes: BudgetEnvelope[],
  currentDay: number,
  totalDaysInMonth: number
): ProjectedMonthEndResult {
  if (income <= 0) {
    return {
      savedSoFar: 0,
      targetSavings: 0,
      projectedMonthEnd: 0,
      projectedExpenses: 0,
      isProjectedBelowTarget: true,
      savingsRatePercent: 0,
      projectedShortfallOrSurplus: 0,
    };
  }

  const goalEnvelopes = envelopes.filter(e => e.type === 'goal');
  const nonGoalEnvelopes = envelopes.filter(e => e.type !== 'goal');
  const fixedEnvelopes = envelopes.filter(e => e.type === 'need' && e.allocated >= 10000); // e.g., PG Rent
  const variableEnvelopes = nonGoalEnvelopes.filter(e => !fixedEnvelopes.includes(e));

  const targetSavings = goalEnvelopes.reduce((sum, e) => sum + e.allocated, 0);
  const fixedTotal = fixedEnvelopes.reduce((sum, e) => sum + e.allocated, 0);
  const variableSpent = variableEnvelopes.reduce((sum, e) => sum + e.spent, 0);
  const nonGoalSpentSoFar = nonGoalEnvelopes.reduce((sum, e) => sum + e.spent, 0);

  const savedSoFar = Math.max(0, income - nonGoalSpentSoFar);

  // Call engine's pure projectMonthEnd function
  const projection = financeProjectMonthEnd(
    fixedTotal,
    variableSpent,
    Math.max(1, currentDay),
    totalDaysInMonth,
    income,
    targetSavings
  );

  const isProjectedBelowTarget = !projection.onTrackForSavings;
  const savingsRatePercent = Math.round((savedSoFar / income) * 100);

  return {
    savedSoFar,
    targetSavings,
    projectedMonthEnd: projection.projectedSavings,
    projectedExpenses: projection.projectedTotalExpenses,
    isProjectedBelowTarget,
    savingsRatePercent,
    projectedShortfallOrSurplus: projection.projectedSurplus,
  };
}

/**
 * Evaluates Financial Health Score using the engine financialHealthScore function.
 */
export function calculateFinancialHealth(
  income: number,
  envelopes: BudgetEnvelope[],
  reminders: DueReminder[]
): FinancialHealthScoreResult {
  if (income <= 0) {
    return {
      score: 0,
      status: 'at_risk',
      tipKey: 'health.tips.no_income',
      subBars: [
        { key: 'savings', labelKey: 'health.subbar.savings_rate', score: 0, weight: 0.3, status: 'alert', displayValue: '0%' },
        { key: 'discipline', labelKey: 'health.subbar.budget_discipline', score: 0, weight: 0.25, status: 'alert', displayValue: '0%' },
        { key: 'goals', labelKey: 'health.subbar.goal_cushion', score: 0, weight: 0.25, status: 'alert', displayValue: '0%' },
        { key: 'dues', labelKey: 'health.subbar.bills_dues', score: 0, weight: 0.2, status: 'alert', displayValue: '0%' },
      ],
    };
  }

  const nonGoalSpent = envelopes.filter(e => e.type !== 'goal').reduce((sum, e) => sum + e.spent, 0);
  const currentSavings = Math.max(0, income - nonGoalSpent);
  const currentSavingsRate = (currentSavings / income) * 100;

  // Emergency cushion months
  const monthlyExpenses = nonGoalSpent > 0 ? nonGoalSpent : income * 0.7;
  const emergencyMonths = currentSavings > 0 ? currentSavings / monthlyExpenses : 0;

  // Debt/Dues to income
  const totalDues = reminders.reduce((s, r) => s + r.amount, 0);
  const debtToIncome = (totalDues / income) * 100;

  // Budget adherence (ratio of total spent vs total allocated across envelopes)
  const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
  const adherence = totalAllocated > 0 ? Math.max(0, 1 - (totalSpent - totalAllocated) / totalAllocated) * 100 : 100;

  // Pure engine evaluation
  const engineResult = financeHealthScore(
    currentSavingsRate,
    emergencyMonths,
    debtToIncome,
    adherence
  );

  const savingsPartScore = Math.round((engineResult.parts.savings / 30) * 100);
  const emergencyPartScore = Math.round((engineResult.parts.emergency / 25) * 100);
  const debtPartScore = Math.round((engineResult.parts.debt / 25) * 100);
  const adherencePartScore = Math.round((engineResult.parts.adherence / 20) * 100);

  const getStatus = (score: number): 'good' | 'warning' | 'alert' => {
    if (score >= 75) return 'good';
    if (score >= 50) return 'warning';
    return 'alert';
  };

  const subBars: [HealthSubBar, HealthSubBar, HealthSubBar, HealthSubBar] = [
    {
      key: 'savings',
      labelKey: 'health.subbar.savings_rate',
      score: savingsPartScore,
      weight: 0.30,
      status: getStatus(savingsPartScore),
      displayValue: `${Math.round(currentSavingsRate)}%`,
    },
    {
      key: 'discipline',
      labelKey: 'health.subbar.budget_discipline',
      score: adherencePartScore,
      weight: 0.20,
      status: getStatus(adherencePartScore),
      displayValue: `${adherencePartScore}/100`,
    },
    {
      key: 'goals',
      labelKey: 'health.subbar.goal_cushion',
      score: emergencyPartScore,
      weight: 0.25,
      status: getStatus(emergencyPartScore),
      displayValue: `${emergencyMonths.toFixed(1)}m`,
    },
    {
      key: 'dues',
      labelKey: 'health.subbar.bills_dues',
      score: debtPartScore,
      weight: 0.25,
      status: getStatus(debtPartScore),
      displayValue: `${debtPartScore}/100`,
    },
  ];

  let status: 'excellent' | 'fair' | 'at_risk' = 'fair';
  if (engineResult.total >= 75) status = 'excellent';
  else if (engineResult.total < 50) status = 'at_risk';

  let tipKey = 'health.tips.excellent_trajectory';
  const minScore = Math.min(savingsPartScore, adherencePartScore, emergencyPartScore, debtPartScore);
  if (minScore === adherencePartScore && adherencePartScore < 75) {
    tipKey = 'health.tips.reing_in_overspending';
  } else if (minScore === savingsPartScore && currentSavingsRate < 20) {
    tipKey = 'health.tips.boost_savings_rate';
  } else if (minScore === debtPartScore && debtPartScore < 75) {
    tipKey = 'health.tips.clear_upcoming_dues';
  } else if (minScore === emergencyPartScore && emergencyPartScore < 75) {
    tipKey = 'health.tips.fund_emergency_goal';
  }

  return {
    score: engineResult.total,
    status,
    tipKey,
    subBars,
  };
}

/**
 * Calculates top 5 category caps with color thresholds:
 * - Maroon when over (> 100%)
 * - Tan near limit (>= 80% and <= 100%)
 * - Ink when fine (< 80%)
 */
export function calculateCategoryCaps(envelopes: BudgetEnvelope[]): CategoryCapItem[] {
  const sorted = [...envelopes].sort((a, b) => {
    const aOver = a.spent > a.allocated;
    const bOver = b.spent > b.allocated;
    if (aOver !== bOver) return aOver ? -1 : 1;
    return b.spent - a.spent;
  });

  const top5 = sorted.slice(0, 5);

  return top5.map(env => {
    const allocated = env.allocated;
    const spent = env.spent;
    const remaining = allocated - spent;
    const percentageSpent = allocated > 0 ? Math.round((spent / allocated) * 100) : (spent > 0 ? 100 : 0);

    let status: 'fine' | 'near_limit' | 'over' = 'fine';
    let statusColor: 'ink' | 'sand' | 'maroon' = 'ink';

    if (spent > allocated) {
      status = 'over';
      statusColor = 'maroon';
    } else if (percentageSpent >= 80) {
      status = 'near_limit';
      statusColor = 'sand';
    } else {
      status = 'fine';
      statusColor = 'ink';
    }

    return {
      id: env.id,
      categoryKey: env.categoryKey,
      icon: env.icon,
      type: env.type,
      spent,
      cap: allocated,
      remaining,
      percentageSpent,
      status,
      statusColor,
    };
  });
}

/**
 * Calculates reminders due in the next 7 days (or unpaid overdue).
 */
export function calculateUpcomingDues(
  reminders: DueReminder[],
  referenceDateStr: string = '2026-10-20',
  windowDays: number = 7
): UpcomingDueItem[] {
  const refDate = new Date(referenceDateStr);
  refDate.setHours(0, 0, 0, 0);

  const items: UpcomingDueItem[] = [];

  for (const reminder of reminders) {
    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffMs = dueDate.getTime() - refDate.getTime();
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const isWithinWindow = (daysLeft >= 0 && daysLeft <= windowDays);
    const isOverdueUnpaid = (daysLeft < 0 && !reminder.isPaid);

    if (isWithinWindow || isOverdueUnpaid) {
      let chipStatus: 'due_today' | 'days_left' | 'overdue' | 'paid' = 'days_left';
      let chipTextKey = 'dues.chip.days_left';

      if (reminder.isPaid) {
        chipStatus = 'paid';
        chipTextKey = 'dues.chip.paid';
      } else if (daysLeft < 0) {
        chipStatus = 'overdue';
        chipTextKey = 'dues.chip.overdue';
      } else if (daysLeft === 0) {
        chipStatus = 'due_today';
        chipTextKey = 'dues.chip.due_today';
      }

      items.push({
        id: reminder.id,
        titleKey: reminder.titleKey,
        customTitle: reminder.customTitle,
        amount: reminder.amount,
        dueDate: reminder.dueDate,
        category: reminder.category,
        isPaid: reminder.isPaid,
        isRecurring: reminder.isRecurring,
        daysLeft,
        chipStatus,
        chipTextKey,
      });
    }
  }

  items.sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
    return a.daysLeft - b.daysLeft;
  });

  return items;
}

/**
 * High-level engine function that computes all Home Dashboard data at once.
 * Zero math occurs in the UI.
 */
export function computeHomeDashboard(
  profile: UserProfile,
  envelopes: BudgetEnvelope[],
  reminders: DueReminder[],
  currentDate: Date = new Date('2026-10-20T10:30:00+05:30')
): HomeDashboardData {
  const { currentDay, totalDaysInMonth, daysRemaining } = getDaysRemainingInMonth(currentDate);

  const hero = calculateHeroSafeToSpend(envelopes, daysRemaining, totalDaysInMonth, currentDay);
  const savingsTracker = calculateProjectedMonthEnd(profile.monthlyIncome, envelopes, currentDay, totalDaysInMonth);
  const healthScore = calculateFinancialHealth(profile.monthlyIncome, envelopes, reminders);
  const categoryCaps = calculateCategoryCaps(envelopes);
  const dateStr = currentDate.toISOString().split('T')[0];
  const upcomingDues = calculateUpcomingDues(reminders, dateStr, 7);

  return {
    hero,
    savingsTracker,
    healthScore,
    categoryCaps,
    upcomingDues,
  };
}
