import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  calculatePrepaymentImpact,
  evaluateAffordability,
  calculateGoalSIP,
  evaluateGoalPlanFit,
  calculateSIP,
  calculateCompoundInterest,
  compareEarlyInvesting,
} from '../calculators';
import en from '../../i18n/locales/en.json';
import hi from '../../i18n/locales/hi.json';

describe('Calculators Engine Suite - P3 Test Vectors & Acceptance', () => {
  // ==========================================================================
  // 1. P3 Benchmark Test Vectors
  // ==========================================================================

  it('EMI Calculator matches P3 test vector: EMI ~10,624 for 5,00,000 @ 10% / 60 months', () => {
    const result = calculateEMI(500000, 10, 60);

    // Exact P3 test vector: ~ 10,624 (±1)
    expect(Math.abs(result.monthlyEMI - 10624)).toBeLessThanOrEqual(1);
    expect(result.monthlyEMI).toBe(10624);

    // Total payable & interest
    expect(result.totalPayment).toBe(10624 * 60);
    expect(result.totalInterest).toBe(result.totalPayment - 500000);

    // Principal and interest ratio sum to 100
    expect(result.principalRatio + result.interestRatio).toBe(100);
    expect(result.principalRatio).toBeGreaterThan(70);

    // Amortization schedule has all 60 rows
    expect(result.amortizationSchedule.length).toBe(60);
    expect(result.amortizationSummary.length).toBe(12);

    // Final balance is zero
    const lastRow = result.amortizationSchedule[result.amortizationSchedule.length - 1];
    expect(lastRow.remainingBalance).toBe(0);
  });

  it('SIP Calculator matches P3 test vector: SIP FV ~11,61,695 for 5,000 @ 12% / 120 months', () => {
    // 120 months = 10 years
    const result = calculateSIP(5000, 12, 10);

    // Exact P3 test vector: ~ 11,61,695 (±5)
    expect(Math.abs(result.totalValue - 1161695)).toBeLessThanOrEqual(5);
    expect(result.investedAmount).toBe(600000); // 5000 * 120
    expect(result.estimatedReturns).toBe(result.totalValue - 600000);
    expect(result.yearlyBreakdown.length).toBe(10);
  });

  it('Goal Calculator matches P3 test vector: goal SIP ~12,12x for 10,00,000 @ 12% / 60 months', () => {
    const result = calculateGoalSIP({
      targetAmount: 1000000,
      annualReturnRate: 12,
      tenureMonths: 60,
    });

    // Exact P3 test vector: ~ 12,12x (specifically 12,123 ±5)
    expect(result.requiredMonthlySIP).toBeGreaterThanOrEqual(12118);
    expect(result.requiredMonthlySIP).toBeLessThanOrEqual(12128);
    expect(result.requiredMonthlySIP).toBe(12123);

    expect(result.inflationAdjustedTarget).toBe(1000000);
    expect(result.totalInvested).toBe(result.requiredMonthlySIP * 60);
    expect(result.projectedReturns).toBe(1000000 - result.totalInvested);
  });

  it('Compound Interest matches P3 benchmark: 10,000 @ 8% / 10y yearly ~ 21,589', () => {
    const result = calculateCompoundInterest(10000, 8, 10, 1, 6);
    expect(Math.abs(result.maturityAmount - 21589)).toBeLessThanOrEqual(1);
    expect(result.interestEarned).toBe(result.maturityAmount - 10000);
    expect(result.realPurchasingPower).toBeLessThan(result.maturityAmount);
  });

  // ==========================================================================
  // 2. Input Validation & Edge Cases
  // ==========================================================================

  describe('Input Validation & Safe Clamping', () => {
    it('handles negative or zero values safely without throwing', () => {
      // Negative principal clamped safely
      const emiNeg = calculateEMI(-500000, 10, 60);
      expect(emiNeg.monthlyEMI).toBe(0);
      expect(emiNeg.totalPayment).toBe(0);

      // Negative rate clamped safely (0% edge case: principal / tenure)
      const emiZeroRate = calculateEMI(60000, 0, 6);
      expect(emiZeroRate.monthlyEMI).toBe(10000);
      expect(emiZeroRate.totalInterest).toBe(0);

      // Negative goal amount
      const goalNeg = calculateGoalSIP({
        targetAmount: -100000,
        annualReturnRate: 12,
        tenureMonths: 12,
      });
      expect(goalNeg.requiredMonthlySIP).toBe(0);

      // Negative SIP amount
      const sipNeg = calculateSIP(-5000, 12, 5);
      expect(sipNeg.totalValue).toBe(0);

      // Negative compound principal
      const compNeg = calculateCompoundInterest(-10000, 8, 5);
      expect(compNeg.maturityAmount).toBe(0);
    });
  });

  // ==========================================================================
  // 3. "Can I afford this?" gives different answers for Rohan vs Aarav
  // ==========================================================================

  describe('Affordability Check: Rohan vs. Aarav', () => {
    const p3LoanEmi = 10624; // from ₹5,00,000 @ 10% / 60 months

    // Rohan's plan profile:
    // Income: ₹38,000 / mo
    // Fixed obligations: ₹18,198 (including bike loan EMI ₹3,200)
    // Savings target: ₹5,000
    // Disposable: 38,000 - 18,198 - 5,000 = ₹14,802
    const rohanPlan = {
      emi: p3LoanEmi,
      disposable: 14802,
      monthlyIncome: 38000,
      existingDebtMonthly: 3200,
      existingObligationsMonthly: 18198,
    };

    // Aarav's plan profile:
    // Income: ₹12,000 / mo (pocket money / stipend)
    // Fixed obligations: ₹5,598
    // Savings target: ₹2,400
    // Disposable: 12,000 - 5,598 - 2,400 = ₹4,002
    const aaravPlan = {
      emi: p3LoanEmi,
      disposable: 4002,
      monthlyIncome: 12000,
      existingDebtMonthly: 0,
      existingObligationsMonthly: 5598,
    };

    it('gives "no" for Aarav because ₹10,624 EMI exceeds his disposable budget (₹4,002)', () => {
      const aaravResult = evaluateAffordability(aaravPlan);
      expect(aaravResult.status).toBe('no');
      expect(aaravResult.reasonKey).toBe('calculators.affordability.no_exceeds_disposable');
      expect(aaravResult.metrics.remainingDisposable).toBeLessThan(0);
    });

    it('gives "careful" for Rohan because ₹10,624 EMI fits in disposable (₹14,802) but is a high percentage (>65%)', () => {
      const rohanResult = evaluateAffordability(rohanPlan);
      expect(rohanResult.status).toBe('careful');
      expect(rohanResult.reasonKey).toBe('calculators.affordability.careful_tight');
      expect(rohanResult.metrics.remainingDisposable).toBeGreaterThan(0);
      expect(rohanResult.metrics.emiToDisposableRatio).toBe(72); // 10624 / 14802 ~ 71.8%
    });

    it('verifies that Aarav and Rohan receive strictly DIFFERENT answers for the same loan', () => {
      const aaravResult = evaluateAffordability(aaravPlan);
      const rohanResult = evaluateAffordability(rohanPlan);

      expect(aaravResult.status).not.toBe(rohanResult.status);
      expect(aaravResult.status).toBe('no');
      expect(rohanResult.status).toBe('careful');
    });

    it('gives "yes" for Rohan on a smaller loan (e.g. ₹1,00,000 loan -> EMI ~₹3,227)', () => {
      const smallEmi = 3227;
      const rohanSmall = evaluateAffordability({
        ...rohanPlan,
        emi: smallEmi,
      });

      expect(rohanSmall.status).toBe('yes');
      expect(rohanSmall.reasonKey).toBe('calculators.affordability.yes_affordable');
      expect(rohanSmall.metrics.emiToDisposableRatio).toBeLessThan(30);
    });
  });

  // ==========================================================================
  // 4. Prepayment What-If Analysis
  // ==========================================================================

  describe('Prepayment What-If', () => {
    it('calculates months and interest saved with extra monthly prepayment', () => {
      const principal = 500000;
      const annualRate = 10;
      const months = 60;
      const extraPerMonth = 1000;

      const impact = calculatePrepaymentImpact(principal, annualRate, months, extraPerMonth);

      // Extra ₹1,000/mo on 60m ₹5L loan saves ~5-7 months and >₹10,000 interest
      expect(impact.monthsSaved).toBeGreaterThan(0);
      expect(impact.interestSaved).toBeGreaterThan(5000);
      expect(impact.newTenureMonths).toBe(months - impact.monthsSaved);
    });
  });

  // ==========================================================================
  // 5. Goal Plan Fit Evaluation
  // ==========================================================================

  describe('Goal Plan Fit Evaluation', () => {
    it('evaluates whether goal SIP fits into user disposable budget', () => {
      const targetSip = 12123; // ₹10,00,000 in 60m

      // For Aarav (disposable ₹4,002): exceeds
      const aaravFit = evaluateGoalPlanFit(targetSip, 4002, 1000000);
      expect(aaravFit.status).toBe('no');
      expect(aaravFit.reasonKey).toBe('calculators.goal_fit.no_exceeds');

      // For Rohan (disposable ₹14,802): tight fit
      const rohanFit = evaluateGoalPlanFit(targetSip, 14802, 1000000);
      expect(rohanFit.status).toBe('careful');
      expect(rohanFit.reasonKey).toBe('calculators.goal_fit.careful_tight');

      // For comfortable goal (e.g. ₹1,000/mo for Rohan)
      const easyFit = evaluateGoalPlanFit(1000, 14802, 60000);
      expect(easyFit.status).toBe('yes');
      expect(easyFit.reasonKey).toBe('calculators.goal_fit.yes_fits');
    });

    it('adjusts target amount for inflation when inflation is provided', () => {
      const resultWithInflation = calculateGoalSIP({
        targetAmount: 1000000,
        annualReturnRate: 12,
        tenureMonths: 60, // 5 years
        inflationRate: 6, // 6% inflation
      });

      // 10L compounded at 6% for 5 years ~ 13,38,226
      expect(resultWithInflation.inflationAdjustedTarget).toBeGreaterThan(1300000);
      expect(resultWithInflation.requiredMonthlySIP).toBeGreaterThan(12123);
    });
  });

  // ==========================================================================
  // 6. Power of Starting Early Comparison
  // ==========================================================================

  describe('Power of Starting Early Comparison', () => {
    it('demonstrates substantial wealth advantage of starting now vs 5 years later', () => {
      const comparison = compareEarlyInvesting('sip', 5000, 12, 10, 4, 5);

      // Start Now (10 yrs)
      expect(comparison.startNow.totalInvested).toBe(600000);
      expect(Math.abs(comparison.startNow.maturityValue - 1161695)).toBeLessThanOrEqual(5);

      // Start 5 Years Later (5 yrs)
      expect(comparison.startDelayed.totalInvested).toBe(300000);
      expect(comparison.startDelayed.maturityValue).toBeLessThan(comparison.startNow.maturityValue);

      // Cost of delay & extra wealth
      expect(comparison.extraWealthFromEarlyStart).toBeGreaterThan(700000);
      expect(comparison.costOfDelay).toBe(comparison.extraWealthFromEarlyStart);
      expect(comparison.multiplier).toBeGreaterThan(2);

      // Trajectory points for chart
      expect(comparison.yearlyTrajectory.length).toBe(11); // years 0 to 10
    });
  });

  // ==========================================================================
  // 7. Bilingual Parity (English and Hindi)
  // ==========================================================================

  describe('Bilingual Parity: English & Hindi', () => {
    it('verifies all calculator translation keys exist in both en.json and hi.json', () => {
      const enCalc = (en as any).calculators;
      const hiCalc = (hi as any).calculators;

      expect(enCalc).toBeDefined();
      expect(hiCalc).toBeDefined();

      // Core sections
      expect(enCalc.title).toBe('Calculators Hub');
      expect(hiCalc.title).toBe('कैलकुलेटर हब');

      expect(enCalc.tab_emi).toBeTruthy();
      expect(hiCalc.tab_emi).toBeTruthy();

      expect(enCalc.tab_goal).toBeTruthy();
      expect(hiCalc.tab_goal).toBeTruthy();

      expect(enCalc.tab_compound).toBeTruthy();
      expect(hiCalc.tab_compound).toBeTruthy();

      // Accordion keys
      expect(enCalc.accordion.emi_plain).toBeTruthy();
      expect(hiCalc.accordion.emi_plain).toBeTruthy();
      expect(enCalc.accordion.emi_formula).toBeTruthy();
      expect(hiCalc.accordion.emi_formula).toBeTruthy();

      expect(enCalc.accordion.goal_plain).toBeTruthy();
      expect(hiCalc.accordion.goal_plain).toBeTruthy();
      expect(enCalc.accordion.goal_formula).toBeTruthy();
      expect(hiCalc.accordion.goal_formula).toBeTruthy();

      expect(enCalc.accordion.compound_plain).toBeTruthy();
      expect(hiCalc.accordion.compound_plain).toBeTruthy();
      expect(enCalc.accordion.compound_formula).toBeTruthy();
      expect(hiCalc.accordion.compound_formula).toBeTruthy();

      // Affordability keys
      expect(enCalc.affordability.button).toBe('Can I afford this?');
      expect(hiCalc.affordability.button).toBe('क्या मैं इसका खर्च उठा सकता हूँ?');

      expect(enCalc.affordability.yes_affordable).toBeTruthy();
      expect(hiCalc.affordability.yes_affordable).toBeTruthy();
      expect(enCalc.affordability.careful_tight).toBeTruthy();
      expect(hiCalc.affordability.careful_tight).toBeTruthy();
      expect(enCalc.affordability.no_exceeds_disposable).toBeTruthy();
      expect(hiCalc.affordability.no_exceeds_disposable).toBeTruthy();
    });
  });
});
