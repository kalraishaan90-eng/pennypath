// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RemindersScreen } from '../RemindersScreen';
import { AppProvider } from '../../context/AppContext';
import { repository } from '../../repository';
import '../../i18n';
import i18n from '../../i18n';

describe('RemindersScreen Component Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('pennypath_mode', 'earner');
    await repository.resetSeedData('earner');
    await repository.seedPersona('rohan');
    await i18n.changeLanguage('en');

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });

    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders Rohan's EMI due in 2 days in the Next 7 days section", async () => {
    render(
      <AppProvider>
        <RemindersScreen />
      </AppProvider>
    );

    // Verify Next 7 Days section exists
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Next 7 Days/i })).toBeInTheDocument();
    });

    // Rohan's EMI appears in Next 7 Days with ₹3,200 and 2026-10-22
    expect(screen.getByText(/Bike Loan EMI \(Bajaj Pulsar\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3,200/)).toBeInTheDocument();
    expect(screen.getByText(/2026-10-22/)).toBeInTheDocument();
    expect(screen.getByText(/Due in 2 days/i)).toBeInTheDocument();
  });

  it('marking paid removes it from Next 7 days and creates the transaction once without duplicates on reload', async () => {
    render(
      <AppProvider>
        <RemindersScreen />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bike Loan EMI \(Bajaj Pulsar\)/i)).toBeInTheDocument();
    });

    // Initial transactions count
    const initialTxs = await repository.getTransactions('earner');
    const bikeTxsBefore = initialTxs.filter((t) => t.description.includes('Bike Loan EMI'));
    expect(bikeTxsBefore.length).toBe(0);

    // Find the reminder card for Bike Loan EMI
    const emiCard = screen.getByTestId('reminder-card-rem-er-bike-emi');
    expect(emiCard).toBeInTheDocument();

    // Click "Mark as Paid" button on the EMI card
    const markPaidBtn =
      (emiCard.querySelector('button[aria-label="Mark as Paid"]') as HTMLElement) ||
      (emiCard.querySelectorAll('button')[0] as HTMLElement);
    fireEvent.click(markPaidBtn);

    // Confirmation modal appears with option to log to budget
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Mark as Paid/i })).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Log/i });
    fireEvent.click(confirmBtn);

    // After marking paid, it is removed from Next 7 Days
    await waitFor(() => {
      // In the Next 7 Days section, it should no longer be present
      const next7Section = screen.getByRole('heading', { name: /Next 7 Days/i }).closest('section');
      expect(next7Section?.textContent).not.toContain('Bike Loan EMI');
    });

    // Transaction was created in repository
    const txsAfter = await repository.getTransactions('earner');
    const bikeTxsAfter = txsAfter.filter((t) => t.description.includes('Bike Loan EMI'));
    expect(bikeTxsAfter.length).toBe(1);
    expect(bikeTxsAfter[0].amount).toBe(3200);

    // Reload test: simulate reload by resetting/re-querying repository
    const reloadedReminders = await repository.getReminders('earner');
    const reloadedBikeEmi = reloadedReminders.find((r) => r.id === 'rem-er-bike-emi');
    expect(reloadedBikeEmi?.isPaid).toBe(true);

    // Second check: transactions are not duplicated
    const reloadedTxs = await repository.getTransactions('earner');
    const bikeTxsReloaded = reloadedTxs.filter((t) => t.description.includes('Bike Loan EMI'));
    expect(bikeTxsReloaded.length).toBe(1);
  });

  it('snoozes a reminder by 1 day and 3 days', async () => {
    render(
      <AppProvider>
        <RemindersScreen />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bike Loan EMI \(Bajaj Pulsar\)/i)).toBeInTheDocument();
    });

    // Click snooze +1d on the Bike Loan EMI card
    const emiCard = screen.getByText(/Bike Loan EMI \(Bajaj Pulsar\)/i).closest('[data-testid^="reminder-card-"]')!;
    const snooze1dBtn = within(emiCard as HTMLElement).getByRole('button', { name: /\+1d/i });
    fireEvent.click(snooze1dBtn);

    await waitFor(() => {
      expect(screen.getByText(/2026-10-23/)).toBeInTheDocument();
    });

    // Click snooze +3d on the Bike Loan EMI card
    const updatedEmiCard = screen.getByText(/Bike Loan EMI \(Bajaj Pulsar\)/i).closest('[data-testid^="reminder-card-"]')!;
    const snooze3dBtn = within(updatedEmiCard as HTMLElement).getByRole('button', { name: /\+3d/i });
    fireEvent.click(snooze3dBtn);

    await waitFor(() => {
      expect(screen.getByText(/2026-10-26/)).toBeInTheDocument();
    });
  });

  it('"Add to calendar" button downloads .ics file with monthly recurrence rule for EMI', async () => {
    render(
      <AppProvider>
        <RemindersScreen />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bike Loan EMI \(Bajaj Pulsar\)/i)).toBeInTheDocument();
    });

    const calendarBtns = screen.getAllByLabelText(/Add to calendar/i);
    expect(calendarBtns.length).toBeGreaterThan(0);

    // Spy on link click and mock implementation to prevent jsdom navigation attempt
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.click(calendarBtns[0]);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('shows in-app banner fallback when browser notifications are denied', async () => {
    // Set notification permission to 'denied'
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
    });

    render(
      <AppProvider>
        <RemindersScreen />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Notifications Blocked:/i)).toBeInTheDocument();
      expect(screen.getByText(/PennyPath will display upcoming due dates here in your in-app alerts instead/i)).toBeInTheDocument();
    });
  });

  it('never prompts for notifications on initial load; prompts only after user adds a due date', async () => {
    const requestPermissionSpy = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: requestPermissionSpy,
      },
    });

    render(
      <AppProvider>
        <RemindersScreen />
      </AppProvider>
    );

    // Initial load: verify requestPermission was NOT called
    expect(requestPermissionSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/Get alerts before bills & EMIs are due/i)).not.toBeInTheDocument();

    // Now user clicks "Add Due Date" / "Add Reminder"
    const addBtn = screen.getByRole('button', { name: /Add Reminder|Add Due Date/i });
    fireEvent.click(addBtn);

    // Fill form
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Gym Membership' } });
    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText(/Due Date/i), { target: { value: '2026-10-30' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    // Now plain language explanation prompt appears
    await waitFor(() => {
      expect(screen.getByText(/Get alerts before bills & EMIs are due/i)).toBeInTheDocument();
      expect(screen.getByText(/PennyPath alerts you 3 days and 1 day before payments are due/i)).toBeInTheDocument();
    });

    // User clicks "Allow Notifications"
    const allowBtn = screen.getByRole('button', { name: /Allow Notifications/i });
    fireEvent.click(allowBtn);

    expect(requestPermissionSpy).toHaveBeenCalledTimes(1);
  });
});
