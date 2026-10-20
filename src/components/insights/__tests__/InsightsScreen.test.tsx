// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../../context/AppContext';
import { InsightsScreen } from '../InsightsScreen';
import { CategoryBreakdownCard } from '../CategoryBreakdownCard';
import { MonthOverMonthBarsCard } from '../MonthOverMonthBarsCard';
import { WhereYouCanSaveCards } from '../WhereYouCanSaveCards';
import { SpendingPaceLineCard } from '../SpendingPaceLineCard';
import { HealthScoreDetailPage } from '../HealthScoreDetailPage';
import { WeeklySummaryCard } from '../WeeklySummaryCard';
import {
  computeCategoryBreakdown,
  computeMonthOverMonth,
  computeWhereYouCanSave,
  computeSpendingPace,
  computeHealthScoreDetail,
  computeWeeklySummary,
} from '../../../engine/insightsEngine';
import { generate60DaysTransactions, INITIAL_ENVELOPES, INITIAL_REMINDERS } from '../../../repository/seedData';

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container" style={{ width: 360, height: 260 }}>
        {children}
      </div>
    ),
  };
});

describe('Insights Screen & Component Suite', () => {
  const transactions = generate60DaysTransactions('rohan');
  const envelopes = INITIAL_ENVELOPES.earner;
  const reminders = INITIAL_REMINDERS.earner;

  const categoryData = computeCategoryBreakdown(transactions, '2026-10', envelopes);
  const momData = computeMonthOverMonth(transactions, 38000);
  const savingsData = computeWhereYouCanSave(transactions, '2026-10', envelopes);
  const paceData = computeSpendingPace(transactions, '2026-10', 38000);
  const healthData = computeHealthScoreDetail(38000, envelopes, reminders);
  const weeklyData = computeWeeklySummary(transactions);

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders CategoryBreakdownCard with donut stats, legend with icon + text, and accessible pattern symbols', () => {
    render(
      <MemoryRouter>
        <CategoryBreakdownCard data={categoryData} selectedMonth="2026-10" />
      </MemoryRouter>
    );

    // Checks title and subtitle
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    expect(screen.getByText(/Ranked spending & envelope distribution/i)).toBeInTheDocument();

    // Check legend items contain rank, name, and symbol
    expect(screen.getByText('Rank #1')).toBeInTheDocument();
    expect(screen.getByText('●')).toBeInTheDocument();

    // Check Total Spent in inner donut
    expect(screen.getByText(/Total Spent/i)).toBeInTheDocument();
  });

  it('renders MonthOverMonthBarsCard with 3 series (spend, income, saved)', () => {
    render(
      <MemoryRouter>
        <MonthOverMonthBarsCard data={momData} />
      </MemoryRouter>
    );

    expect(screen.getByText('Month-over-Month Comparison')).toBeInTheDocument();
    expect(screen.getByText(/Spend \(व्यय\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Income \(आय\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Saved \(बचत\)/i)).toBeInTheDocument();
  });

  it('renders WhereYouCanSaveCards with engine-derived sipFutureValue projections', () => {
    render(
      <MemoryRouter>
        <WhereYouCanSaveCards data={savingsData} />
      </MemoryRouter>
    );

    expect(screen.getByText('Where You Can Save')).toBeInTheDocument();
    expect(screen.getByText(/Engine Derived/i)).toBeInTheDocument();

    // Verify copy format: "% of wants: cutting 15% frees"
    const matches = screen.getAllByText(/cutting 15% frees/i);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/in 5 years at 12%/i).length).toBeGreaterThan(0);
  });

  it('renders SpendingPaceLineCard with ideal pace vs actual spend and pace status', () => {
    render(
      <MemoryRouter>
        <SpendingPaceLineCard data={paceData} />
      </MemoryRouter>
    );

    expect(screen.getByText('Spending Pace vs Ideal Pace')).toBeInTheDocument();
    expect(screen.getByText(/Ideal Pace \(Dashed/i)).toBeInTheDocument();
    expect(screen.getByText(/Actual Spend \(Solid Line/i)).toBeInTheDocument();
  });

  it('renders HealthScoreDetailPage with four sub-scores and "How to Add 10 Points" suggestions ranked by impact', () => {
    render(
      <MemoryRouter>
        <HealthScoreDetailPage data={healthData} />
      </MemoryRouter>
    );

    expect(screen.getByText(/The Four Health Pillars/i)).toBeInTheDocument();
    expect(screen.getByText(/Savings & Investment Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget Discipline & Caps/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Cushion Buffer/i)).toBeInTheDocument();
    expect(screen.getByText(/Debt-to-Income & Due Cleanliness/i)).toBeInTheDocument();

    expect(screen.getByText('How to Add 10 Points')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText(/Ranked by Impact/i)).toBeInTheDocument();
  });

  it('renders WeeklySummaryCard with weekly metrics, largest expense, and peak day', () => {
    render(
      <MemoryRouter>
        <WeeklySummaryCard data={weeklyData} />
      </MemoryRouter>
    );

    expect(screen.getByText('Weekly Summary')).toBeInTheDocument();
    expect(screen.getByText(/Total Spent This Week/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Average Burn/i)).toBeInTheDocument();
    expect(screen.getByText(/Peak Outflow Day/i)).toBeInTheDocument();
  });

  it('handles empty data across all cards without crashing', () => {
    const emptyCat = computeCategoryBreakdown([]);
    const emptyMoM = computeMonthOverMonth([]);
    const emptySave = computeWhereYouCanSave([], '2026-10', []);
    const emptyPace = computeSpendingPace([], '2026-10', 0);
    const emptyWeekly = computeWeeklySummary([]);

    render(
      <MemoryRouter>
        <div>
          <CategoryBreakdownCard data={emptyCat} selectedMonth="2026-10" />
          <MonthOverMonthBarsCard data={emptyMoM} />
          <WhereYouCanSaveCards data={emptySave} />
          <SpendingPaceLineCard data={emptyPace} />
          <WeeklySummaryCard data={emptyWeekly} />
        </div>
      </MemoryRouter>
    );

    expect(screen.getByText(/No expense transactions recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Not enough historical data/i)).toBeInTheDocument();
    expect(screen.getByText(/No discretionary want expenses logged yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No budget pace available/i)).toBeInTheDocument();
    expect(screen.getByText(/No transactions logged this week/i)).toBeInTheDocument();
  });

  it('renders full InsightsScreen integrated with tabs and switches smoothly', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <InsightsScreen />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Financial Insights')).toBeInTheDocument();

    // Check Trends & Savings tab is active by default
    expect(screen.getByText('Trends & Savings')).toBeInTheDocument();
    expect(screen.getByText('Health Detail & +10 Pts')).toBeInTheDocument();

    // Switch to Health tab
    const healthTabBtn = screen.getByText('Health Detail & +10 Pts');
    fireEvent.click(healthTabBtn);

    // Now Health detail pillars should be visible
    expect(screen.getByText(/The Four Health Pillars/i)).toBeInTheDocument();
    expect(screen.getByText('How to Add 10 Points')).toBeInTheDocument();
  });
});
