/**
 * Pure TypeScript Insights Engine.
 * 
 * Strict architectural rule:
 * NO MATH in UI components. All metrics, aggregations, future wealth projections (SIP),
 * spending pace curves, health score simulations, and cross-checks are computed here.
 */

import { Transaction, DueReminder } from '../types';
import { BudgetEnvelope } from './budget';
import { sipFutureValue } from './finance';
import { calculateFinancialHealth } from './homeEngine';

// ============================================================================
// Brand Palette-Derived Tints & Colorblind Accessibility Markers
// ============================================================================

/**
 * Strict palette-derived tints based on PennyPath's brand tokens:
 * #0F414A (ink), #7F0303 (accent maroon), #D8BA98 (sand), #96C0CE (sky)
 * and their dark/light variations.
 */
export const PALETTE_TINTS = [
  '#0F414A', // ink (primary)
  '#7F0303', // accent (maroon)
  '#C29D74', // sand-dark (amber)
  '#1B5B67', // ink-light
  '#6EA2B3', // sky-dark
  '#96C0CE', // sky
  '#D8BA98', // sand
  '#A00D0D', // accent-light
  '#0A2D33', // ink-dark
  '#E6D3BE', // sand-light
] as const;

/**
 * Accessibility shape & pattern markers for colorblind users.
 * Ensures charts and legends are readable without relying on color alone.
 */
export const ACCESSIBILITY_PATTERNS = [
  { symbol: '●', label: 'Solid Circle', strokeDash: 'none' },
  { symbol: '■', label: 'Square', strokeDash: '4 4' },
  { symbol: '▲', label: 'Triangle', strokeDash: '2 2' },
  { symbol: '◆', label: 'Diamond', strokeDash: '8 4' },
  { symbol: '★', label: 'Star', strokeDash: '6 2 2 2' },
  { symbol: '⬟', label: 'Pentagon', strokeDash: '5 5' },
  { symbol: '✖', label: 'Cross', strokeDash: '3 3' },
  { symbol: '✦', label: 'Spark', strokeDash: '10 2' },
] as const;

// ============================================================================
// 1. Category Breakdown Interfaces & Functions
// ============================================================================

export interface CategoryBreakdownItem {
  rank: number;
  categoryKey: string;
  categoryLabel: string;
  totalSpent: number;
  transactionCount: number;
  percentage: number;
  type: 'need' | 'want' | 'goal' | 'buffer';
  icon: string;
  color: string;
  symbol: string;
  strokeDash: string;
}

export interface CategoryBreakdownResult {
  totalExpenses: number;
  items: CategoryBreakdownItem[];
  topCategory: CategoryBreakdownItem | null;
  wantsPercentage: number;
  needsPercentage: number;
}

/**
 * Dev-only invariant cross-check:
 * Category breakdown sums must strictly equal raw expense transaction totals.
 */
export function assertCategoryTotalsMatchTransactions(
  categoryItems: CategoryBreakdownItem[],
  rawTransactions: Transaction[],
  month?: string
): void {
  const expenseTx = rawTransactions.filter(
    (t) => t.type === 'expense' && (!month || t.date.startsWith(month))
  );
  const rawSum = expenseTx.reduce((acc, t) => acc + t.amount, 0);
  const catSum = categoryItems.reduce((acc, c) => acc + c.totalSpent, 0);

  if (catSum !== rawSum) {
    const errorMsg = `[PennyPath Dev Invariant Error] Category totals sum (₹${catSum}) !== Raw transaction sum (₹${rawSum}) for month '${month || 'all'}'.`;
    console.error(errorMsg, { categoryItems, rawTransactions });
    throw new Error(errorMsg);
  }
}

/**
 * Computes category breakdown for a given month or all transactions.
 */
