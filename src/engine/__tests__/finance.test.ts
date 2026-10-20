import { describe, it, expect } from 'vitest';
import {
  emi,
  amortization,
  prepaymentImpact,
  compoundInterest,
  sipFutureValue,
  goalMonthlySip,
  emergencyFundTarget,
  buildPlan,
  dailySafeToSpend,
  projectMonthEnd,
  financialHealthScore,
  riskScore,
  allocationFor,
  rebalanceCaps,
  calculateEmiPayoff,
  explainCapsWeighting,
} from '../finance';

describe('Finance Engine - Pure TypeScript Core', () => {
  // ==========================================================================
  // Required Benchmark Tests
  // ==========================================================================

  it('emi(5,00,000 @10% / 60) ~ 10,624 (±1)', () => {
    // Rupee scale: 5,00,000 @ 10% for 60 months
    const resultRupees = emi({ principal: 500000, annualRate: 10, months: 60 });
    expect(Math.abs(resultRupees.emi - 10624)).toBeLessThanOrEqual(1);
    expect(resultRupees.totalPayable).toBe(resultRupees.emi * 60);
    expect(resultRupees.totalInterest).toBe(resultRupees.totalPayable - 500000);

    // Paise scale: 50,000,000 paise (₹5,00,000)
    const resultPaise = emi({ principal: 50000000, annualRate: 0.10, months: 60 });
    const emiInRupees = Math.round(resultPaise.emi / 100);
    expect(Math.abs(emiInRupees - 10624)).toBeLessThanOrEqual(1);
  });

  it('compoundInterest(10,000 @8% / 10y yearly) ~ 21,589 (±1)', () => {
    // Rupee scale: ₹10,000 at 8% for 10 years compounded annually
    const resultRupees = compoundInterest({
      principal: 10000,
      annualRate: 8,
      years: 10,
      compoundsPerYear: 1,
    });
    expect(Math.abs(resultRupees - 21589)).toBeLessThanOrEqual(1);

    // Paise scale: 1,000,000 paise
    const resultPaise = compoundInterest({
      principal: 1000000,
      annualRate: 0.08,
      years: 10,
      compoundsPerYear: 1,
    });
    expect(Math.abs(Math.round(resultPaise / 100) - 21589)).toBeLessThanOrEqual(1);
  });

  it('sipFutureValue(5,000 @12% / 120 months) ~ 11,61,695 (±5)', () => {
    // Annuity-due forward SIP: ₹5,000 monthly at 12% p.a. for 120 months
    const resultRupees = sipFutureValue({
      monthly: 5000,
      annualRate: 12,
      months: 120,
    });
    expect(Math.abs(resultRupees - 1161695)).toBeLessThanOrEqual(5);

    // In paise: 500,000 paise
    const resultPaise = sipFutureValue({
      monthly: 500000,
      annualRate: 0.12,
      months: 120,
    });
    expect(Math.abs(Math.round(resultPaise / 100) - 1161695)).toBeLessThanOrEqual(5);
  });

  it('goalMonthlySip(10,00,000 @12% / 60 months) ~ 12,12x (±5)', () => {
    // Annuity-due reverse SIP: target ₹10,00,000 in 60 months at 12% p.a.
    const resultRupees = goalMonthlySip({
      targetAmount: 1000000,
      annualRate: 12,
      months: 60,
    });
    // Expected ~ 12,123 (which satisfies 12,12x within ±5)
    expect(resultRupees).toBeGreaterThanOrEqual(12118);
    expect(resultRupees).toBeLessThanOrEqual(12128);

    // With inflation adjustment (e.g. 6% inflation)
    const withInflation = goalMonthlySip({
      targetAmount: 1000000,
      annualRate: 12,
      months: 60,
      inflation: 6,
    });
    expect(withInflation).toBeGreaterThan(resultRupees);
  });

  it('buildPlan(income 50,000, save 20,000, fixed 18,000) -> disposable 12,000, caps sum == 12,000', () => {
    const plan = buildPlan({
      income: 50000,
      savingsTarget: 20000,
      fixedObligations: 18000,
    });

    expect(plan.disposable).toBe(12000);
    expect(plan.shortfall).toBe(0);
    expect(plan.variableBudget).toBe(12000);
    expect(plan.fixes).toHaveLength(0);

    const capsSum = plan.caps.reduce((sum, c) => sum + c.amount, 0);
    expect(capsSum).toBe(12000);
  });

  it('buildPlan(income 30,000, save 20,000, fixed 15,000) -> shortfall 5,000, fixes non-empty', () => {
    const plan = buildPlan({
      income: 30000,
      savingsTarget: 20000,
      fixedObligations: 15000,
    });

    // D = 30000 - 15000 - 20000 = -5000
    expect(plan.disposable).toBe(-5000);
    expect(plan.shortfall).toBe(5000);
    expect(plan.variableBudget).toBe(0);
    expect(plan.fixes.length).toBeGreaterThan(0);

    // Fix (a): lower savings target to income - fixed = 30,000 - 15,000 = 15,000
    const lowerSavings = plan.fixes.find(f => f.type === 'lower_savings');
    expect(lowerSavings).toBeDefined();
    expect(lowerSavings?.effect).toBe(15000);

    // Fix (b): extend goal date
    const extendGoal = plan.fixes.find(f => f.type === 'extend_goal');
    expect(extendGoal).toBeDefined();
    expect(extendGoal?.effect).toBeGreaterThan(1);

    // Fix (c): trim obligations
    const trimObligations = plan.fixes.find(f => f.type === 'trim_obligations');
    expect(trimObligations).toBeDefined();
    expect(trimObligations?.effect).toBe(5000);

    // Fix (d): raise income
    const raiseIncome = plan.fixes.find(f => f.type === 'raise_income');
    expect(raiseIncome).toBeDefined();
    expect(raiseIncome?.effect).toBe(5000);

    // Caps when variableBudget is 0
    const capsSum = plan.caps.reduce((sum, c) => sum + c.amount, 0);
    expect(capsSum).toBe(0);
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles zero income in buildPlan and financialHealthScore', () => {
      const planZero = buildPlan({
        income: 0,
        fixedObligations: 10000,
        savingsTarget: 5000,
      });
      expect(planZero.disposable).toBe(-15000);
      expect(planZero.shortfall).toBe(15000);
      expect(planZero.variableBudget).toBe(0);
      expect(planZero.fixes.length).toBeGreaterThanOrEqual(4);

      const healthZero = financialHealthScore({
        savingsRate: 0,
        emergencyMonths: 0,
        debtToIncome: 0,
        budgetAdherence: 0,
      });
      expect(healthZero.parts.savings).toBe(0);
      expect(healthZero.parts.emergency).toBe(0);
      expect(healthZero.parts.adherence).toBe(0);
      expect(healthZero.tip).toBeTruthy();
    });

    it('handles zero rate correctly across all functions', () => {
      // emi at 0%
      const emiZero = emi({ principal: 60000, annualRate: 0, months: 6 });
      expect(emiZero.emi).toBe(10000);
      expect(emiZero.totalInterest).toBe(0);
      expect(emiZero.totalPayable).toBe(60000);

      // compoundInterest at 0%
      const ciZero = compoundInterest({
        principal: 15000,
        annualRate: 0,
        years: 5,
        compoundsPerYear: 1,
      });
      expect(ciZero).toBe(15000);

      // sipFutureValue at 0%
      const sipZero = sipFutureValue({ monthly: 4000, annualRate: 0, months: 10 });
      expect(sipZero).toBe(40000);

      // goalMonthlySip at 0%
      const goalZero = goalMonthlySip({ targetAmount: 50000, annualRate: 0, months: 10 });
      expect(goalZero).toBe(5000);

      // amortization at 0%
      const amortZero = amortization({ principal: 3000, annualRate: 0, months: 3 });
      expect(amortZero).toHaveLength(3);
      expect(amortZero[0].interest).toBe(0);
      expect(amortZero[0].principal).toBe(1000);
      expect(amortZero[2].balance).toBe(0);
    });

    it('handles tenure 1 correctly across all functions', () => {
      // EMI with 1 month tenure
      const emiOne = emi({ principal: 12000, annualRate: 12, months: 1 });
      // Monthly rate 1%, interest 120, EMI = 12120
      expect(emiOne.emi).toBe(12120);
      expect(emiOne.totalInterest).toBe(120);
      expect(emiOne.totalPayable).toBe(12120);

      const amortOne = amortization({ principal: 12000, annualRate: 12, months: 1 });
      expect(amortOne).toHaveLength(1);
      expect(amortOne[0].month).toBe(1);
      expect(amortOne[0].balance).toBe(0);

      // SIP annuity-due with 1 month tenure (P * (1 + i))
      const sipOne = sipFutureValue({ monthly: 10000, annualRate: 12, months: 1 });
      expect(sipOne).toBe(10100);

      // Reverse SIP with 1 month tenure
      const goalOne = goalMonthlySip({ targetAmount: 10100, annualRate: 12, months: 1 });
      expect(goalOne).toBe(10000);
    });

    it('rejects negative inputs with descriptive errors', () => {
      expect(() => emi({ principal: -5000, annualRate: 10, months: 12 })).toThrow(/principal/);
      expect(() => emi({ principal: 5000, annualRate: -5, months: 12 })).toThrow(/annualRate/);
      expect(() => emi({ principal: 5000, annualRate: 10, months: 0 })).toThrow(/months/);

      expect(() => amortization({ principal: -100, annualRate: 10, months: 6 })).toThrow();
      expect(() => amortization({ principal: 1000, annualRate: 10, months: 6, extraPerMonth: -50 })).toThrow();

      expect(() => prepaymentImpact({ principal: 1000, annualRate: 10, months: 12, extraPerMonth: -100 })).toThrow();

      expect(() => compoundInterest({ principal: -1000, annualRate: 8, years: 5, compoundsPerYear: 1 })).toThrow();
      expect(() => compoundInterest({ principal: 1000, annualRate: -8, years: 5, compoundsPerYear: 1 })).toThrow();
      expect(() => compoundInterest({ principal: 1000, annualRate: 8, years: -5, compoundsPerYear: 1 })).toThrow();

      expect(() => sipFutureValue({ monthly: -500, annualRate: 12, months: 12 })).toThrow();
      expect(() => goalMonthlySip({ targetAmount: -1000, annualRate: 12, months: 12 })).toThrow();
      expect(() => goalMonthlySip({ targetAmount: 1000, annualRate: 12, months: 12, inflation: -3 })).toThrow();

      expect(() => emergencyFundTarget({ avgMonthlyEssential: -10000, mode: 'earner' })).toThrow();

      expect(() => buildPlan({ income: -1000, savingsTarget: 100, fixedObligations: 100 })).toThrow();
      expect(() => buildPlan({ income: 1000, savingsTarget: -100, fixedObligations: 100 })).toThrow();

      expect(() => dailySafeToSpend({ variableBudget: -100, variableSpent: 0, daysLeft: 10 })).toThrow();
      expect(() => dailySafeToSpend({ variableBudget: 100, variableSpent: -10, daysLeft: 10 })).toThrow();
      expect(() => dailySafeToSpend({ variableBudget: 100, variableSpent: 10, daysLeft: -5 })).toThrow();

      expect(() => projectMonthEnd({ fixed: -10, variableSpent: 0, daysElapsed: 1, daysInMonth: 30, income: 1000, savingsTarget: 100 })).toThrow();

      expect(() => financialHealthScore({ savingsRate: -10, emergencyMonths: 3, debtToIncome: 10, budgetAdherence: 80 })).toThrow();

      expect(() => riskScore([1, 2, 3, 4, 5])).toThrow(/Expected exactly 6 answers/);
      expect(() => riskScore([1, 2, 3, 4, 5, -1])).toThrow();

      expect(() => allocationFor({ band: 'moderate', horizonYears: -2, emergencyFundMonths: 6 })).toThrow();
      expect(() => allocationFor({ band: 'moderate', horizonYears: 5, emergencyFundMonths: -1 })).toThrow();
    });

    it('guarantees category caps always sum exactly to variableBudget with rounding paise distribution', () => {
      // Test odd numbers and remainders
      const testBudgets = [1, 7, 13, 99, 100, 333, 12345, 99999];

      const categoryHistory = [
        { category: 'Groceries', amount: 4500, type: 'need' as const },
        { category: 'Rent', amount: 10000, type: 'need' as const },
        { category: 'Dining Out', amount: 3500, type: 'want' as const },
        { category: 'Cinema', amount: 1500, type: 'want' as const },
      ];

      for (const budget of testBudgets) {
        const plan = buildPlan({
          income: budget + 5000,
          fixedObligations: 5000,
          savingsTarget: 0,
          categoryHistory,
        });

        expect(plan.variableBudget).toBe(budget);
        const capsSum = plan.caps.reduce((sum, c) => sum + c.amount, 0);
        expect(capsSum).toBe(budget);
      }
    });
  });

  // ==========================================================================
  // Remaining Required Functions
  // ==========================================================================

  describe('amortization & prepaymentImpact', () => {
    it('produces valid amortization table and respects extra prepayment', () => {
      const schedule = amortization({
        principal: 100000,
        annualRate: 12,
        months: 12,
      });

      expect(schedule).toHaveLength(12);
      expect(schedule[0].month).toBe(1);
      expect(schedule[11].balance).toBe(0);
      expect(schedule[0].principal + schedule[0].interest).toBeGreaterThan(0);

      // Prepayment impact
      const impact = prepaymentImpact({
        principal: 500000,
        annualRate: 10,
        months: 60,
        extraPerMonth: 2000,
      });

      expect(impact.monthsSaved).toBeGreaterThan(5);
      expect(impact.interestSaved).toBeGreaterThan(10000);
    });
  });

  describe('emergencyFundTarget', () => {
    it('calculates correct months and amounts for each persona', () => {
      const student = emergencyFundTarget({ avgMonthlyEssential: 10000, mode: 'student' });
      expect(student.minMonths).toBe(3);
      expect(student.maxMonths).toBe(6);
      expect(student.minAmount).toBe(30000);
      expect(student.maxAmount).toBe(60000);

      const household = emergencyFundTarget({ avgMonthlyEssential: 30000, mode: 'household' });
      expect(household.minMonths).toBe(6);
      expect(household.maxMonths).toBe(12);
      expect(household.minAmount).toBe(180000);
      expect(household.maxAmount).toBe(360000);

      const earner = emergencyFundTarget({ avgMonthlyEssential: 20000, mode: 'earner' });
      expect(earner.minMonths).toBe(3);
      expect(earner.maxMonths).toBe(6);
      expect(earner.minAmount).toBe(60000);
      expect(earner.maxAmount).toBe(120000);
    });
  });

  describe('dailySafeToSpend', () => {
    it('calculates daily safe spending correctly and handles zero daysLeft or overspending', () => {
      // ₹15,000 budget, ₹5,000 spent, 10 days left -> ₹1,000 / day
      const safe = dailySafeToSpend({
        variableBudget: 15000,
        variableSpent: 5000,
        daysLeft: 10,
      });
      expect(safe).toBe(1000);

      // Over budget
      const over = dailySafeToSpend({
        variableBudget: 10000,
        variableSpent: 12000,
        daysLeft: 5,
      });
      expect(over).toBe(0);

      // 0 days left
      const zeroDays = dailySafeToSpend({
        variableBudget: 10000,
        variableSpent: 5000,
        daysLeft: 0,
      });
      expect(zeroDays).toBe(0);
    });
  });

  describe('projectMonthEnd', () => {
    it('projects variable expenses and surplus/shortfall accurately', () => {
      // 10 days elapsed, ₹10,000 variable spent in a 30-day month -> projected ₹30,000 variable
      const projection = projectMonthEnd({
        fixed: 15000,
        variableSpent: 10000,
        daysElapsed: 10,
        daysInMonth: 30,
        income: 60000,
        savingsTarget: 10000,
      });

      expect(projection.projectedVariable).toBe(30000);
      expect(projection.projectedTotalExpenses).toBe(45000);
      expect(projection.projectedSavings).toBe(15000);
      expect(projection.projectedSurplus).toBe(5000);
      expect(projection.onTrackForSavings).toBe(true);
      expect(projection.dailyBurnRate).toBe(1000);
    });
  });

  describe('financialHealthScore', () => {
    it('computes 100-point composite score and parts correctly', () => {
      // Perfect profile: 20% savings (30/30), 6mo emergency (25/25), 20% DTI (25/25), 100% adherence (20/20)
      const perfect = financialHealthScore({
        savingsRate: 20,
        emergencyMonths: 6,
        debtToIncome: 20,
        budgetAdherence: 100,
      });

      expect(perfect.total).toBe(100);
      expect(perfect.parts.savings).toBe(30);
      expect(perfect.parts.emergency).toBe(25);
      expect(perfect.parts.debt).toBe(25);
      expect(perfect.parts.adherence).toBe(20);

      // Deficit profile
      const struggling = financialHealthScore({
        savingsRate: 5,
        emergencyMonths: 0.5,
        debtToIncome: 60,
        budgetAdherence: 50,
      });

      expect(struggling.total).toBeLessThan(40);
      expect(struggling.parts.debt).toBe(0);
      expect(struggling.tip).toContain('emergency fund');
    });
  });

  describe('riskScore', () => {
    it('accurately maps 6 answers to score and bands', () => {
      // All conservative (all 1s)
      const conservative = riskScore([1, 1, 1, 1, 1, 1]);
      expect(conservative.score).toBe(0);
      expect(conservative.band).toBe('conservative');

      // Balanced (all 3s)
      const moderate = riskScore([3, 3, 3, 3, 3, 3]);
      expect(moderate.score).toBe(50);
      expect(moderate.band).toBe('moderate');

      // All aggressive (all 5s)
      const aggressive = riskScore([5, 5, 5, 5, 5, 5]);
      expect(aggressive.score).toBe(100);
      expect(aggressive.band).toBe('aggressive');
    });
  });

  describe('allocationFor', () => {
    it('returns only "build emergency fund first" when emergencyFundMonths < 1', () => {
      expect(allocationFor({ band: 'aggressive', horizonYears: 10, emergencyFundMonths: 0 })).toBe(
        'build emergency fund first'
      );
      expect(allocationFor({ band: 'moderate', horizonYears: 5, emergencyFundMonths: 0.8 })).toBe(
        'build emergency fund first'
      );
    });

    it('returns valid asset allocations summing to 100% when emergencyFundMonths >= 1', () => {
      const aggressiveLong = allocationFor({
        band: 'aggressive',
        horizonYears: 8,
        emergencyFundMonths: 6,
      });

      expect(typeof aggressiveLong).toBe('object');
      if (typeof aggressiveLong === 'object') {
        expect(aggressiveLong.equity).toBe(75);
        expect(aggressiveLong.debt).toBe(15);
        expect(aggressiveLong.gold).toBe(5);
        expect(aggressiveLong.cash).toBe(5);
        const sum = aggressiveLong.equity + aggressiveLong.debt + aggressiveLong.gold + aggressiveLong.cash;
        expect(sum).toBe(100);
      }

      const conservativeShort = allocationFor({
        band: 'conservative',
        horizonYears: 2,
        emergencyFundMonths: 3,
      });

      expect(typeof conservativeShort).toBe('object');
      if (typeof conservativeShort === 'object') {
        const sum = conservativeShort.equity + conservativeShort.debt + conservativeShort.gold + conservativeShort.cash;
        expect(sum).toBe(100);
      }
    });
  });

  // ==========================================================================
  // Plan Screen Engine Tests: Rebalancing, Invariants, Payoff & Explanations
  // ==========================================================================

  describe('Plan Screen Engine Utilities', () => {
    it('rebalanceCaps proportionally adjusts unlocked caps and strictly maintains total == D', () => {
      const caps = [
        { category: 'Rent & PG', amount: 4200, type: 'need' as const },
        { category: 'Food & Groceries', amount: 3000, type: 'need' as const },
        { category: 'Commute & Travel', amount: 1800, type: 'need' as const },
        { category: 'Weekend Hangouts', amount: 1800, type: 'want' as const },
        { category: 'Gadgets & Shopping', amount: 1200, type: 'want' as const },
      ];
      const totalBudget = 12000;
      expect(caps.reduce((s, c) => s + c.amount, 0)).toBe(totalBudget);

      // User increases 'Food & Groceries' (index 1) from 3000 to 5000
      const rebalanced = rebalanceCaps({
        caps,
        targetIndex: 1,
        newAmount: 5000,
        totalBudget,
      });

      expect(rebalanced[1].amount).toBe(5000);
      const sum = rebalanced.reduce((s, c) => s + c.amount, 0);
      expect(sum).toBe(12000); // INVARIANT: sum is strictly 12,000

      // Other caps proportionally reduced
      expect(rebalanced[0].amount).toBeLessThan(4200);
      expect(rebalanced[2].amount).toBeLessThan(1800);
      expect(rebalanced[3].amount).toBeLessThan(1800);
      expect(rebalanced[4].amount).toBeLessThan(1200);
    });

    it('rebalanceCaps respects locked categories and preserves their exact amounts', () => {
      const caps = [
        { category: 'Rent & PG', amount: 4000, type: 'need' as const, locked: true },
        { category: 'Food & Groceries', amount: 3000, type: 'need' as const, locked: false },
        { category: 'Commute', amount: 2000, type: 'need' as const, locked: false },
        { category: 'Entertainment', amount: 3000, type: 'want' as const, locked: false },
      ];
      const totalBudget = 12000;

      // Edit Food from 3000 to 4500
      const rebalanced = rebalanceCaps({
        caps,
        targetIndex: 1,
        newAmount: 4500,
        totalBudget,
      });

      expect(rebalanced[1].amount).toBe(4500);
      expect(rebalanced[0].amount).toBe(4000); // LOCKED: strictly unchanged!
      const sum = rebalanced.reduce((s, c) => s + c.amount, 0);
      expect(sum).toBe(12000);
    });

    it('rebalanceCaps clamps target amount when it exceeds maximum feasible amount', () => {
      const caps = [
        { category: 'Fixed Need', amount: 5000, type: 'need' as const, locked: true },
        { category: 'Flex Need', amount: 4000, type: 'need' as const },
        { category: 'Want', amount: 3000, type: 'want' as const },
      ];
      const totalBudget = 12000;

      // User tries to drag Flex Need to 9000 (max possible is 12000 - 5000 = 7000)
      const rebalanced = rebalanceCaps({
        caps,
        targetIndex: 1,
        newAmount: 9000,
        totalBudget,
      });

      expect(rebalanced[1].amount).toBe(7000);
      expect(rebalanced[0].amount).toBe(5000);
      expect(rebalanced[2].amount).toBe(0);
      const sum = rebalanced.reduce((s, c) => s + c.amount, 0);
      expect(sum).toBe(12000);
    });

    it('rebalanceCaps handles edge case when all other categories are locked', () => {
      const caps = [
        { category: 'Rent', amount: 5000, type: 'need' as const, locked: true },
        { category: 'Bills', amount: 3000, type: 'need' as const, locked: true },
        { category: 'Food', amount: 4000, type: 'need' as const, locked: false },
      ];
      const totalBudget = 12000;

      // User tries to drag Food to 2000, but with all others locked, Food must take remaining 4000
      const rebalanced = rebalanceCaps({
        caps,
        targetIndex: 2,
        newAmount: 2000,
        totalBudget,
      });

      expect(rebalanced[2].amount).toBe(4000);
      const sum = rebalanced.reduce((s, c) => s + c.amount, 0);
      expect(sum).toBe(12000);
    });

    it('rebalanceCaps returns zeroed caps when totalBudget is 0', () => {
      const caps = [
        { category: 'Rent', amount: 3000, type: 'need' as const },
        { category: 'Food', amount: 2000, type: 'need' as const },
      ];
      const rebalanced = rebalanceCaps({
        caps,
        targetIndex: 0,
        newAmount: 1000,
        totalBudget: 0,
      });

      expect(rebalanced[0].amount).toBe(0);
      expect(rebalanced[1].amount).toBe(0);
      expect(rebalanced.reduce((s, c) => s + c.amount, 0)).toBe(0);
    });

    it('calculateEmiPayoff accurately calculates remaining tenure and payoff date', () => {
      const anchorDate = new Date('2026-10-20T00:00:00Z');
      const payoff = calculateEmiPayoff(22, anchorDate);

      expect(payoff.remainingMonths).toBe(22);
      expect(payoff.isPaidOff).toBe(false);
      expect(payoff.payoffDate).toBe('Aug 2028');
      expect(payoff.payoffMonth).toBe('2028-08');

      const zeroPayoff = calculateEmiPayoff(0, anchorDate);
      expect(zeroPayoff.isPaidOff).toBe(true);
    });

    it('explainCapsWeighting produces clear plain-language rationale for needs vs wants', () => {
      const caps = [
        { category: 'Rent & PG', amount: 4200, type: 'need' as const },
        { category: 'Food & Groceries', amount: 3000, type: 'need' as const },
        { category: 'Weekend Hangouts', amount: 1800, type: 'want' as const },
      ];
      const explanation = explainCapsWeighting(caps, 9000);

      expect(explanation.needsWeight).toContain('100%');
      expect(explanation.wantsWeight).toContain('60%');
      expect(explanation.basis).toContain('3 months');
      expect(explanation.breakdown.length).toBe(3);
      expect(explanation.breakdown[0].weightFactor).toBe(1.0);
      expect(explanation.breakdown[2].weightFactor).toBe(0.6);
    });
  });
});
