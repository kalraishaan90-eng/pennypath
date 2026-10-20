import { describe, it, expect, beforeEach } from 'vitest';
import {
  getConnectedUpiAccounts,
  getPrimaryUpiAccount,
  saveConnectedUpiAccounts,
  parseUpiString,
  lookupIfsc,
  matchEnvelopeForItem,
  buildUpiDeepLink,
  generateUpiReferenceNumber,
  ConnectedUpiAccount,
} from '../upiService';
import { BudgetEnvelope } from '../../engine/budget';

const mockEnvelopes: BudgetEnvelope[] = [
  { id: 'env-1', categoryKey: 'budget.cat.food_groceries', allocated: 7000, spent: 4000, icon: 'Utensils', type: 'need' },
  { id: 'env-2', categoryKey: 'budget.cat.groceries_ration', allocated: 8000, spent: 3500, icon: 'ShoppingBag', type: 'need' },
  { id: 'env-3', categoryKey: 'budget.cat.commute', allocated: 3000, spent: 1200, icon: 'Bus', type: 'need' },
  { id: 'env-4', categoryKey: 'budget.cat.utilities_bills', allocated: 4000, spent: 2100, icon: 'Zap', type: 'need' },
  { id: 'env-5', categoryKey: 'budget.cat.weekend_hangouts', allocated: 4500, spent: 2000, icon: 'Coffee', type: 'want' },
];

describe('UPI Service & Auto-Expense System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('UPI Account Connection & Management', () => {
    it('returns default primary account for earner persona', () => {
      const primary = getPrimaryUpiAccount('earner');
      expect(primary).toBeDefined();
      expect(primary.vpa).toBe('rohan@okaxis');
      expect(primary.bankName).toBe('HDFC Bank');
    });

    it('returns default primary account for student and household', () => {
      const studentAcc = getPrimaryUpiAccount('student');
      expect(studentAcc.vpa).toBe('aarav@ybl');

      const householdAcc = getPrimaryUpiAccount('household');
      expect(householdAcc.vpa).toBe('meena@okhdfcbank');
    });

    it('persists and retrieves custom linked UPI accounts', () => {
      const customAcc: ConnectedUpiAccount = {
        id: 'custom-1',
        vpa: 'testuser@okhdfcbank',
        holderName: 'Test User',
        bankName: 'HDFC Bank',
        accountMasked: '•••• 1234',
        accountType: 'savings',
        isDefault: true,
        linkedAt: '2026-10-20',
      };

      saveConnectedUpiAccounts([customAcc], 'earner');
      const retrieved = getConnectedUpiAccounts('earner');
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].vpa).toBe('testuser@okhdfcbank');

      const primary = getPrimaryUpiAccount('earner');
      expect(primary.vpa).toBe('testuser@okhdfcbank');
    });
  });

  describe('QR Code & UPI URI Parser', () => {
    it('parses standard Bharat UPI URI scheme correctly', () => {
      const uri = 'upi://pay?pa=ramesh.kirana@paytm&pn=Ramesh%20Kirana%20Store&am=380.00&cu=INR&tn=Weekly%20vegetables';
      const parsed = parseUpiString(uri);

      expect(parsed.isValid).toBe(true);
      expect(parsed.payeeVpa).toBe('ramesh.kirana@paytm');
      expect(parsed.payeeName).toBe('Ramesh Kirana Store');
      expect(parsed.amount).toBe(380);
      expect(parsed.note).toBe('Weekly vegetables');
    });

    it('parses raw VPA strings with auto-formatted name', () => {
      const raw = 'bluetokai.coffee@icici';
      const parsed = parseUpiString(raw);

      expect(parsed.isValid).toBe(true);
      expect(parsed.payeeVpa).toBe('bluetokai.coffee@icici');
      expect(parsed.payeeName).toContain('Bluetokai');
    });

    it('handles empty or malformed strings safely', () => {
      expect(parseUpiString('').isValid).toBe(false);
      expect(parseUpiString('not-a-upi-string').isValid).toBe(false);
    });
  });

  describe('IFSC Bank Lookup', () => {
    it('resolves bank name from standard Indian IFSC prefixes', () => {
      expect(lookupIfsc('SBIN0001234').bankName).toBe('State Bank of India');
      expect(lookupIfsc('SBIN0001234').isValid).toBe(true);

      expect(lookupIfsc('HDFC0000128').bankName).toBe('HDFC Bank');
      expect(lookupIfsc('HDFC0000128').isValid).toBe(true);

      expect(lookupIfsc('ICIC0000001').bankName).toBe('ICICI Bank');
      expect(lookupIfsc('ICIC0000001').isValid).toBe(true);

      expect(lookupIfsc('UTIB0000001').bankName).toBe('Axis Bank');
    });

    it('handles invalid or short IFSC codes', () => {
      expect(lookupIfsc('XYZ').isValid).toBe(false);
      expect(lookupIfsc('').isValid).toBe(false);
    });
  });

  describe('Auto-Categorization: Item Description to Budget Envelopes', () => {
    it('maps food items and restaurants to food envelope', () => {
      const res = matchEnvelopeForItem('Masala Dosa and Filter Coffee', mockEnvelopes, 'Udupi Cafe');
      expect(res.categoryKey).toBe('budget.cat.food_groceries');
      expect(res.isConfident).toBe(true);
    });

    it('maps groceries and kirana items to groceries envelope', () => {
      const res = matchEnvelopeForItem('Atta, Dal and Cooking Oil', mockEnvelopes, 'Ramesh Kirana');
      expect(res.categoryKey).toBe('budget.cat.groceries_ration');
      expect(res.isConfident).toBe(true);
    });

    it('maps commute and transport to commute envelope', () => {
      const res = matchEnvelopeForItem('Metro smartcard recharge and Auto fare', mockEnvelopes, 'Namma Metro');
      expect(res.categoryKey).toBe('budget.cat.commute');
      expect(res.isConfident).toBe(true);
    });

    it('maps electricity and power bills to utilities envelope', () => {
      const res = matchEnvelopeForItem('Monthly electricity and power charges', mockEnvelopes, 'BESCOM');
      expect(res.categoryKey).toBe('budget.cat.utilities_bills');
      expect(res.isConfident).toBe(true);
    });

    it('falls back gracefully to first envelope when description is generic', () => {
      const res = matchEnvelopeForItem('Miscellaneous item', mockEnvelopes);
      expect(res.matchedEnvelope).not.toBeNull();
      expect(res.isConfident).toBe(false);
    });
  });

  describe('Payment Deep Link & Reference Generator', () => {
    it('generates a valid UPI deep link URL', () => {
      const link = buildUpiDeepLink({
        payeeVpa: 'shop@upi',
        payeeName: 'Local Shop',
        amount: 450,
        note: 'Stationery items',
      });

      expect(link).toContain('upi://pay');
      expect(link).toContain('pa=shop%40upi');
      expect(link).toContain('am=450.00');
      expect(link).toContain('cu=INR');
    });

    it('generates authentic NPCI reference numbers with date format', () => {
      const ref = generateUpiReferenceNumber();
      expect(ref).toMatch(/^UPI\/\d{6}\/\d{6}$/);
    });
  });
});
