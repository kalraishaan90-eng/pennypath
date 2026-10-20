/**
 * Pure TypeScript Financial Engine.
 * 
 * All monetary values are represented as integer paise (1 Rupee = 100 paise).
 * Conversions to Rupees should only occur at the presentation/UI boundary.
 * 
 * Pure functions: No React, no DOM, no disk/network I/O.
 */

// ============================================================================
// Helper Utilities & Validation
// ============================================================================

/**
 * Normalizes an annual percentage or decimal rate to an annual decimal rate.
 * For example:
 * - 10 or 12 becomes 0.10 or 0.12 (percentage -> decimal)
 * - 0.10 or 0.12 remains 0.10 or 0.12
 * - 0 remains 0
 */
function normalizeRate(rate: number): number {
  if (rate > 1) {
    return rate / 100;
  }
  return rate;
}

/**
 * Ensures a numeric value is non-negative and finite.
 */
function assertNonNegative(value: number, fieldName: string): void {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number, got ${value}`);
  }
}

/**
 * Ensures a numeric tenure / count is a positive integer >= 1.
 */
function assertPositiveInt(value: number, fieldName: string): void {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value) || value < 1) {
    throw new Error(`${fieldName} must be an integer >= 1, got ${value}`);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface EmiInput {
  principal: number; // in paise
  annualRate: number; // decimal (0.10) or percentage (10)
  months: number; // loan tenure in months
}

export interface EmiResult {
  emi: number; // monthly installment in paise
  totalInterest: number; // total interest paid over tenure in paise
  totalPayable: number; // principal + totalInterest in paise
}

export interface AmortizationInput {
  principal: number; // in paise
  annualRate: number; // decimal (0.10) or percentage (10)
  months: number; // loan tenure in months
  extraPerMonth?: number; // optional prepayment in paise
}

export interface AmortizationRow {
  month: number;
  interest: number; // in paise
  principal: number; // in paise
  balance: number; // in paise
}

export interface PrepaymentInput {
  principal: number; // in paise
  annualRate: number; // decimal (0.10) or percentage (10)
  months: number; // original tenure in months
  extraPerMonth: number; // monthly prepayment in paise
}

export interface PrepaymentImpactResult {
  monthsSaved: number;
  interestSaved: number; // in paise
}

export interface CompoundInterestInput {
  principal: number; // in paise
  annualRate: number; // decimal (0.08) or percentage (8)
  years: number; // investment duration in years
  compoundsPerYear: number; // e.g. 1 (annual), 4 (quarterly), 12 (monthly)
}

export interface SipFutureValueInput {
  monthly: number; // monthly deposit in paise
  annualRate: number; // expected annual return rate (decimal or percentage)
  months: number; // investment tenure in months
}

export interface GoalMonthlySipInput {
  targetAmount: number; // desired future amount in paise
  annualRate: number; // expected annual return rate (decimal or percentage)
  months: number; // time horizon in months
  inflation?: number; // annual inflation rate (decimal or percentage)
}

export interface EmergencyFundTargetInput {
  avgMonthlyEssential: number; // essential monthly living expenses in paise
  mode?: 'student' | 'household' | 'earner' | string;
}

export interface EmergencyFundTargetResult {
  minMonths: number;
  maxMonths: number;
  minAmount: number; // in paise
  maxAmount: number; // in paise
}

export interface CategoryHistoryItem {
  category: string;
  amount: number;
  type?: 'need' | 'want' | 'goal' | 'buffer';
}

export interface BuildPlanInput {
  income: number; // in paise
  fixedObligations?: number; // in paise
  fixed?: number; // alias for fixedObligations
  fixedTotal?: number; // alias for fixedObligations
  savingsTarget: number; // in paise
  categoryHistory?: CategoryHistoryItem[];
  mode?: 'student' | 'household' | 'earner' | string;
  daysInMonth?: number;
}

export interface BudgetCap {
  category: string;
  amount: number; // in paise
  type: 'need' | 'want' | 'goal' | 'buffer';
  share: number; // normalized proportion 0..1
}

export interface PlanFix {
  type: 'lower_savings' | 'extend_goal' | 'trim_obligations' | 'raise_income' | string;
  description: string;
  effect: number; // numeric effect in paise or percentage
  [key: string]: unknown;
}

export interface BuildPlanResult {
  disposable: number; // in paise (can be negative)
  shortfall: number; // in paise (0 if disposable >= 0)
  variableBudget: number; // in paise (max(0, disposable))
  caps: BudgetCap[];
  fixes: PlanFix[];
  discretionaryTotal?: number;
  hasShortfall?: boolean;
  feasibility?: 'healthy' | 'tight' | 'shortfall';
  dailyDiscretionary?: number;
}

export interface DailySafeToSpendInput {
  variableBudget: number; // in paise
  variableSpent: number; // in paise
  daysLeft: number; // remaining days in month
}

export interface ProjectMonthEndInput {
  fixed: number; // fixed obligations in paise
  variableSpent: number; // variable spending to date in paise
  daysElapsed: number; // days elapsed in month
  daysInMonth: number; // total days in month
  income: number; // monthly income in paise
  savingsTarget: number; // monthly savings goal in paise
}

export interface MonthEndProjection {
  projectedVariable: number; // in paise
  projectedTotalExpenses: number; // in paise
  projectedSavings: number; // in paise (can be negative)
  projectedSurplus: number; // in paise vs savings target (can be negative)
  onTrackForSavings: boolean;
  dailyBurnRate: number; // in paise
}

export interface FinancialHealthScoreInput {
  savingsRate: number; // savings rate: decimal (0.20) or percentage (20)
  emergencyMonths: number; // months of living expenses saved
  debtToIncome: number; // debt-to-income ratio: decimal (0.30) or percentage (30)
  budgetAdherence: number; // budget adherence: decimal (0.90) or percentage (90)
}

export interface FinancialHealthScoreParts {
  savings: number; // 0..30
  emergency: number; // 0..25
  debt: number; // 0..25
  adherence: number; // 0..20
}

export interface FinancialHealthScoreResult {
  total: number; // 0..100
  parts: FinancialHealthScoreParts;
  tip: string;
}

export type RiskBand = 'conservative' | 'moderate' | 'aggressive' | 'balanced' | 'growth';

export interface RiskScoreResult {
  score: number; // 0..100
  band: RiskBand;
}

export interface AllocationInput {
  band: RiskBand | string;
  horizonYears: number;
  emergencyFundMonths: number;
}

export interface AssetAllocation {
  equity: number; // percentage (0..100)
  debt: number; // percentage (0..100)
  gold: number; // percentage (0..100)
  cash: number; // percentage (0..100)
}

export type AllocationResult = AssetAllocation | 'build emergency fund first';

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculates the Equated Monthly Installment (EMI), total interest, and total payable amount.
 * 
 * Formula:
 * - Monthly interest rate: r = annualRate / 12
 * - When r > 0:
 *     EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * - When r = 0:
 *     EMI = P / n
 * - Total Payable = EMI * n
 * - Total Interest = Total Payable - P
 * 
 * @param principal Loan principal amount in paise
 * @param annualRate Annual interest rate as percentage (10) or decimal (0.10)
 * @param months Total tenure in months (>= 1)
 * @returns {emi, totalInterest, totalPayable} in integer paise
 */
export function emi(
  inputOrPrincipal: EmiInput | number,
  annualRateArg?: number,
  monthsArg?: number
): EmiResult {
  let principal: number;
  let annualRate: number;
  let months: number;

  if (typeof inputOrPrincipal === 'object' && inputOrPrincipal !== null) {
    principal = inputOrPrincipal.principal;
    annualRate = inputOrPrincipal.annualRate;
    months = inputOrPrincipal.months;
  } else {
    principal = inputOrPrincipal;
    annualRate = annualRateArg ?? 0;
    months = monthsArg ?? 1;
  }

  assertNonNegative(principal, 'principal');
  assertNonNegative(annualRate, 'annualRate');
  assertPositiveInt(months, 'months');

  if (principal === 0) {
    return { emi: 0, totalInterest: 0, totalPayable: 0 };
  }

  const r = normalizeRate(annualRate) / 12;
  const n = months;

  if (r === 0) {
    const installment = Math.round(principal / n);
    return {
      emi: installment,
      totalInterest: 0,
      totalPayable: principal,
    };
  }

  const factor = Math.pow(1 + r, n);
  const rawEmi = (principal * r * factor) / (factor - 1);
  const calculatedEmi = Math.round(rawEmi);
  const totalPayable = calculatedEmi * n;
  const totalInterest = Math.max(0, totalPayable - principal);

  return {
    emi: calculatedEmi,
    totalInterest,
    totalPayable,
  };
}

/**
 * Generates the complete month-by-month loan amortization schedule.
 * 
 * Formula for each month m:
 * - Monthly interest rate: r = annualRate / 12
 * - Interest_m = round(Balance_{m-1} * r)
 * - Scheduled_EMI = emi({principal, annualRate, months}).emi
 * - Total Payment = Scheduled_EMI + extraPerMonth
 * - If Balance_{m-1} + Interest_m <= Total Payment or month === months:
 *     Principal_m = Balance_{m-1}
 *     Balance_m = 0
 *   Else:
 *     Principal_m = Total Payment - Interest_m
 *     Balance_m = Balance_{m-1} - Principal_m
 * 
 * @param input Loan details and optional extra monthly prepayment in paise
 * @returns Array of amortization rows {month, interest, principal, balance}
 */
export function amortization(
  inputOrPrincipal: AmortizationInput | number,
  annualRateArg?: number,
  monthsArg?: number,
  extraArg?: number
): AmortizationRow[] {
  let principal: number;
  let annualRate: number;
  let months: number;
  let extraPerMonth = 0;

  if (typeof inputOrPrincipal === 'object' && inputOrPrincipal !== null) {
    principal = inputOrPrincipal.principal;
    annualRate = inputOrPrincipal.annualRate;
    months = inputOrPrincipal.months;
    extraPerMonth = inputOrPrincipal.extraPerMonth ?? 0;
  } else {
    principal = inputOrPrincipal;
    annualRate = annualRateArg ?? 0;
    months = monthsArg ?? 1;
    extraPerMonth = extraArg ?? 0;
  }

  assertNonNegative(principal, 'principal');
  assertNonNegative(annualRate, 'annualRate');
  assertPositiveInt(months, 'months');
  assertNonNegative(extraPerMonth, 'extraPerMonth');

  const rows: AmortizationRow[] = [];
  if (principal === 0) {
    return rows;
  }

  const r = normalizeRate(annualRate) / 12;
  const standardEmi = emi({ principal, annualRate, months }).emi;
  let currentBalance = principal;

  for (let month = 1; month <= months * 3; month++) {
    const interest = r === 0 ? 0 : Math.round(currentBalance * r);
    const scheduledPayment = standardEmi + extraPerMonth;

    if (currentBalance + interest <= scheduledPayment || (month === months && extraPerMonth === 0)) {
      // Final payoff
      const principalPayment = currentBalance;
      currentBalance = 0;
      rows.push({
        month,
        interest,
        principal: principalPayment,
        balance: 0,
      });
      break;
    } else {
      const principalPayment = Math.max(0, scheduledPayment - interest);
      const actualPrincipal = Math.min(currentBalance, principalPayment);
      currentBalance -= actualPrincipal;

      rows.push({
        month,
        interest,
        principal: actualPrincipal,
        balance: Math.max(0, currentBalance),
      });

      if (currentBalance <= 0) {
        break;
      }
    }
  }

  return rows;
}

/**
 * Calculates the impact of making an extra monthly prepayment towards a loan.
 * 
 * Formula:
 * - Base interest = sum(interest) of standard schedule
 * - Prepayment interest = sum(interest) of schedule with extraPerMonth
 * - monthsSaved = baseSchedule.length - prepaySchedule.length
 * - interestSaved = max(0, Base interest - Prepayment interest)
 * 
 * @param principal Loan principal in paise
 * @param annualRate Annual interest rate
 * @param months Original tenure in months
 * @param extraPerMonth Extra monthly prepayment in paise
 * @returns {monthsSaved, interestSaved}
 */
export function prepaymentImpact(
  inputOrPrincipal: PrepaymentInput | number,
  annualRateArg?: number,
  monthsArg?: number,
  extraArg?: number
): PrepaymentImpactResult {
  let principal: number;
  let annualRate: number;
  let months: number;
  let extraPerMonth: number;

  if (typeof inputOrPrincipal === 'object' && inputOrPrincipal !== null) {
    principal = inputOrPrincipal.principal;
    annualRate = inputOrPrincipal.annualRate;
    months = inputOrPrincipal.months;
    extraPerMonth = inputOrPrincipal.extraPerMonth;
  } else {
    principal = inputOrPrincipal;
    annualRate = annualRateArg ?? 0;
    months = monthsArg ?? 1;
    extraPerMonth = extraArg ?? 0;
  }

  assertNonNegative(principal, 'principal');
  assertNonNegative(annualRate, 'annualRate');
  assertPositiveInt(months, 'months');
  assertNonNegative(extraPerMonth, 'extraPerMonth');

  if (extraPerMonth <= 0 || principal === 0) {
    return { monthsSaved: 0, interestSaved: 0 };
  }

  const baseSchedule = amortization({ principal, annualRate, months, extraPerMonth: 0 });
  const prepaySchedule = amortization({ principal, annualRate, months, extraPerMonth });

  const baseTotalInterest = baseSchedule.reduce((sum, row) => sum + row.interest, 0);
  const prepayTotalInterest = prepaySchedule.reduce((sum, row) => sum + row.interest, 0);

  const monthsSaved = Math.max(0, baseSchedule.length - prepaySchedule.length);
  const interestSaved = Math.max(0, baseTotalInterest - prepayTotalInterest);

  return {
    monthsSaved,
    interestSaved,
  };
}

/**
 * Calculates compound interest future value.
 * 
 * Formula:
 * A = P * (1 + r / n)^(n * t)
 * 
 * Where:
 * - P = principal in paise
 * - r = annualRate normalized to decimal
 * - n = compoundsPerYear (e.g. 1 for yearly, 4 for quarterly, 12 for monthly)
 * - t = years
 * 
 * @returns Final compounded amount A in integer paise
 */
export function compoundInterest(
  inputOrPrincipal: CompoundInterestInput | number,
  annualRateArg?: number,
  yearsArg?: number,
  compoundsPerYearArg?: number
): number {
  let principal: number;
  let annualRate: number;
  let years: number;
  let compoundsPerYear: number;

  if (typeof inputOrPrincipal === 'object' && inputOrPrincipal !== null) {
    principal = inputOrPrincipal.principal;
    annualRate = inputOrPrincipal.annualRate;
    years = inputOrPrincipal.years;
    compoundsPerYear = inputOrPrincipal.compoundsPerYear;
  } else {
    principal = inputOrPrincipal;
    annualRate = annualRateArg ?? 0;
    years = yearsArg ?? 0;
    compoundsPerYear = compoundsPerYearArg ?? 1;
  }

  assertNonNegative(principal, 'principal');
  assertNonNegative(annualRate, 'annualRate');
  assertNonNegative(years, 'years');
  assertPositiveInt(compoundsPerYear, 'compoundsPerYear');

  if (principal === 0 || years === 0) {
    return principal;
  }

  const r = normalizeRate(annualRate);
  const n = compoundsPerYear;
  const t = years;

  if (r === 0) {
    return principal;
  }

  const amount = principal * Math.pow(1 + r / n, n * t);
  return Math.round(amount);
}

/**
 * Calculates the Future Value of a Systematic Investment Plan (SIP) using the Annuity-Due formula
 * (installments invested at the beginning of each month).
 * 
 * Formula:
 * - Monthly return rate: i = annualRate / 12
 * - When i > 0:
 *     FV = P * [ ((1 + i)^n - 1) / i ] * (1 + i)
 * - When i = 0:
 *     FV = P * n
 * 
 * Where:
 * - P = monthly investment in paise
 * - n = months
 * 
 * @returns Total accumulated Future Value in integer paise
 */
export function sipFutureValue(
  inputOrMonthly: SipFutureValueInput | number,
  annualRateArg?: number,
  monthsArg?: number
): number {
  let monthly: number;
  let annualRate: number;
  let months: number;

  if (typeof inputOrMonthly === 'object' && inputOrMonthly !== null) {
    monthly = inputOrMonthly.monthly;
    annualRate = inputOrMonthly.annualRate;
    months = inputOrMonthly.months;
  } else {
    monthly = inputOrMonthly;
    annualRate = annualRateArg ?? 0;
    months = monthsArg ?? 1;
  }

  assertNonNegative(monthly, 'monthly');
  assertNonNegative(annualRate, 'annualRate');
  assertPositiveInt(months, 'months');

  if (monthly === 0) {
    return 0;
  }

  const i = normalizeRate(annualRate) / 12;
  const n = months;

  if (i === 0) {
    return monthly * n;
  }

  const factor = Math.pow(1 + i, n);
  const fv = monthly * ((factor - 1) / i) * (1 + i);
  return Math.round(fv);
}

/**
 * Calculates required monthly SIP contribution to reach a future financial goal,
 * with optional inflation adjustment.
 * 
 * Formula:
 * 1. If inflation > 0:
 *      years = months / 12
 *      FV_adjusted = targetAmount * (1 + inflation)^years
 *    Else:
 *      FV_adjusted = targetAmount
 * 2. Monthly return rate: i = annualRate / 12
 * 3. Annuity-Due SIP required:
 *    - When i > 0:
 *        P = FV_adjusted / [ (((1 + i)^n - 1) / i) * (1 + i) ]
 *    - When i = 0:
 *        P = FV_adjusted / n
 * 
 * @returns Monthly SIP needed in integer paise
 */
export function goalMonthlySip(
  inputOrTarget: GoalMonthlySipInput | number,
  annualRateArg?: number,
  monthsArg?: number,
  inflationArg?: number
): number {
  let targetAmount: number;
  let annualRate: number;
  let months: number;
  let inflation: number | undefined;

  if (typeof inputOrTarget === 'object' && inputOrTarget !== null) {
    targetAmount = inputOrTarget.targetAmount;
    annualRate = inputOrTarget.annualRate;
    months = inputOrTarget.months;
    inflation = inputOrTarget.inflation;
  } else {
    targetAmount = inputOrTarget;
    annualRate = annualRateArg ?? 0;
    months = monthsArg ?? 1;
    inflation = inflationArg;
  }

  assertNonNegative(targetAmount, 'targetAmount');
  assertNonNegative(annualRate, 'annualRate');
  assertPositiveInt(months, 'months');
  if (inflation !== undefined) {
    assertNonNegative(inflation, 'inflation');
  }

  if (targetAmount === 0) {
    return 0;
  }

  let adjustedTarget = targetAmount;
  if (inflation && inflation > 0) {
    const infRate = normalizeRate(inflation);
    const years = months / 12;
    adjustedTarget = targetAmount * Math.pow(1 + infRate, years);
  }

  const i = normalizeRate(annualRate) / 12;
  const n = months;

  if (i === 0) {
    return Math.round(adjustedTarget / n);
  }

  const factor = Math.pow(1 + i, n);
  const annuityFactor = ((factor - 1) / i) * (1 + i);
  const monthly = adjustedTarget / annuityFactor;

  return Math.round(monthly);
}

/**
 * Computes recommended emergency fund targets (months and total amount in paise)
 * based on user persona mode and essential monthly expenses.
 * 
 * Formula:
 * - minAmount = round(avgMonthlyEssential * minMonths)
 * - maxAmount = round(avgMonthlyEssential * maxMonths)
 * 
 * Persona targets:
 * - student: 3 to 6 months
 * - household: 6 to 12 months
 * - earner / default: 3 to 6 months
 * 
 * @returns {minMonths, maxMonths, minAmount, maxAmount}
 */
export function emergencyFundTarget(
  inputOrEssential: EmergencyFundTargetInput | number,
  modeArg?: string
): EmergencyFundTargetResult {
  let avgMonthlyEssential: number;
  let mode: string | undefined;

  if (typeof inputOrEssential === 'object' && inputOrEssential !== null) {
    avgMonthlyEssential = inputOrEssential.avgMonthlyEssential;
    mode = inputOrEssential.mode;
  } else {
    avgMonthlyEssential = inputOrEssential;
    mode = modeArg;
  }

  assertNonNegative(avgMonthlyEssential, 'avgMonthlyEssential');

  let minMonths = 3;
  let maxMonths = 6;

  const normalizedMode = (mode || '').toLowerCase();
  if (normalizedMode === 'household') {
    minMonths = 6;
    maxMonths = 12;
  } else if (normalizedMode === 'student') {
    minMonths = 3;
    maxMonths = 6;
  } else {
    minMonths = 3;
    maxMonths = 6;
  }

  return {
    minMonths,
    maxMonths,
    minAmount: Math.round(avgMonthlyEssential * minMonths),
    maxAmount: Math.round(avgMonthlyEssential * maxMonths),
  };
}

/**
 * Mode category defaults for variable budget planning.
 */
const DEFAULT_VARIABLE_CATEGORIES: Record<string, Array<{ category: string; share: number; type: 'need' | 'want' }>> = {
  student: [
    { category: 'Tuition & Study Materials', share: 0.35, type: 'need' },
    { category: 'Food & Mess', share: 0.30, type: 'need' },
    { category: 'Transport', share: 0.15, type: 'need' },
    { category: 'Canteen & Social', share: 0.20, type: 'want' },
  ],
  household: [
    { category: 'Groceries & Provisions', share: 0.40, type: 'need' },
    { category: 'Utilities & Household Bills', share: 0.20, type: 'need' },
    { category: 'Children Education & Care', share: 0.20, type: 'need' },
    { category: 'Household Buffer', share: 0.10, type: 'need' },
    { category: 'Family Outings & Dining', share: 0.10, type: 'want' },
  ],
  earner: [
    { category: 'Rent & PG', share: 0.35, type: 'need' },
    { category: 'Food & Groceries', share: 0.25, type: 'need' },
    { category: 'Commute & Travel', share: 0.15, type: 'need' },
    { category: 'Weekend Hangouts', share: 0.15, type: 'want' },
    { category: 'Gadgets & Shopping', share: 0.10, type: 'want' },
  ],
};

/**
 * Builds a comprehensive monthly budget plan with category caps and corrective fixes.
 * 
 * Rules:
 * 1. Disposable D = income - fixedObligations - savingsTarget
 * 2. If D < 0:
 *      shortfall = -D
 *      variableBudget = 0
 *      fixes[] contains:
 *        (a) lower savings target to max(0, income - fixedObligations)
 *        (b) extend goal date by required tenure extension
 *        (c) trim fixed obligations by shortfall
 *        (d) raise monthly income by shortfall
 *    Else:
 *      shortfall = 0
 *      variableBudget = D
 *      fixes = []
 * 3. Caps split by 3-month category share (or mode defaults):
 *      weight = need: 1.0, want: 0.6
 *      renormalize so caps sum exactly to variableBudget (distributing rounding paise via largest remainder).
 * 
 * @returns {disposable, shortfall, variableBudget, caps, fixes}
 */
export function buildPlan(input: BuildPlanInput): BuildPlanResult {
  const {
    income,
    savingsTarget,
    categoryHistory,
    mode = 'earner',
    daysInMonth = 30,
  } = input;

  const fixed = input.fixedObligations ?? input.fixed ?? input.fixedTotal ?? 0;

  assertNonNegative(income, 'income');
  assertNonNegative(fixed, 'fixedObligations');
  assertNonNegative(savingsTarget, 'savingsTarget');
  assertPositiveInt(daysInMonth, 'daysInMonth');

  const disposable = income - fixed - savingsTarget;
  const shortfall = disposable < 0 ? -disposable : 0;
  const variableBudget = Math.max(0, disposable);

  const fixes: PlanFix[] = [];
  if (shortfall > 0) {
    const feasibleSavings = Math.max(0, income - fixed);

    const formatVal = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

    fixes.push({
      type: 'lower_savings',
      description: `Lower savings target to ${formatVal(feasibleSavings)}`,
      effect: feasibleSavings,
      suggestedValue: feasibleSavings,
      freedAmount: savingsTarget - feasibleSavings,
    });

    const tenureMultiplier = feasibleSavings > 0
      ? Math.round((savingsTarget / feasibleSavings) * 10) / 10
      : 2.0;

    fixes.push({
      type: 'extend_goal',
      description: `Extend goal horizon by ~${Math.round((tenureMultiplier - 1) * 100)}% to offset reduced monthly savings`,
      effect: tenureMultiplier,
      suggestedMultiplier: tenureMultiplier,
    });

    fixes.push({
      type: 'trim_obligations',
      description: `Trim fixed obligations by ${formatVal(shortfall)}`,
      effect: shortfall,
      freedAmount: shortfall,
      suggestedValue: Math.max(0, fixed - shortfall),
    });

    fixes.push({
      type: 'raise_income',
      description: `Raise monthly income by ${formatVal(shortfall)}`,
      effect: shortfall,
      neededAmount: shortfall,
      suggestedValue: income + shortfall,
    });
  }

  // Determine categories to allocate
  type BaseCategory = { category: string; baseAmount: number; type: 'need' | 'want' | 'goal' | 'buffer' };
  let baseCategories: BaseCategory[] = [];

  if (categoryHistory && categoryHistory.length > 0) {
    baseCategories = categoryHistory.map(item => ({
      category: item.category,
      baseAmount: Math.max(0, item.amount),
      type: item.type || 'need',
    }));
  } else {
    const personaDefaults = DEFAULT_VARIABLE_CATEGORIES[mode] || DEFAULT_VARIABLE_CATEGORIES.earner;
    baseCategories = personaDefaults.map(p => ({
      category: p.category,
      baseAmount: p.share * 10000,
      type: p.type,
    }));
  }

  // Weight needs at 1.0, wants at 0.6
  const weighted = baseCategories.map(cat => {
    const weight = cat.type === 'want' ? 0.6 : 1.0;
    return {
      category: cat.category,
      type: cat.type,
      rawWeight: (cat.baseAmount || 1) * weight,
    };
  });

  const totalRawWeight = weighted.reduce((sum, w) => sum + w.rawWeight, 0);

  // Normalize shares and allocate budget in paise
  const caps: BudgetCap[] = [];
  if (variableBudget === 0 || totalRawWeight === 0) {
    for (const item of weighted) {
      caps.push({
        category: item.category,
        amount: 0,
        type: item.type,
        share: totalRawWeight > 0 ? item.rawWeight / totalRawWeight : 1 / weighted.length,
      });
    }
  } else {
    // Largest remainder method (Hare-Niemeyer) to guarantee exact integer paise summation
    interface AllocationItem {
      category: string;
      type: 'need' | 'want' | 'goal' | 'buffer';
      share: number;
      ideal: number;
      floorAmount: number;
      remainder: number;
      finalAmount: number;
    }

    const items: AllocationItem[] = weighted.map(item => {
      const share = item.rawWeight / totalRawWeight;
      const ideal = variableBudget * share;
      const floorAmount = Math.floor(ideal);
      return {
        category: item.category,
        type: item.type,
        share,
        ideal,
        floorAmount,
        remainder: ideal - floorAmount,
        finalAmount: floorAmount,
      };
    });

    const currentSum = items.reduce((s, it) => s + it.floorAmount, 0);
    const leftoverPaise = variableBudget - currentSum;

    // Distribute leftover paise to items with largest fractional remainder
    const sortedIndices = [...items.keys()].sort((a, b) => items[b].remainder - items[a].remainder);
    for (let i = 0; i < leftoverPaise; i++) {
      items[sortedIndices[i % sortedIndices.length]].finalAmount += 1;
    }

    for (const it of items) {
      caps.push({
        category: it.category,
        amount: it.finalAmount,
        type: it.type,
        share: it.share,
      });
    }
  }

  return {
    disposable,
    shortfall,
    variableBudget,
    caps,
    fixes,
    discretionaryTotal: disposable,
    hasShortfall: shortfall > 0,
    feasibility: shortfall > 0 ? 'shortfall' : 'healthy',
    dailyDiscretionary: daysInMonth > 0 ? Math.floor(variableBudget / daysInMonth) : 0,
  };
}

/**
 * Calculates the daily safe-to-spend allowance for the remainder of the month.
 * 
 * Formula:
 * - remaining = max(0, variableBudget - variableSpent)
 * - If daysLeft <= 0: dailySafe = 0
 * - Else: dailySafe = floor(remaining / daysLeft)
 * 
 * @param variableBudget Monthly variable budget in paise
 * @param variableSpent Total variable spending to date in paise
 * @param daysLeft Days remaining in the billing cycle / month (>= 0)
 * @returns Safe daily spending allowance in integer paise
 */
export function dailySafeToSpend(
  inputOrBudget: DailySafeToSpendInput | number,
  spentArg?: number,
  daysLeftArg?: number
): number {
  let variableBudget: number;
  let variableSpent: number;
  let daysLeft: number;

  if (typeof inputOrBudget === 'object' && inputOrBudget !== null) {
    variableBudget = inputOrBudget.variableBudget;
    variableSpent = inputOrBudget.variableSpent;
    daysLeft = inputOrBudget.daysLeft;
  } else {
    variableBudget = inputOrBudget;
    variableSpent = spentArg ?? 0;
    daysLeft = daysLeftArg ?? 0;
  }

  assertNonNegative(variableBudget, 'variableBudget');
  assertNonNegative(variableSpent, 'variableSpent');
  assertNonNegative(daysLeft, 'daysLeft');

  if (daysLeft <= 0) {
    return 0;
  }

  const remaining = variableBudget - variableSpent;
  if (remaining <= 0) {
    return 0;
  }

  return Math.floor(remaining / daysLeft);
}

/**
 * Projects month-end spending, savings, and goal surplus based on burn rate to date.
 * 
 * Formula:
 * - dailyBurnRate = daysElapsed > 0 ? (variableSpent / daysElapsed) : 0
 * - projectedVariable = round(dailyBurnRate * daysInMonth)
 * - projectedTotalExpenses = fixed + projectedVariable
 * - projectedSavings = income - projectedTotalExpenses
 * - projectedSurplus = projectedSavings - savingsTarget
 * - onTrackForSavings = projectedSavings >= savingsTarget
 * 
 * @returns {projectedVariable, projectedTotalExpenses, projectedSavings, projectedSurplus, onTrackForSavings, dailyBurnRate}
 */
export function projectMonthEnd(
  inputOrFixed: ProjectMonthEndInput | number,
  spentArg?: number,
  elapsedArg?: number,
  daysInMonthArg?: number,
  incomeArg?: number,
  savingsTargetArg?: number
): MonthEndProjection {
  let fixed: number;
  let variableSpent: number;
  let daysElapsed: number;
  let daysInMonth: number;
  let income: number;
  let savingsTarget: number;

  if (typeof inputOrFixed === 'object' && inputOrFixed !== null) {
    fixed = inputOrFixed.fixed;
    variableSpent = inputOrFixed.variableSpent;
    daysElapsed = inputOrFixed.daysElapsed;
    daysInMonth = inputOrFixed.daysInMonth;
    income = inputOrFixed.income;
    savingsTarget = inputOrFixed.savingsTarget;
  } else {
    fixed = inputOrFixed;
    variableSpent = spentArg ?? 0;
    daysElapsed = elapsedArg ?? 0;
    daysInMonth = daysInMonthArg ?? 30;
    income = incomeArg ?? 0;
    savingsTarget = savingsTargetArg ?? 0;
  }

  assertNonNegative(fixed, 'fixed');
  assertNonNegative(variableSpent, 'variableSpent');
  assertNonNegative(daysElapsed, 'daysElapsed');
  assertPositiveInt(daysInMonth, 'daysInMonth');
  assertNonNegative(income, 'income');
  assertNonNegative(savingsTarget, 'savingsTarget');

  const dailyBurn = daysElapsed > 0 ? variableSpent / daysElapsed : 0;
  const projectedVariable = Math.round(dailyBurn * daysInMonth);
  const projectedTotalExpenses = fixed + projectedVariable;
  const projectedSavings = income - projectedTotalExpenses;
  const projectedSurplus = projectedSavings - savingsTarget;
  const onTrackForSavings = projectedSavings >= savingsTarget;

  return {
    projectedVariable,
    projectedTotalExpenses,
    projectedSavings,
    projectedSurplus,
    onTrackForSavings,
    dailyBurnRate: Math.round(dailyBurn),
  };
}

/**
 * Evaluates overall financial health on a 100-point composite rubric.
 * 
 * Rubric components:
 * 1. Savings Rate (max 30 pts):
 *      20% savings rate achieves full 30 pts.
 *      score = min(30, max(0, round((normSavingsRate / 0.20) * 30)))
 * 2. Emergency Fund (max 25 pts):
 *      6 months of living expenses achieves full 25 pts.
 *      score = min(25, max(0, round((emergencyMonths / 6) * 25)))
 * 3. Debt-to-Income (max 25 pts):
 *      DTI <= 20% gives 25 pts; DTI >= 50% gives 0 pts; linear in between.
 *      score = round(25 * (1 - (normDTI - 0.20) / 0.30))
 * 4. Budget Adherence (max 20 pts):
 *      Adherence >= 100% gives 20 pts.
 *      score = min(20, max(0, round(normAdherence * 20)))
 * 
 * Total = savings + emergency + debt + adherence
 * Tip: Actionable suggestion focused on the weakest scoring pillar.
 * 
 * @returns {total, parts:{savings, emergency, debt, adherence}, tip}
 */
export function financialHealthScore(
  inputOrSavings: FinancialHealthScoreInput | number,
  emergencyMonthsArg?: number,
  debtToIncomeArg?: number,
  budgetAdherenceArg?: number
): FinancialHealthScoreResult {
  let savingsRate: number;
  let emergencyMonths: number;
  let debtToIncome: number;
  let budgetAdherence: number;

  if (typeof inputOrSavings === 'object' && inputOrSavings !== null) {
    savingsRate = inputOrSavings.savingsRate;
    emergencyMonths = inputOrSavings.emergencyMonths;
    debtToIncome = inputOrSavings.debtToIncome;
    budgetAdherence = inputOrSavings.budgetAdherence;
  } else {
    savingsRate = inputOrSavings;
    emergencyMonths = emergencyMonthsArg ?? 0;
    debtToIncome = debtToIncomeArg ?? 0;
    budgetAdherence = budgetAdherenceArg ?? 0;
  }

  assertNonNegative(savingsRate, 'savingsRate');
  assertNonNegative(emergencyMonths, 'emergencyMonths');
  assertNonNegative(debtToIncome, 'debtToIncome');
  assertNonNegative(budgetAdherence, 'budgetAdherence');

  const normSavings = normalizeRate(savingsRate);
  const normDTI = normalizeRate(debtToIncome);
  const normAdh = normalizeRate(budgetAdherence);

  // 1. Savings (max 30)
  const savingsScore = Math.min(30, Math.max(0, Math.round((normSavings / 0.20) * 30)));

  // 2. Emergency fund (max 25)
  const emergencyScore = Math.min(25, Math.max(0, Math.round((emergencyMonths / 6) * 25)));

  // 3. Debt-to-Income (max 25)
  let debtScore = 25;
  if (normDTI > 0.50) {
    debtScore = 0;
  } else if (normDTI > 0.20) {
    debtScore = Math.round(25 * (1 - (normDTI - 0.20) / 0.30));
  }

  // 4. Budget adherence (max 20)
  const adherenceScore = Math.min(20, Math.max(0, Math.round(normAdh * 20)));

  const total = savingsScore + emergencyScore + debtScore + adherenceScore;

  // Determine most impactful tip
  const ratios = [
    { key: 'emergency', ratio: emergencyScore / 25, tip: 'Build an emergency fund covering at least 3-6 months of living expenses.' },
    { key: 'debt', ratio: debtScore / 25, tip: 'Prioritize paying down existing loans to bring your debt-to-income ratio below 35%.' },
    { key: 'savings', ratio: savingsScore / 30, tip: 'Increase your monthly savings rate towards the recommended 20% benchmark.' },
    { key: 'adherence', ratio: adherenceScore / 20, tip: 'Track variable expenses weekly to stay strictly within your category budget caps.' },
  ];

  let tip: string;
  if (total >= 85) {
    tip = 'Excellent financial health! Maintain your emergency buffer and stay consistent with your SIPs.';
  } else if (emergencyMonths < 1) {
    tip = 'Build an emergency fund covering at least 3-6 months of living expenses.';
  } else {
    ratios.sort((a, b) => a.ratio - b.ratio);
    tip = ratios[0].tip;
  }

  return {
    total,
    parts: {
      savings: savingsScore,
      emergency: emergencyScore,
      debt: debtScore,
      adherence: adherenceScore,
    },
    tip,
  };
}

/**
 * Calculates an investment risk score and band from answers to a 6-question questionnaire.
 * 
 * Formula:
 * - Each question is scored on a standard 1 to 5 scale (minimum raw score 6, maximum 30).
 * - Normalized score (0 to 100):
 *     score = round(((sum(answers) - 6) / 24) * 100)
 * - Band thresholds:
 *     score <= 35: conservative
 *     35 < score <= 70: moderate
 *     score > 70: aggressive
 * 
 * @param answers Array of exactly 6 numeric answers (ratings 1 to 5)
 * @returns {score, band}
 */
export function riskScore(answers: number[]): RiskScoreResult {
  if (!Array.isArray(answers) || answers.length !== 6) {
    throw new Error(`Expected exactly 6 answers for risk assessment, received ${answers?.length ?? 0}`);
  }

  for (let i = 0; i < answers.length; i++) {
    assertNonNegative(answers[i], `answers[${i}]`);
  }

  const rawSum = answers.reduce((sum, val) => sum + val, 0);

  // If inputs are on 1-5 scale
  let score: number;
  if (rawSum <= 30) {
    // 1-5 scale mapping 6..30 to 0..100
    const clampedSum = Math.max(6, Math.min(30, rawSum));
    score = Math.round(((clampedSum - 6) / 24) * 100);
  } else {
    // Scaled directly
    score = Math.min(100, Math.round((rawSum / (answers.length * 20)) * 100));
  }

  let band: RiskBand = 'moderate';
  if (score <= 35) {
    band = 'conservative';
  } else if (score > 70) {
    band = 'aggressive';
  }

  return {
    score,
    band,
  };
}

/**
 * Suggests an illustrative asset allocation across Equity, Debt, Gold, and Cash.
 * 
 * Rule:
 * - If emergencyFundMonths < 1:
 *     return only "build emergency fund first"
 * - Otherwise:
 *     returns illustrative bands based on risk profile and investment time horizon.
 * 
 * @param band Risk tolerance band ('conservative', 'moderate', 'aggressive')
 * @param horizonYears Planned investment horizon in years
 * @param emergencyFundMonths Number of months of essential expenses currently saved
 * @returns AssetAllocation ({equity, debt, gold, cash}) or "build emergency fund first"
 */
export function allocationFor(
  inputOrBand: AllocationInput | RiskBand | string,
  horizonArg?: number,
  emergencyMonthsArg?: number
): AllocationResult {
  let band: string;
  let horizonYears: number;
  let emergencyFundMonths: number;

  if (typeof inputOrBand === 'object' && inputOrBand !== null) {
    band = inputOrBand.band;
    horizonYears = inputOrBand.horizonYears;
    emergencyFundMonths = inputOrBand.emergencyFundMonths;
  } else {
    band = inputOrBand;
    horizonYears = horizonArg ?? 5;
    emergencyFundMonths = emergencyMonthsArg ?? 6;
  }

  assertNonNegative(horizonYears, 'horizonYears');
  assertNonNegative(emergencyFundMonths, 'emergencyFundMonths');

  if (emergencyFundMonths < 1) {
    return 'build emergency fund first';
  }

  const normalizedBand = (band || '').toLowerCase();

  if (normalizedBand === 'conservative') {
    if (horizonYears < 3) {
      return { equity: 0, debt: 60, gold: 10, cash: 30 };
    } else if (horizonYears <= 7) {
      return { equity: 20, debt: 60, gold: 10, cash: 10 };
    } else {
      return { equity: 35, debt: 50, gold: 10, cash: 5 };
    }
  }

  if (normalizedBand === 'aggressive' || normalizedBand === 'growth') {
    if (horizonYears < 3) {
      return { equity: 25, debt: 55, gold: 10, cash: 10 };
    } else if (horizonYears <= 7) {
      return { equity: 60, debt: 25, gold: 10, cash: 5 };
    } else {
      return { equity: 75, debt: 15, gold: 5, cash: 5 };
    }
  }

  // Default: moderate
  if (horizonYears < 3) {
    return { equity: 15, debt: 60, gold: 10, cash: 15 };
  } else if (horizonYears <= 7) {
    return { equity: 45, debt: 35, gold: 10, cash: 10 };
  } else {
    return { equity: 65, debt: 25, gold: 5, cash: 5 };
  }
}

// ============================================================================
// Plan Screen Rebalancing, Explanations & Payoff Engine Functions
// ============================================================================

export interface RebalanceCapItem {
  category: string;
  amount: number;
  type: 'need' | 'want' | 'goal' | 'buffer';
  share?: number;
  locked?: boolean;
}

export interface RebalanceCapsInput {
  caps: RebalanceCapItem[];
  targetIndex: number;
  newAmount: number;
  totalBudget: number;
}

/**
 * Rebalances category caps proportionally when any slider is adjusted.
 * 
 * Invariants:
 * 1. Total sum of all caps ALWAYS equals totalBudget exactly.
 * 2. Locked categories retain their exact amounts.
 * 3. Modified category is clamped between 0 and [totalBudget - sum(otherLockedCaps)].
 * 4. Remainder is distributed proportionally across other unlocked categories.
 * 5. Hare-Niemeyer / Largest Remainder distribution ensures integer precision with zero drift.
 */
export function rebalanceCaps(input: RebalanceCapsInput): RebalanceCapItem[] {
  const { caps, targetIndex, newAmount, totalBudget } = input;
  if (!caps || caps.length === 0) return [];
  if (totalBudget <= 0) {
    return caps.map((c) => ({ ...c, amount: 0, share: 0 }));
  }

  const result: RebalanceCapItem[] = caps.map((c) => ({ ...c }));
  const target = result[targetIndex];
  if (!target) return result;

  // 1. Other locked caps
  const otherLockedCaps = result.filter((_, idx) => idx !== targetIndex && _.locked);
  const otherLockedSum = otherLockedCaps.reduce((s, c) => s + Math.max(0, c.amount), 0);

  // 2. Unlocked indices excluding target
  const unlockedIndices = result
    .map((c, idx) => ({ idx, cap: c }))
    .filter(({ idx, cap }) => idx !== targetIndex && !cap.locked)
    .map(({ idx }) => idx);

  // 3. Available budget for target + unlocked categories
  const budgetForTargetAndUnlocked = Math.max(0, totalBudget - otherLockedSum);

  // If no unlocked caps exist to absorb rebalancing, target takes entire remainder
  if (unlockedIndices.length === 0) {
    target.amount = budgetForTargetAndUnlocked;
    return result.map((c) => ({
      ...c,
      share: totalBudget > 0 ? c.amount / totalBudget : 0,
    }));
  }

  // Desired target amount clamped
  const clampedTarget = Math.max(0, Math.min(Math.round(newAmount), budgetForTargetAndUnlocked));
  target.amount = clampedTarget;

  // 4. Remaining budget for other unlocked categories
  const remainingForUnlocked = budgetForTargetAndUnlocked - clampedTarget;

  if (remainingForUnlocked === 0) {
    for (const idx of unlockedIndices) {
      result[idx].amount = 0;
    }
  } else {
    const currentUnlockedSum = unlockedIndices.reduce((s, idx) => s + Math.max(0, result[idx].amount), 0);

    interface RemainderItem {
      idx: number;
      ideal: number;
      floorAmount: number;
      remainder: number;
    }

    const items: RemainderItem[] = unlockedIndices.map((idx) => {
      const weight = currentUnlockedSum > 0
        ? result[idx].amount / currentUnlockedSum
        : 1 / unlockedIndices.length;
      const ideal = remainingForUnlocked * weight;
      const floorAmount = Math.floor(ideal);
      return {
        idx,
        ideal,
        floorAmount,
        remainder: ideal - floorAmount,
      };
    });

    const sumFloor = items.reduce((s, it) => s + it.floorAmount, 0);
    const leftover = remainingForUnlocked - sumFloor;

    items.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < leftover; i++) {
      items[i % items.length].floorAmount += 1;
    }

    for (const it of items) {
      result[it.idx].amount = it.floorAmount;
    }
  }

  // Guard against any 1-unit rounding drift
  const currentSum = result.reduce((s, c) => s + c.amount, 0);
  if (currentSum !== totalBudget && unlockedIndices.length > 0) {
    result[unlockedIndices[0]].amount += totalBudget - currentSum;
  }

  return result.map((c) => ({
    ...c,
    share: totalBudget > 0 ? Math.round((c.amount / totalBudget) * 1000) / 1000 : 0,
  }));
}

export interface EmiPayoffInfo {
  remainingMonths: number;
  payoffDate: string;
  payoffMonth: string;
  isPaidOff: boolean;
}

/**
 * Computes remaining loan tenure and human-readable payoff date.
 */
export function calculateEmiPayoff(
  remainingMonths: number,
  fromDate: Date = new Date()
): EmiPayoffInfo {
  const safeMonths = Math.max(0, Math.round(remainingMonths));
  const isPaidOff = safeMonths <= 0;

  const d = new Date(fromDate.getTime());
  d.setMonth(d.getMonth() + safeMonths);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');

  return {
    remainingMonths: safeMonths,
    payoffDate: `${monthName} ${year}`,
    payoffMonth: `${year}-${monthStr}`,
    isPaidOff,
  };
}

export interface CapsExplanationItem {
  category: string;
  type: 'need' | 'want' | 'goal' | 'buffer';
  weightFactor: number;
  amount: number;
  sharePercent: number;
  explanation: string;
}

export interface CapsExplanation {
  headline: string;
  needsWeight: string;
  wantsWeight: string;
  basis: string;
  summary: string;
  breakdown: CapsExplanationItem[];
}

/**
 * Generates a plain-language explanation of category cap weights based on needs vs wants.
 */
export function explainCapsWeighting(
  caps: RebalanceCapItem[],
  totalBudget: number
): CapsExplanation {
  const needsCount = caps.filter((c) => c.type === 'need').length;
  const wantsCount = caps.filter((c) => c.type === 'want').length;

  const breakdown: CapsExplanationItem[] = caps.map((cap) => {
    const isNeed = cap.type === 'need';
    const weightFactor = isNeed ? 1.0 : 0.6;
    const sharePercent = totalBudget > 0 ? Math.round((cap.amount / totalBudget) * 100) : 0;
    const explanation = isNeed
      ? `Weighted at 100% (1.0x priority) because ${cap.category} covers essential living requirements.`
      : `Weighted at 60% (0.6x priority) because ${cap.category} is discretionary lifestyle spending that scales down during tighter months.`;

    return {
      category: cap.category,
      type: cap.type,
      weightFactor,
      amount: cap.amount,
      sharePercent,
      explanation,
    };
  });

  return {
    headline: 'Needs vs. Wants Balanced Allocation',
    needsWeight: '100% (1.0x priority)',
    wantsWeight: '60% (0.6x priority)',
    basis: 'Calculated from your past 3 months of spending history and essential commitments.',
    summary: `Your variable budget is split across ${needsCount} essential needs (prioritized with 1.0x weight) and ${wantsCount} lifestyle wants (allocated with 0.6x flexibility), ensuring non-negotiables are covered first.`,
    breakdown,
  };
}

