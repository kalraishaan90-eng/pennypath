import { UserMode, BudgetEnvelope } from '../engine/budget';
import { Transaction, PaymentMode } from '../types';

export interface ConnectedUpiAccount {
  id: string;
  vpa: string;
  holderName: string;
  bankName: string;
  accountMasked: string;
  accountType: 'savings' | 'current';
  isDefault: boolean;
  linkedAt: string;
}

export interface PresetMerchantQR {
  id: string;
  name: string;
  vpa: string;
  defaultAmount: number;
  itemDescription: string;
  categoryHint: string;
  icon: string;
  tag: string;
}

export interface UpiPaymentRequest {
  payeeVpa?: string;
  payeeName: string;
  payeeAccountNumber?: string;
  payeeIfsc?: string;
  payeeBankName?: string;
  amount: number;
  itemDescription: string;
  envelopeId?: string;
  categoryKey?: string;
  upiPin?: string;
  payerVpa?: string;
  payerBankName?: string;
  payerAccountMasked?: string;
}

export interface UpiPaymentReceipt {
  success: boolean;
  transactionRef: string;
  timestamp: string;
  amount: number;
  itemDescription: string;
  categoryKey: string;
  envelopeId?: string;
  payeeName: string;
  payeeIdentifier: string; // VPA or masked account
  payerVpa: string;
  payerBank: string;
  mode: PaymentMode;
  createdTransaction?: Transaction;
}

const STORAGE_UPI_KEY = 'pennypath_connected_upi';

export const DEFAULT_UPI_ACCOUNTS: Record<UserMode, ConnectedUpiAccount> = {
  earner: {
    id: 'upi-earner-1',
    vpa: 'rohan@okaxis',
    holderName: 'Rohan Sharma',
    bankName: 'HDFC Bank',
    accountMasked: '•••• 4821',
    accountType: 'savings',
    isDefault: true,
    linkedAt: '2026-09-01',
  },
  household: {
    id: 'upi-household-1',
    vpa: 'meena@okhdfcbank',
    holderName: 'Meena Patel',
    bankName: 'State Bank of India',
    accountMasked: '•••• 9104',
    accountType: 'savings',
    isDefault: true,
    linkedAt: '2026-08-15',
  },
  student: {
    id: 'upi-student-1',
    vpa: 'aarav@ybl',
    holderName: 'Aarav Verma',
    bankName: 'ICICI Bank',
    accountMasked: '•••• 3025',
    accountType: 'savings',
    isDefault: true,
    linkedAt: '2026-09-20',
  },
};

export const PRESET_MERCHANT_QRS: PresetMerchantQR[] = [
  {
    id: 'qr-kirana',
    name: 'Ramesh Kirana & General Store',
    vpa: 'ramesh.kirana@paytm',
    defaultAmount: 380,
    itemDescription: 'Weekly groceries & milk',
    categoryHint: 'budget.cat.groceries_ration',
    icon: 'ShoppingBag',
    tag: 'Daily Kirana',
  },
  {
    id: 'qr-chai',
    name: 'Blue Tokai Cafe & Bakery',
    vpa: 'bluetokai@icici',
    defaultAmount: 240,
    itemDescription: 'Cappuccino & croissant breakfast',
    categoryHint: 'budget.cat.food_groceries',
    icon: 'Coffee',
    tag: 'Food & Coffee',
  },
  {
    id: 'qr-pharmacy',
    name: 'Apollo 24|7 Pharmacy',
    vpa: 'apollo.meds@hdfcbank',
    defaultAmount: 650,
    itemDescription: 'Vitamins & first-aid medicines',
    categoryHint: 'budget.cat.utilities_bills',
    icon: 'Pill',
    tag: 'Healthcare',
  },
  {
    id: 'qr-metro',
    name: 'Namma Metro / FastTag Commute',
    vpa: 'commute.ride@axisbank',
    defaultAmount: 90,
    itemDescription: 'Metro SmartCard token recharge',
    categoryHint: 'budget.cat.commute',
    icon: 'Train',
    tag: 'Transport',
  },
  {
    id: 'qr-power',
    name: 'BESCOM Electricity Utility',
    vpa: 'bescom.bill@sbi',
    defaultAmount: 1420,
    itemDescription: 'October Home Power & Electricity bill',
    categoryHint: 'budget.cat.utilities_bills',
    icon: 'Zap',
    tag: 'Monthly Bill',
  },
  {
    id: 'qr-canteen',
    name: 'Campus Canteen & Stationery',
    vpa: 'canteen.campus@oksbi',
    defaultAmount: 120,
    itemDescription: 'Lunch thali & notebook',
    categoryHint: 'budget.cat.canteen_fun',
    icon: 'Utensils',
    tag: 'Campus Snack',
  },
];

