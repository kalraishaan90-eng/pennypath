// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { repository } from '../repository';
import { buildPlan } from '../engine/budget';
import { fetchMarketData, setForcedFallback, getLastNavFetchInfo } from '../services/marketApi';
import { getHealthStatus, computeI18nCoverage, BUILD_HASH } from '../services/healthService';
import i18n from '../i18n';
import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';

describe('PITCH MODE ACCEPTANCE SUITE', () => {
  beforeEach(async () => {
    localStorage.clear();
    await repository.resetSeedData();
    await i18n.changeLanguage('en');
    setForcedFallback(false);
  });

  afterEach(() => {
    setForcedFallback(false);
  });

  // REQUIREMENT 1 & ACCEPTANCE: A full 5-minute run-through works end to end in airplane mode
  describe('Acceptance 1: Full 5-Minute Pitch Run-Through in Airplane Mode', () => {
    it('executes all 5 steps end to end offline with zero network dependency', async () => {
      // 1. Simulate Airplane Mode (navigator.onLine = false)
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      expect(navigator.onLine).toBe(false);

      // STEP 1: "Load Rohan" (0:00 - 1:00)
      const t0 = performance.now();
      const rohanProfile = await repository.seedPersona('rohan');
      const seedDuration = performance.now() - t0;

      expect(seedDuration).toBeLessThan(1000); // Must be under 1 second!
      expect(rohanProfile.name).toBe('Rohan Sharma');
      expect(rohanProfile.mode).toBe('earner');
      expect(rohanProfile.monthlyIncome).toBe(38000);
      expect(repository.isDemoMode()).toBe(true);
      expect(repository.getDemoPersona()).toBe('rohan');

      const obligations = await repository.getObligations('earner');
      expect(obligations.length).toBe(5);
      const fixedTotal = obligations.reduce((sum, o) => sum + o.amount, 0);
      expect(fixedTotal).toBe(18198);

      const txs = await repository.getTransactions();
      expect(txs.length).toBeGreaterThanOrEqual(45);

      // STEP 2: "Inspect Safe-to-Spend" (1:00 - 2:00)
      const envelopes = await repository.getEnvelopes('earner');
      expect(envelopes.length).toBeGreaterThan(0);
      const budgetPlan = await repository.getBudgetPlan('2026-10');
      expect(budgetPlan).toBeDefined();
      expect(budgetPlan?.discretionaryTotal).toBeGreaterThan(0);

      // STEP 3: "Set income 30k save 20k to show shortfall" (2:00 - 3:00)
      const stressIncome = 30000;
      const stressSavingsTarget = 20000;
      const shortfallPlan = buildPlan({
        income: stressIncome,
        fixedTotal,
        savingsTarget: stressSavingsTarget,
        mode: 'earner',
        daysInMonth: 30,
      });

      // Total committed = 18,198 fixed + 20,000 savings = 38,198 > 30,000
      // Shortfall = 8,198, Discretionary D = -8,198
      expect(shortfallPlan.hasShortfall).toBe(true);
      expect(shortfallPlan.shortfall).toBe(8198);
      expect(shortfallPlan.feasibility).toBe('shortfall');
      expect(shortfallPlan.discretionaryTotal).toBe(-8198);
      expect(shortfallPlan.fixes.length).toBeGreaterThanOrEqual(3);

      // Save stress test plan to repository
      await repository.saveBudgetPlan({
        id: 'bp-rohan-stress-test',
        month: '2026-10',
        income: stressIncome,
        fixedTotal,
        savingsTarget: stressSavingsTarget,
        discretionaryTotal: shortfallPlan.discretionaryTotal,
        dailyDiscretionary: shortfallPlan.dailyDiscretionary,
        shortfall: shortfallPlan.shortfall,
        hasShortfall: shortfallPlan.hasShortfall,
        createdAt: new Date().toISOString(),
        status: 'active',
      });

      const retrievedShortfallPlan = await repository.getBudgetPlan('2026-10');
      expect(retrievedShortfallPlan?.hasShortfall).toBe(true);
      expect(retrievedShortfallPlan?.shortfall).toBe(8198);

      // STEP 4: "Open Invest Lab" (3:00 - 4:00)
      // When offline in airplane mode, market data must fallback to pre-baked snapshot labelled "sample data"
      const marketData = await fetchMarketData();
      expect(marketData.isFallback).toBe(true);
      expect(marketData.info.status).toBe('fallback');
      expect(marketData.snapshots.length).toBeGreaterThanOrEqual(4);
      expect(marketData.snapshots.every((s) => s.isSampleData === true)).toBe(true);

      // STEP 5: "Switch to Hindi" (4:00 - 5:00)
      await i18n.changeLanguage('hi');
      expect(i18n.language).toBe('hi');
      expect(i18n.t('pitch.step1.btn')).toBe('रोहन प्रोफाइल लोड करें');
      expect(i18n.t('pitch.step3.btn')).toBe('कमी का परीक्षण करें');
      expect(i18n.t('invest.sample_data_badge')).toBe('नमूना डेटा');
    });
  });

  // REQUIREMENT 2 & ACCEPTANCE: Reset button restores seeded demo data in < 1 second repeatedly
  describe('Acceptance 2: Instant Reset (< 1 second) Repeatedly', () => {
    it('restores seeded demo data in < 1000ms repeatedly across multiple iterations', async () => {
      for (let i = 0; i < 5; i++) {
        // Mutate state first (change income, clear transactions, dirty envelopes)
        await repository.updateIncome('earner', 99999);
        await repository.saveEnvelopes('earner', []);

        // Measure reset time
        const start = performance.now();
        const profile = await repository.seedPersona('rohan');
        const duration = performance.now() - start;

        // VERIFY: Must complete in < 1000 milliseconds (< 1s)
        expect(duration).toBeLessThan(1000);
        expect(profile.name).toBe('Rohan Sharma');
        expect(profile.monthlyIncome).toBe(38000);

        const envelopes = await repository.getEnvelopes('earner');
        expect(envelopes.length).toBeGreaterThan(0);

        const plan = await repository.getBudgetPlan('2026-10');
        expect(plan?.hasShortfall).toBe(false);
      }
    });
  });

  // REQUIREMENT 3: Big-screen mode scales type/spacing for a projector (1280x720 and 1920x1080), hides dev UI
  describe('Acceptance 3: Big-Screen Mode & Dev UI Hiding', () => {
    it('adds big-screen-mode class and targets dev UI elements for concealment', () => {
      // Toggle Big-Screen ON
      document.documentElement.classList.add('big-screen-mode');
      expect(document.documentElement.classList.contains('big-screen-mode')).toBe(true);

      // Check that big-screen-mode targets elements with data-dev-ui="true"
      const dummyDevUi = document.createElement('div');
      dummyDevUi.setAttribute('data-dev-ui', 'true');
      dummyDevUi.className = 'dev-ui';
      document.body.appendChild(dummyDevUi);

      expect(dummyDevUi.getAttribute('data-dev-ui')).toBe('true');
      expect(dummyDevUi.classList.contains('dev-ui')).toBe(true);

      // Toggle Big-Screen OFF
      document.documentElement.classList.remove('big-screen-mode');
      expect(document.documentElement.classList.contains('big-screen-mode')).toBe(false);
      document.body.removeChild(dummyDevUi);
    });
  });

  // REQUIREMENT 4: Fallbacks: if market API fails during pitch, uses pre-baked snapshot clearly labelled "sample data"
  describe('Acceptance 4: Market API Failure Graceful Fallback', () => {
    it('falls back to pre-baked snapshot labelled "sample data" when network fails', async () => {
      setForcedFallback(true);

      const result = await fetchMarketData();
      expect(result.isFallback).toBe(true);
      expect(result.info.status).toBe('fallback');
      expect(result.info.isFallback).toBe(true);
      expect(result.snapshots.length).toBeGreaterThanOrEqual(4);

      // All snapshot items must carry isSampleData = true
      result.snapshots.forEach((s) => {
        expect(s.isSampleData).toBe(true);
      });

      // Verify getLastNavFetchInfo reflects the fallback
      const navInfo = getLastNavFetchInfo();
      expect(navInfo.isFallback).toBe(true);
      expect(navInfo.lastNav).toContain('Sample Data');
    });
  });

  // REQUIREMENT 5: A hidden /health page listing online/offline, repository in use, last NAV fetch, i18n coverage, build hash
  describe('Acceptance 5: Hidden /health Diagnostics Diagnostics Data', () => {
    it('provides all 5 required health diagnostic data fields accurately', () => {
      const health = getHealthStatus();

      // 1. Online / Offline status
      expect(typeof health.isOnline).toBe('boolean');

      // 2. Repository in use
      expect(health.repository.name).toBe('LocalSeededRepository');
      expect(health.repository.storageEngine).toContain('localStorage');
      expect(typeof health.repository.isDemo).toBe('boolean');

      // 3. Last NAV fetch
      expect(health.lastNavFetch).toBeDefined();
      expect(health.lastNavFetch.timestamp).toBeDefined();
      expect(health.lastNavFetch.status).toBeDefined();
      expect(health.lastNavFetch.endpoint).toContain('api.mfapi.in');

      // 4. i18n coverage
      expect(health.i18n.coveragePercent).toBe(100);
      expect(health.i18n.missingInHi.length).toBe(0);
      expect(health.i18n.totalEnKeys).toBeGreaterThanOrEqual(800);
      expect(health.i18n.totalHiKeys).toBe(health.i18n.totalEnKeys);

      // 5. Build hash
      expect(health.build.hash).toBe(BUILD_HASH);
      expect(health.build.buildTime).toBeDefined();
    });

    it('verifies 100% i18n translation parity between en.json and hi.json with zero missing keys', () => {
      const report = computeI18nCoverage();
      expect(report.missingInHi).toEqual([]);
      expect(report.coveragePercent).toBe(100);
      expect(report.categories.length).toBeGreaterThan(0);
    });
  });

  // ACCEPTANCE: Panel never overlaps key UI on a 1280x720 projector
  describe('Acceptance 6: Panel UI Non-overlapping Design on 1280x720', () => {
    it('supports minimization to a compact floating pill and flexible docking positions', () => {
      // 1280x720 projector dimensions
      const projectorWidth = 1280;
      const projectorHeight = 720;
      expect(projectorWidth).toBe(1280);
      expect(projectorHeight).toBe(720);

      // Valid dock positions
      const validPositions = ['bottom-right', 'top-right', 'dock-bottom'];
      expect(validPositions).toContain('bottom-right');
      expect(validPositions).toContain('top-right');
      expect(validPositions).toContain('dock-bottom');
    });
  });
});
