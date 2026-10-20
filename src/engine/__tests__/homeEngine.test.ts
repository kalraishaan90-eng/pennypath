import { describe, it, expect } from 'vitest';
import {
  getDaysInMonth,
  getDaysRemainingInMonth,
  calculateHeroSafeToSpend,
  calculateProjectedMonthEnd,
  calculateFinancialHealth,
  calculateCategoryCaps,
  calculateUpcomingDues,
  computeHomeDashboard,
} from '../homeEngine';
import { INITIAL_ENVELOPES, INITIAL_REMINDERS } from '../../repository/seedData';
import { UserProfile } from '../../types';

describe('Home Dashboard Engine (Pure Math & Business Logic)', () => {
  it('correctly calculates days in month and days remaining', () => {
    expect(getDaysInMonth(2026, 10)).toBe(31);
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2026, 2)).toBe(28);

    const testDate = new Date(2026, 9, 20); // 20 Oct 2026
    const rem = getDaysRemainingInMonth(testDate);
    expect(rem.currentDay).toBe(20);
    expect(rem.totalDaysInMonth).toBe(31);
    expect(rem.daysRemaining).toBe(12);
  });

  describe('calculateHeroSafeToSpend', () => {
    it('calculates daily safe to spend accurately from non-goal envelopes', () => {
      const earnerEnvelopes = INITIAL_ENVELOPES.earner;
      const res = calculateHeroSafeToSpend(earnerEnvelopes, 12, 31, 20);
      expect(res.variableRemaining).toBe(1000);
      expect(res.daysRemaining).toBe(12);
      expect(res.dailySafeToSpend).toBe(Math.floor(1000 / 12)); // 83
      expect(res.variablePercentUsed).toBe(97);
    });

    it('handles zero or negative remaining budget gracefully without negative numbers', () => {
      const overspentEnvelopes = [
        { id: '1', categoryKey: 'test', allocated: 5000, spent: 6000, icon: 'Zap', type: 'want' as const },
      ];
      const res = calculateHeroSafeToSpend(overspentEnvelopes, 10, 30, 20);
      expect(res.variableRemaining).toBe(0);
      expect(res.dailySafeToSpend).toBe(0);
      expect(res.variablePercentUsed).toBe(100);
    });
  });

  describe('calculateProjectedMonthEnd', () => {
    it('projects month-end savings based on variable run-rate and flags maroon when below target', () => {
      const earnerEnvelopes = INITIAL_ENVELOPES.earner;
      const income = 38000;
      const res = calculateProjectedMonthEnd(income, earnerEnvelopes, 20, 31);
      
      expect(res.targetSavings).toBe(8000);
      expect(res.savedSoFar).toBe(9000);
      expect(res.isProjectedBelowTarget).toBe(true);
    });

    it('returns positive projection when spending is well within budget', () => {
      const conservativeEnvelopes = [
        { id: '1', categoryKey: 'food', allocated: 10000, spent: 2000, icon: 'Utensils', type: 'need' as const },
        { id: '2', categoryKey: 'goal', allocated: 5000, spent: 5000, icon: 'Target', type: 'goal' as const },
      ];
      const res = calculateProjectedMonthEnd(20000, conservativeEnvelopes, 15, 30);
      expect(res.targetSavings).toBe(5000);
      expect(res.projectedMonthEnd).toBeGreaterThan(5000);
      expect(res.isProjectedBelowTarget).toBe(false);
    });
  });

  describe('calculateFinancialHealth', () => {
    it('returns score (0-100), status, tip, and exactly four sub-bars', () => {
      const earnerEnvelopes = INITIAL_ENVELOPES.earner;
      const earnerReminders = INITIAL_REMINDERS.earner;
      const res = calculateFinancialHealth(38000, earnerEnvelopes, earnerReminders);

      expect(res.score).toBeGreaterThanOrEqual(0);
      expect(res.score).toBeLessThanOrEqual(100);
      expect(['excellent', 'fair', 'at_risk']).toContain(res.status);
      expect(res.subBars).toHaveLength(4);
      expect(res.subBars.map(s => s.key)).toEqual(['savings', 'discipline', 'goals', 'dues']);
      expect(res.tipKey).toBeTruthy();
    });
  });

  describe('calculateCategoryCaps', () => {
    it('returns top 5 categories and classifies status into fine (ink), near_limit (sand), over (maroon)', () => {
      const earnerEnvelopes = INITIAL_ENVELOPES.earner;
      const caps = calculateCategoryCaps(earnerEnvelopes);

      expect(caps).toHaveLength(5);
      
      const overCategory = caps.find(c => c.categoryKey === 'budget.cat.weekend_hangouts');
      expect(overCategory).toBeDefined();
      expect(overCategory!.status).toBe('over');
      expect(overCategory!.statusColor).toBe('maroon');

      const nearLimitCategory = caps.find(c => c.categoryKey === 'budget.cat.gadgets_shopping');
      expect(nearLimitCategory).toBeDefined();
      expect(nearLimitCategory!.status).toBe('near_limit');
      expect(nearLimitCategory!.statusColor).toBe('sand');
    });
  });

  describe('calculateUpcomingDues', () => {
    it('filters dues within next 7 days and attaches correct chip statuses', () => {
      const earnerReminders = INITIAL_REMINDERS.earner;
      const dues = calculateUpcomingDues(earnerReminders, '2026-10-20', 7);

      expect(dues.length).toBeGreaterThan(0);
      
      const todayDue = dues.find(d => d.dueDate === '2026-10-20');
      expect(todayDue).toBeDefined();
      expect(todayDue!.isPaid).toBe(true);
      expect(todayDue!.chipStatus).toBe('paid');

      const cardDue = dues.find(d => d.dueDate === '2026-10-27');
      expect(cardDue).toBeDefined();
      expect(cardDue!.daysLeft).toBe(7);
      expect(cardDue!.chipStatus).toBe('days_left');
    });
  });

  describe('computeHomeDashboard (Complete Aggregator)', () => {
    it('populates every card model for Rohan without missing fields', () => {
      const profile: UserProfile = {
        id: 'usr-earner',
        name: 'Rohan',
        mode: 'earner',
        monthlyIncome: 38000,
        language: 'en',
      };
      const envelopes = INITIAL_ENVELOPES.earner;
      const reminders = INITIAL_REMINDERS.earner;
      const testDate = new Date('2026-10-20T10:30:00+05:30');

      const data = computeHomeDashboard(profile, envelopes, reminders, testDate);

      expect(data.hero.dailySafeToSpend).toBeGreaterThanOrEqual(0);
      expect(data.hero.daysRemaining).toBe(12);
      expect(data.savingsTracker.targetSavings).toBe(8000);
      expect(data.healthScore.subBars).toHaveLength(4);
      expect(data.categoryCaps).toHaveLength(5);
      expect(data.upcomingDues.length).toBeGreaterThan(0);
    });
  });
});
