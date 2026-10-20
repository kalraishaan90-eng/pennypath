import { UserMode, BudgetEnvelope } from '../engine/budget';
import {
  FinancialGoal,
  DueReminder,
  MicroLesson,
  UserProfile,
  MarketRateSnapshot,
  Obligation,
  Transaction,
  BudgetPlan,
  PlanLine,
  DemoPersona,
  RiskProfile,
  RiskBand,
} from '../types';

export interface IPennyPathRepository {
  getProfile(mode?: UserMode): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
  updateIncome(mode: UserMode, income: number): Promise<void>;
  updateLanguage(mode: UserMode, language: 'en' | 'hi'): Promise<void>;
  
  getEnvelopes(mode: UserMode): Promise<BudgetEnvelope[]>;
  updateEnvelopeSpent(mode: UserMode, envelopeId: string, deltaSpent: number): Promise<BudgetEnvelope>;
  updateEnvelopeAllocation(mode: UserMode, envelopeId: string, newAllocated: number): Promise<BudgetEnvelope>;
  addEnvelope(mode: UserMode, envelope: Omit<BudgetEnvelope, 'id'>): Promise<BudgetEnvelope>;
  saveEnvelopes(mode: UserMode, envelopes: BudgetEnvelope[]): Promise<void>;
  
  getGoals(mode: UserMode): Promise<FinancialGoal[]>;
  addGoal(mode: UserMode, goal: Omit<FinancialGoal, 'id'>): Promise<FinancialGoal>;
  contributeToGoal(mode: UserMode, goalId: string, amount: number): Promise<FinancialGoal>;
  
  getObligations(mode?: UserMode): Promise<Obligation[]>;
  addObligation(obligation: Omit<Obligation, 'id'>): Promise<Obligation>;
  updateObligation(obligation: Obligation): Promise<Obligation>;
  deleteObligation(obligationId: string): Promise<void>;
  toggleObligationPaid(obligationId: string): Promise<Obligation>;
  saveObligations(obligations: Obligation[]): Promise<void>;

  getTransactions(mode?: UserMode): Promise<Transaction[]>;
  addTransaction(transaction: Omit<Transaction, 'id'>, mode?: UserMode): Promise<Transaction>;
  deleteTransaction(transactionId: string, mode?: UserMode): Promise<void>;
  updateTransaction(transaction: Transaction, mode?: UserMode): Promise<Transaction>;
  
  getBudgetPlan(month?: string): Promise<BudgetPlan | null>;
  saveBudgetPlan(plan: BudgetPlan, lines?: PlanLine[]): Promise<void>;
  getPlanLines(planId?: string): Promise<PlanLine[]>;

  getReminders(mode: UserMode): Promise<DueReminder[]>;
  toggleReminderPaid(
    mode: UserMode,
    reminderId: string,
    options?: { logTransaction?: boolean; categoryKey?: string }
  ): Promise<DueReminder>;
  addReminder(mode: UserMode, reminder: Omit<DueReminder, 'id'>): Promise<DueReminder>;
  markReminderPaid(
    mode: UserMode,
    reminderId: string,
    options?: { logTransaction?: boolean; categoryKey?: string }
  ): Promise<{ reminder: DueReminder; transaction?: Transaction }>;
  snoozeReminder(mode: UserMode, reminderId: string, days: 1 | 3): Promise<DueReminder>;
  
  getLessons(mode: UserMode): Promise<MicroLesson[]>;
  markLessonComplete(lessonId: string): Promise<void>;
  getLessonProgress(userId?: string): Promise<import('../types').LessonProgressRecord[]>;
  
  getMarketSnapshots(): Promise<MarketRateSnapshot[]>;
  
  // Risk Profiles
  getRiskProfile(userId?: string): Promise<RiskProfile | null>;
  saveRiskProfile(profile: Partial<RiskProfile> & { band: RiskBand; score: number; answers: Record<string, any> }): Promise<RiskProfile>;
  
  // Demo Mode management
  seedPersona(personaId: 'rohan' | 'meena' | 'aarav'): Promise<UserProfile>;
  getDemoPersona(): 'rohan' | 'meena' | 'aarav' | null;
  getDemoPersonas(): DemoPersona[];
  exitDemo(): Promise<void>;
  resetSeedData(mode?: UserMode): Promise<void>;
  isDemoMode(): boolean;
}
