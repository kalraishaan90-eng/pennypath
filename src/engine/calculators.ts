/**
 * Pure TypeScript Financial Calculators:
 * 1. Loan EMI Calculator with Amortization Schedule & Prepayment What-If
 * 2. Goal SIP Calculator with Inflation Adjustment & Plan Fit Evaluation
 * 3. Compound / SIP Calculator with Power of Starting Early Comparison
 * 
 * ALL MATH strictly powered by /src/engine.
 */

import {
  emi as financeEmi,
  amortization as financeAmortization,
  prepaymentImpact as financePrepaymentImpact,
  compoundInterest as financeCompoundInterest,
  sipFutureValue as financeSipFutureValue,
  goalMonthlySip as financeGoalMonthlySip,
} from './finance';

// ============================================================================
// Types
// ============================================================================

export interface AmortizationRow {
  month: number;
  principalPart: number;
  interestPart: number;
  totalPayment: number;
  remainingBalance: number;
}

export interface EMIResult {
  monthlyEMI: number;
  totalPayment: number;
  totalInterest: number;
  principalRatio: number; // percentage (0..100)
  interestRatio: number; // percentage (0..100)
  amortizationSummary: AmortizationRow[];
  amortizationSchedule: AmortizationRow[];
}

export interface PrepaymentImpactResult {
  monthsSaved: number;
  interestSaved: number;
  newTenureMonths: number;
}

export type AffordabilityStatus = 'yes' | 'careful' | 'no';

export interface AffordabilityInput {
  emi: number; // in Rupees
  disposable: number; // in Rupees (plan's disposable / discretionary amount)
  monthlyIncome: number; // in Rupees
  existingDebtMonthly?: number; // in Rupees (e.g. existing EMIs)
  existingObligationsMonthly?: number; // in Rupees (total fixed commitments)
}

export interface AffordabilityResult {
  status: AffordabilityStatus;
  reason: string;
  reasonKey: string;
  reasonParams: Record<string, string | number>;
  metrics: {
    emiToDisposableRatio: number; // percentage
    projectedDebtToIncome: number; // percentage
    projectedTotalObligationsRatio: number; // percentage
    remainingDisposable: number; // in Rupees
  };
}

export interface GoalSIPInput {
  targetAmount: number;
  annualReturnRate: number;
  tenureMonths: number;
  inflationRate?: number;
}

export interface GoalSIPResult {
  requiredMonthlySIP: number;
  inflationAdjustedTarget: number;
  totalInvested: number;
  projectedReturns: number;
}

export type GoalFitStatus = 'yes' | 'careful' | 'no';

export interface GoalFitResult {
  status: GoalFitStatus;
  reason: string;
  reasonKey: string;
  reasonParams: Record<string, string | number>;
  metrics: {
    sipToDisposableRatio: number;
    remainingDisposable: number;
    inflationAdjustedTarget: number;
  };
}

export interface SIPResult {
  investedAmount: number;
  estimatedReturns: number;
  totalValue: number;
  yearlyBreakdown: { year: number; invested: number; value: number }[];
}

export interface CompoundResult {
  maturityAmount: number;
  interestEarned: number;
  realPurchasingPower: number; // Inflation adjusted value
  yearlyBreakdown: { year: number; invested: number; value: number }[];
}

export interface EarlyInvestingComparison {
  delayYears: number;
  startNow: {
    totalInvested: number;
    maturityValue: number;
    wealthGain: number;
  };
  startDelayed: {
    totalInvested: number;
    maturityValue: number;
    wealthGain: number;
  };
  extraWealthFromEarlyStart: number;
  costOfDelay: number;
  multiplier: number;
  yearlyTrajectory: {
    year: number;
    investedNow: number;
    wealthNow: number;
    investedDelayed: number;
    wealthDelayed: number;
  }[];
}

// ============================================================================
// 1. Loan EMI & Amortization
// ============================================================================

