// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanScreen } from '../components/plan/PlanScreen';
import { repository } from '../repository';
import {
  financeBuildPlan,
  rebalanceCaps,
  calculateEmiPayoff,
  explainCapsWeighting,
} from '../engine';
import '../i18n';

describe('PLAN SCREEN ACCEPTANCE TEST SUITE ("Earn 50k, save 20k")', () => {
  beforeEach(async () => {
    localStorage.clear();
    await repository.resetSeedData('earner');
    await repository.seedPersona('rohan');
  });

  // --------------------------------------------------------------------------
  // Criterion 1: Rohan scenario (50k / 20k / 18k) -> D=12k & caps sum == 12k
  // --------------------------------------------------------------------------
  it('Rohan scenario (50,000 / 20,000 / 18,000) yields D=12,000 and caps sum exactly 12,000', async () => {
    // 1. Direct engine verification
    const engineResult = financeBuildPlan({
      income: 50000,
      savingsTarget: 20000,
      fixedObligations: 18000,
      mode: 'earner',
    });

    expect(engineResult.disposable).toBe(12000);
    expect(engineResult.shortfall).toBe(0);
    expect(engineResult.variableBudget).toBe(12000);
    expect(engineResult.fixes).toHaveLength(0);

    const engineCapsSum = engineResult.caps.reduce((sum, c) => sum + c.amount, 0);
    expect(engineCapsSum).toBe(12000);

    // 2. Component live verification
    render(
      <PlanScreen
        initialIncome={50000}
        initialSavingsTarget={20000}
        initialFixedObligations={18000}
      />
    );

    // Inputs reflect 50k, 20k, 18k
    await waitFor(() => {
      expect(screen.getByLabelText(/Monthly Income/i)).toHaveValue(50000);
      expect(screen.getByLabelText(/Savings Target/i)).toHaveValue(20000);
      expect(screen.getByTestId('fixed-obligations-card')).toBeInTheDocument();
    });

    // Disposable D displays ₹12,000
    const matches = screen.getAllByText(/₹12,000/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Balanced/i)).toBeInTheDocument();

    // Category caps section rendered
    expect(screen.getByText(/Envelope Allocations & Strategy/i)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Criterion 2: Shortfall scenario (30k / 20k / 15k) -> shows 5k + 4 fixes
  // --------------------------------------------------------------------------
  it('Shortfall scenario (30,000 / 20,000 / 15,000) shows 5,000 shortfall + 4 fixes in maroon', async () => {
    // 1. Direct engine verification
    const engineResult = financeBuildPlan({
      income: 30000,
      savingsTarget: 20000,
      fixedObligations: 15000,
      mode: 'earner',
    });

    expect(engineResult.disposable).toBe(-5000);
    expect(engineResult.shortfall).toBe(5000);
    expect(engineResult.variableBudget).toBe(0);
    expect(engineResult.fixes).toHaveLength(4);

    // 2. Component live verification
    render(
      <PlanScreen
        initialIncome={30000}
        initialSavingsTarget={20000}
        initialFixedObligations={15000}
      />
    );

    await waitFor(() => {
      // Shortfall alert present
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.className).toContain('border-accent'); // maroon styling
      expect(screen.getByText(/Projected Shortfall/i)).toBeInTheDocument();
    });

    // All 4 engine fixes rendered as cards with numeric effects
    const fixCards = screen.getAllByRole('button', { name: /^Apply Fix/i });
    expect(fixCards.length).toBe(4);

    // Tapping Fix 1 (Lower savings target) applies it to the draft
    fireEvent.click(fixCards[0]);

    // Savings target should adjust to feasible amount (15,000)
    await waitFor(() => {
      expect(screen.getByLabelText(/Savings Target/i)).toHaveValue(15000);
    });

    // Shortfall disappears and plan becomes balanced!
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Criterion 3: Slider rebalancing never breaks the sum
  // --------------------------------------------------------------------------
  it('slider rebalancing never breaks the sum and respects locked categories', async () => {
    const totalBudget = 12000;
    const initialCaps = [
      { category: 'Rent & PG', amount: 4200, type: 'need' as const, locked: false },
      { category: 'Food & Groceries', amount: 3000, type: 'need' as const, locked: false },
      { category: 'Commute & Travel', amount: 1800, type: 'need' as const, locked: false },
      { category: 'Weekend Hangouts', amount: 1800, type: 'want' as const, locked: false },
      { category: 'Gadgets & Shopping', amount: 1200, type: 'want' as const, locked: false },
    ];

    // Rebalance unlocked
    const rebalanced1 = rebalanceCaps({
      caps: initialCaps,
      targetIndex: 1, // Food
      newAmount: 5500,
      totalBudget,
    });

    expect(rebalanced1[1].amount).toBe(5500);
    const sum1 = rebalanced1.reduce((s, c) => s + c.amount, 0);
    expect(sum1).toBe(12000);

    // Lock Rent at 4200 and rebalance Food to 6000
    const lockedCaps = initialCaps.map((c, i) => (i === 0 ? { ...c, locked: true } : c));
    const rebalanced2 = rebalanceCaps({
      caps: lockedCaps,
      targetIndex: 1,
      newAmount: 6000,
      totalBudget,
    });

    expect(rebalanced2[0].amount).toBe(4200); // strictly pinned!
    expect(rebalanced2[1].amount).toBe(6000);
    const sum2 = rebalanced2.reduce((s, c) => s + c.amount, 0);
    expect(sum2).toBe(12000);

    // Extreme clamp: attempt to set Food higher than remaining budget
    const rebalanced3 = rebalanceCaps({
      caps: lockedCaps,
      targetIndex: 1,
      newAmount: 15000,
      totalBudget,
    });

    // Max possible is 12000 - 4200 = 7800
    expect(rebalanced3[1].amount).toBe(7800);
    expect(rebalanced3[0].amount).toBe(4200);
    const sum3 = rebalanced3.reduce((s, c) => s + c.amount, 0);
    expect(sum3).toBe(12000);
  });

  // --------------------------------------------------------------------------
  // Criterion 4: "Why these caps?" expandable plain-language explanation
  // --------------------------------------------------------------------------
  it('renders "Why these caps?" expandable disclosure with needs vs wants weighting', async () => {
    render(
      <PlanScreen
        initialIncome={50000}
        initialSavingsTarget={20000}
        initialFixedObligations={18000}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Why these caps\?/i)).toBeInTheDocument();
    });

    const whyBtn = screen.getByText(/Why these caps\?/i);
    fireEvent.click(whyBtn);

    // Verify plain language explanation content
    await waitFor(() => {
      expect(screen.getByText(/Needs Weight: 100%/i)).toBeInTheDocument();
      expect(screen.getByText(/Wants Weight: 60%/i)).toBeInTheDocument();
      expect(screen.getByText(/Based on last 3 months/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Criterion 5: Obligations manager with tenure and payoff forecasting
  // --------------------------------------------------------------------------
  it('obligations manager displays obligations with remaining tenure and payoff date for EMIs', async () => {
    // Engine verification of payoff calculation
    const anchor = new Date('2026-10-20T00:00:00Z');
    const payoff = calculateEmiPayoff(22, anchor);
    expect(payoff.payoffDate).toBe('Aug 2028');
    expect(payoff.remainingMonths).toBe(22);

    render(<PlanScreen />);

    // Click Fixed Obligations card to open Obligations Manager
    await waitFor(() => {
      expect(screen.getByTestId('fixed-obligations-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('fixed-obligations-card'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Obligations Manager/i })).toBeInTheDocument();
      // Bike EMI from Rohan seed data
      expect(screen.getByText(/Bike/i)).toBeInTheDocument();
      expect(screen.getByText(/22 months left/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Criterion 6: Save plan -> creates budget_plan + plan_lines and persists
  // --------------------------------------------------------------------------
  it('Save plan creates budget_plan and plan_lines in repository and updates Home', async () => {
    render(
      <PlanScreen
        initialIncome={50000}
        initialSavingsTarget={20000}
        initialFixedObligations={18000}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Plan/i })).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Save Plan/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Plan saved successfully!/i)).toBeInTheDocument();
    });

    // Check stored budget plan
    const savedPlan = await repository.getBudgetPlan('2026-10');
    expect(savedPlan).not.toBeNull();
    expect(savedPlan?.income).toBe(50000);
    expect(savedPlan?.savingsTarget).toBe(20000);
    expect(savedPlan?.fixedTotal).toBe(18000);
    expect(savedPlan?.discretionaryTotal).toBe(12000);

    // Check stored plan lines
    const planLines = await repository.getPlanLines(savedPlan?.id);
    expect(planLines.length).toBeGreaterThan(0);
    const sumLines = planLines.reduce((s, l) => s + l.cap, 0);
    expect(sumLines).toBe(12000);
  });

  // --------------------------------------------------------------------------
  // Criterion 7: "What-if" mode reverts temporary changes until saved
  // --------------------------------------------------------------------------
  it('What-if mode: temporary changes are reversible and not saved until confirmed', async () => {
    render(
      <PlanScreen
        initialIncome={50000}
        initialSavingsTarget={20000}
        initialFixedObligations={18000}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Monthly Income/i)).toHaveValue(50000);
    });

    // Change income to 60000
    const incomeInput = screen.getByLabelText(/Monthly Income/i);
    fireEvent.change(incomeInput, { target: { value: '60000' } });

    // What-If banner appears
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /What-If Mode/i })).toBeInTheDocument();
      expect(screen.getByText(/Discard/i)).toBeInTheDocument();
    });

    // Click Discard
    const discardBtn = screen.getByText(/Discard/i);
    fireEvent.click(discardBtn);

    // Reverts to original value 50000
    await waitFor(() => {
      expect(screen.getByLabelText(/Monthly Income/i)).toHaveValue(50000);
    });
  });
});
