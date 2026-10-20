import { describe, it, expect, beforeEach } from 'vitest';
import { LocalSeededRepository } from '../localSeededRepository';

describe('LocalSeededRepository (Offline & Demo Mode)', () => {
  let repo: LocalSeededRepository;

  beforeEach(() => {
    repo = new LocalSeededRepository();
  });

  it('correctly seeds Rohan (Earner) demo data with 60 days transactions and mid-month state', async () => {
    const profile = await repo.seedPersona('rohan');
    expect(profile.name).toBe('Rohan Sharma');
    expect(profile.mode).toBe('earner');
    expect(profile.monthlyIncome).toBe(38000);

    expect(repo.isDemoMode()).toBe(true);
    expect(repo.getDemoPersona()).toBe('rohan');

    // Obligations
    const obligations = await repo.getObligations();
    expect(obligations.length).toBeGreaterThanOrEqual(4);
    const emi = obligations.find(o => o.type === 'emi');
    expect(emi).toBeDefined();
    expect(emi?.amount).toBe(3200);
    expect(emi?.emiDetails?.principal).toBe(90000);
    expect(emi?.emiDetails?.remainingMonths).toBe(22);

    // Goal
    const goals = await repo.getGoals('earner');
    expect(goals.length).toBeGreaterThan(0);
    expect(goals[0].targetAmount).toBe(50000);
    expect(goals[0].currentAmount).toBe(22000);

    // 60 days transactions
    const txs = await repo.getTransactions();
    expect(txs.length).toBeGreaterThanOrEqual(40);
    
    // Check that we have September and October transactions
    const hasSep = txs.some(t => t.date.startsWith('2026-09'));
    const hasOct = txs.some(t => t.date.startsWith('2026-10'));
    expect(hasSep).toBe(true);
    expect(hasOct).toBe(true);

    // Active Budget plan exists
    const plan = await repo.getBudgetPlan('2026-10');
    expect(plan).toBeDefined();
    expect(plan?.income).toBe(38000);
    expect(plan?.discretionaryTotal).toBeGreaterThan(0);

    // Mid-month envelopes have spent amounts
    const envelopes = await repo.getEnvelopes('earner');
    const spentEnvelopes = envelopes.filter(e => e.spent > 0);
    expect(spentEnvelopes.length).toBeGreaterThan(0);
  });

  it('correctly seeds Meena (Household) and Aarav (Student) personas offline', async () => {
    // Meena
    const meena = await repo.seedPersona('meena');
    expect(meena.name).toBe('Meena Patel');
    expect(meena.mode).toBe('household');
    expect(meena.monthlyIncome).toBe(55000);

    const meenaObs = await repo.getObligations();
    expect(meenaObs.some(o => o.type === 'chit')).toBe(true);

    // Aarav
    const aarav = await repo.seedPersona('aarav');
    expect(aarav.name).toBe('Aarav Verma');
    expect(aarav.mode).toBe('student');
    expect(aarav.monthlyIncome).toBe(12000);
    expect(repo.getDemoPersona()).toBe('aarav');
  });

  it('exitDemo resets state completely and exits demo mode', async () => {
    await repo.seedPersona('rohan');
    expect(repo.isDemoMode()).toBe(true);

    await repo.exitDemo();
    expect(repo.isDemoMode()).toBe(false);
    expect(repo.getDemoPersona()).toBeNull();
  });
});
