import { describe, it, expect } from 'vitest';
import { formatINR, parseINR, roundToRupee } from '../currency';
import { calculateBudgetStatus, calculateSavingsHealthScore, PERSONA_CONFIGS, buildPlan } from '../budget';
import { calculateEMI, calculateSIP, calculateTargetSIP, calculateCompoundInterest } from '../calculators';
import { calculateEmergencyReadiness, suggestAssetAllocation } from '../investGuidance';

describe('Currency Engine (INR)', () => {
  it('formats standard INR amounts with Indian comma grouping', () => {
    // In en-IN: 1,50,000
    const formatted = formatINR(150000);
    expect(formatted).toContain('1,50,000');
    expect(formatted).toContain('₹');
  });

  it('formats compact amounts in Lakhs and Crores', () => {
    expect(formatINR(250000, { compact: true })).toMatch(/2\.5\s*L/);
    expect(formatINR(12500000, { compact: true })).toMatch(/1\.25\s*Cr/);
  });

  it('formats paise when requested', () => {
    const formatted = formatINR(1050.5, { showPaise: true });
    expect(formatted).toContain('1,050.50');
  });

  it('parses formatted string inputs safely', () => {
    expect(parseINR('₹ 1,50,000')).toBe(150000);
    expect(parseINR('45,000')).toBe(45000);
    expect(parseINR('')).toBe(0);
    expect(parseINR('abc')).toBe(0);
  });

  it('rounds to nearest rupee', () => {
    expect(roundToRupee(1250.4)).toBe(1250);
    expect(roundToRupee(1250.6)).toBe(1251);
  });
});

describe('Budgeting Engine', () => {
  it('provides configured persona profiles', () => {
    expect(PERSONA_CONFIGS.student.monthlyIncome).toBe(12000);
    expect(PERSONA_CONFIGS.household.monthlyIncome).toBe(45000);
    expect(PERSONA_CONFIGS.earner.monthlyIncome).toBe(38000);
  });

  it('correctly calculates budget remaining and status', () => {
    // Under budget
    const safe = calculateBudgetStatus(5000, 3000);
    expect(safe.remaining).toBe(2000);
    expect(safe.percentageSpent).toBe(60);
    expect(safe.status).toBe('good');
    expect(safe.isOverBudget).toBe(false);

    // Warning near threshold (>= 85%)
    const warning = calculateBudgetStatus(5000, 4500);
    expect(warning.percentageSpent).toBe(90);
    expect(warning.status).toBe('warning');
    expect(warning.isOverBudget).toBe(false);

    // Over budget alert
    const alert = calculateBudgetStatus(5000, 5200);
    expect(alert.remaining).toBe(-200);
    expect(alert.percentageSpent).toBe(104);
    expect(alert.status).toBe('alert');
    expect(alert.isOverBudget).toBe(true);
  });

  it('computes financial safety health score properly', () => {
    // Excellent savings (saving >= 25% + goals met)
    const healthy = calculateSavingsHealthScore(50000, 30000, 10000);
    expect(healthy.score).toBeGreaterThanOrEqual(75);
    expect(healthy.status).toBe('excellent');

    // Negative savings / deficit
    const deficit = calculateSavingsHealthScore(30000, 35000, 5000);
    expect(deficit.score).toBe(0);
    expect(deficit.status).toBe('at_risk');
  });

  it('correctly calculates buildPlan and identifies shortfall with fixes (income 30000, save 20000, fixed 15000)', () => {
    // Acceptance criterion: shortfall review state with (income 30,000, save 20,000, fixed 15,000)
    const plan = buildPlan({
      income: 30000,
      savingsTarget: 20000,
      fixedTotal: 15000,
      mode: 'earner',
      daysInMonth: 30,
    });

    // D = income - fixed - savings = 30000 - 15000 - 20000 = -5000
    expect(plan.discretionaryTotal).toBe(-5000);
    expect(plan.shortfall).toBe(5000);
    expect(plan.hasShortfall).toBe(true);
    expect(plan.feasibility).toBe('shortfall');
    expect(plan.fixes.length).toBeGreaterThan(0);
    
    // Check that engine suggested reducing savings to a feasible level
    const reduceSavingsFix = plan.fixes.find(f => f.type === 'reduce_savings');
    expect(reduceSavingsFix).toBeDefined();
    expect(reduceSavingsFix?.suggestedValue).toBeLessThanOrEqual(15000);
  });

  it('correctly calculates healthy plan when income comfortably exceeds fixed and savings', () => {
    const plan = buildPlan({
      income: 38000,
      savingsTarget: 5000,
      fixedTotal: 15000,
      mode: 'earner',
      daysInMonth: 30,
    });

    // D = 38000 - 15000 - 5000 = 18000
    expect(plan.discretionaryTotal).toBe(18000);
    expect(plan.dailyDiscretionary).toBe(600); // 18000 / 30
    expect(plan.shortfall).toBe(0);
    expect(plan.hasShortfall).toBe(false);
    expect(plan.feasibility).toBe('healthy');
    expect(plan.fixes.length).toBe(0);
  });
});

