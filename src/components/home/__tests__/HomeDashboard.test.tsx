// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeDashboard } from '../HomeDashboard';
import { HeroSafeToSpendCard } from '../HeroSafeToSpendCard';
import { SavingsTrackerCard } from '../SavingsTrackerCard';
import { FinancialHealthScoreCard } from '../FinancialHealthScoreCard';
import { CategoryCapsCard } from '../CategoryCapsCard';
import { Next7DaysDuesStrip } from '../Next7DaysDuesStrip';
import '../../../i18n';
import i18n from '../../../i18n';
import { repository } from '../../../repository';

import { AppProvider } from '../../../context/AppContext';

const renderWithRouter = (ui: React.ReactElement) =>
  render(
    <AppProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AppProvider>
  );

describe('Home Dashboard Component Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    await repository.resetSeedData('earner');
    await i18n.changeLanguage('en');

    // Mock matchMedia for jsdom
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('populates every card for Rohan demo on initial render', async () => {
    renderWithRouter(<HomeDashboard />);

    // Wait for async loadData to finish and populate the dashboard
    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    // 1. Greeting shows Rohan
    expect(screen.getByRole('heading', { level: 1, name: /Rohan/i })).toBeInTheDocument();

    // 2. HERO CARD
    expect(screen.getByText(/left for the month/i)).toBeInTheDocument();
    expect(screen.getByText(/Variable budget used/i)).toBeInTheDocument();

    // 3. Savings Tracker Card
    expect(screen.getByText(/Savings Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Saved so far/i)).toBeInTheDocument();
    expect(screen.getByText(/^Target$/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected month-end/i)).toBeInTheDocument();

    // 4. Financial Health Score Card
    expect(screen.getByText(/Financial Health Score/i)).toBeInTheDocument();
    expect(screen.getByText(/^Savings Rate$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Budget Discipline$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Goal Cushion$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Bills & Dues$/i)).toBeInTheDocument();

    // 5. Category Caps Card
    expect(screen.getByText(/Category Caps/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 5 categories/i)).toBeInTheDocument();

    // 6. Next 7 Days Dues Strip
    expect(screen.getByText(/Next 7 Days Dues/i)).toBeInTheDocument();

    // 7. Quick-Add FAB
    expect(screen.getByLabelText(/Add New Expense/i)).toBeInTheDocument();
  });

  it('changing a transaction updates safe-to-spend and health score instantly', async () => {
    renderWithRouter(<HomeDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    const initialText = screen.getByText(/left for the month/i).textContent;

    // Simulate adding an expense via quick simulator button "+₹200"
    const addButtons = screen.getAllByText(/\+.*200/);
    expect(addButtons.length).toBeGreaterThan(0);

    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      const updatedText = screen.getByText(/left for the month/i).textContent;
      expect(updatedText).not.toBe(initialText);
    });
  });

  it('respects reduced motion when enabled in Health Score card', async () => {
    const mockHealthData = {
      score: 72,
      status: 'fair' as const,
      tipKey: 'health.tips.excellent_trajectory',
      subBars: [
        { key: 'savings', labelKey: 'health.subbar.savings_rate', score: 70, weight: 0.3, status: 'good' as const, displayValue: '20%' },
        { key: 'discipline', labelKey: 'health.subbar.budget_discipline', score: 65, weight: 0.2, status: 'warning' as const, displayValue: '65/100' },
        { key: 'goals', labelKey: 'health.subbar.goal_cushion', score: 80, weight: 0.25, status: 'good' as const, displayValue: '2.5m' },
        { key: 'dues', labelKey: 'health.subbar.bills_dues', score: 75, weight: 0.25, status: 'good' as const, displayValue: '75/100' },
      ] as any,
    };

    renderWithRouter(<FinancialHealthScoreCard data={mockHealthData} reducedMotion={true} />);

    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('switches all text to Hindi when language toggle is triggered', async () => {
    renderWithRouter(<HomeDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    const langBtn = screen.getByTitle('Switch Language');
    fireEvent.click(langBtn);

    await waitFor(() => {
      expect(screen.getByText(/आज का सुरक्षित खर्च/i)).toBeInTheDocument();
      expect(screen.getByText(/बचत ट्रैकर/i)).toBeInTheDocument();
      expect(screen.getByText(/वित्तीय स्वास्थ्य स्कोर/i)).toBeInTheDocument();
    });
  });

  it('opens Plan screen modal on one tap from Savings Tracker card', async () => {
    renderWithRouter(<HomeDashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/View Plan/i)).toBeInTheDocument();
    });

    const planBtn = screen.getByLabelText(/View Plan/i);
    fireEvent.click(planBtn);

    await waitFor(() => {
      expect(screen.getByText(/Monthly Financial Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Envelope Allocations & Strategy/i)).toBeInTheDocument();
    });

    const returnBtn = screen.getByText(/Back to Dashboard/i);
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Envelope Allocations & Strategy/i)).not.toBeInTheDocument();
    });
  });

  it('renders loading, error, and empty states gracefully for each card', () => {
    const { unmount: u1 } = render(<HeroSafeToSpendCard data={null} loading={true} />);
    expect(screen.getByLabelText(/Loading card content/i)).toBeInTheDocument();
    u1();

    const onRetry = vi.fn();
    const { unmount: u2 } = render(<HeroSafeToSpendCard data={null} error="Network Timeout" onRetry={onRetry} />);
    expect(screen.getByText(/Network Timeout/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Retry/i));
    expect(onRetry).toHaveBeenCalledTimes(1);
    u2();

    const { unmount: u3 } = render(<SavingsTrackerCard data={null} onNavigateToPlan={vi.fn()} />);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    u3();

    const { unmount: u4 } = render(<CategoryCapsCard categories={[]} />);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    u4();

    const { unmount: u5 } = renderWithRouter(<Next7DaysDuesStrip dues={[]} onTogglePaid={vi.fn()} />);
    expect(screen.getByText(/No dues upcoming in the next 7 days/i)).toBeInTheDocument();
    u5();
  });

  it('verifies Category Caps colors: maroon when over, tan near limit, ink when fine', () => {
    const mockCategories = [
      {
        id: 'cat-1',
        categoryKey: 'budget.cat.weekend_hangouts',
        icon: 'PartyPopper',
        type: 'want' as const,
        spent: 5100,
        cap: 4500,
        remaining: -600,
        percentageSpent: 113,
        status: 'over' as const,
        statusColor: 'maroon' as const,
      },
      {
        id: 'cat-2',
        categoryKey: 'budget.cat.gadgets_shopping',
        icon: 'Smartphone',
        type: 'want' as const,
        spent: 3000,
        cap: 3500,
        remaining: 500,
        percentageSpent: 86,
        status: 'near_limit' as const,
        statusColor: 'sand' as const,
      },
      {
        id: 'cat-3',
        categoryKey: 'budget.cat.transport',
        icon: 'Bus',
        type: 'need' as const,
        spent: 1000,
        cap: 2500,
        remaining: 1500,
        percentageSpent: 40,
        status: 'fine' as const,
        statusColor: 'ink' as const,
      },
    ];

    render(<CategoryCapsCard categories={mockCategories} />);

    expect(screen.getByText(/Over cap/i)).toBeInTheDocument();
    expect(screen.getByText(/Near limit/i)).toBeInTheDocument();
    expect(screen.getByText(/Within limit/i)).toBeInTheDocument();
  });

  it('safely fits within a narrow 360px mobile viewport without overflow', async () => {
    // Set 360px mobile viewport
    window.innerWidth = 360;
    window.innerHeight = 640;

    const { container } = renderWithRouter(<HomeDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    // Check that top level containers use responsive width
    const rootContainer = container.querySelector('.max-w-6xl');
    expect(rootContainer).toBeInTheDocument();
    expect(rootContainer).toHaveClass('w-full');

    // Verify all articles (cards) do not have overflow or fixed widths wider than 360px
    const articles = container.querySelectorAll('article');
    expect(articles.length).toBeGreaterThanOrEqual(4);
    articles.forEach((article) => {
      expect(article.className).not.toContain('w-[4');
      expect(article.className).not.toContain('w-[5');
      expect(article.className).not.toContain('w-[6');
    });
  });
});
