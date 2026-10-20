import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalculatorsScreen } from '../CalculatorsScreen';
import { AppProvider } from '../../context/AppContext';
import { repository } from '../../repository';
import '../../i18n';
import i18n from 'i18next';

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('CalculatorsScreen Component Suite', () => {
  beforeEach(async () => {
    await repository.seedPersona('rohan');
    await i18n.changeLanguage('en');
  });

  const renderScreen = () => {
    return render(
      <AppProvider>
        <CalculatorsScreen />
      </AppProvider>
    );
  };

  it('renders Calculators Hub with all three tool tabs', async () => {
    renderScreen();

    expect(screen.getByText('Calculators Hub')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /emi calculator/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /goal calculator/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /compound \/ sip/i })).toBeInTheDocument();
  });

  it('displays exact P3 test vector for EMI (~10,624) by default', async () => {
    renderScreen();

    // Default inputs: 5,00,000 @ 10% for 60 months => 10,624
    const emiOutput = screen.getByTestId('emi-output');
    expect(emiOutput).toBeInTheDocument();
    expect(emiOutput.textContent).toContain('10,624');
  });

  it('triggers "Can I afford this?" and displays different answers for Rohan vs. Aarav', async () => {
    renderScreen();

    // Wait for plan context (Rohan Sharma) to load
    await waitFor(() => {
      expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
    });

    // 1. Check for Rohan (Earner, disposable ~14,802)
    const affordBtn = screen.getByRole('button', { name: /can i afford this/i });
    fireEvent.click(affordBtn);

    await waitFor(() => {
      const affordPanel = screen.getByTestId('affordability-panel');
      expect(affordPanel).toBeInTheDocument();
      // For Rohan: EMI fits disposable (₹14,802) but takes >65% -> Proceed with Caution (Careful)
      expect(affordPanel.textContent).toMatch(/caution|careful/i);
    });

    // 2. Switch to Aarav directly via the persona test button
    const aaravBtn = screen.getByRole('button', { name: /Aarav/i });
    fireEvent.click(aaravBtn);

    await waitFor(() => {
      // For Aarav: EMI of 10,624 exceeds disposable budget of 4,002 -> Not Recommended (No)
      const updatedPanel = screen.getByTestId('affordability-panel');
      expect(updatedPanel.textContent).toMatch(/not recommended|exceeds/i);
    });
  });

  it('toggles collapsible amortization schedule table', () => {
    renderScreen();

    const scheduleBtn = screen.getByRole('button', { name: /view amortization schedule/i });
    expect(scheduleBtn).toBeInTheDocument();

    // Initially closed
    expect(screen.queryByRole('columnheader', { name: /remaining balance/i })).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(scheduleBtn);
    expect(screen.getByRole('columnheader', { name: /remaining balance/i })).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(scheduleBtn);
    expect(screen.queryByRole('columnheader', { name: /remaining balance/i })).not.toBeInTheDocument();
  });

  it('switches to Goal Calculator and outputs P3 test vector (~12,12x) and plan fit', async () => {
    renderScreen();

    const goalTab = screen.getByRole('tab', { name: /goal calculator/i });
    fireEvent.click(goalTab);

    // Default inputs: Target 10,00,000 @ 12% in 60 months => ~12,123
    const sipOutput = screen.getByTestId('goal-sip-output');
    expect(sipOutput).toBeInTheDocument();
    expect(sipOutput.textContent).toContain('12,123');

    // Goal fit check panel appears
    const goalFitPanel = screen.getByTestId('goal-fit-panel');
    expect(goalFitPanel).toBeInTheDocument();
  });

  it('switches to Compound / SIP Calculator and outputs P3 test vector (~11,61,695) and early start comparison', async () => {
    renderScreen();

    const compoundTab = screen.getByRole('tab', { name: /compound \/ sip/i });
    fireEvent.click(compoundTab);

    // Default inputs: 5,000/mo @ 12% for 10 years (120 months) => ~11,61,695
    const maturityOutput = screen.getByTestId('compound-maturity-output');
    expect(maturityOutput).toBeInTheDocument();
    expect(maturityOutput.textContent).toContain('11,61,695');

    // Power of starting early comparison card is present
    expect(screen.getByText(/power of starting early/i)).toBeInTheDocument();
    expect(screen.getByText(/cost of 5-year delay/i)).toBeInTheDocument();
  });

  it('toggles "How is this calculated?" accordion and reveals formula and plain language explanation', () => {
    renderScreen();

    const accordionBtn = screen.getByRole('button', { name: /how is this calculated\?/i });
    expect(accordionBtn).toBeInTheDocument();

    // Click to open
    fireEvent.click(accordionBtn);

    expect(screen.getAllByText(/plain language explanation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/mathematical formula/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/E = P ×/i)).toBeInTheDocument();
  });

  it('works in Hindi with full localization parity', async () => {
    await i18n.changeLanguage('hi');
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('कैलकुलेटर हब')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ईएमआई कैलकुलेटर/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /लक्ष्य कैलकुलेटर/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /चक्रवृद्धि \/ एसआईपी/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /क्या मैं इसका खर्च उठा सकता हूँ\?/i })).toBeInTheDocument();
    });
  });
});
