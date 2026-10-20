import { describe, it, expect } from 'vitest';
import { parseUPISMS, SAMPLE_UPI_SMS, normalizeDate } from '../smsParser';

describe('UPI Debit SMS Regex Parser', () => {
  it('correctly parses HDFC Bank UPI debit SMS', () => {
    const result = parseUPISMS(SAMPLE_UPI_SMS.hdfc);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(450);
    expect(result?.merchant.toLowerCase()).toContain('swiggy');
    expect(result?.date).toBe('2026-10-20');
    expect(result?.paymentMode).toBe('upi');
    expect(result?.suggestedCategoryKey).toBe('budget.cat.food_groceries');
  });

  it('correctly parses SBI Bank UPI debit SMS', () => {
    const result = parseUPISMS(SAMPLE_UPI_SMS.sbi);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(250);
    expect(result?.merchant.toLowerCase()).toContain('zomato');
    expect(result?.date).toBe('2026-10-20');
    expect(result?.suggestedCategoryKey).toBe('budget.cat.food_groceries');
  });

  it('correctly parses ICICI Bank UPI debit SMS with petrol fuel merchant', () => {
    const result = parseUPISMS(SAMPLE_UPI_SMS.icici);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(750);
    expect(result?.merchant.toLowerCase()).toContain('petrol');
    expect(result?.date).toBe('2026-10-20');
    expect(result?.suggestedCategoryKey).toBe('budget.cat.commute');
  });

  it('correctly parses Axis Bank UPI debit SMS with grocery merchant', () => {
    const result = parseUPISMS(SAMPLE_UPI_SMS.axis);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(350);
    expect(result?.merchant.toLowerCase()).toContain('zepto');
    expect(result?.date).toBe('2026-10-20');
    expect(result?.suggestedCategoryKey).toBe('budget.cat.groceries_ration');
  });

  it('returns null for non-SMS or non-financial messages', () => {
    expect(parseUPISMS('')).toBeNull();
    expect(parseUPISMS('Your OTP for Aadhaar verification is 584920.')).toBeNull();
    expect(parseUPISMS('Hello, please call me back later.')).toBeNull();
  });

  it('normalizes multiple date formats properly', () => {
    expect(normalizeDate('20-10-2026')).toBe('2026-10-20');
    expect(normalizeDate('20/10/2026')).toBe('2026-10-20');
    expect(normalizeDate('20-10-26')).toBe('2026-10-20');
    expect(normalizeDate('20-Oct-2026')).toBe('2026-10-20');
    expect(normalizeDate('20Oct26')).toBe('2026-10-20');
  });
});