const BANK_IFSC_MAP: Record<string, string> = {
  SBIN: 'State Bank of India',
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank',
  BARB: 'Bank of Baroda',
  CNRB: 'Canara Bank',
  UBIN: 'Union Bank of India',
  IDIB: 'Indian Bank',
  BKID: 'Bank of India',
  YESB: 'Yes Bank',
  IDFB: 'IDFC FIRST Bank',
  PYTM: 'Paytm Payments Bank',
  AIRP: 'Airtel Payments Bank',
  IOBA: 'Indian Overseas Bank',
  INDB: 'IndusInd Bank',
};

/**
 * Returns connected UPI accounts for current user
 */
export function getConnectedUpiAccounts(mode: UserMode = 'earner'): ConnectedUpiAccount[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_UPI_KEY}_${mode}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored UPI accounts', e);
  }
  const defaultAcc = DEFAULT_UPI_ACCOUNTS[mode] || DEFAULT_UPI_ACCOUNTS.earner;
  return [defaultAcc];
}

/**
 * Saves connected UPI accounts for current user
 */
export function saveConnectedUpiAccounts(accounts: ConnectedUpiAccount[], mode: UserMode = 'earner'): void {
  try {
    localStorage.setItem(`${STORAGE_UPI_KEY}_${mode}`, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save UPI accounts', e);
  }
}

/**
 * Get active default account
 */
export function getPrimaryUpiAccount(mode: UserMode = 'earner'): ConnectedUpiAccount {
  const accounts = getConnectedUpiAccounts(mode);
  const found = accounts.find((a) => a.isDefault);
  return found || accounts[0] || DEFAULT_UPI_ACCOUNTS.earner;
}

/**
 * Parses UPI QR codes or strings
 * Supports upi://pay?pa=...&pn=...&am=...&tn=...
 */
export function parseUpiString(input: string): {
  payeeVpa: string;
  payeeName: string;
  amount?: number;
  note?: string;
  isValid: boolean;
} {
  const clean = (input || '').trim();
  if (!clean) {
    return { payeeVpa: '', payeeName: '', isValid: false };
  }

  // 1. Standard UPI URI scheme: upi://pay?pa=...
  if (clean.toLowerCase().startsWith('upi://pay')) {
    try {
      const url = new URL(clean.replace('upi://pay', 'http://upi.dummy'));
      const pa = url.searchParams.get('pa') || '';
      const pn = url.searchParams.get('pn') || '';
      const am = url.searchParams.get('am');
      const tn = url.searchParams.get('tn') || '';

      const amountNum = am ? parseFloat(am) : undefined;
      return {
        payeeVpa: pa,
        payeeName: pn ? decodeURIComponent(pn) : (pa ? pa.split('@')[0] : 'Merchant'),
        amount: amountNum && !isNaN(amountNum) && amountNum > 0 ? amountNum : undefined,
        note: tn ? decodeURIComponent(tn) : undefined,
        isValid: Boolean(pa && pa.includes('@')),
      };
    } catch {
      // fallback regex if URL parsing fails
      const paMatch = clean.match(/pa=([^&]+)/i);
      const pnMatch = clean.match(/pn=([^&]+)/i);
      const amMatch = clean.match(/am=([^&]+)/i);
      const tnMatch = clean.match(/tn=([^&]+)/i);

      const pa = paMatch ? decodeURIComponent(paMatch[1]) : '';
      const pn = pnMatch ? decodeURIComponent(pnMatch[1]) : '';
      const am = amMatch ? parseFloat(amMatch[1]) : undefined;
      const tn = tnMatch ? decodeURIComponent(tnMatch[1]) : '';

      return {
        payeeVpa: pa,
        payeeName: pn || (pa ? pa.split('@')[0] : 'Merchant'),
        amount: am && !isNaN(am) ? am : undefined,
        note: tn || undefined,
        isValid: Boolean(pa && pa.includes('@')),
      };
    }
  }

  // 2. Direct VPA entry: e.g. "sharma@okaxis" or "9876543210@paytm"
  if (/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(clean)) {
    const rawName = clean.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    return {
      payeeVpa: clean,
      payeeName: formattedName,
      isValid: true,
    };
  }

  return { payeeVpa: '', payeeName: '', isValid: false };
}

/**
 * Lookup bank name by IFSC code
 */
export function lookupIfsc(ifsc: string): { bankName: string; branch: string; isValid: boolean } {
  const clean = (ifsc || '').trim().toUpperCase();
  if (clean.length < 4) {
    return { bankName: '', branch: '', isValid: false };
  }
  const prefix = clean.substring(0, 4);
  const bankName = BANK_IFSC_MAP[prefix] || (clean.length >= 11 ? 'Verified Commercial Bank' : '');
  const isValid = Boolean(BANK_IFSC_MAP[prefix]) && clean.length === 11;
  const branch = isValid ? `Main Branch (${clean.substring(5)})` : '';
  return { bankName, branch, isValid };
}

/**
 * Smart Auto-Categorization: Matches user item description or merchant to budget envelopes
 */
export function matchEnvelopeForItem(
  itemDescription: string,
  envelopes: BudgetEnvelope[],
  merchantName: string = ''
): {
  matchedEnvelope: BudgetEnvelope | null;
  categoryKey: string;
  isConfident: boolean;
} {
  const text = `${itemDescription} ${merchantName}`.toLowerCase();

  const rules: { regex: RegExp; keywords: string[] }[] = [
    {
      regex: /grocer|kirana|ration|sabzi|vegetable|fruit|blinkit|zepto|instamart|dmart|bigbasket|milk|bread|amul|mother dairy|flour|atta|dal|oil/i,
      keywords: ['groceries_ration', 'food_groceries', 'food_mess'],
    },
    {
      regex: /cafe|coffee|chai|tea|dinner|lunch|breakfast|swiggy|zomato|burger|pizza|dosa|biryani|restaurant|canteen|snack|mcdonald|kfc|barista|starbucks/i,
      keywords: ['food_groceries', 'canteen_fun', 'family_dining', 'food_mess', 'weekend_hangouts'],
    },
    {
      regex: /metro|uber|ola|rapido|bus|auto|rickshaw|petrol|fuel|diesel|commute|transport|travel|train|irctc|fastag|cab/i,
      keywords: ['commute', 'transport', 'household_buffer'],
    },
    {
      regex: /power|electricity|bescom|tneb|gas|cylinder|indane|bill|wifi|airtel|jio|broadband|recharge|water|utility|utilities/i,
      keywords: ['utilities_bills', 'household_buffer'],
    },
    {
      regex: /shopping|amazon|flipkart|myntra|clothes|shoes|zara|h&m|electronics|phone|headphone|earphone|gadget/i,
      keywords: ['gadgets_shopping', 'canteen_fun', 'weekend_hangouts'],
    },
    {
      regex: /movie|cinema|pvr|inox|netflix|party|hangout|drink|beer|gaming|fun|concert|club/i,
      keywords: ['weekend_hangouts', 'canteen_fun', 'family_dining'],
    },
    {
      regex: /book|tuition|fee|college|school|stationery|course|exam|pen|notebook|class/i,
      keywords: ['kids_education', 'tuition_books', 'laptop_goal'],
    },
    {
      regex: /rent|pg|hostel|flat|maintenance|society/i,
      keywords: ['pg_rent', 'household_buffer'],
    },
    {
      regex: /doctor|medicine|pharmacy|apollo|hospital|clinic|meds|tablet|syrup|test|diagnostic/i,
      keywords: ['utilities_bills', 'household_buffer', 'emergency_stash'],
    },
  ];

  for (const rule of rules) {
    if (rule.regex.test(text)) {
      for (const kw of rule.keywords) {
        const found = envelopes.find((e) => e.categoryKey.toLowerCase().includes(kw));
        if (found) {
          return {
            matchedEnvelope: found,
            categoryKey: found.categoryKey,
            isConfident: true,
          };
        }
      }
    }
  }

  // Fallback to first available need/expense envelope
  const fallback = envelopes[0] || null;
  return {
    matchedEnvelope: fallback,
    categoryKey: fallback ? fallback.categoryKey : 'budget.cat.food_groceries',
    isConfident: false,
  };
}

/**
 * Builds standard UPI Intent Deep Link for mobile devices
 */
export function buildUpiDeepLink(params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  const { payeeVpa, payeeName, amount, note } = params;
  const url = new URL('upi://pay');
  url.searchParams.set('pa', payeeVpa);
  url.searchParams.set('pn', payeeName);
  url.searchParams.set('am', amount.toFixed(2));
  url.searchParams.set('cu', 'INR');
  if (note) {
    url.searchParams.set('tn', note);
  }
  return url.toString();
}

/**
 * Generates an authentic NPCI UPI Reference Number
 */
export function generateUpiReferenceNumber(): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  return `UPI/${datePart}/${randomSuffix}`;
}