describe('Financial Calculators Engine', () => {
  it('calculates standard loan EMI accurately', () => {
    // ₹10,00,000 loan at 9% p.a. for 240 months (20 years)
    // EMI is approx ₹8,997
    const result = calculateEMI(1000000, 9, 240);
    expect(result.monthlyEMI).toBe(8997);
    expect(result.totalPayment).toBe(8997 * 240);
    expect(result.totalInterest).toBe(result.totalPayment - 1000000);
    expect(result.amortizationSummary.length).toBe(12);
  });

  it('handles zero percent or edge cases in EMI', () => {
    const zeroRate = calculateEMI(12000, 0, 12);
    expect(zeroRate.monthlyEMI).toBe(1000);
    expect(zeroRate.totalInterest).toBe(0);
  });

  it('calculates SIP investment growth', () => {
    // ₹5,000 monthly for 5 years at 12% p.a.
    // Invested: 5000 * 60 = 3,00,000
    // Expected maturity around ₹4,12,432
    const sip = calculateSIP(5000, 12, 5);
    expect(sip.investedAmount).toBe(300000);
    expect(sip.totalValue).toBeGreaterThan(400000);
    expect(sip.estimatedReturns).toBe(sip.totalValue - 300000);
    expect(sip.yearlyBreakdown.length).toBe(5);
  });

  it('calculates reverse target SIP required for a goal', () => {
    // Target ₹5,00,000 in 3 years at 12% p.a.
    const target = calculateTargetSIP(500000, 12, 3);
    expect(target.requiredMonthlySIP).toBeGreaterThan(0);
    // Verifying forward calculation with this SIP gets at least the target
    const verifyForward = calculateSIP(target.requiredMonthlySIP, 12, 3);
    expect(verifyForward.totalValue).toBeGreaterThanOrEqual(490000);
  });

  it('calculates compound interest and inflation adjusted value', () => {
    // ₹1,00,000 at 7% p.a. for 5 years compounded quarterly
    // A = 100000 * (1 + 0.07/4)^20 ≈ ₹1,41,478
    const comp = calculateCompoundInterest(100000, 7, 5, 4, 6);
    expect(comp.maturityAmount).toBe(141478);
    expect(comp.interestEarned).toBe(41478);
    expect(comp.realPurchasingPower).toBeLessThan(comp.maturityAmount);
  });
});

describe('Educational Invest Guidance Engine', () => {
  it('evaluates emergency readiness accurately', () => {
    const expenses = 25000;
    // 6 months target = 1,50,000
    const ready = calculateEmergencyReadiness(150000, expenses, 6);
    expect(ready.isReady).toBe(true);
    expect(ready.monthsCovered).toBe(6);
    expect(ready.status).toBe('secure');

    const low = calculateEmergencyReadiness(20000, expenses, 6);
    expect(low.isReady).toBe(false);
    expect(low.status).toBe('critical');
    expect(low.shortfall).toBe(130000);
  });

  it('suggests educational asset allocations based on horizon and profile', () => {
    const shortHorizon = suggestAssetAllocation('earner', 'growth', 1);
    expect(shortHorizon.fixedIncomePercent + shortHorizon.liquidEmergencyPercent).toBeGreaterThanOrEqual(70);

    const longStudent = suggestAssetAllocation('student', 'growth', 5);
    expect(longStudent.equityIndexPercent).toBeGreaterThanOrEqual(50);
  });
});
