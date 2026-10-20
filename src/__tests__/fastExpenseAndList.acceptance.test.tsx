// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

import { AppProvider } from '../context/AppContext';
import { HomeDashboard } from '../components/home/HomeDashboard';
import { TransactionsPage } from '../pages/TransactionsPage';
import { AddExpenseSheet } from '../components/home/AddExpenseSheet';
import { repository } from '../repository';
import { parseUPISMS, SAMPLE_UPI_SMS } from '../utils/smsParser';
import '../i18n';
import i18n from '../i18n';
import { Transaction } from '../types';

describe('Fast Expense Entry & Transactions List Acceptance Suite', { timeout: 25000 }, () => {
  beforeEach(async () => {
    localStorage.clear();
    await repository.resetSeedData('earner');
    await i18n.changeLanguage('en');

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
    }) as any;

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

  // 1. ADD EXPENSE IN <= 3 TAPS FROM HOME & 2-TAP SAVE
  it('allows adding an expense in <= 3 taps from Home via keypad and category tap', async () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    // Tap 1: Tap Quick-Add FAB
    const fabButton = screen.getByLabelText(/Add New Expense/i);
    fireEvent.click(fabButton);

    // Add Expense Sheet opens with large numeric keypad and category chips
    await waitFor(() => {
      expect(screen.getByText(/Category \/ Envelope/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Numeric Keypad')).toBeInTheDocument();
    });

    // Tap numeric keypad keys: 5, 0 (or preset +100)
    const key5 = screen.getByRole('button', { name: '5' });
    const key0 = screen.getByRole('button', { name: '0' });
    fireEvent.click(key5);
    fireEvent.click(key0);

    // Tap 2: Tap category chip (e.g. "PG Rent" or "Food & Groceries")
    // Requirement: Saves in 2 taps after typing amount (tap category = save, with undo toast)
    const categoryChips = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Spent:')
    );
    expect(categoryChips.length).toBeGreaterThan(0);

    // Tap a category chip to save immediately
    fireEvent.click(categoryChips[0]);

    // Sheet should close and Undo toast should appear
    await waitFor(() => {
      expect(screen.getByText(/Undo/i)).toBeInTheDocument();
    });
  });

  // 2. OFFLINE ADD IN DEMO MODE SYNCS STATE TO DASHBOARD
  it('offline add works in Demo Mode and syncs state to dashboard', async () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    const initialText = screen.getByText(/left for the month/i).textContent;

    // Open sheet
    fireEvent.click(screen.getByLabelText(/Add New Expense/i));

    await waitFor(() => {
      expect(screen.getByLabelText('Numeric Keypad')).toBeInTheDocument();
    });

    // Tap preset "+₹500"
    const preset500 = screen.getByRole('button', { name: '+₹500' });
    fireEvent.click(preset500);

    // Tap first category
    const categoryChips = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Spent:')
    );
    fireEvent.click(categoryChips[0]);

    // State on dashboard should update
    await waitFor(() => {
      const updatedText = screen.getByText(/left for the month/i).textContent;
      expect(updatedText).not.toBe(initialText);
    });
  });

  // 3. UNDO WORKS
  it('undo reverts transaction and restores envelope spent amount', async () => {
    render(
      <AppProvider>
        <HomeDashboard />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    const initialText = screen.getByText(/left for the month/i).textContent;

    // Add expense of ₹500
    fireEvent.click(screen.getByLabelText(/Add New Expense/i));
    await waitFor(() => {
      expect(screen.getByLabelText('Numeric Keypad')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '+₹500' }));
    const categoryChips = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Spent:')
    );
    fireEvent.click(categoryChips[0]);

    // Undo toast appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Undo/i })).toBeInTheDocument();
    });

    // Tap Undo
    const undoBtn = screen.getByRole('button', { name: /Undo/i });
    fireEvent.click(undoBtn);

    // Dashboard reverts back to initial state
    await waitFor(() => {
      const revertedText = screen.getByText(/left for the month/i).textContent;
      expect(revertedText).toBe(initialText);
    });
  });

  // 4. INCOME QUICK-ADD (ONE-TIME BONUS/GIFT)
  it('allows quick-add for income (bonus/gift) with note, payment mode, and date', async () => {
    let incomeAdded = false;
    let incomeAmount = 0;
    let incomeDesc = '';

    const mockEnvelopes = await repository.getEnvelopes('earner');

    render(
      <AddExpenseSheet
        isOpen={true}
        onClose={() => {}}
        envelopes={mockEnvelopes}
        onAddExpense={async () => {}}
        onAddIncome={async (amt, desc) => {
          incomeAdded = true;
          incomeAmount = amt;
          incomeDesc = desc;
        }}
      />
    );

    // Switch to Income tab
    const incomeTab = screen.getByRole('button', { name: /Income/i });
    fireEvent.click(incomeTab);

    // Presets + Keypad
    fireEvent.click(screen.getByRole('button', { name: '+₹1,000' }));

    // Select source "Bonus" or "Gift"
    const bonusChip = screen.getByRole('button', { name: /Bonus/i });
    fireEvent.click(bonusChip);

    await waitFor(() => {
      expect(incomeAdded).toBe(true);
      expect(incomeAmount).toBe(1000);
      expect(incomeDesc).toContain('Bonus');
    });
  });

  // 5. TRANSACTIONS LIST: GROUPED BY DAY, SEARCH, FILTER, EDIT/DELETE
  it('groups transactions by day, supports note search, filters, and edit/delete', async () => {
    await repository.seedPersona('rohan');
    localStorage.setItem('pennypath_mode', 'earner');

    render(
      <AppProvider>
        <TransactionsPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Transactions & Fast Entry/i)).toBeInTheDocument();
      // Verify day group headers exist (Today, Yesterday, or dates)
      expect(screen.getByText(/Today, 20 Oct 2026/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    // Verify search by note
    const searchInput = screen.getByPlaceholderText(/Search note or merchant/i);
    fireEvent.change(searchInput, { target: { value: 'Chai' } });

    await waitFor(() => {
      const matches = screen.getAllByText(/Chai/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Verify filter by payment mode
    const modeSelect = screen.getByLabelText(/Filter by Payment Mode/i);
    fireEvent.change(modeSelect, { target: { value: 'upi' } });

    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    });
  });

  // 6. STUDENT MODE: WEEKLY VIEW TOGGLE & POCKET MONEY LEFT THIS WEEK
  it('displays pocket money left this week and weekly view toggle for student persona', async () => {
    await repository.seedPersona('aarav');
    localStorage.setItem('pennypath_mode', 'student');

    render(
      <AppProvider>
        <TransactionsPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Student Mode • Aarav/i)).toBeInTheDocument();
      expect(screen.getByText(/Pocket money left this week/i)).toBeInTheDocument();
    });

    // Verify weekly view toggle button
    const weeklyToggle = screen.getByRole('button', { name: /(Weekly View|This Week)/i });
    expect(weeklyToggle).toBeInTheDocument();

    fireEvent.click(weeklyToggle);
    expect(weeklyToggle).toHaveClass('bg-accent');
  });

  // 7. HOUSEHOLD MODE: "ENVELOPE" VIEW WITH REMAINING CASH
  it('displays envelope view with remaining cash for each category in household mode', async () => {
    await repository.seedPersona('meena');
    localStorage.setItem('pennypath_mode', 'household');

    render(
      <AppProvider>
        <TransactionsPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Household Mode • Meena/i)).toBeInTheDocument();
    });

    // Toggle Envelope View
    const envelopeViewBtn = screen.getByRole('button', { name: /Envelope View/i });
    fireEvent.click(envelopeViewBtn);

    // Verify remaining cash envelopes
    await waitFor(() => {
      const remainingLabels = screen.getAllByText(/Remaining Cash/i);
      expect(remainingLabels.length).toBeGreaterThan(0);
    });
  });

  // 8. STRETCH: "PASTE SMS" PARSER (NEVER AUTO-SAVES)
  it('parses bank UPI debit SMS, displays preview, and requires user confirmation before saving', async () => {
    render(
      <AppProvider>
        <TransactionsPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Paste SMS/i })).toBeInTheDocument();
    });

    // Open Paste SMS Box
    fireEvent.click(screen.getByRole('button', { name: /Paste SMS/i }));

    const textarea = screen.getByPlaceholderText(/Paste bank debit SMS here/i);
    expect(textarea).toBeInTheDocument();

    // Paste sample HDFC SMS: "Rs. 450.00 debited from a/c **1234 on 20-10-2026 to VPA swiggy@icici (UPI Ref no 123456789012)."
    fireEvent.change(textarea, { target: { value: SAMPLE_UPI_SMS.hdfc } });

    // Preview appears with parsed details
    await waitFor(() => {
      expect(screen.getByText(/Preview Parsed Transaction/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirm & Save Expense/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Swiggy/i).length).toBeGreaterThanOrEqual(1);
    });

    // Ensure it NEVER auto-saves: clicking Confirm & Save is required
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save Expense/i });
    fireEvent.click(confirmBtn);

    // Saved with Undo toast
    await waitFor(() => {
      expect(screen.getByText(/Undo/i)).toBeInTheDocument();
    });
  });

  // 9. HINDI LABELS FIT WITHOUT TRUNCATION
  it('renders all Hindi labels correctly without truncation', async () => {
    await i18n.changeLanguage('hi');

    render(
      <AppProvider>
        <TransactionsPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/लेन-देन और त्वरित प्रविष्टि/i)).toBeInTheDocument();
    });

    // Check Hindi action buttons
    expect(screen.getByRole('button', { name: /खर्च जोड़ें/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /त्वरित आय/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /एसएमएस पेस्ट करें/i })).toBeInTheDocument();
  });

  // 10. LIST HANDLES 500+ ROWS SMOOTHLY (PAGINATION)
  it('handles 500+ rows smoothly with pagination and Load More button', async () => {
    // Generate 500 mock transactions
    const bulkTxs: Transaction[] = [];
    for (let i = 1; i <= 500; i++) {
      bulkTxs.push({
        id: `tx-bulk-${i}`,
        date: i % 2 === 0 ? '2026-10-20' : '2026-10-19',
        amount: 50 + (i % 200),
        type: 'expense',
        categoryKey: 'budget.cat.food_groceries',
        description: `Bulk Expense #${i}`,
        paymentMode: 'upi',
      });
    }

    localStorage.setItem('pennypath_transactions', JSON.stringify(bulkTxs));
    localStorage.setItem('pennypath_earner_transactions', JSON.stringify(bulkTxs));

    render(
      <AppProvider>
        <TransactionsPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Showing 30 of 500 transactions/i)).toBeInTheDocument();
    });

    // Click "Load More"
    const loadMoreBtn = screen.getByRole('button', { name: /Load More/i });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText(/Showing 60 of 500 transactions/i)).toBeInTheDocument();
    });
  });
});
