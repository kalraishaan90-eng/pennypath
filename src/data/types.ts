/**
 * PennyPath Database Schema & Domain Types
 * 
 * RULE: All money is stored as integer PAISE (1 Rupee = 100 Paise).
 * Never use floating-point numbers for currency amounts.
 */

export type Paise = number;

/**
 * Validates that an amount is a safe, non-negative integer representing paise.
 * Throws TypeError if a float or negative number is passed.
 */
export function assertIntegerPaise(amount: unknown, fieldName = 'Amount'): asserts amount is Paise {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    throw new TypeError(
      `[PennyPath Currency Rule Violation] ${fieldName} must be an integer number of paise, received: ${amount}`
    );
  }
}

/**
 * Converts whole or decimal Rupees into integer Paise safely without float inaccuracy.
 * e.g., toPaise(125.50) -> 12550
 */
export function toPaise(rupees: number): Paise {
  if (typeof rupees !== 'number' || Number.isNaN(rupees)) {
    throw new TypeError(`Cannot convert non-number to paise: ${rupees}`);
  }
  return Math.round(rupees * 100);
}

/**
 * Converts integer Paise into decimal Rupees for display purposes only.
 */
export function toRupees(paise: Paise): number {
  assertIntegerPaise(paise, 'paise');
  return paise / 100;
}

/**
 * Formats integer Paise in the Indian number formatting system (Lakhs / Crores).
 * e.g., 2500000 paise -> ₹25,000
 */
export function formatINR(paise: Paise, language: 'en' | 'hi' = 'en'): string {
  assertIntegerPaise(paise, 'paise');
  const rupees = toRupees(paise);
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(rupees);
}

// ----------------------------------------------------------------------------
// Entity Enums & Allowed Literals
// ----------------------------------------------------------------------------
export type ProfileMode = 'student' | 'household' | 'earner';
export type Language = 'en' | 'hi';
export type IncomeFrequency = 'monthly' | 'weekly' | 'one_time';
export type CategoryKind = 'need' | 'want' | 'saving';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'other';
export type TransactionSource = 'manual' | 'sms';
export type ObligationKind = 'emi' | 'rent' | 'subscription' | 'insurance' | 'chit' | 'other';
export type ReminderStatus = 'pending' | 'done' | 'snoozed';
export type RiskBand = 'conservative' | 'balanced' | 'growth';

// ----------------------------------------------------------------------------
// Database Models
// ----------------------------------------------------------------------------
export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  mode: ProfileMode;
  language: Language;
  month_start_day: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface IncomeSource {
  id: string;
  user_id: string;
  label: string;
  amount_paise: Paise;
  frequency: IncomeFrequency;
  created_at: string;
}

export type IncomeSourceInsert = Omit<IncomeSource, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface Category {
  id: string;
  user_id: string;
  name_en: string;
  name_hi: string;
  kind: CategoryKind;
  icon: string;
  is_default: boolean;
  created_at: string;
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface Transaction {
  id: string;
  user_id: string;
  amount_paise: Paise;
  category_id: string | null;
  note: string | null;
  occurred_on: string; // YYYY-MM-DD
  payment_mode: PaymentMode;
  source: TransactionSource;
  created_at: string;
}

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paymentMode?: PaymentMode;
  source?: TransactionSource;
  limit?: number;
  offset?: number;
}

export interface Obligation {
  id: string;
  user_id: string;
  label: string;
  kind: ObligationKind;
  amount_paise: Paise;
  due_day: number;
  principal_paise: Paise | null;
  annual_rate: number | null;
  tenure_months: number | null;
  start_date: string | null;
  active: boolean;
  created_at: string;
}

export type ObligationInsert = Omit<Obligation, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface Goal {
  id: string;
  user_id: string;
  label: string;
  target_paise: Paise;
  target_date: string; // YYYY-MM-DD
  saved_paise: Paise;
  priority: number;
  created_at: string;
}

export type GoalInsert = Omit<Goal, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface BudgetPlan {
  id: string;
  user_id: string;
  month: string; // YYYY-MM-DD
  income_paise: Paise;
  fixed_paise: Paise;
  savings_target_paise: Paise;
  variable_budget_paise: Paise;
  shortfall_paise: Paise;
  created_at: string;
}

export type BudgetPlanInsert = Omit<BudgetPlan, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface PlanLine {
  id: string;
  user_id: string;
  plan_id: string;
  category_id: string;
  cap_paise: Paise;
  created_at: string;
}

export type PlanLineInsert = Omit<PlanLine, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface BudgetPlanWithLines extends BudgetPlan {
  lines: PlanLine[];
}

export interface Reminder {
  id: string;
  user_id: string;
  obligation_id: string | null;
  label: string;
  remind_on: string; // YYYY-MM-DD
  status: ReminderStatus;
  created_at: string;
}

export type ReminderInsert = Omit<Reminder, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface RiskProfile {
  id: string;
  user_id: string;
  score: number;
  band: RiskBand;
  answers: Record<string, any>;
  created_at: string;
}

export type RiskProfileInsert = Omit<RiskProfile, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_key: string;
  completed_at: string;
  created_at: string;
}

export type LessonProgressInsert = Omit<LessonProgress, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ----------------------------------------------------------------------------
// Supabase Database Mapping Types (for createClient<Database>)
// ----------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      income_sources: {
        Row: IncomeSource;
        Insert: IncomeSourceInsert;
        Update: Partial<IncomeSourceInsert>;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: Partial<CategoryInsert>;
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: Partial<TransactionInsert>;
      };
      obligations: {
        Row: Obligation;
        Insert: ObligationInsert;
        Update: Partial<ObligationInsert>;
      };
      goals: {
        Row: Goal;
        Insert: GoalInsert;
        Update: Partial<GoalInsert>;
      };
      budget_plans: {
        Row: BudgetPlan;
        Insert: BudgetPlanInsert;
        Update: Partial<BudgetPlanInsert>;
      };
      plan_lines: {
        Row: PlanLine;
        Insert: PlanLineInsert;
        Update: Partial<PlanLineInsert>;
      };
      reminders: {
        Row: Reminder;
        Insert: ReminderInsert;
        Update: Partial<ReminderInsert>;
      };
      risk_profiles: {
        Row: RiskProfile;
        Insert: RiskProfileInsert;
        Update: Partial<RiskProfileInsert>;
      };
      lesson_progress: {
        Row: LessonProgress;
        Insert: LessonProgressInsert;
        Update: Partial<LessonProgressInsert>;
      };
    };
  };
}