/**
 * Calculates Loan EMI, total payable, total interest, and amortization schedule.
 * Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): EMIResult {
  const safePrincipal = Math.max(0, Math.round(Number(principal) || 0));
  const safeRate = Math.max(0, Number(annualInterestRate) || 0);
  const safeMonths = Math.max(1, Math.round(Number(tenureMonths) || 1));

  if (safePrincipal <= 0) {
    return {
      monthlyEMI: 0,
      totalPayment: 0,
      totalInterest: 0,
      principalRatio: 100,
      interestRatio: 0,
      amortizationSummary: [],
      amortizationSchedule: [],
    };
  }

  // Use core finance.emi
  const emiRes = financeEmi({
    principal: safePrincipal,
    annualRate: safeRate,
    months: safeMonths,
  });

  const monthlyEMI = emiRes.emi;
  const totalPayment = emiRes.totalPayable;
  const totalInterest = emiRes.totalInterest;

  const principalRatio = totalPayment > 0
    ? Math.max(0, Math.min(100, Math.round((safePrincipal / totalPayment) * 100)))
    : 100;
  const interestRatio = Math.max(0, 100 - principalRatio);

  // Generate amortization rows via core finance.amortization
  const amortRows = financeAmortization({
    principal: safePrincipal,
    annualRate: safeRate,
    months: safeMonths,
  });

  const amortizationSchedule: AmortizationRow[] = amortRows.map((r) => ({
    month: r.month,
    principalPart: r.principal,
    interestPart: r.interest,
    totalPayment: r.principal + r.interest,
    remainingBalance: r.balance,
  }));

  const amortizationSummary = amortizationSchedule.slice(0, 12);

  return {
    monthlyEMI,
    totalPayment,
    totalInterest,
    principalRatio,
    interestRatio,
    amortizationSummary,
    amortizationSchedule,
  };
}

/**
 * Calculates prepayment what-if impact (extra ₹/month -> months and interest saved).
 */
export function calculatePrepaymentImpact(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  extraPerMonth: number
): PrepaymentImpactResult {
  const safePrincipal = Math.max(0, Math.round(Number(principal) || 0));
  const safeRate = Math.max(0, Number(annualInterestRate) || 0);
  const safeMonths = Math.max(1, Math.round(Number(tenureMonths) || 1));
  const safeExtra = Math.max(0, Math.round(Number(extraPerMonth) || 0));

  if (safeExtra <= 0 || safePrincipal <= 0) {
    return {
      monthsSaved: 0,
      interestSaved: 0,
      newTenureMonths: safeMonths,
    };
  }

  const impact = financePrepaymentImpact({
    principal: safePrincipal,
    annualRate: safeRate,
    months: safeMonths,
    extraPerMonth: safeExtra,
  });

  const newTenureMonths = Math.max(1, safeMonths - impact.monthsSaved);

  return {
    monthsSaved: impact.monthsSaved,
    interestSaved: impact.interestSaved,
    newTenureMonths,
  };
}

/**
 * Affordability evaluation:
 * Compares EMI against Plan's disposable amount and debt-to-income (DTI).
 * Gives a clear 'yes' / 'careful' / 'no' with a transparent financial reason.
 */
