// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';
import { Money, formatINR } from '../Money';
import { Badge } from '../Badge';
import { ProgressBar } from '../ProgressBar';
import { Tabs } from '../Tabs';
import { Modal } from '../Modal';
import { getContrastRatio } from '../../utils/contrast';

describe('Design System Tokens & Accessibility', () => {
  it('strictly satisfies WCAG contrast rules for required pairs', () => {
    // 1. Ink (#0F414A) on Paper (#EFE8DF) -> must be >= 7:1 (AAA)
    const inkOnPaper = getContrastRatio('#0F414A', '#EFE8DF');
    expect(inkOnPaper).toBeGreaterThanOrEqual(7.0);

    // 2. Paper (#EFE8DF) on Ink (#0F414A) -> must be >= 7:1 (AAA)
    const paperOnInk = getContrastRatio('#EFE8DF', '#0F414A');
    expect(paperOnInk).toBeGreaterThanOrEqual(7.0);

    // 3. Paper (#EFE8DF) on Accent (#7F0303) -> must be >= 7:1 (AAA)
    const paperOnAccent = getContrastRatio('#EFE8DF', '#7F0303');
    expect(paperOnAccent).toBeGreaterThanOrEqual(7.0);

    // 4. Sky (#96C0CE) on Ink (#0F414A) -> must be >= 4.5:1 (AA / AAA large)
    const skyOnInk = getContrastRatio('#96C0CE', '#0F414A');
    expect(skyOnInk).toBeGreaterThanOrEqual(4.5);
  });
});

describe('UI Kit: Money Component', () => {
  it('formats Rupee values in Indian numbering system', () => {
    const { formattedNumber } = formatINR(123456);
    expect(formattedNumber).toBe('₹1,23,456');
  });

  it('formats large Crores correctly', () => {
    const { formattedNumber } = formatINR(10000000);
    expect(formattedNumber).toBe('₹1,00,00,000');
  });

  it('handles Paise conversion correctly', () => {
    render(<Money amount={250000} inPaise data-testid="money-paise" />);
    const el = screen.getByTestId('money-paise');
    expect(el.textContent).toBe('₹2,500');
    expect(el.className).toContain('tabular-nums');
  });

  it('formats negative numbers with accent tone', () => {
    render(<Money amount={-450} data-testid="money-neg" />);
    const el = screen.getByTestId('money-neg');
    expect(el.textContent).toBe('-₹450');
    expect(el.className).toContain('text-accent');
  });
});

describe('UI Kit: Button Component', () => {
  it('renders primary button with ink background and paper text', () => {
    render(<Button variant="primary">Submit</Button>);
    const btn = screen.getByRole('button', { name: 'Submit' });
    expect(btn.className).toContain('bg-ink');
    expect(btn.className).toContain('text-paper');
  });

  it('renders secondary button with sand background', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' });
    expect(btn.className).toContain('bg-sand');
    expect(btn.className).toContain('text-ink');
  });

  it('renders danger button with accent background', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('bg-accent');
    expect(btn.className).toContain('text-paper');
  });

  it('handles click and disabled states', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
    expect(btn).toBeDisabled();
  });
});

describe('UI Kit: Badge & ProgressBar', () => {
  it('renders Badge with correct variant styles', () => {
    render(<Badge variant="awning" data-testid="badge-awning">Special</Badge>);
    const badge = screen.getByTestId('badge-awning');
    expect(badge.className).toContain('awning-stripe-badge');
  });

  it('renders ProgressBar with aria attributes and awning stripe edge', () => {
    render(<ProgressBar value={75} max={100} label="Groceries" showValueText data-testid="pb" />);
    const pb = screen.getByRole('progressbar');
    expect(pb.getAttribute('aria-valuenow')).toBe('75');
    expect(pb.getAttribute('aria-valuemax')).toBe('100');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});

describe('UI Kit: Tabs & Modal', () => {
  it('switches tabs on click', () => {
    render(
      <Tabs
        items={[
          { id: 'tab1', label: 'Tab One', content: <div>Panel One Content</div> },
          { id: 'tab2', label: 'Tab Two', content: <div>Panel Two Content</div> },
        ]}
      />
    );

    expect(screen.getByText('Panel One Content')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Tab Two'));
    expect(screen.getByText('Panel Two Content')).toBeInTheDocument();
  });

  it('renders Modal when isOpen is true and fires onClose', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Modal Body</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Body')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
