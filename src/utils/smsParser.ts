/**
 * UPI Debit SMS Regex Parser for Indian Banks (HDFC, SBI, ICICI, Axis, Kotak, etc.)
 * Strictly parses text into { amount, merchant, date, suggestedCategoryKey, paymentMode }
 * and never auto-saves.
 */

export interface ParsedSMSResult {
  amount: number;
  merchant: string;
  date: string; // YYYY-MM-DD
  paymentMode: 'upi';
  suggestedCategoryKey: string;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Normalizes date string into YYYY-MM-DD format
 */
export function normalizeDate(dateStr: string): string {
  const clean = dateStr.trim();

  // Format: 20-10-2026 or 20/10/2026 or 20-10-26
  const dmyMatch = clean.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Format: 20-Oct-2026 or 20Oct26 or 20-Oct-26
  const alphaMatch = clean.match(/^(\d{1,2})[-\s]?([A-Za-z]{3})[-\s]?(\d{2,4})$/i);
  if (alphaMatch) {
    const day = alphaMatch[1].padStart(2, '0');
    const monthKey = alphaMatch[2].toLowerCase();
    const month = MONTH_MAP[monthKey] || '10';
    let year = alphaMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  return '2026-10-20';
}

/**
 * Guesses the most appropriate PennyPath budget category based on merchant name
 */
export function guessCategory(merchant: string, text: string): string {
  const combined = `${merchant} ${text}`.toLowerCase();

  if (/blinkit|zepto|instamart|kirana|ration|grocery|groceries|dairy|amul|mother dairy|subzi|veggies|fruits|bigbasket/i.test(combined)) {
    return 'budget.cat.groceries_ration';
  }
  if (/swiggy|zomato|eatfit|restaurant|cafe|chai|tea|coffee|dhaba|mess|pizza|burger|mcdonald|kfc|food|lunch|dinner|thali/i.test(combined)) {
    return 'budget.cat.food_groceries';
  }
  if (/uber|ola|rapido|metro|petrol|fuel|hpcl|bpcl|iocl|bike|commute|transport|bus|auto/i.test(combined)) {
    return 'budget.cat.commute';
  }
  if (/electricity|bescom|adani|gas|indane|bill|wifi|airtel|jio|broadband|recharge|cylinder/i.test(combined)) {
    return 'budget.cat.utilities_bills';
  }
  if (/school|tuition|books|college|exam|fee|notebooks|stationery/i.test(combined)) {
    return 'budget.cat.kids_education';
  }
  if (/amazon|flipkart|myntra|boat|croma|shopping|gadgets|earphones/i.test(combined)) {
    return 'budget.cat.gadgets_shopping';
  }
  if (/cinema|pvr|movie|netflix|party|hangout|bar/i.test(combined)) {
    return 'budget.cat.weekend_hangouts';
  }

  return 'budget.cat.food_groceries';
}

/**
 * Main SMS parsing function using robust regular expressions
 */
export function parseUPISMS(smsText: string): ParsedSMSResult | null {
  if (!smsText || typeof smsText !== 'string' || smsText.trim().length === 0) {
    return null;
  }

  const text = smsText.trim();

  // 1. Extract Amount
  // Matches: "Rs. 450.00", "Rs 250", "INR 750.50", "₹500", "debited by Rs 1,200", "Paid Rs.60"
  let amount = 0;
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /debited\s+(?:by|with|for)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /paid\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /spent\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  if (amount <= 0) {
    return null;
  }

  // 2. Extract Merchant / Receiver
  let merchant = 'UPI Merchant';
  const merchantRegexes = [
    // VPA handle e.g. "to VPA swiggy@icici" or "to uber@icici"
    /(?:to\s+VPA\s+|to\s+)([a-zA-Z0-9._-]+)@[a-zA-Z0-9]+/i,
    // UPI transfer e.g. "transfer to UPI/DR/529381/Zomato" or "Info: UPI/BLR*PETROL/paytm"
    /(?:transfer\s+to\s+UPI\/DR\/[^\/]+\/|towards\s+UPI\/|Info:\s*UPI\/|to\s+UPI\/)([^\/.\n,]+)/i,
    // "to [Merchant] on" or "to [Merchant] via" or "to [Merchant] using"
    /(?:to|towards|at)\s+([A-Za-z0-9&'\s.-]+?)(?:\s+(?:on|via|using|via\s+UPI|Ref|UPI|A\/c|Avl|Bal)|\.|\n|$)/i,
    // "Paid Rs.X to [Merchant]"
    /paid\s+(?:rs\.?|inr|₹)?\s*[\d,.]+\s+to\s+([A-Za-z0-9&'\s.-]+?)(?:\s+(?:using|on|via)|\.|\n|$)/i,
  ];

  for (const regex of merchantRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Avoid false positive matching "VPA", "account", numbers
      if (
        candidate.length > 1 &&
        !/^(account|a\/c|vpa|bank|upi|ref|bal|avl)$/i.test(candidate) &&
        !/^\d+$/.test(candidate)
      ) {
        merchant = candidate.replace(/^VPA\s+/i, '').trim();
        break;
      }
    }
  }

  // Capitalize nicely
  merchant = merchant
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .substring(0, 40);

  // 3. Extract Date
  let date = '2026-10-20';
  const dateRegexes = [
    /(?:on\s+)(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /(?:on\s+)(\d{1,2}[-\s]?[A-Za-z]{3}[-\s]?\d{2,4})/i,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{1,2}[A-Za-z]{3}\d{2,4})/,
  ];

  for (const regex of dateRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      date = normalizeDate(match[1]);
      break;
    }
  }

  // 4. Guessed category
  const suggestedCategoryKey = guessCategory(merchant, text);

  return {
    amount,
    merchant,
    date,
    paymentMode: 'upi',
    suggestedCategoryKey,
    rawText: smsText,
    confidence: amount > 0 && merchant !== 'UPI Merchant' ? 'high' : 'medium',
  };
}

export const SAMPLE_UPI_SMS = {
  hdfc: 'Rs. 450.00 debited from a/c **1234 on 20-10-2026 to VPA swiggy@icici (UPI Ref no 123456789012).',
  sbi: 'Dear SBI User, your A/c ending 4567 debited by Rs 250.0 on 20Oct26 by transfer to UPI/DR/529381/Zomato. Bal: Rs 5400.',
  icici: 'Acct XX123 debited with INR 750.00 on 20-Oct-26. Info: UPI/BLR*PETROL/paytm. Avl Bal: INR 12,400.00.',
  axis: 'INR 350.00 debited from A/c no. XX789 on 20-10-2026 14:32:10 towards UPI/Zepto Blink/upi@axis. UPI Ref: 98765.',
};