export function evaluateAffordability(input: AffordabilityInput): AffordabilityResult {
  const {
    emi,
    disposable,
    monthlyIncome,
    existingDebtMonthly = 0,
    existingObligationsMonthly = 0,
  } = input;

  const safeEmi = Math.max(0, emi);
  const safeIncome = Math.max(0, monthlyIncome);
  const safeDebt = Math.max(0, existingDebtMonthly);
  const safeObligations = Math.max(0, existingObligationsMonthly);

  // Projected metrics
  const totalDebt = safeDebt + safeEmi;
  const totalObligations = safeObligations + safeEmi;

  const projectedDebtToIncome = safeIncome > 0
    ? Math.round((totalDebt / safeIncome) * 100)
    : 100;

  const projectedTotalObligationsRatio = safeIncome > 0
    ? Math.round((totalObligations / safeIncome) * 100)
    : 100;

  const emiToDisposableRatio = disposable > 0
    ? Math.round((safeEmi / disposable) * 100)
    : 999;

  const remainingDisposable = disposable - safeEmi;

  // 1. Clear "NO" conditions
  if (disposable <= 0) {
    return {
      status: 'no',
      reasonKey: 'calculators.affordability.no_shortfall',
      reason: `Your plan currently has zero or negative disposable income (shortfall). Taking on an EMI of ₹${safeEmi.toLocaleString('en-IN')} would worsen your monthly deficit.`,
      reasonParams: { emi: safeEmi, disposable },
      metrics: {
        emiToDisposableRatio,
        projectedDebtToIncome,
        projectedTotalObligationsRatio,
        remainingDisposable,
      },
    };
  }

  if (safeEmi > disposable) {
    const diff = safeEmi - disposable;
    return {
      status: 'no',
      reasonKey: 'calculators.affordability.no_exceeds_disposable',
      reason: `Monthly EMI of ₹${safeEmi.toLocaleString('en-IN')} exceeds your monthly disposable budget of ₹${disposable.toLocaleString('en-IN')} by ₹${diff.toLocaleString('en-IN')}. This would cause an immediate monthly shortfall.`,
      reasonParams: { emi: safeEmi, disposable, diff },
      metrics: {
        emiToDisposableRatio,
        projectedDebtToIncome,
        projectedTotalObligationsRatio,
        remainingDisposable,
      },
    };
  }

  if (safeIncome > 0 && projectedDebtToIncome > 50) {
    return {
      status: 'no',
      reasonKey: 'calculators.affordability.no_high_dti',
      reason: `This loan would push your debt-to-income ratio to ${projectedDebtToIncome}%, well beyond the prudent 50% safety ceiling.`,
      reasonParams: { dti: projectedDebtToIncome },
      metrics: {
        emiToDisposableRatio,
        projectedDebtToIncome,
        projectedTotalObligationsRatio,
        remainingDisposable,
      },
    };
  }

  if (safeIncome > 0 && projectedTotalObligationsRatio > 85) {
    return {
      status: 'no',
      reasonKey: 'calculators.affordability.no_high_commitments',
      reason: `Total fixed obligations would consume ${projectedTotalObligationsRatio}% of your monthly income, leaving virtually no margin for food and daily necessities.`,
      reasonParams: { ratio: projectedTotalObligationsRatio },
      metrics: {
        emiToDisposableRatio,
        projectedDebtToIncome,
        projectedTotalObligationsRatio,
        remainingDisposable,
      },
    };
  }

  // 2. "CAREFUL" conditions
  const isHighShareOfDisposable = emiToDisposableRatio > 65;
  const isModerateDti = projectedDebtToIncome > 35;
  const isHighCommitments = projectedTotalObligationsRatio > 65;

  if (isHighShareOfDisposable || isModerateDti || isHighCommitments) {
    return {
      status: 'careful',
      reasonKey: 'calculators.affordability.careful_tight',
      reason: `Proceed with caution: EMI consumes ${emiToDisposableRatio}% of your disposable buffer (leaving ₹${remainingDisposable.toLocaleString('en-IN')}/mo) and pushes debt-to-income to ${projectedDebtToIncome}%. Feasible, but leaves very little buffer for unexpected expenses.`,
      reasonParams: {
        ratio: emiToDisposableRatio,
        remaining: remainingDisposable,
        dti: projectedDebtToIncome,
      },
      metrics: {
        emiToDisposableRatio,
        projectedDebtToIncome,
        projectedTotalObligationsRatio,
        remainingDisposable,
      },
    };
  }

  // 3. Clear "YES"
  return {
    status: 'yes',
    reasonKey: 'calculators.affordability.yes_affordable',
    reason: `Comfortably affordable! The EMI requires only ${emiToDisposableRatio}% of your monthly disposable buffer (leaving ₹${remainingDisposable.toLocaleString('en-IN')}/mo) and maintains a safe debt-to-income ratio of ${projectedDebtToIncome}%.`,
    reasonParams: {
      ratio: emiToDisposableRatio,
      remaining: remainingDisposable,
      dti: projectedDebtToIncome,
    },
    metrics: {
      emiToDisposableRatio,
      projectedDebtToIncome,
      projectedTotalObligationsRatio,
      remainingDisposable,
    },
  };
}

// ============================================================================
// 2. Goal SIP & Plan Fit
// ============================================================================

/**
 * Calculates Required Monthly SIP to reach a target goal with optional inflation.
 */
