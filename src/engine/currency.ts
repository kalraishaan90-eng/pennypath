/**
 * Currency utilities for Indian Rupee (INR) formatting and parsing.
 * Always formats with Indian number grouping via Intl.NumberFormat('en-IN').
 */

export interface FormatINROptions {
  showPaise?: boolean;
  compact?: boolean;
  includeSymbol?: boolean;
}

/**
 * Formats a number as Indian Rupee (e.g. ₹1,50,000 or ₹1.5 Lakh)
 */
export function formatINR(amount: number, options: FormatINROptions = {}): string {
  const { showPaise = false, compact = false, includeSymbol = true } = options;

  if (isNaN(amount) || !isFinite(amount)) {
    return includeSymbol ? '₹0' : '0';
  }

  // Handle compact notation for Indian numbering system (Lakhs, Crores)
  if (compact && Math.abs(amount) >= 100000) {
    const symbol = includeSymbol ? '₹' : '';
    if (Math.abs(amount) >= 10000000) {
      const cr = amount / 10000000;
      return `${symbol}${cr.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })} Cr`;
    }
    const lakh = amount / 100000;
    return `${symbol}${lakh.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })} L`;
  }

  const fractionDigits = showPaise ? 2 : 0;

  if (includeSymbol) {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    });
    return formatter.format(amount);
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
  return formatter.format(amount);
}

/**
 * Parses user input string to clean numeric INR value
 */
export function parseINR(value: string | number): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : Math.max(0, value);
  }

  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remove currency symbol, commas, and whitespace
  const sanitized = value.replace(/[₹,\s]/g, '').trim();
  const parsed = parseFloat(sanitized);

  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Rounds an amount to the nearest Rupee
 */
export function roundToRupee(amount: number): number {
  return Math.round(amount);
}
