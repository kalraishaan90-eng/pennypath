import { UserMode } from '../engine/budget';

export interface FinancialGoal {
  id: string;
  titleKey: string;
  customTitle?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: 'safety' | 'asset' | 'education' | 'lifestyle';
  priority: 'high' | 'medium' | 'low';
}

export interface DueReminder {
  id: string;
  titleKey: string;
  customTitle?: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: 'bill' | 'fee' | 'sip' | 'subscription' | 'loan';
  isPaid: boolean;
  isRecurring: boolean;
  obligationId?: string;
  obligationType?: ObligationType;
  snoozedUntil?: string;
  alertDaysBefore?: number[];
  transactionId?: string;
  emiDetails?: {
    principal: number;
    annualInterestRate: number;
    tenureMonths: number;
    remainingMonths: number;
    remainingPrincipal: number;
  };
}

export type LessonTopicId =
  | 'needs_vs_wants'
  | 'rule_50_30_20'
  | 'emergency_fund'
  | 'how_emis_work'
  | 'compound_interest'
  | 'sip_vs_lump_sum'
  | 'inflation_savings'
  | 'risk_vs_return'
  | 'gold_fd_mutual_funds'
  | 'scam_safety';

export interface MicroLesson {
  id: string;
  topicId: LessonTopicId;
  titleKey: string;
  tagKey: string;
  readTimeMinutes: number;
  mode: UserMode | 'all';
  summaryKey: string;
  contentKey: string;
  takeawayKey: string;
  quiz: {
    questionKey: string;
    optionsKeys: string[];
    correctOptionIndex: number;
    explanationKey: string;
  };
  isCompleted?: boolean;
}

export interface LessonProgressRecord {
  id: string;
  userId: string;
  lessonKey: string;
  completedAt: string;
  createdAt: string;
}

export interface MarketRateSnapshot {
  benchmarkName: string;
  rateOrValue: string;
  change: string;
  isPositive: boolean;
  lastUpdated: string;
  source: string;
  isSampleData?: boolean;
}

export interface UserProfile {
  id: string;
  mode: UserMode;
  name: string;
  monthlyIncome: number;
  language: 'en' | 'hi';
}

export type ObligationType = 'emi' | 'rent' | 'subscription' | 'chit' | 'insurance' | 'utilities' | 'other';

export interface Obligation {
  id: string;
  title: string;
  type: ObligationType;
  amount: number;
  dueDay: number; // 1 to 31
  isPaid?: boolean;
  emiDetails?: {
    principal: number;
    annualInterestRate: number;
    tenureMonths: number;
    remainingMonths: number;
    remainingPrincipal: number;
  };
}

export type PaymentMode = 'cash' | 'upi' | 'card' | 'other';

export interface Transaction {
  id: string;
  date: string; // ISO date 'YYYY-MM-DD'
  amount: number;
  type: 'income' | 'expense';
  categoryKey: string;
  description: string;
  envelopeId?: string;
  isObligation?: boolean;
  obligationId?: string;
  paymentMode?: PaymentMode;
  note?: string;
}

export interface PlanLine {
  id: string;
  planId: string;
  category: string;
  cap: number;
  type?: 'need' | 'want' | 'goal' | 'buffer';
  locked?: boolean;
}

export interface BudgetPlan {
  id: string;
  userId?: string;
  month: string; // 'YYYY-MM'
  income: number;
  fixedTotal: number;
  savingsTarget: number;
  discretionaryTotal: number; // D = income - fixed - savings
  dailyDiscretionary: number; // D / 30
  shortfall: number;
  hasShortfall: boolean;
  createdAt: string;
  status: 'active' | 'archived';
  lines?: PlanLine[];
}

export interface DemoPersona {
  id: 'rohan' | 'meena' | 'aarav';
  name: string;
  roleTitleKey: string;
  mode: UserMode;
  age: number;
  bioKey: string;
  monthlyIncome: number;
  savingsGoal: {
    titleKey: string;
    targetAmount: number;
    currentAmount: number;
    monthlyTarget: number;
    targetDate: string;
    category: 'safety' | 'asset' | 'education' | 'lifestyle';
  };
  obligations: Omit<Obligation, 'id'>[];
}

export interface AuthSession {
  user: {
    id: string;
    email?: string;
    name?: string;
  } | null;
  isGuest: boolean;
  isDemo: boolean;
  personaId?: 'rohan' | 'meena' | 'aarav';
}

export type RiskBand = 'conservative' | 'balanced' | 'growth';

export interface RiskProfile {
  id: string;
  user_id: string;
  score: number;
  band: RiskBand;
  answers: Record<string, any>;
  created_at: string;
}