export function calculateGoalSIP(input: GoalSIPInput): GoalSIPResult {
  const { targetAmount, annualReturnRate, tenureMonths, inflationRate } = input;

  const safeTarget = Math.max(0, Math.round(Number(targetAmount) || 0));
  const safeRate = Math.max(0, Number(annualReturnRate) || 0);
  const safeMonths = Math.max(1, Math.round(Number(tenureMonths) || 1));
  const safeInflation = inflationRate && inflationRate > 0 ? Number(inflationRate) : undefined;

  if (safeTarget <= 0) {
    return {
      requiredMonthlySIP: 0,
      inflationAdjustedTarget: 0,
      totalInvested: 0,
      projectedReturns: 0,
    };
  }

  let inflationAdjustedTarget = safeTarget;
  if (safeInflation !== undefined && safeInflation > 0) {
    const years = safeMonths / 12;
    inflationAdjustedTarget = Math.round(safeTarget * Math.pow(1 + safeInflation / 100, years));
  }

  const requiredMonthlySIP = financeGoalMonthlySip({
    targetAmount: safeTarget,
    annualRate: safeRate,
    months: safeMonths,
    inflation: safeInflation,
  });

  const totalInvested = requiredMonthlySIP * safeMonths;
  const projectedReturns = Math.max(0, inflationAdjustedTarget - totalInvested);

  return {
    requiredMonthlySIP,
    inflationAdjustedTarget,
    totalInvested,
    projectedReturns,
  };
}

/**
 * Backwards compatible alias for calculateTargetSIP
 */
export function calculateTargetSIP(
  targetAmount: number,
  annualReturnRate: number,
  tenureYears: number
): {
  requiredMonthlySIP: number;
  totalInvested: number;
  projectedReturns: number;
  targetAmount: number;
} {
  const res = calculateGoalSIP({
    targetAmount,
    annualReturnRate,
    tenureMonths: tenureYears * 12,
  });
  return {
    requiredMonthlySIP: res.requiredMonthlySIP,
    totalInvested: res.totalInvested,
    projectedReturns: res.projectedReturns,
    targetAmount,
  };
}

/**
 * Evaluates whether required monthly SIP fits into user's disposable budget.
 */
export function evaluateGoalPlanFit(
  requiredMonthlySip: number,
  disposable: number,
  inflationAdjustedTarget: number
): GoalFitResult {
  const safeSip = Math.max(0, requiredMonthlySip);
  const remainingDisposable = disposable - safeSip;
  const sipToDisposableRatio = disposable > 0
    ? Math.round((safeSip / disposable) * 100)
    : 999;

  if (disposable <= 0) {
    return {
      status: 'no',
      reasonKey: 'calculators.goal_fit.no_shortfall',
      reason: `Your plan currently has zero disposable budget. Prioritize stabilizing your core essentials before committing ₹${safeSip.toLocaleString('en-IN')}/month to this goal.`,
      reasonParams: { sip: safeSip, disposable },
      metrics: {
        sipToDisposableRatio,
        remainingDisposable,
        inflationAdjustedTarget,
      },
    };
  }

  if (safeSip > disposable) {
    const diff = safeSip - disposable;
    return {
      status: 'no',
      reasonKey: 'calculators.goal_fit.no_exceeds',
      reason: `Required monthly SIP of ₹${safeSip.toLocaleString('en-IN')} exceeds your plan's disposable income of ₹${disposable.toLocaleString('en-IN')} by ₹${diff.toLocaleString('en-IN')}/month.`,
      reasonParams: { sip: safeSip, disposable, diff },
      metrics: {
        sipToDisposableRatio,
        remainingDisposable,
        inflationAdjustedTarget,
      },
    };
  }

  if (sipToDisposableRatio > 60) {
    return {
      status: 'careful',
      reasonKey: 'calculators.goal_fit.careful_tight',
      reason: `Tight fit: This SIP consumes ${sipToDisposableRatio}% of your disposable buffer, leaving ₹${remainingDisposable.toLocaleString('en-IN')}/month for other lifestyle goals and unexpected needs.`,
      reasonParams: { ratio: sipToDisposableRatio, remaining: remainingDisposable },
      metrics: {
        sipToDisposableRatio,
        remainingDisposable,
        inflationAdjustedTarget,
      },
    };
  }

  return {
    status: 'yes',
    reasonKey: 'calculators.goal_fit.yes_fits',
    reason: `Fits comfortably! This goal takes only ${sipToDisposableRatio}% of your monthly disposable buffer, leaving ₹${remainingDisposable.toLocaleString('en-IN')}/month completely intact.`,
    reasonParams: { ratio: sipToDisposableRatio, remaining: remainingDisposable },
    metrics: {
      sipToDisposableRatio,
      remainingDisposable,
      inflationAdjustedTarget,
    },
  };
}

