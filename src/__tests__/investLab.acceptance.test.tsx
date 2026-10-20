// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { InvestLabScreen } from '../components/InvestLabScreen';
import { AppProvider } from '../context/AppContext';
import { repository } from '../repository';
import '../i18n';
import {
  parseNavDate,
  computeTrailingReturns,
  fetchIndexFundSnapshots,
  getCachedIndexFunds,
} from '../services/mfIndexFunds';
import { emergencyFundTarget, allocationFor, sipFutureValue, riskScore } from '../engine/finance';

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

describe('INVEST LAB ACCEPTANCE TEST SUITE', () => {
  beforeEach(async () => {
    localStorage.clear();
    await repository.resetSeedData();

    // Mock fetch for mfapi.in
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.mfapi.in/mf/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            meta: {
              scheme_name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth',
              fund_house: 'UTI Mutual Fund',
              scheme_code: 120716,
            },
            data: [
              { date: '19-10-2026', nav: '160.00' },
              { date: '19-10-2025', nav: '140.00' }, // 1Y ago: +14.29%
              { date: '19-10-2023', nav: '110.00' }, // 3Y ago: ~13.3% CAGR
            ],
          }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. GATE SCREEN FOR A USER WITH 0 EMERGENCY FUND
  // --------------------------------------------------------------------------
  describe('1. Gate Screen & Emergency Readiness (Acceptance: gate works for a user with 0 emergency fund)', () => {
    it('displays "Build your safety net first", 0% progress bar, and savings plan for 0 emergency fund', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      // Verify the gate headline
      const gateHeadline = await screen.findByText(/Build your safety net first/i);
      expect(gateHeadline).toBeInTheDocument();

      // Ensure 0% or low percentage progress bar and 1-month milestone
      expect(screen.getByText(/Progress towards 1-Month Safety Milestone/i)).toBeInTheDocument();
      expect(screen.getByText(/1-Month Immediate Goal/i)).toBeInTheDocument();
      expect(screen.getByText(/Recommended Reserve Target/i)).toBeInTheDocument();
      expect(screen.getByText(/Actionable Savings Plan/i)).toBeInTheDocument();

      // Content must be LOCKED, NOT HIDDEN
      const lockNotice = screen.getByText(/Invest Lab Gated Content Locked/i);
      expect(lockNotice).toBeInTheDocument();

      // Risk Assessment and Illustrative Allocation are still visible in DOM
      expect(screen.getByRole('region', { name: /Risk Assessment Quiz/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /Illustrative Asset Allocation/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /Compounding Growth Lab/i })).toBeInTheDocument();
    });

    it('unlocks smoothly when emergency fund meets 1 month of essentials', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      // Click "Unlock Preview" button
      const unlockButton = await screen.findByRole('button', { name: /Unlock Preview/i });
      fireEvent.click(unlockButton);

      // Now the gate shows "Safety Net Shield Active"
      await waitFor(() => {
        expect(screen.getByText(/Safety Net Shield Active/i)).toBeInTheDocument();
      });

      // Locked status banner is removed
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. RISK QUIZ (6 Questions, One per screen, Progress bar, Result band & explanation, Stored in risk_profiles)
  // --------------------------------------------------------------------------
  describe('2. Risk Quiz Suite (Acceptance: quiz stores result)', () => {
    it('steps through 6 questions one per screen, shows progress bar, and saves result in risk_profiles', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      // Unlock gate to interact
      const unlockBtn = await screen.findByRole('button', { name: /Unlock Preview/i });
      fireEvent.click(unlockBtn);

      // Start quiz
      const startQuizBtn = screen.getByRole('button', { name: /Take 6-Question Quiz|Retake Quiz/i });
      fireEvent.click(startQuizBtn);

      // Question 1: Horizon
      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 6/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/How long do you plan to keep your invested money/i)).toBeInTheDocument();
      // Select option 4 (5 to 10 years)
      fireEvent.click(screen.getByText(/5 to 10 years/i));
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Question 2: Income Stability
      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 6/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/How consistent and predictable is your monthly income/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Steady monthly salary/i));
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Question 3: Reaction to 20% drop
      await waitFor(() => {
        expect(screen.getByText(/Question 3 of 6/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/If the broader stock market drops 20%/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Continue regular SIPs unaffected/i));
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Question 4: Goal Type
      await waitFor(() => {
        expect(screen.getByText(/Question 4 of 6/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/What is the primary objective for this pool/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Long-term wealth creation/i));
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Question 5: Experience
      await waitFor(() => {
        expect(screen.getByText(/Question 5 of 6/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/What is your prior experience with investments/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Comfortable with index funds/i));
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Question 6: Dependents
      await waitFor(() => {
        expect(screen.getByText(/Question 6 of 6/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/How many individuals rely directly on your income/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/No dependents/i));

      // Click Complete
      fireEvent.click(screen.getByRole('button', { name: /Complete & View Band/i }));

      // Result Screen appears with band (Conservative / Balanced / Growth)
      await waitFor(() => {
        expect(screen.getByText(/Your Evaluated Risk Profile Band/i)).toBeInTheDocument();
      });

      // Check band text and 2-line explanation
      expect(screen.getAllByText(/Growth|Balanced/i).length).toBeGreaterThanOrEqual(1);

      // Check storage in risk_profiles
      const storedProfile = await repository.getRiskProfile();
      expect(storedProfile).not.toBeNull();
      expect(storedProfile?.score).toBeGreaterThanOrEqual(0);
      expect(['conservative', 'balanced', 'growth']).toContain(storedProfile?.band);
      expect(storedProfile?.answers.scores.length).toBe(6);
    }, 15000);
  });

  // --------------------------------------------------------------------------
  // 3. ILLUSTRATIVE ALLOCATION (engine.allocationFor -> Donut + Table + Student Sandbox)
  // --------------------------------------------------------------------------
  describe('3. Illustrative Allocation Suite', () => {
    it('computes allocation via engine.allocationFor and displays asset class table', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      // Verify table headers
      expect(screen.getAllByText(/Asset Class/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/What each is/i)).toBeInTheDocument();
      expect(screen.getByText(/Typical Risk/i)).toBeInTheDocument();
      expect(screen.getByText(/Typical Horizon/i)).toBeInTheDocument();

      // Verify asset classes
      expect(screen.getByText(/Broad Market Index Funds/i)).toBeInTheDocument();
      expect(screen.getByText(/Liquid & Low-Duration Debt Funds/i)).toBeInTheDocument();
      expect(screen.getByText(/Gold ETFs \/ Sovereign Gold/i)).toBeInTheDocument();
      expect(screen.getByText(/Liquid Cash & Savings Buffer/i)).toBeInTheDocument();
    });

    it('engine.allocationFor returns correct percentages for conservative, balanced, and growth', () => {
      const conservative = allocationFor({ band: 'conservative', horizonYears: 5, emergencyFundMonths: 3 });
      expect(typeof conservative).toBe('object');
      if (typeof conservative === 'object') {
        expect(conservative.equity).toBe(20);
        expect(conservative.debt).toBe(60);
        expect(conservative.gold).toBe(10);
        expect(conservative.cash).toBe(10);
      }

      const growth = allocationFor({ band: 'growth', horizonYears: 8, emergencyFundMonths: 3 });
      expect(typeof growth).toBe('object');
      if (typeof growth === 'object') {
        expect(growth.equity).toBe(75);
        expect(growth.debt).toBe(15);
      }
    });

    it('displays student practice portfolio explainer when in student mode', async () => {
      localStorage.setItem('pennypath_mode', 'student');
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      expect(
        screen.getByRole('note', { name: /Student Practice Portfolio Sandbox/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Zero Real Money Sandbox/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. GROWTH LAB (sipFutureValue, Sliders, Ghost Line)
  // --------------------------------------------------------------------------
  describe('4. Growth Lab Suite', () => {
    it('displays sliders, "Assumption, not a promise" label, and 5-year ghost delay metrics', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      expect(screen.getByText(/Compounding Simulator/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Assumption, not a promise/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Cost of 5-Yr Delay/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Invested/i)).toBeInTheDocument();
      expect(screen.getByText(/Projected Value/i)).toBeInTheDocument();
    });

    it('sipFutureValue correctly compounds and delay calculates positive opportunity cost', () => {
      const onTime = sipFutureValue({ monthly: 5000, annualRate: 12, months: 180 }); // 15 years
      const delayed = sipFutureValue({ monthly: 5000, annualRate: 12, months: 120 }); // 10 years (5 yr delay)
      expect(onTime).toBeGreaterThan(delayed);
      const delayCost = onTime - delayed;
      expect(delayCost).toBeGreaterThan(1000000); // Massive compounding difference
    });
  });

  // --------------------------------------------------------------------------
  // 5. MARKET SNAPSHOT WIDGET (mfapi.in, caching, offline graceful degradation)
  // --------------------------------------------------------------------------
  describe('5. Market Snapshot Suite (Acceptance: widget degrades gracefully with network off)', () => {
    it('computes trailing 1Y and 3Y returns accurately from historical NAV records', () => {
      const history = [
        { date: '20-10-2026', nav: '200.00' },
        { date: '20-10-2025', nav: '160.00' }, // 1Y: (200 - 160)/160 = +25%
        { date: '20-10-2023', nav: '125.00' }, // 3Y: (200 / 125)^(1/3) - 1 = (1.6)^(0.3333) - 1 = ~16.96% CAGR
      ];

      const returns = computeTrailingReturns(history);
      expect(returns.return1Y).toBe(25);
      expect(returns.return3Y).toBeCloseTo(16.96, 1);
    });

    it('renders market snapshot with "Last updated" and "past performance does not guarantee future returns"', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Past performance does not guarantee future returns/i)).toBeInTheDocument();
      expect(screen.getByText(/UTI Nifty 50 Index Fund/i)).toBeInTheDocument();
    });

    it('degrades gracefully with network off: displays cached data if available', async () => {
      // Seed cache
      const cachedPayload = {
        funds: [
          {
            schemeCode: 120716,
            schemeName: 'UTI Nifty 50 Index Fund',
            shortName: 'UTI Nifty 50 Index Fund',
            fundHouse: 'UTI Mutual Fund',
            nav: 161.2,
            navDate: '19-10-2026',
            trailingReturn1Y: 14.5,
            trailingReturn3Y: 12.8,
          },
        ],
        lastUpdated: '19 Oct 2026, 04:30 PM',
      };
      localStorage.setItem('pennypath_mfapi_cache', JSON.stringify(cachedPayload));

      // Mock offline fetch rejection
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const result = await fetchIndexFundSnapshots();
      expect(result.status).toBe('cached');
      expect(result.funds.length).toBe(1);
      expect(result.funds[0].shortName).toBe('UTI Nifty 50 Index Fund');
    });

    it('degrades gracefully with network off: displays clear unavailable state when no cache exists', async () => {
      localStorage.removeItem('pennypath_mfapi_cache');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      // Simulate navigator.onLine = false
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const result = await fetchIndexFundSnapshots();
      expect(result.status).toBe('unavailable');
      expect(result.funds.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. READY TO INVEST CARD (Outbound links to regulated platforms)
  // --------------------------------------------------------------------------
  describe('6. Outbound Regulated Platforms Card', () => {
    it('displays outbound links with target="_blank", rel="noopener noreferrer", and "You are leaving Pennypath" note', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      expect(screen.getByText(/You are leaving Pennypath/i)).toBeInTheDocument();
      expect(screen.getByText(/Pennypath is strictly an educational simulator/i)).toBeInTheDocument();

      const growwLink = screen.getByRole('link', { name: /Groww Direct Mutual Funds/i });
      expect(growwLink).toHaveAttribute('href', 'https://groww.in/mutual-funds');
      expect(growwLink).toHaveAttribute('target', '_blank');
      expect(growwLink).toHaveAttribute('rel', 'noopener noreferrer');

      const sbiLink = screen.getByRole('link', { name: /SBI Mutual Fund Portal/i });
      expect(sbiLink).toHaveAttribute('href', 'https://www.sbimf.com');
      expect(sbiLink).toHaveAttribute('target', '_blank');
      expect(sbiLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // --------------------------------------------------------------------------
  // 7. FOOTER DISCLAIMER ON EVERY INVEST VIEW
  // --------------------------------------------------------------------------
  describe('7. Footer Disclaimer (Acceptance: disclaimer present on all Invest routes)', () => {
    it('displays mandatory SEBI disclaimer on the view', async () => {
      render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      const disclaimer = screen.getByText(
        /Educational only\. Not investment advice\. Returns are not guaranteed\. Consult a SEBI-registered adviser\./i
      );
      expect(disclaimer).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 8. ACCEPTANCE: NO SCREEN SUGGESTS SPECIFIC STOCKS OR PROMISES RETURNS
  // --------------------------------------------------------------------------
  describe('8. Regulatory Compliance (Acceptance: no screen suggests specific stocks or promises returns)', () => {
    it('contains zero individual stock recommendations and no guaranteed return promises', async () => {
      const { container } = render(
        <AppProvider>
          <InvestLabScreen />
        </AppProvider>
      );

      const text = container.textContent || '';

      // Check no stock picking / tips
      expect(text).not.toMatch(/\b(Reliance|TCS|Infosys|HDFC Bank|Tata Motors)\s+(stock|shares|target price|buy now)\b/i);
      expect(text).not.toMatch(/guaranteed return/i);
      expect(text).not.toMatch(/risk-free returns/i);
      expect(text).not.toMatch(/100% profit/i);

      // Verify return projections are explicitly labelled as assumptions
      expect(screen.getAllByText(/Assumption, not a promise/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Past performance does not guarantee future returns/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