export function computeCategoryBreakdown(
  transactions: Transaction[],
  month?: string,
  envelopes: BudgetEnvelope[] = []
): CategoryBreakdownResult {
  const filtered = transactions.filter(
    (t) => t.type === 'expense' && (!month || t.date.startsWith(month))
  );

  const totalExpenses = filtered.reduce((acc, t) => acc + t.amount, 0);

  // Envelope lookup map
  const envelopeMap = new Map<string, BudgetEnvelope>();
  envelopes.forEach((e) => envelopeMap.set(e.categoryKey, e));

  // Aggregate by categoryKey
  const catMap = new Map<string, { total: number; count: number }>();
  filtered.forEach((tx) => {
    const current = catMap.get(tx.categoryKey) || { total: 0, count: 0 };
    current.total += tx.amount;
    current.count += 1;
    catMap.set(tx.categoryKey, current);
  });

  // Sort descending by total spent (Ranked list)
  const sortedEntries = Array.from(catMap.entries()).sort(
    (a, b) => b[1].total - a[1].total
  );

  const items: CategoryBreakdownItem[] = sortedEntries.map(([key, data], idx) => {
    const env = envelopeMap.get(key);
    const color = PALETTE_TINTS[idx % PALETTE_TINTS.length];
    const pattern = ACCESSIBILITY_PATTERNS[idx % ACCESSIBILITY_PATTERNS.length];
    const percentage = totalExpenses > 0 ? Math.round((data.total / totalExpenses) * 100) : 0;

    return {
      rank: idx + 1,
      categoryKey: key,
      categoryLabel: key,
      totalSpent: data.total,
      transactionCount: data.count,
      percentage,
      type: env?.type || 'want',
      icon: env?.icon || 'Tag',
      color,
      symbol: pattern.symbol,
      strokeDash: pattern.strokeDash,
    };
  });

  // Run dev-only invariant assertion
  const isDev =
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV);

  if (isDev) {
    assertCategoryTotalsMatchTransactions(items, transactions, month);
  }

  // Calculate needs vs wants split
  const wantsTotal = items
    .filter((i) => i.type === 'want')
    .reduce((s, i) => s + i.totalSpent, 0);
  const needsTotal = items
    .filter((i) => i.type === 'need')
    .reduce((s, i) => s + i.totalSpent, 0);

  const wantsPercentage = totalExpenses > 0 ? Math.round((wantsTotal / totalExpenses) * 100) : 0;
  const needsPercentage = totalExpenses > 0 ? Math.round((needsTotal / totalExpenses) * 100) : 0;

  return {
    totalExpenses,
    items,
    topCategory: items[0] || null,
    wantsPercentage,
    needsPercentage,
  };
}

// ============================================================================
// 2. Month-over-Month Comparison
// ============================================================================

export interface MonthOverMonthItem {
  monthKey: string; // 'YYYY-MM'
  monthLabel: string; // 'Sep 2026'
  income: number;
  spent: number;
  saved: number;
  savingsRate: number;
}