// ============================================================================
// 3. Compound / SIP Calculator & Power of Starting Early
// ============================================================================

/**
 * Calculates Systematic Investment Plan (SIP) returns.
 * Formula: M = P * [((1 + i)^n - 1) / i] * (1 + i)
 */
export function calculateSIP(
  monthlyInvestment: number,
  annualReturnRate: number,
  tenureYears: number
): SIPResult {
  const safeMonthly = Math.max(0, Math.round(Number(monthlyInvestment) || 0));
  const safeRate = Math.max(0, Number(annualReturnRate) || 0);
  const safeYears = Math.max(1, Math.round(Number(tenureYears) || 1));
  const months = safeYears * 12;

  if (safeMonthly <= 0) {
    return { investedAmount: 0, estimatedReturns: 0, totalValue: 0, yearlyBreakdown: [] };
  }

  const totalValue = financeSipFutureValue({
    monthly: safeMonthly,
    annualRate: safeRate,
    months,
  });

  const investedAmount = safeMonthly * months;
  const estimatedReturns = Math.max(0, totalValue - investedAmount);

  // Yearly milestones
  const yearlyBreakdown: { year: number; invested: number; value: number }[] = [];
  for (let y = 1; y <= safeYears; y++) {
    const curMonths = y * 12;
    const curInvested = safeMonthly * curMonths;
    const curValue = financeSipFutureValue({
      monthly: safeMonthly,
      annualRate: safeRate,
      months: curMonths,
    });
    yearlyBreakdown.push({
      year: y,
      invested: curInvested,
      value: curValue,
    });
  }

  return {
    investedAmount,
    estimatedReturns,
    totalValue,
    yearlyBreakdown,
  };
}

/**
 * Calculates Compound Interest and Inflation Adjusted Purchasing Power.
 * A = P(1 + r/n)^(nt)
 * Real Value = A / (1 + inflation)^t
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compoundFrequencyPerYear: number = 4,
  annualInflationRate: number = 6
): CompoundResult {
  const safePrincipal = Math.max(0, Math.round(Number(principal) || 0));
  const safeRate = Math.max(0, Number(annualRate) || 0);
  const safeYears = Math.max(1, Math.round(Number(years) || 1));
  const safeFreq = Math.max(1, Math.round(Number(compoundFrequencyPerYear) || 1));
  const safeInflation = Math.max(0, Number(annualInflationRate) || 0);

  if (safePrincipal <= 0) {
    return {
      maturityAmount: 0,
      interestEarned: 0,
      realPurchasingPower: 0,
      yearlyBreakdown: [],
    };
  }

  const maturityAmount = financeCompoundInterest({
    principal: safePrincipal,
    annualRate: safeRate,
    years: safeYears,
    compoundsPerYear: safeFreq,
  });

  const interestEarned = Math.max(0, maturityAmount - safePrincipal);
  const realPurchasingPower = Math.round(maturityAmount / Math.pow(1 + safeInflation / 100, safeYears));

  const yearlyBreakdown: { year: number; invested: number; value: number }[] = [];
  for (let y = 1; y <= safeYears; y++) {
    const curValue = financeCompoundInterest({
      principal: safePrincipal,
      annualRate: safeRate,
      years: y,
      compoundsPerYear: safeFreq,
    });
    yearlyBreakdown.push({
      year: y,
      invested: safePrincipal,
      value: curValue,
    });
  }

  return {
    maturityAmount,
    interestEarned,
    realPurchasingPower,
    yearlyBreakdown,
  };
}

/**
 * Compares Starting Early (Start Now) vs Starting 5 Years Later.
 * Calculates wealth gains, cost of delay, and trajectory points.
 */
