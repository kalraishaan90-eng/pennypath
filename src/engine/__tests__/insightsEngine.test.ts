import { describe, it, expect } from 'vitest';
import {
  computeCategoryBreakdown,
  assertCategoryTotalsMatchTransactions,
  computeMonthOverMonth,
  computeWhereYouCanSave,
  computeSpendingPace,
  computeHealthScoreDetail,
  computeWeeklySummary,
  PALETTE_TINTS,
  ACCESSIBILITY_PATTERNS,
} from '../insightsEngine';
import { generate60DaysTransactions } from '../../repository/seedData';
import { INITIAL_ENVELOPES, INITIAL_REMINDERS } from '../../repository/seedData';
import { Transaction } from '../../types';

describe('Insights Financial Engine Suite', () => {
  const rohanTransactions = generate60DaysTransactions('rohan');
  const rohanEnvelopes = INITIAL_ENVELOPES.earner;
  const rohanReminders = INITIAL_REMINDERS.earner;

  describe('1. Category Breakdown (Donut + Ranked List)', () => {
    it('aggregates expenses strictly matching raw transactions sum (Dev-only Invariant Assertion)', () => {
      const breakdown = computeCategoryBreakdown(rohanTransactions, '2026-10', rohanEnvelopes);

      const rawExpenseSum = rohanTransactions
        .filter((t) => t.type === 'expense' && t.date.startsWith('2026-10'))
        .reduce((sum, t) => sum + t.amount, 0);

      const computedSum = breakdown.items.reduce((sum, item) => sum + item.totalSpent, 0);

      expect(breakdown.totalExpenses).toBe(rawExpenseSum);
      expect(computedSum).toBe(rawExpenseSum);

      // Verify the invariant assert function doesn't throw on match
      expect(() => {
        assertCategoryTotalsMatchTransactions(breakdown.items, rohanTransactions, '2026-10');
      }).not.toThrow();
    });

    it('dev assertion throws an error if any discrepancy is detected', () => {
      const breakdown = computeCategoryBreakdown(rohanTransactions, '2026-10', rohanEnvelopes);
      // Alter an item to induce a discrepancy
      const tamperedItems = breakdown.items.map((it, idx) =>
        idx === 0 ? { ...it, totalSpent: it.totalSpent + 500 } : it
      );

      expect(() => {
        assertCategoryTotalsMatchTransactions(tamperedItems, rohanTransactions, '2026-10');
      }).toThrow(/Category totals sum/);
    });

    it('uses only palette-derived tints and assigns colorblind accessibility patterns', () => {
      const breakdown = computeCategoryBreakdown(rohanTransactions, '2026-10', rohanEnvelopes);

      expect(breakdown.items.length).toBeGreaterThan(0);
      breakdown.items.forEach((item) => {
        // Must be one of the palette-derived tints
        expect(PALETTE_TINTS).toContain(item.color);
        // Must have non-color accessibility symbol
        expect(ACCESSIBILITY_PATTERNS.some((p) => p.symbol === item.symbol)).toBe(true);
        // Must have rank #
        expect(item.rank).toBeGreaterThanOrEqual(1);
      });

      // Verify ranked order descending by spend
      for (let i = 0; i < breakdown.items.length - 1; i++) {
        expect(breakdown.items[i].totalSpent).toBeGreaterThanOrEqual(
          breakdown.items[i + 1].totalSpent
        );
      }
    });

    it('handles empty transactions without crashing', () => {
      const emptyBreakdown = computeCategoryBreakdown([], '2026-10', rohanEnvelopes);
      expect(emptyBreakdown.totalExpenses).toBe(0);
      expect(emptyBreakdown.items).toEqual([]);
      expect(emptyBreakdown.topCategory).toBeNull();
      expect(emptyBreakdown.wantsPercentage).toBe(0);
      expect(emptyBreakdown.needsPercentage).toBe(0);
    });
  });

  describe('2. Month-over-Month Bars (Spend vs Income vs Saved)', () => {
    it('compares distinct months accurately', () => {
      const mom = computeMonthOverMonth(rohanTransactions, 38000);

      expect(mom.months.length).toBeGreaterThanOrEqual(2);
      const sep = mom.months.find((m) => m.monthKey === '2026-09');
      const oct = mom.months.find((m) => m.monthKey === '2026-10');

      expect(sep).toBeDefined();
      expect(oct).toBeDefined();
      expect(sep?.income).toBe(38000);
      expect(sep?.spent).toBeGreaterThan(0);
      expect(sep?.saved).toBe(sep!.income - sep!.spent);

      expect(mom.latestComparison).toBeDefined();
      expect(typeof mom.latestComparison?.spendChangePercent).toBe('number');
    });

    it('handles empty transactions gracefully without crashing', () => {
      const emptyMoM = computeMonthOverMonth([], 38000);
      expect(emptyMoM.months).toEqual([]);
      expect(emptyMoM.latestComparison).toBeNull();
    });
  });

  describe('3. "Where you can save" Cards (SIP Future Value)', () => {
    it('derives want savings cards using sipFutureValue formula', () => {
      const savings = computeWhereYouCanSave(rohanTransactions, '2026-10', rohanEnvelopes, 12, 5);

      expect(savings.opportunities.length).toBeGreaterThan(0);

      const topOpp = savings.opportunities[0];
      expect(topOpp.recommendedCutPercent).toBe(15);
      expect(topOpp.monthlyFreedAmount).toBe(Math.round(topOpp.currentSpend * 0.15));

      // sipFutureValue formula check: for monthlyFreed at 12% for 60 months
      expect(topOpp.futureValue5Years).toBeGreaterThan(topOpp.monthlyFreedAmount * 60);

      // Verify exact explanation copy requirement
      expect(topOpp.explanation).toContain('% of wants');
      expect(topOpp.explanation).toContain('cutting 15% frees');
      expect(topOpp.explanation).toContain('in 5 years at 12%');
    });

    it('handles zero wants spend without crashing', () => {
      const onlyNeedsTransactions: Transaction[] = [
        {
          id: 'tx-test-1',
          date: '2026-10-05',
          amount: 5000,
          type: 'expense',
          categoryKey: 'budget.cat.pg_rent',
          description: 'Rent',
        },
      ];
      // Only need envelope
      const needEnvelopes = rohanEnvelopes.filter((e) => e.type === 'need');
      const result = computeWhereYouCanSave(onlyNeedsTransactions, '2026-10', needEnvelopes);

      expect(result.totalWantsSpend).toBe(0);
      expect(result.opportunities).toEqual([]);
    });
  });

  describe('4. Spending Pace Line vs Ideal Pace', () => {
    it('computes linear ideal pace curve and cumulative actual spend up to current day', () => {
      const pace = computeSpendingPace(rohanTransactions, '2026-10', 38000);

      expect(pace.daysInMonth).toBe(31);
      expect(pace.currentDay).toBe(20);
      expect(pace.dataPoints.length).toBe(31);

      // Check ideal pace is linear: day 31 ideal pace should equal totalBudget
      const lastPoint = pace.dataPoints[30];
      expect(lastPoint.idealPace).toBe(38000);

      // Day 20 actual cumulative must be a valid number
      const day20 = pace.dataPoints[19];
      expect(day20.isCurrentDay).toBe(true);
      expect(day20.actualCumulative).toBe(pace.currentActualSpend);

      // Future day (Day 25) actual cumulative must be null (only plotted up to today)
      const day25 = pace.dataPoints[24];
      expect(day25.actualCumulative).toBeNull();

      expect(['ahead_of_pace', 'on_track', 'under_pace']).toContain(pace.paceStatus);
    });

    it('handles empty transactions without crashing', () => {
      const pace = computeSpendingPace([], '2026-10', 38000);
      expect(pace.currentActualSpend).toBe(0);
      expect(pace.dataPoints.length).toBe(31);
      expect(pace.paceStatus).toBe('under_pace');
    });
  });

  describe('5. Health Score Detail & "How to add 10 points"', () => {
    it('breaks down into 4 sub-scores with explanations and ranks suggestions by impact', () => {
      const detail = computeHealthScoreDetail(38000, rohanEnvelopes, rohanReminders);

      expect(detail.subScores.length).toBe(4);
      const [savings, discipline, cushion, dues] = detail.subScores;

      expect(savings.id).toBe('savings');
      expect(savings.weightPercent).toBe(30);
      expect(discipline.id).toBe('discipline');
      expect(discipline.weightPercent).toBe(20);
      expect(cushion.id).toBe('cushion');
      expect(cushion.weightPercent).toBe(25);
      expect(dues.id).toBe('dues');
      expect(dues.weightPercent).toBe(25);

      // Sub-scores have benchmark and explanation
      detail.subScores.forEach((p) => {
        expect(p.targetBenchmark).toBeTruthy();
        expect(p.explanation).toBeTruthy();
        expect(p.improvementTip).toBeTruthy();
      });

      // Suggestions ranked by impact
      expect(detail.add10PointsSuggestions.length).toBeGreaterThan(0);
      for (let i = 0; i < detail.add10PointsSuggestions.length - 1; i++) {
        expect(detail.add10PointsSuggestions[i].pointsGain).toBeGreaterThanOrEqual(
          detail.add10PointsSuggestions[i + 1].pointsGain
        );
      }
    });
  });

  describe('6. Weekly Summary Card', () => {
    it('computes current 7-day spending, prior week comparison, peak day, and largest expense', () => {
      const summary = computeWeeklySummary(rohanTransactions);

      expect(summary.currentWeekSpent).toBeGreaterThan(0);
      expect(summary.currentWeekRange).toContain('Oct');
      expect(summary.dailyAverage).toBe(Math.round(summary.currentWeekSpent / 7));
      expect(summary.largestExpense).toBeDefined();
      expect(summary.largestExpense?.amount).toBeGreaterThan(0);
      expect(summary.peakSpendDay).toBeDefined();
    });

    it('handles empty transactions gracefully', () => {
      const emptySummary = computeWeeklySummary([]);
      expect(emptySummary.currentWeekSpent).toBe(0);
      expect(emptySummary.previousWeekSpent).toBe(0);
      expect(emptySummary.largestExpense).toBeNull();
      expect(emptySummary.peakSpendDay).toBeNull();
    });
  });
});