export interface MonthOverMonthResult {
  months: MonthOverMonthItem[];
  latestComparison: {
    spendChangePercent: number;
    savedChangePercent: number;
    isSpendingLower: boolean;
    isSavingsHigher: boolean;
  } | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

export function computeMonthOverMonth(
  transactions: Transaction[],
  profileMonthlyIncome = 0
): MonthOverMonthResult {
  if (transactions.length === 0) {
    return {
      months: [],
      latestComparison: null,
    };
  }

  // Find unique months
  const monthSet = new Set<string>();
  transactions.forEach((t) => {
    if (t.date && t.date.length >= 7) {
      monthSet.add(t.date.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(monthSet).sort();

  const months: MonthOverMonthItem[] = sortedMonths.map((mKey) => {
    const monthTx = transactions.filter((t) => t.date.startsWith(mKey));

    const incomeFromTx = monthTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const income = incomeFromTx > 0 ? incomeFromTx : profileMonthlyIncome;

    const spent = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const saved = Math.max(0, income - spent);
    const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

    return {
      monthKey: mKey,
      monthLabel: formatMonthLabel(mKey),
      income,
      spent,
      saved,
      savingsRate,
    };
  });

  // Calculate comparison between last 2 months if available
  let latestComparison = null;
  if (months.length >= 2) {
    const current = months[months.length - 1];
    const prev = months[months.length - 2];

    const spendChangePercent = prev.spent > 0
      ? Math.round(((current.spent - prev.spent) / prev.spent) * 100)
      : 0;
    const savedChangePercent = prev.saved > 0
      ? Math.round(((current.saved - prev.saved) / prev.saved) * 100)
      : 0;

    latestComparison = {
      spendChangePercent,
      savedChangePercent,
      isSpendingLower: current.spent <= prev.spent,
      isSavingsHigher: current.saved >= prev.saved,
    };
  }

  return {
    months,
    latestComparison,
  };
}

// ============================================================================
// 3. "Where You Can Save" Engine (SIP Future Value)
// ============================================================================

export interface WhereYouCanSaveOpportunity {
  id: string;
  categoryKey: string;
  categoryLabel: string;
  icon: string;
  currentSpend: number;
  totalWantsSpend: number;
  percentOfWants: number;
  recommendedCutPercent: number; // e.g. 15%
  monthlyFreedAmount: number; // ₹X/month
  tenureYears: number; // 5 years
  annualReturnRate: number; // 12%
  futureValue5Years: number; // ₹Y from sipFutureValue
  explanation: string;
  impactRank: number;
}

export interface WhereYouCanSaveResult {
  totalWantsSpend: number;
  totalPotentialMonthlyFreed: number;
  totalPotential5YearWealth: number;
  opportunities: WhereYouCanSaveOpportunity[];
}

/**
 * Derives actionable "Where you can save" suggestions using sipFutureValue.
 * E.g. "Weekend Hangouts is 28% of wants: cutting 15% frees ₹765/month -> adds ₹63,812 in 5 years at 12%"
 */
export function computeWhereYouCanSave(
  transactions: Transaction[],
  month: string,
  envelopes: BudgetEnvelope[],
  expectedReturnRate = 12,
  tenureYears = 5
): WhereYouCanSaveResult {
  const filtered = transactions.filter(
    (t) => t.type === 'expense' && t.date.startsWith(month)
  );

  const envelopeMap = new Map<string, BudgetEnvelope>();
  envelopes.forEach((e) => envelopeMap.set(e.categoryKey, e));

  // Aggregate by category
  const spendByCat = new Map<string, number>();
  filtered.forEach((t) => {
    spendByCat.set(t.categoryKey, (spendByCat.get(t.categoryKey) || 0) + t.amount);
  });

  // Filter for wants
  const wantsCategories: { key: string; spend: number; env?: BudgetEnvelope }[] = [];
  spendByCat.forEach((spend, key) => {
    const env = envelopeMap.get(key);
    // If explicitly marked as 'want' or fallback heuristic
    if (env?.type === 'want' || (!env && key.includes('want'))) {
      wantsCategories.push({ key, spend, env });
    }
  });

  // If no explicit wants found in envelopes, take top variable/non-need categories
  if (wantsCategories.length === 0) {
    spendByCat.forEach((spend, key) => {
      const env = envelopeMap.get(key);
      if (env?.type !== 'need' && env?.type !== 'goal') {
        wantsCategories.push({ key, spend, env });
      }
    });
  }

  const totalWantsSpend = wantsCategories.reduce((sum, c) => sum + c.spend, 0);

  // If still zero wants spend, return empty
  if (totalWantsSpend === 0) {
    return {
      totalWantsSpend: 0,
      totalPotentialMonthlyFreed: 0,
      totalPotential5YearWealth: 0,
      opportunities: [],
    };
  }

  // Sort wants descending
  wantsCategories.sort((a, b) => b.spend - a.spend);

  const tenureMonths = tenureYears * 12;

  const opportunities: WhereYouCanSaveOpportunity[] = wantsCategories
    .slice(0, 4)
    .map((item, idx) => {
      const percentOfWants = Math.round((item.spend / totalWantsSpend) * 100);
      const recommendedCutPercent = 15; // standard achievable 15% reduction
      const monthlyFreedAmount = Math.round((item.spend * recommendedCutPercent) / 100);

      // Call pure finance engine function: sipFutureValue
      const futureValue5Years = sipFutureValue(
        monthlyFreedAmount,
        expectedReturnRate,
        tenureMonths
      );

      return {
        id: `save-opp-${item.key}`,
        categoryKey: item.key,
        categoryLabel: item.key,
        icon: item.env?.icon || 'Sparkles',
        currentSpend: item.spend,
        totalWantsSpend,
        percentOfWants,
        recommendedCutPercent,
        monthlyFreedAmount,
        tenureYears,
        annualReturnRate: expectedReturnRate,
        futureValue5Years,
        explanation: `${percentOfWants}% of wants: cutting ${recommendedCutPercent}% frees ₹${monthlyFreedAmount.toLocaleString('en-IN')}/month -> adds ₹${futureValue5Years.toLocaleString('en-IN')} in ${tenureYears} years at ${expectedReturnRate}%`,
        impactRank: idx + 1,
      };
    });

  const totalPotentialMonthlyFreed = opportunities.reduce(
    (sum, o) => sum + o.monthlyFreedAmount,
    0
  );
  const totalPotential5YearWealth = opportunities.reduce(
    (sum, o) => sum + o.futureValue5Years,
    0
  );

  return {
    totalWantsSpend,
    totalPotentialMonthlyFreed,
    totalPotential5YearWealth,
    opportunities,
  };
}

// ============================================================================
// 4. Spending Pace vs Ideal Pace
// ============================================================================

export interface DailyPacePoint {
  day: number;
  date: string;
  idealPace: number;
  actualCumulative: number | null;
  dailySpend: number;
  isCurrentDay: boolean;
}

export interface SpendingPaceResult {
  daysInMonth: number;
  currentDay: number;
  totalBudget: number;
  currentActualSpend: number;
  currentIdealSpend: number;
  paceVariance: number;
  paceStatus: 'ahead_of_pace' | 'on_track' | 'under_pace';
  paceStatusLabel: string;
  projectedMonthEndSpend: number;
  dataPoints: DailyPacePoint[];
}

export function computeSpendingPace(
  transactions: Transaction[],
  month: string,
  totalBudget: number,
  simDate: Date = new Date('2026-10-20T10:30:00+05:30')
): SpendingPaceResult {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Determine current day for the specified month
  const simYear = simDate.getFullYear();
  const simMonth = simDate.getMonth() + 1;
  const isSelectedMonthCurrent = year === simYear && monthNum === simMonth;
  const currentDay = isSelectedMonthCurrent
    ? Math.min(daysInMonth, simDate.getDate())
    : daysInMonth;

  // Filter transactions for this month
  const monthTx = transactions.filter(
    (t) => t.type === 'expense' && t.date.startsWith(month)
  );

  // Group by day of month
  const dailySpendMap = new Map<number, number>();
  monthTx.forEach((tx) => {
    const day = parseInt(tx.date.substring(8, 10), 10);
    dailySpendMap.set(day, (dailySpendMap.get(day) || 0) + tx.amount);
  });

  const dataPoints: DailyPacePoint[] = [];
  let runningCumulative = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dailySpend = dailySpendMap.get(d) || 0;
    const idealPace = Math.round((totalBudget / daysInMonth) * d);

    let actualCumulative: number | null = null;
    if (d <= currentDay) {
      runningCumulative += dailySpend;
      actualCumulative = runningCumulative;
    }

    const dayStr = d < 10 ? `0${d}` : `${d}`;
    dataPoints.push({
      day: d,
      date: `${month}-${dayStr}`,
      idealPace,
      actualCumulative,
      dailySpend,
      isCurrentDay: d === currentDay,
    });
  }

  const currentActualSpend = runningCumulative;
  const currentIdealSpend = Math.round((totalBudget / daysInMonth) * currentDay);
  const paceVariance = currentActualSpend - currentIdealSpend;

  // 5% margin of tolerance
  const tolerance = totalBudget * 0.05;
  let paceStatus: 'ahead_of_pace' | 'on_track' | 'under_pace' = 'on_track';
  let paceStatusLabel = 'On Track with Ideal Pace';

  if (paceVariance > tolerance) {
    paceStatus = 'ahead_of_pace';
    paceStatusLabel = 'Burning Faster than Ideal Pace';
  } else if (paceVariance < -tolerance) {
    paceStatus = 'under_pace';
    paceStatusLabel = 'Well Under Ideal Budget Pace';
  }

  const burnRatePerDay = currentDay > 0 ? currentActualSpend / currentDay : 0;
  const projectedMonthEndSpend = Math.round(burnRatePerDay * daysInMonth);

  return {
    daysInMonth,
    currentDay,
    totalBudget,
    currentActualSpend,
    currentIdealSpend,
    paceVariance,
    paceStatus,
    paceStatusLabel,
    projectedMonthEndSpend,
    dataPoints,
  };
}

// ============================================================================
// 5. Health Score Detail & "How to Add 10 Points"
// ============================================================================

export interface HealthSubScoreDetail {
  id: string;
  nameKey: string;
  title: string;
  score: number;
  weightPercent: number;
  pointsEarned: number;
  maxPoints: number;
  status: 'good' | 'warning' | 'alert';
  currentMetric: string;
  targetBenchmark: string;
  explanation: string;
  improvementTip: string;
}

export interface Add10PointsSuggestion {
  id: string;
  rank: number;
  title: string;
  action: string;
  pointsGain: number;
  targetSubScore: string;
  impact: 'high' | 'medium' | 'moderate';
  financialStep: string;
}

export interface HealthScoreDetailResult {
  totalScore: number;
  status: 'excellent' | 'fair' | 'at_risk';
  subScores: [
    HealthSubScoreDetail,
    HealthSubScoreDetail,
    HealthSubScoreDetail,
    HealthSubScoreDetail
  ];
  add10PointsSuggestions: Add10PointsSuggestion[];
}

export function computeHealthScoreDetail(
  income: number,
  envelopes: BudgetEnvelope[],
  reminders: DueReminder[]
): HealthScoreDetailResult {
  const health = calculateFinancialHealth(income, envelopes, reminders);

  const [savingsBar, disciplineBar, cushionBar, duesBar] = health.subBars;

  const subScores: [
    HealthSubScoreDetail,
    HealthSubScoreDetail,
    HealthSubScoreDetail,
    HealthSubScoreDetail
  ] = [
    {
      id: 'savings',
      nameKey: savingsBar.labelKey,
      title: 'Savings & Investment Rate',
      score: savingsBar.score,
      weightPercent: 30,
      pointsEarned: Math.round((savingsBar.score * 30) / 100),
      maxPoints: 30,
      status: savingsBar.status,
      currentMetric: savingsBar.displayValue,
      targetBenchmark: '≥ 20% of monthly income',
      explanation:
        'Measures the portion of monthly earnings retained after all expenses. A healthy savings rate powers long-term compounding.',
      improvementTip: 'Route at least 20% to SIPs, RD, or savings goals on salary day.',
    },
    {
      id: 'discipline',
      nameKey: disciplineBar.labelKey,
      title: 'Budget Discipline & Caps',
      score: disciplineBar.score,
      weightPercent: 20,
      pointsEarned: Math.round((disciplineBar.score * 20) / 100),
      maxPoints: 20,
      status: disciplineBar.status,
      currentMetric: disciplineBar.displayValue,
      targetBenchmark: '≤ 100% of envelope allocation',
      explanation:
        'Reflects how closely daily and weekly spending adheres to allocated envelope boundaries without overdrawing.',
      improvementTip: 'Trim discretionary weekend hangouts and food delivery when nearing limits.',
    },
    {
      id: 'cushion',
      nameKey: cushionBar.labelKey,
      title: 'Emergency Cushion Buffer',
      score: cushionBar.score,
      weightPercent: 25,
      pointsEarned: Math.round((cushionBar.score * 25) / 100),
      maxPoints: 25,
      status: cushionBar.status,
      currentMetric: cushionBar.displayValue,
      targetBenchmark: '3 to 6 months living expenses',
      explanation:
        'Ensures financial resilience against medical emergencies, job transitions, or unexpected repairs without borrowing.',
      improvementTip: 'Build an emergency liquid fund equal to at least 3 months essential living costs.',
    },
    {
      id: 'dues',
      nameKey: duesBar.labelKey,
      title: 'Debt-to-Income & Due Cleanliness',
      score: duesBar.score,
      weightPercent: 25,
      pointsEarned: Math.round((duesBar.score * 25) / 100),
      maxPoints: 25,
      status: duesBar.status,
      currentMetric: duesBar.displayValue,
      targetBenchmark: 'Total fixed dues < 30% of income',
      explanation:
        'Tracks exposure to recurring loans, EMIs, and bills. Keeping fixed obligations manageable prevents cash flow stress.',
      improvementTip: 'Pay upcoming credit bills and EMIs before due date to avoid interest and penalty fees.',
    },
  ];

  // Derive "How to add 10 points" suggestions ranked by impact
  const potentialSuggestions: {
    id: string;
    title: string;
    action: string;
    pointsGain: number;
    targetSubScore: string;
    impact: 'high' | 'medium' | 'moderate';
    financialStep: string;
  }[] = [];

  // 1. Budget discipline headroom
  if (disciplineBar.score < 95) {
    const gain = Math.min(6, Math.max(3, Math.round(((100 - disciplineBar.score) * 0.2) / 1.5)));
    potentialSuggestions.push({
      id: 'sug-trim-wants',
      title: 'Cap Weekend Discretionary Spend',
      action: 'Cut dining out & impulse orders by 15% this month',
      pointsGain: gain,
      targetSubScore: 'Budget Discipline',
      impact: 'high',
      financialStep: 'Frees ~₹1,200 to restore envelope limits',
    });
  }

  // 2. Savings rate headroom
  if (savingsBar.score < 90) {
    const gain = Math.min(5, Math.max(3, Math.round(((100 - savingsBar.score) * 0.3) / 2)));
    potentialSuggestions.push({
      id: 'sug-boost-sip',
      title: 'Automate Salary-Day Savings SIP',
      action: 'Increase monthly savings transfer by ₹2,000 on day 1',
      pointsGain: gain,
      targetSubScore: 'Savings Rate',
      impact: 'high',
      financialStep: 'Boosts savings rate toward the 20% benchmark',
    });
  }

  // 3. Emergency cushion headroom
  if (cushionBar.score < 90) {
    const gain = Math.min(4, Math.max(2, Math.round(((100 - cushionBar.score) * 0.25) / 2)));
    potentialSuggestions.push({
      id: 'sug-emergency-fund',
      title: 'Top Up Liquid Emergency Cushion',
      action: 'Deposit next bonus or cash gift into Emergency Stash',
      pointsGain: gain,
      targetSubScore: 'Emergency Cushion',
      impact: 'medium',
      financialStep: 'Adds +0.5 month to safety buffer',
    });
  }

  // 4. Bills & Dues headroom
  if (duesBar.score < 95) {
    const gain = Math.min(3, Math.max(2, Math.round(((100 - duesBar.score) * 0.25) / 2.5)));
    potentialSuggestions.push({
      id: 'sug-clear-dues',
      title: 'Clear Impending Dues 3 Days Early',
      action: 'Clear bike EMI and utility bills before due date',
      pointsGain: gain,
      targetSubScore: 'Bills & Dues',
      impact: 'medium',
      financialStep: 'Guarantees zero penalty and pristine score',
    });
  }

  // Fallback if everything is near perfect
  if (potentialSuggestions.length === 0) {
    potentialSuggestions.push({
      id: 'sug-maintain',
      title: 'Maintain Current Trajectory',
      action: 'Continue disciplined envelopes and SIP investments',
      pointsGain: 2,
      targetSubScore: 'All Pillars',
      impact: 'moderate',
      financialStep: 'Consistently reinforces 90+ tier rating',
    });
  }

  // Sort by points gain descending
  potentialSuggestions.sort((a, b) => b.pointsGain - a.pointsGain);

  const add10PointsSuggestions: Add10PointsSuggestion[] = potentialSuggestions.map(
    (sug, idx) => ({
      ...sug,
      rank: idx + 1,
    })
  );

  return {
    totalScore: health.score,
    status: health.status,
    subScores,
    add10PointsSuggestions,
  };
}

// ============================================================================
// 6. Weekly Summary Card
// ============================================================================

export interface WeeklySummaryResult {
  currentWeekRange: string;
  previousWeekRange: string;
  currentWeekSpent: number;
  previousWeekSpent: number;
  changePercent: number;
  isSpendIncreased: boolean;
  largestExpense: {
    description: string;
    amount: number;
    categoryKey: string;
    date: string;
  } | null;
  peakSpendDay: {
    dayName: string;
    date: string;
    amount: number;
  } | null;
  dailyAverage: number;
  status: 'within_budget' | 'elevated' | 'prudent';
  summaryTip: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function computeWeeklySummary(
  transactions: Transaction[],
  simDate: Date = new Date('2026-10-20T10:30:00+05:30')
): WeeklySummaryResult {
  // Current 7-day window: simDate - 6 days to simDate
  const currentWeekDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(simDate);
    d.setDate(d.getDate() - i);
    currentWeekDays.push(d.toISOString().substring(0, 10));
  }

  // Prior 7-day window
  const priorWeekDays: string[] = [];
  for (let i = 13; i >= 7; i--) {
    const d = new Date(simDate);
    d.setDate(d.getDate() - i);
    priorWeekDays.push(d.toISOString().substring(0, 10));
  }

  const currentWeekSet = new Set(currentWeekDays);
  const priorWeekSet = new Set(priorWeekDays);

  const currentWeekTx = transactions.filter(
    (t) => t.type === 'expense' && currentWeekSet.has(t.date)
  );
  const priorWeekTx = transactions.filter(
    (t) => t.type === 'expense' && priorWeekSet.has(t.date)
  );

  const currentWeekSpent = currentWeekTx.reduce((sum, t) => sum + t.amount, 0);
  const previousWeekSpent = priorWeekTx.reduce((sum, t) => sum + t.amount, 0);

  const changePercent = previousWeekSpent > 0
    ? Math.round(((currentWeekSpent - previousWeekSpent) / previousWeekSpent) * 100)
    : 0;
  const isSpendIncreased = currentWeekSpent > previousWeekSpent;

  // Largest expense in current week
  let largestExpense: WeeklySummaryResult['largestExpense'] = null;
  if (currentWeekTx.length > 0) {
    const sorted = [...currentWeekTx].sort((a, b) => b.amount - a.amount);
    largestExpense = {
      description: sorted[0].description,
      amount: sorted[0].amount,
      categoryKey: sorted[0].categoryKey,
      date: sorted[0].date,
    };
  }

  // Peak spend day in current week
  const daySpendMap = new Map<string, number>();
  currentWeekTx.forEach((t) => {
    daySpendMap.set(t.date, (daySpendMap.get(t.date) || 0) + t.amount);
  });

  let peakSpendDay: WeeklySummaryResult['peakSpendDay'] = null;
  let maxDaySpend = 0;
  daySpendMap.forEach((amount, date) => {
    if (amount > maxDaySpend) {
      maxDaySpend = amount;
      const dObj = new Date(`${date}T12:00:00`);
      peakSpendDay = {
        dayName: DAY_NAMES[dObj.getDay()],
        date,
        amount,
      };
    }
  });

  const dailyAverage = Math.round(currentWeekSpent / 7);

  let status: 'within_budget' | 'elevated' | 'prudent' = 'within_budget';
  let summaryTip = 'Spending is steady and within typical weekly bounds.';

  if (changePercent > 15) {
    status = 'elevated';
    summaryTip = `Spending is ${changePercent}% higher than last week. Consider slowing discretionary orders.`;
  } else if (changePercent < -10) {
    status = 'prudent';
    summaryTip = `Great discipline! Spending is ${Math.abs(changePercent)}% lower than last week.`;
  }

  const formatShortDate = (dStr: string) => {
    const parts = dStr.split('-');
    const m = MONTH_NAMES[parseInt(parts[1], 10) - 1];
    return `${m} ${parseInt(parts[2], 10)}`;
  };

  const currentWeekRange = `${formatShortDate(currentWeekDays[0])} – ${formatShortDate(currentWeekDays[currentWeekDays.length - 1])}`;
  const previousWeekRange = `${formatShortDate(priorWeekDays[0])} – ${formatShortDate(priorWeekDays[priorWeekDays.length - 1])}`;

  return {
    currentWeekRange,
    previousWeekRange,
    currentWeekSpent,
    previousWeekSpent,
    changePercent,
    isSpendIncreased,
    largestExpense,
    peakSpendDay,
    dailyAverage,
    status,
    summaryTip,
  };
}