export function compareEarlyInvesting(
  mode: 'sip' | 'lump_sum',
  amount: number,
  annualRate: number,
  years: number,
  compoundsPerYear: number = 4,
  delayYears: number = 5
): EarlyInvestingComparison {
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  const safeRate = Math.max(0, Number(annualRate) || 0);
  const totalYears = Math.max(1, Math.round(Number(years) || 1));
  const safeDelay = Math.min(delayYears, Math.max(1, totalYears - 1));

  // 1. Start Now
  let nowInvested = 0;
  let nowMaturity = 0;

  if (mode === 'sip') {
    nowInvested = safeAmount * totalYears * 12;
    nowMaturity = financeSipFutureValue({
      monthly: safeAmount,
      annualRate: safeRate,
      months: totalYears * 12,
    });
  } else {
    nowInvested = safeAmount;
    nowMaturity = financeCompoundInterest({
      principal: safeAmount,
      annualRate: safeRate,
      years: totalYears,
      compoundsPerYear,
    });
  }
  const nowWealthGain = Math.max(0, nowMaturity - nowInvested);

  // 2. Start Delayed (delayed by safeDelay years)
  const delayedActiveYears = Math.max(0, totalYears - safeDelay);
  let delayedInvested = 0;
  let delayedMaturity = 0;

  if (delayedActiveYears > 0) {
    if (mode === 'sip') {
      delayedInvested = safeAmount * delayedActiveYears * 12;
      delayedMaturity = financeSipFutureValue({
        monthly: safeAmount,
        annualRate: safeRate,
        months: delayedActiveYears * 12,
      });
    } else {
      delayedInvested = safeAmount;
      delayedMaturity = financeCompoundInterest({
        principal: safeAmount,
        annualRate: safeRate,
        years: delayedActiveYears,
        compoundsPerYear,
      });
    }
  }
  const delayedWealthGain = Math.max(0, delayedMaturity - delayedInvested);

  const extraWealthFromEarlyStart = Math.max(0, nowMaturity - delayedMaturity);
  const costOfDelay = extraWealthFromEarlyStart;
  const multiplier = delayedWealthGain > 0
    ? Math.round((nowWealthGain / delayedWealthGain) * 10) / 10
    : delayedMaturity > 0 ? Math.round((nowMaturity / delayedMaturity) * 10) / 10 : 1;

  // 3. Yearly Trajectory for Chart
  const yearlyTrajectory: {
    year: number;
    investedNow: number;
    wealthNow: number;
    investedDelayed: number;
    wealthDelayed: number;
  }[] = [];

  for (let y = 0; y <= totalYears; y++) {
    if (y === 0) {
      yearlyTrajectory.push({
        year: 0,
        investedNow: mode === 'lump_sum' ? safeAmount : 0,
        wealthNow: mode === 'lump_sum' ? safeAmount : 0,
        investedDelayed: 0,
        wealthDelayed: 0,
      });
      continue;
    }

    // Now path
    let curInvNow = 0;
    let curWealthNow = 0;
    if (mode === 'sip') {
      curInvNow = safeAmount * y * 12;
      curWealthNow = financeSipFutureValue({
        monthly: safeAmount,
        annualRate: safeRate,
        months: y * 12,
      });
    } else {
      curInvNow = safeAmount;
      curWealthNow = financeCompoundInterest({
        principal: safeAmount,
        annualRate: safeRate,
        years: y,
        compoundsPerYear,
      });
    }

    // Delayed path
    let curInvDelayed = 0;
    let curWealthDelayed = 0;
    if (y > safeDelay) {
      const activeY = y - safeDelay;
      if (mode === 'sip') {
        curInvDelayed = safeAmount * activeY * 12;
        curWealthDelayed = financeSipFutureValue({
          monthly: safeAmount,
          annualRate: safeRate,
          months: activeY * 12,
        });
      } else {
        curInvDelayed = safeAmount;
        curWealthDelayed = financeCompoundInterest({
          principal: safeAmount,
          annualRate: safeRate,
          years: activeY,
          compoundsPerYear,
        });
      }
    }

    yearlyTrajectory.push({
      year: y,
      investedNow: curInvNow,
      wealthNow: curWealthNow,
      investedDelayed: curInvDelayed,
      wealthDelayed: curWealthDelayed,
    });
  }

  return {
    delayYears: safeDelay,
    startNow: {
      totalInvested: nowInvested,
      maturityValue: nowMaturity,
      wealthGain: nowWealthGain,
    },
    startDelayed: {
      totalInvested: delayedInvested,
      maturityValue: delayedMaturity,
      wealthGain: delayedWealthGain,
    },
    extraWealthFromEarlyStart,
    costOfDelay,
    multiplier,
    yearlyTrajectory,
  };
}
