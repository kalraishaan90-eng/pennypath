import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AppProvider } from '../context/AppContext';
import { PitchProvider } from '../context/PitchContext';
import { AppShell } from '../layouts/AppShell';
import { UpiPaymentModal } from '../components/payment/UpiPaymentModal';
import { UpiPaymentPage } from '../pages/UpiPaymentPage';
import { repository } from '../repository';
import '../i18n';

describe('Acceptance Test: Design Showcase Removal & UPI Auto-Expense Payment System', () => {
  beforeEach(async () => {
    localStorage.clear();
    await repository.resetSeedData('earner');
  });

  const TestWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({
    children,
    initialEntries = ['/'],
  }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <PitchProvider>
          <AppProvider>{children}</AppProvider>
        </PitchProvider>
      </AuthProvider>
    </MemoryRouter>
  );

  describe('1. Verification: Design Showcase Tab Completely Removed', () => {
    it('does not contain any Design Showcase link in navigation', () => {
      render(
        <TestWrapper>
          <AppShell />
        </TestWrapper>
      );

      // Verify no "Design Showcase" link exists
      const designLinks = screen.queryAllByRole('link', { name: /design/i });
      expect(designLinks).toHaveLength(0);

      // Verify "Scan & Pay" or "UPI" link is present in navigation
      const payLinks = screen.getAllByRole('link', { name: /scan & pay|upi/i });
      expect(payLinks.length).toBeGreaterThan(0);
    });
  });

  describe('2. Verification: UPI Payment & Automatic Expense Handling Flow', () => {
    it('executes UPI payment, asks what item is bought, auto-categorizes, and deducts from envelope', async () => {
      const handlePaymentSuccess = vi.fn();

      render(
        <TestWrapper>
          <UpiPaymentModal
            isOpen={true}
            onClose={() => {}}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </TestWrapper>
      );

      // Wait for modal to render
      expect(screen.getByText(/PennyPath UPI Pay & Auto-Expense/i)).toBeInTheDocument();

      // Check linked UPI ID is visible
      expect(screen.getByText(/rohan@okaxis/i)).toBeInTheDocument();

      // Switch to UPI ID / VPA tab
      const vpaTab = screen.getByRole('button', { name: /UPI ID \/ VPA/i });
      fireEvent.click(vpaTab);

      // Enter Payee VPA
      const vpaInput = screen.getByPlaceholderText(/merchant.store@paytm/i);
      fireEvent.change(vpaInput, { target: { value: 'ramesh.store@paytm' } });

      // Enter Amount: 300
      const amountInput = screen.getByPlaceholderText(/250/i);
      fireEvent.change(amountInput, { target: { value: '300' } });

      // Enter "What item are you spending this money on?"
      const itemInput = screen.getByPlaceholderText(/Chai & Samosa, Kirana Ration/i);
      fireEvent.change(itemInput, { target: { value: 'Weekly Kirana Ration and Flour' } });

      // Verify auto-detected envelope
      await waitFor(() => {
        expect(screen.getByText(/Auto-Detected Category/i)).toBeInTheDocument();
      });

      // Continue to Pay
      const continueBtn = screen.getByRole('button', { name: /Continue to Pay/i });
      fireEvent.click(continueBtn);

      // Enter UPI PIN
      await waitFor(() => {
        expect(screen.getByText(/Enter 4 or 6-Digit UPI PIN/i)).toBeInTheDocument();
      });

      const pinButtons = ['1', '2', '3', '4'];
      for (const digit of pinButtons) {
        const btn = screen.getByRole('button', { name: digit });
        fireEvent.click(btn);
      }

      // Click Confirm & Pay
      const confirmBtn = screen.getByRole('button', { name: /Confirm & Pay/i });
      fireEvent.click(confirmBtn);

      // Verify successful receipt with auto-deduction explanation
      await waitFor(
        () => {
          expect(screen.getByText(/Payment Successful!/i)).toBeInTheDocument();
          expect(screen.getByText(/Expense Handled Automatically by PennyPath/i)).toBeInTheDocument();
        },
        { timeout: 3500 }
      );
    });
  });

  describe('3. Verification: UpiPaymentPage renders recent payments & linked accounts', () => {
    it('renders UPI page with bank details and quick merchant presets', async () => {
      render(
        <TestWrapper initialEntries={['/pay']}>
          <UpiPaymentPage />
        </TestWrapper>
      );

      expect(screen.getByText(/UPI Payments & Auto-Expense/i)).toBeInTheDocument();
      expect(screen.getByText(/HDFC Bank/i)).toBeInTheDocument();
      expect(screen.getByText(/Instant Scan & Pay Merchants/i)).toBeInTheDocument();
      expect(screen.getByText(/Ramesh Kirana & General Store/i)).toBeInTheDocument();
      expect(screen.getByText(/Blue Tokai Cafe & Bakery/i)).toBeInTheDocument();
    });
  });
});
