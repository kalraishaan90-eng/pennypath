/**
 * PennyPath Data Repositories
 * 
 * Provides a unified Repository contract with two implementations:
 * 1. SupabaseRepository - For production cloud sync with PostgreSQL & RLS.
 * 2. LocalRepository - For offline Demo Mode and local-first privacy (IndexedDB / localStorage).
 * 
 * RULE: All monetary amounts are integer PAISE (bigint in DB, integer in TS).
 * Floats are strictly prohibited.
 */

import {
  assertIntegerPaise,
  type Profile,
  type ProfileInsert,
  type IncomeSource,
  type IncomeSourceInsert,
  type Category,
  type CategoryInsert,
  type Transaction,
  type TransactionInsert,
  type TransactionFilter,
  type Obligation,
  type ObligationInsert,
  type Goal,
  type GoalInsert,
  type BudgetPlan,
  type BudgetPlanInsert,
  type PlanLine,
  type PlanLineInsert,
  type BudgetPlanWithLines,
  type Reminder,
  type ReminderInsert,
  type ReminderStatus,
  type RiskProfile,
  type RiskProfileInsert,
  type LessonProgress,
  type LessonProgressInsert,
} from './types';

export * from './types';

export const DEFAULT_CATEGORIES: Omit<CategoryInsert, 'user_id'>[] = [
  { name_en: 'Rent', name_hi: 'किराया', kind: 'need', icon: 'home', is_default: true },
  { name_en: 'Groceries', name_hi: 'राशन / किराना', kind: 'need', icon: 'shopping-cart', is_default: true },
  { name_en: 'Transport', name_hi: 'यातायात', kind: 'need', icon: 'bus', is_default: true },
  { name_en: 'Bills', name_hi: 'बिजली-पानी-बिल', kind: 'need', icon: 'zap', is_default: true },
  { name_en: 'Health', name_hi: 'स्वास्थ्य और दवाएँ', kind: 'need', icon: 'heart-pulse', is_default: true },
  { name_en: 'Education', name_hi: 'शिक्षा', kind: 'need', icon: 'graduation-cap', is_default: true },
  { name_en: 'Eating out', name_hi: 'बाहर खाना', kind: 'want', icon: 'utensils', is_default: true },
  { name_en: 'Entertainment', name_hi: 'मनोरंजन', kind: 'want', icon: 'film', is_default: true },
  { name_en: 'Shopping', name_hi: 'खरीदारी', kind: 'want', icon: 'shopping-bag', is_default: true },
  { name_en: 'Family', name_hi: 'परिवार सहायता', kind: 'need', icon: 'users', is_default: true },
  { name_en: 'Gold/Savings', name_hi: 'सोना / बचत', kind: 'saving', icon: 'coins', is_default: true },
  { name_en: 'Other', name_hi: 'अन्य खर्च', kind: 'want', icon: 'more-horizontal', is_default: true },
];

/**
 * Repository Interface
 */
export interface Repository {
  // Profiles
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(profile: ProfileInsert): Promise<Profile>;

  // Income Sources
  getIncomeSources(userId: string): Promise<IncomeSource[]>;
  createIncomeSource(income: IncomeSourceInsert): Promise<IncomeSource>;
  updateIncomeSource(id: string, updates: Partial<IncomeSourceInsert>): Promise<IncomeSource>;
  deleteIncomeSource(id: string): Promise<void>;

  // Categories
  getCategories(userId: string): Promise<Category[]>;
  createCategory(category: CategoryInsert): Promise<Category>;
  updateCategory(id: string, updates: Partial<CategoryInsert>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  seedDefaultCategories(userId: string): Promise<Category[]>;

  // Transactions
  getTransactions(userId: string, filter?: TransactionFilter): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | null>;
  createTransaction(transaction: TransactionInsert): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<TransactionInsert>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Obligations
  getObligations(userId: string, activeOnly?: boolean): Promise<Obligation[]>;
  createObligation(obligation: ObligationInsert): Promise<Obligation>;
  updateObligation(id: string, updates: Partial<ObligationInsert>): Promise<Obligation>;
  deleteObligation(id: string): Promise<void>;

  // Goals
  getGoals(userId: string): Promise<Goal[]>;
  createGoal(goal: GoalInsert): Promise<Goal>;
  updateGoal(id: string, updates: Partial<GoalInsert>): Promise<Goal>;
  deleteGoal(id: string): Promise<void>;

  // Budget Plans & Lines
  getBudgetPlans(userId: string): Promise<BudgetPlan[]>;
  getBudgetPlanByMonth(userId: string, month: string): Promise<BudgetPlanWithLines | null>;
  createBudgetPlan(plan: BudgetPlanInsert, lines?: PlanLineInsert[]): Promise<BudgetPlanWithLines>;
  updateBudgetPlan(id: string, updates: Partial<BudgetPlanInsert>): Promise<BudgetPlan>;
  upsertPlanLine(line: PlanLineInsert): Promise<PlanLine>;
  deletePlanLine(id: string): Promise<void>;

  // Reminders
  getReminders(userId: string, status?: ReminderStatus): Promise<Reminder[]>;
  createReminder(reminder: ReminderInsert): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<ReminderInsert>): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;

  // Risk Profiles
  getRiskProfile(userId: string): Promise<RiskProfile | null>;
  upsertRiskProfile(profile: RiskProfileInsert): Promise<RiskProfile>;

  // Lesson Progress
  getLessonProgress(userId: string): Promise<LessonProgress[]>;
  recordLessonCompleted(progress: LessonProgressInsert): Promise<LessonProgress>;

  // Demo / Maintenance
  clearUserData(userId: string): Promise<void>;
}

// ============================================================================
// Supabase Implementation
// ============================================================================
export class SupabaseRepository implements Repository {
  constructor(private client: any) {}

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as Profile) ?? null;
  }

  async upsertProfile(profile: ProfileInsert): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .upsert({ ...profile, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    // Auto-seed default categories if none exist (mirrors PostgreSQL trigger)
    const categories = await this.getCategories(profile.user_id);
    if (categories.length === 0) {
      await this.seedDefaultCategories(profile.user_id);
    }

    return data as Profile;
  }

  async getIncomeSources(userId: string): Promise<IncomeSource[]> {
    const { data, error } = await this.client
      .from('income_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as IncomeSource[]) || [];
  }

  async createIncomeSource(income: IncomeSourceInsert): Promise<IncomeSource> {
    assertIntegerPaise(income.amount_paise, 'income.amount_paise');
    const { data, error } = await this.client
      .from('income_sources')
      .insert(income)
      .select()
      .single();

    if (error) throw error;
    return data as IncomeSource;
  }

  async updateIncomeSource(id: string, updates: Partial<IncomeSourceInsert>): Promise<IncomeSource> {
    if (updates.amount_paise !== undefined) {
      assertIntegerPaise(updates.amount_paise, 'updates.amount_paise');
    }
    const { data, error } = await this.client
      .from('income_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as IncomeSource;
  }

  async deleteIncomeSource(id: string): Promise<void> {
    const { error } = await this.client.from('income_sources').delete().eq('id', id);
    if (error) throw error;
  }

  async getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name_en', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return this.seedDefaultCategories(userId);
    }
    return (data as Category[]) || [];
  }

  async createCategory(category: CategoryInsert): Promise<Category> {
    const { data, error } = await this.client
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  }

  async updateCategory(id: string, updates: Partial<CategoryInsert>): Promise<Category> {
    const { data, error } = await this.client
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  async seedDefaultCategories(userId: string): Promise<Category[]> {
    const { data: existing } = await this.client
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    if (existing && existing.length > 0) return existing as Category[];

    const inserts = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      user_id: userId,
    }));

    const { data, error } = await this.client.from('categories').insert(inserts).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      return this.seedDefaultCategories(userId);
    }
    return (data as Category[]) || [];
  }

  async getTransactions(userId: string, filter?: TransactionFilter): Promise<Transaction[]> {
    let query = this.client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter?.startDate) query = query.gte('occurred_on', filter.startDate);
    if (filter?.endDate) query = query.lte('occurred_on', filter.endDate);
    if (filter?.categoryId) query = query.eq('category_id', filter.categoryId);
    if (filter?.paymentMode) query = query.eq('payment_mode', filter.paymentMode);
    if (filter?.source) query = query.eq('source', filter.source);
    if (filter?.limit) query = query.limit(filter.limit);
    if (filter?.offset) query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data as Transaction[]) || [];
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as Transaction) ?? null;
  }

  async createTransaction(transaction: TransactionInsert): Promise<Transaction> {
    assertIntegerPaise(transaction.amount_paise, 'transaction.amount_paise');
    const { data, error } = await this.client
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  async updateTransaction(id: string, updates: Partial<TransactionInsert>): Promise<Transaction> {
    if (updates.amount_paise !== undefined) {
      assertIntegerPaise(updates.amount_paise, 'updates.amount_paise');
    }
    const { data, error } = await this.client
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.client.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  async getObligations(userId: string, activeOnly = false): Promise<Obligation[]> {
    let query = this.client
      .from('obligations')
      .select('*')
      .eq('user_id', userId)
      .order('due_day', { ascending: true });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Obligation[]) || [];
  }

  async createObligation(obligation: ObligationInsert): Promise<Obligation> {
    assertIntegerPaise(obligation.amount_paise, 'obligation.amount_paise');
    if (obligation.principal_paise != null) {
      assertIntegerPaise(obligation.principal_paise, 'obligation.principal_paise');
    }

    const { data, error } = await this.client
      .from('obligations')
      .insert(obligation)
      .select()
      .single();

    if (error) throw error;
    return data as Obligation;
  }

  async updateObligation(id: string, updates: Partial<ObligationInsert>): Promise<Obligation> {
    if (updates.amount_paise !== undefined) {
      assertIntegerPaise(updates.amount_paise, 'updates.amount_paise');
    }
    if (updates.principal_paise != null) {
      assertIntegerPaise(updates.principal_paise, 'updates.principal_paise');
    }

    const { data, error } = await this.client
      .from('obligations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Obligation;
  }

  async deleteObligation(id: string): Promise<void> {
    const { error } = await this.client.from('obligations').delete().eq('id', id);
    if (error) throw error;
  }

  async getGoals(userId: string): Promise<Goal[]> {
    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true });

    if (error) throw error;
    return (data as Goal[]) || [];
  }

  async createGoal(goal: GoalInsert): Promise<Goal> {
    assertIntegerPaise(goal.target_paise, 'goal.target_paise');
    if (goal.saved_paise !== undefined) {
      assertIntegerPaise(goal.saved_paise, 'goal.saved_paise');
    }

    const { data, error } = await this.client
      .from('goals')
      .insert(goal)
      .select()
      .single();

    if (error) throw error;
    return data as Goal;
  }

  async updateGoal(id: string, updates: Partial<GoalInsert>): Promise<Goal> {
    if (updates.target_paise !== undefined) {
      assertIntegerPaise(updates.target_paise, 'updates.target_paise');
    }
    if (updates.saved_paise !== undefined) {
      assertIntegerPaise(updates.saved_paise, 'updates.saved_paise');
    }

    const { data, error } = await this.client
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Goal;
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await this.client.from('goals').delete().eq('id', id);
    if (error) throw error;
  }

  async getBudgetPlans(userId: string): Promise<BudgetPlan[]> {
    const { data, error } = await this.client
      .from('budget_plans')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false });

    if (error) throw error;
    return (data as BudgetPlan[]) || [];
  }

  async getBudgetPlanByMonth(userId: string, month: string): Promise<BudgetPlanWithLines | null> {
    const { data: plan, error: planError } = await this.client
      .from('budget_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) return null;

    const { data: lines, error: linesError } = await this.client
      .from('plan_lines')
      .select('*')
      .eq('plan_id', plan.id);

    if (linesError) throw linesError;

    return {
      ...(plan as BudgetPlan),
      lines: (lines as PlanLine[]) || [],
    };
  }

  async createBudgetPlan(plan: BudgetPlanInsert, lines: PlanLineInsert[] = []): Promise<BudgetPlanWithLines> {
    assertIntegerPaise(plan.income_paise, 'plan.income_paise');
    assertIntegerPaise(plan.fixed_paise, 'plan.fixed_paise');
    assertIntegerPaise(plan.savings_target_paise, 'plan.savings_target_paise');
    assertIntegerPaise(plan.variable_budget_paise, 'plan.variable_budget_paise');
    assertIntegerPaise(plan.shortfall_paise, 'plan.shortfall_paise');

    const { data: createdPlan, error: planError } = await this.client
      .from('budget_plans')
      .insert(plan)
      .select()
      .single();

    if (planError) throw planError;

    let createdLines: PlanLine[] = [];
    if (lines.length > 0) {
      const lineInserts = lines.map((line) => {
        assertIntegerPaise(line.cap_paise, 'line.cap_paise');
        return {
          ...line,
          user_id: plan.user_id,
          plan_id: createdPlan.id,
        };
      });

      const { data: linesData, error: linesError } = await this.client
        .from('plan_lines')
        .insert(lineInserts)
        .select();

      if (linesError) throw linesError;
      createdLines = (linesData as PlanLine[]) || [];
    }

    return {
      ...(createdPlan as BudgetPlan),
      lines: createdLines,
    };
  }

  async updateBudgetPlan(id: string, updates: Partial<BudgetPlanInsert>): Promise<BudgetPlan> {
    if (updates.income_paise !== undefined) assertIntegerPaise(updates.income_paise, 'updates.income_paise');
    if (updates.fixed_paise !== undefined) assertIntegerPaise(updates.fixed_paise, 'updates.fixed_paise');
    if (updates.savings_target_paise !== undefined) assertIntegerPaise(updates.savings_target_paise, 'updates.savings_target_paise');
    if (updates.variable_budget_paise !== undefined) assertIntegerPaise(updates.variable_budget_paise, 'updates.variable_budget_paise');
    if (updates.shortfall_paise !== undefined) assertIntegerPaise(updates.shortfall_paise, 'updates.shortfall_paise');

    const { data, error } = await this.client
      .from('budget_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BudgetPlan;
  }

  async upsertPlanLine(line: PlanLineInsert): Promise<PlanLine> {
    assertIntegerPaise(line.cap_paise, 'line.cap_paise');
    const { data, error } = await this.client
      .from('plan_lines')
      .upsert(line)
      .select()
      .single();

    if (error) throw error;
    return data as PlanLine;
  }

  async deletePlanLine(id: string): Promise<void> {
    const { error } = await this.client.from('plan_lines').delete().eq('id', id);
    if (error) throw error;
  }

  async getReminders(userId: string, status?: ReminderStatus): Promise<Reminder[]> {
    let query = this.client
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('remind_on', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Reminder[]) || [];
  }

  async createReminder(reminder: ReminderInsert): Promise<Reminder> {
    const { data, error } = await this.client
      .from('reminders')
      .insert(reminder)
      .select()
      .single();

    if (error) throw error;
    return data as Reminder;
  }

  async updateReminder(id: string, updates: Partial<ReminderInsert>): Promise<Reminder> {
    const { data, error } = await this.client
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Reminder;
  }

  async deleteReminder(id: string): Promise<void> {
    const { error } = await this.client.from('reminders').delete().eq('id', id);
    if (error) throw error;
  }

  async getRiskProfile(userId: string): Promise<RiskProfile | null> {
    const { data, error } = await this.client
      .from('risk_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as RiskProfile) ?? null;
  }

  async upsertRiskProfile(profile: RiskProfileInsert): Promise<RiskProfile> {
    const { data, error } = await this.client
      .from('risk_profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) throw error;
    return data as RiskProfile;
  }

  async getLessonProgress(userId: string): Promise<LessonProgress[]> {
    const { data, error } = await this.client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return (data as LessonProgress[]) || [];
  }

  async recordLessonCompleted(progress: LessonProgressInsert): Promise<LessonProgress> {
    const { data, error } = await this.client
      .from('lesson_progress')
      .upsert(progress)
      .select()
      .single();

    if (error) throw error;
    return data as LessonProgress;
  }

  async clearUserData(userId: string): Promise<void> {
    // Delete in dependency order
    await this.client.from('plan_lines').delete().eq('user_id', userId);
    await this.client.from('budget_plans').delete().eq('user_id', userId);
    await this.client.from('reminders').delete().eq('user_id', userId);
    await this.client.from('transactions').delete().eq('user_id', userId);
    await this.client.from('obligations').delete().eq('user_id', userId);
    await this.client.from('goals').delete().eq('user_id', userId);
    await this.client.from('income_sources').delete().eq('user_id', userId);
    await this.client.from('categories').delete().eq('user_id', userId);
    await this.client.from('risk_profiles').delete().eq('user_id', userId);
    await this.client.from('lesson_progress').delete().eq('user_id', userId);
    await this.client.from('profiles').delete().eq('user_id', userId);
  }
}

// ============================================================================
// Local Repository (Offline Demo Mode with Zero Network Dependency)
// ============================================================================

interface LocalStoreState {
  profiles: Profile[];
  income_sources: IncomeSource[];
  categories: Category[];
  transactions: Transaction[];
  obligations: Obligation[];
  goals: Goal[];
  budget_plans: BudgetPlan[];
  plan_lines: PlanLine[];
  reminders: Reminder[];
  risk_profiles: RiskProfile[];
  lesson_progress: LessonProgress[];
}

function initialStoreState(): LocalStoreState {
  return {
    profiles: [],
    income_sources: [],
    categories: [],
    transactions: [],
    obligations: [],
    goals: [],
    budget_plans: [],
    plan_lines: [],
    reminders: [],
    risk_profiles: [],
    lesson_progress: [],
  };
}

export class LocalRepository implements Repository {
  private storageKey: string;
  private memoryStore: LocalStoreState;

  constructor(storageKey = 'pennypath_local_db') {
    this.storageKey = storageKey;
    this.memoryStore = initialStoreState();
    this.loadState();
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private loadState(): void {
    if (this.hasStorage()) {
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          this.memoryStore = { ...initialStoreState(), ...JSON.parse(raw) };
          return;
        }
      } catch {
        // Fall back to memoryStore
      }
    }
  }

  private saveState(): void {
    if (this.hasStorage()) {
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.memoryStore));
      } catch {
        // storage quota exceeded or disabled; memory store persists in process
      }
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }

  // --------------------------------------------------------------------------
  // Profile
  // --------------------------------------------------------------------------
  async getProfile(userId: string): Promise<Profile | null> {
    const profile = this.memoryStore.profiles.find((p) => p.user_id === userId);
    return profile ? { ...profile } : null;
  }

  async upsertProfile(profile: ProfileInsert): Promise<Profile> {
    const now = new Date().toISOString();
    const existingIndex = this.memoryStore.profiles.findIndex((p) => p.user_id === profile.user_id);

    let saved: Profile;
    if (existingIndex >= 0) {
      saved = {
        ...this.memoryStore.profiles[existingIndex],
        ...profile,
        updated_at: now,
      };
      this.memoryStore.profiles[existingIndex] = saved;
    } else {
      saved = {
        id: profile.id || this.generateId(),
        user_id: profile.user_id,
        display_name: profile.display_name ?? null,
        mode: profile.mode,
        language: profile.language,
        month_start_day: profile.month_start_day ?? 1,
        currency: profile.currency ?? 'INR',
        created_at: profile.created_at || now,
        updated_at: now,
      };
      this.memoryStore.profiles.push(saved);
      // Auto-seed default categories on profile creation (mirrors Postgres trigger)
      await this.seedDefaultCategories(profile.user_id);
    }

    this.saveState();
    return { ...saved };
  }

  // --------------------------------------------------------------------------
  // Income Sources
  // --------------------------------------------------------------------------
  async getIncomeSources(userId: string): Promise<IncomeSource[]> {
    return this.memoryStore.income_sources
      .filter((i) => i.user_id === userId)
      .map((i) => ({ ...i }));
  }

  async createIncomeSource(income: IncomeSourceInsert): Promise<IncomeSource> {
    assertIntegerPaise(income.amount_paise, 'income.amount_paise');
    const created: IncomeSource = {
      id: income.id || this.generateId(),
      user_id: income.user_id,
      label: income.label,
      amount_paise: income.amount_paise,
      frequency: income.frequency,
      created_at: income.created_at || new Date().toISOString(),
    };
    this.memoryStore.income_sources.push(created);
    this.saveState();
    return { ...created };
  }

  async updateIncomeSource(id: string, updates: Partial<IncomeSourceInsert>): Promise<IncomeSource> {
    if (updates.amount_paise !== undefined) {
      assertIntegerPaise(updates.amount_paise, 'updates.amount_paise');
    }
    const idx = this.memoryStore.income_sources.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Income source with id ${id} not found`);

    const updated = { ...this.memoryStore.income_sources[idx], ...updates };
    this.memoryStore.income_sources[idx] = updated;
    this.saveState();
    return { ...updated };
  }

  async deleteIncomeSource(id: string): Promise<void> {
    this.memoryStore.income_sources = this.memoryStore.income_sources.filter((i) => i.id !== id);
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  async getCategories(userId: string): Promise<Category[]> {
    const list = this.memoryStore.categories.filter((c) => c.user_id === userId);
    if (list.length === 0) {
      return this.seedDefaultCategories(userId);
    }
    return list.map((c) => ({ ...c }));
  }

  async createCategory(category: CategoryInsert): Promise<Category> {
    const created: Category = {
      id: category.id || this.generateId(),
      user_id: category.user_id,
      name_en: category.name_en,
      name_hi: category.name_hi,
      kind: category.kind,
      icon: category.icon,
      is_default: category.is_default ?? false,
      created_at: category.created_at || new Date().toISOString(),
    };
    this.memoryStore.categories.push(created);
    this.saveState();
    return { ...created };
  }

  async updateCategory(id: string, updates: Partial<CategoryInsert>): Promise<Category> {
    const idx = this.memoryStore.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Category with id ${id} not found`);

    const updated = { ...this.memoryStore.categories[idx], ...updates };
    this.memoryStore.categories[idx] = updated;
    this.saveState();
    return { ...updated };
  }

  async deleteCategory(id: string): Promise<void> {
    this.memoryStore.categories = this.memoryStore.categories.filter((c) => c.id !== id);
    this.saveState();
  }

  async seedDefaultCategories(userId: string): Promise<Category[]> {
    const existing = this.memoryStore.categories.filter((c) => c.user_id === userId);
    if (existing.length > 0) return existing.map((c) => ({ ...c }));

    const now = new Date().toISOString();
    const seeded: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
      id: this.generateId(),
      user_id: userId,
      name_en: cat.name_en,
      name_hi: cat.name_hi,
      kind: cat.kind,
      icon: cat.icon,
      is_default: true,
      created_at: now,
    }));

    this.memoryStore.categories.push(...seeded);
    this.saveState();
    return seeded.map((c) => ({ ...c }));
  }

  // --------------------------------------------------------------------------
  // Transactions
  // --------------------------------------------------------------------------
  async getTransactions(userId: string, filter?: TransactionFilter): Promise<Transaction[]> {
    let list = this.memoryStore.transactions.filter((t) => t.user_id === userId);

    if (filter?.startDate) {
      list = list.filter((t) => t.occurred_on >= filter.startDate!);
    }
    if (filter?.endDate) {
      list = list.filter((t) => t.occurred_on <= filter.endDate!);
    }
    if (filter?.categoryId) {
      list = list.filter((t) => t.category_id === filter.categoryId);
    }
    if (filter?.paymentMode) {
      list = list.filter((t) => t.payment_mode === filter.paymentMode);
    }
    if (filter?.source) {
      list = list.filter((t) => t.source === filter.source);
    }

    // Sort descending by occurred_on
    list.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at));

    if (filter?.offset) {
      list = list.slice(filter.offset);
    }
    if (filter?.limit) {
      list = list.slice(0, filter.limit);
    }

    return list.map((t) => ({ ...t }));
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const tx = this.memoryStore.transactions.find((t) => t.id === id);
    return tx ? { ...tx } : null;
  }

  async createTransaction(transaction: TransactionInsert): Promise<Transaction> {
    assertIntegerPaise(transaction.amount_paise, 'transaction.amount_paise');
    const created: Transaction = {
      id: transaction.id || this.generateId(),
      user_id: transaction.user_id,
      amount_paise: transaction.amount_paise,
      category_id: transaction.category_id ?? null,
      note: transaction.note ?? null,
      occurred_on: transaction.occurred_on || new Date().toISOString().slice(0, 10),
      payment_mode: transaction.payment_mode,
      source: transaction.source,
      created_at: transaction.created_at || new Date().toISOString(),
    };
    this.memoryStore.transactions.push(created);
    this.saveState();
    return { ...created };
  }

  async updateTransaction(id: string, updates: Partial<TransactionInsert>): Promise<Transaction> {
    if (updates.amount_paise !== undefined) {
      assertIntegerPaise(updates.amount_paise, 'updates.amount_paise');
    }
    const idx = this.memoryStore.transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Transaction with id ${id} not found`);

    const updated = { ...this.memoryStore.transactions[idx], ...updates };
    this.memoryStore.transactions[idx] = updated;
    this.saveState();
    return { ...updated };
  }

  async deleteTransaction(id: string): Promise<void> {
    this.memoryStore.transactions = this.memoryStore.transactions.filter((t) => t.id !== id);
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Obligations
  // --------------------------------------------------------------------------
  async getObligations(userId: string, activeOnly = false): Promise<Obligation[]> {
    let list = this.memoryStore.obligations.filter((o) => o.user_id === userId);
    if (activeOnly) {
      list = list.filter((o) => o.active);
    }
    list.sort((a, b) => a.due_day - b.due_day);
    return list.map((o) => ({ ...o }));
  }

  async createObligation(obligation: ObligationInsert): Promise<Obligation> {
    assertIntegerPaise(obligation.amount_paise, 'obligation.amount_paise');
    if (obligation.principal_paise != null) {
      assertIntegerPaise(obligation.principal_paise, 'obligation.principal_paise');
    }

    const created: Obligation = {
      id: obligation.id || this.generateId(),
      user_id: obligation.user_id,
      label: obligation.label,
      kind: obligation.kind,
      amount_paise: obligation.amount_paise,
      due_day: obligation.due_day,
      principal_paise: obligation.principal_paise ?? null,
      annual_rate: obligation.annual_rate ?? null,
      tenure_months: obligation.tenure_months ?? null,
      start_date: obligation.start_date ?? null,
      active: obligation.active ?? true,
      created_at: obligation.created_at || new Date().toISOString(),
    };
    this.memoryStore.obligations.push(created);
    this.saveState();
    return { ...created };
  }

  async updateObligation(id: string, updates: Partial<ObligationInsert>): Promise<Obligation> {
    if (updates.amount_paise !== undefined) {
      assertIntegerPaise(updates.amount_paise, 'updates.amount_paise');
    }
    if (updates.principal_paise != null) {
      assertIntegerPaise(updates.principal_paise, 'updates.principal_paise');
    }

    const idx = this.memoryStore.obligations.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Obligation with id ${id} not found`);

    const updated = { ...this.memoryStore.obligations[idx], ...updates };
    this.memoryStore.obligations[idx] = updated;
    this.saveState();
    return { ...updated };
  }

  async deleteObligation(id: string): Promise<void> {
    this.memoryStore.obligations = this.memoryStore.obligations.filter((o) => o.id !== id);
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Goals
  // --------------------------------------------------------------------------
  async getGoals(userId: string): Promise<Goal[]> {
    return this.memoryStore.goals
      .filter((g) => g.user_id === userId)
      .sort((a, b) => a.priority - b.priority)
      .map((g) => ({ ...g }));
  }

  async createGoal(goal: GoalInsert): Promise<Goal> {
    assertIntegerPaise(goal.target_paise, 'goal.target_paise');
    if (goal.saved_paise !== undefined) {
      assertIntegerPaise(goal.saved_paise, 'goal.saved_paise');
    }

    const created: Goal = {
      id: goal.id || this.generateId(),
      user_id: goal.user_id,
      label: goal.label,
      target_paise: goal.target_paise,
      target_date: goal.target_date,
      saved_paise: goal.saved_paise ?? 0,
      priority: goal.priority ?? 1,
      created_at: goal.created_at || new Date().toISOString(),
    };
    this.memoryStore.goals.push(created);
    this.saveState();
    return { ...created };
  }

  async updateGoal(id: string, updates: Partial<GoalInsert>): Promise<Goal> {
    if (updates.target_paise !== undefined) {
      assertIntegerPaise(updates.target_paise, 'updates.target_paise');
    }
    if (updates.saved_paise !== undefined) {
      assertIntegerPaise(updates.saved_paise, 'updates.saved_paise');
    }

    const idx = this.memoryStore.goals.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Goal with id ${id} not found`);

    const updated = { ...this.memoryStore.goals[idx], ...updates };
    this.memoryStore.goals[idx] = updated;
    this.saveState();
    return { ...updated };
  }

  async deleteGoal(id: string): Promise<void> {
    this.memoryStore.goals = this.memoryStore.goals.filter((g) => g.id !== id);
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Budget Plans & Lines
  // --------------------------------------------------------------------------
  async getBudgetPlans(userId: string): Promise<BudgetPlan[]> {
    return this.memoryStore.budget_plans
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((p) => ({ ...p }));
  }

  async getBudgetPlanByMonth(userId: string, month: string): Promise<BudgetPlanWithLines | null> {
    const plan = this.memoryStore.budget_plans.find((p) => p.user_id === userId && p.month === month);
    if (!plan) return null;

    const lines = this.memoryStore.plan_lines
      .filter((l) => l.plan_id === plan.id)
      .map((l) => ({ ...l }));

    return {
      ...plan,
      lines,
    };
  }

  async createBudgetPlan(plan: BudgetPlanInsert, lines: PlanLineInsert[] = []): Promise<BudgetPlanWithLines> {
    assertIntegerPaise(plan.income_paise, 'plan.income_paise');
    assertIntegerPaise(plan.fixed_paise, 'plan.fixed_paise');
    assertIntegerPaise(plan.savings_target_paise, 'plan.savings_target_paise');
    assertIntegerPaise(plan.variable_budget_paise, 'plan.variable_budget_paise');
    assertIntegerPaise(plan.shortfall_paise, 'plan.shortfall_paise');

    const planId = plan.id || this.generateId();
    const createdPlan: BudgetPlan = {
      id: planId,
      user_id: plan.user_id,
      month: plan.month,
      income_paise: plan.income_paise,
      fixed_paise: plan.fixed_paise,
      savings_target_paise: plan.savings_target_paise,
      variable_budget_paise: plan.variable_budget_paise,
      shortfall_paise: plan.shortfall_paise,
      created_at: plan.created_at || new Date().toISOString(),
    };

    this.memoryStore.budget_plans.push(createdPlan);

    const createdLines: PlanLine[] = [];
    for (const line of lines) {
      assertIntegerPaise(line.cap_paise, 'line.cap_paise');
      const createdLine: PlanLine = {
        id: line.id || this.generateId(),
        user_id: plan.user_id,
        plan_id: planId,
        category_id: line.category_id,
        cap_paise: line.cap_paise,
        created_at: line.created_at || new Date().toISOString(),
      };
      this.memoryStore.plan_lines.push(createdLine);
      createdLines.push(createdLine);
    }

    this.saveState();
    return {
      ...createdPlan,
      lines: createdLines,
    };
  }

  async updateBudgetPlan(id: string, updates: Partial<BudgetPlanInsert>): Promise<BudgetPlan> {
    if (updates.income_paise !== undefined) assertIntegerPaise(updates.income_paise, 'updates.income_paise');
    if (updates.fixed_paise !== undefined) assertIntegerPaise(updates.fixed_paise, 'updates.fixed_paise');
    if (updates.savings_target_paise !== undefined) assertIntegerPaise(updates.savings_target_paise, 'updates.savings_target_paise');
    if (updates.variable_budget_paise !== undefined) assertIntegerPaise(updates.variable_budget_paise, 'updates.variable_budget_paise');
    if (updates.shortfall_paise !== undefined) assertIntegerPaise(updates.shortfall_paise, 'updates.shortfall_paise');

    const idx = this.memoryStore.budget_plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Budget plan with id ${id} not found`);

    const updated = { ...this.memoryStore.budget_plans[idx], ...updates };
    this.memoryStore.budget_plans[idx] = updated;
    this.saveState();
    return { ...updated };
  }

  async upsertPlanLine(line: PlanLineInsert): Promise<PlanLine> {
    assertIntegerPaise(line.cap_paise, 'line.cap_paise');
    const existingIndex = this.memoryStore.plan_lines.findIndex(
      (l) => l.plan_id === line.plan_id && l.category_id === line.category_id
    );

    let saved: PlanLine;
    if (existingIndex >= 0) {
      saved = { ...this.memoryStore.plan_lines[existingIndex], ...line };
      this.memoryStore.plan_lines[existingIndex] = saved;
    } else {
      saved = {
        id: line.id || this.generateId(),
        user_id: line.user_id,
        plan_id: line.plan_id,
        category_id: line.category_id,
        cap_paise: line.cap_paise,
        created_at: line.created_at || new Date().toISOString(),
      };
      this.memoryStore.plan_lines.push(saved);
    }

    this.saveState();
    return { ...saved };
  }

  async deletePlanLine(id: string): Promise<void> {
    this.memoryStore.plan_lines = this.memoryStore.plan_lines.filter((l) => l.id !== id);
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Reminders
  // --------------------------------------------------------------------------
  async getReminders(userId: string, status?: ReminderStatus): Promise<Reminder[]> {
    let list = this.memoryStore.reminders.filter((r) => r.user_id === userId);
    if (status) {
      list = list.filter((r) => r.status === status);
    }
    list.sort((a, b) => a.remind_on.localeCompare(b.remind_on));
    return list.map((r) => ({ ...r }));
  }

  async createReminder(reminder: ReminderInsert): Promise<Reminder> {
    const created: Reminder = {
      id: reminder.id || this.generateId(),
      user_id: reminder.user_id,
      obligation_id: reminder.obligation_id ?? null,
      label: reminder.label,
      remind_on: reminder.remind_on,
      status: reminder.status ?? 'pending',
      created_at: reminder.created_at || new Date().toISOString(),
    };
    this.memoryStore.reminders.push(created);
    this.saveState();
    return { ...created };
  }

  async updateReminder(id: string, updates: Partial<ReminderInsert>): Promise<Reminder> {
    const idx = this.memoryStore.reminders.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Reminder with id ${id} not found`);

    const updated = { ...this.memoryStore.reminders[idx], ...updates };
    this.memoryStore.reminders[idx] = updated;
    this.saveState();
    return { ...updated };
  }

  async deleteReminder(id: string): Promise<void> {
    this.memoryStore.reminders = this.memoryStore.reminders.filter((r) => r.id !== id);
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Risk Profiles
  // --------------------------------------------------------------------------
  async getRiskProfile(userId: string): Promise<RiskProfile | null> {
    const profile = this.memoryStore.risk_profiles.find((rp) => rp.user_id === userId);
    return profile ? { ...profile } : null;
  }

  async upsertRiskProfile(profile: RiskProfileInsert): Promise<RiskProfile> {
    const existingIndex = this.memoryStore.risk_profiles.findIndex((rp) => rp.user_id === profile.user_id);
    let saved: RiskProfile;

    if (existingIndex >= 0) {
      saved = { ...this.memoryStore.risk_profiles[existingIndex], ...profile };
      this.memoryStore.risk_profiles[existingIndex] = saved;
    } else {
      saved = {
        id: profile.id || this.generateId(),
        user_id: profile.user_id,
        score: profile.score,
        band: profile.band,
        answers: profile.answers || {},
        created_at: profile.created_at || new Date().toISOString(),
      };
      this.memoryStore.risk_profiles.push(saved);
    }

    this.saveState();
    return { ...saved };
  }

  // --------------------------------------------------------------------------
  // Lesson Progress
  // --------------------------------------------------------------------------
  async getLessonProgress(userId: string): Promise<LessonProgress[]> {
    return this.memoryStore.lesson_progress
      .filter((lp) => lp.user_id === userId)
      .map((lp) => ({ ...lp }));
  }

  async recordLessonCompleted(progress: LessonProgressInsert): Promise<LessonProgress> {
    const existingIndex = this.memoryStore.lesson_progress.findIndex(
      (lp) => lp.user_id === progress.user_id && lp.lesson_key === progress.lesson_key
    );

    let saved: LessonProgress;
    if (existingIndex >= 0) {
      saved = { ...this.memoryStore.lesson_progress[existingIndex], ...progress };
      this.memoryStore.lesson_progress[existingIndex] = saved;
    } else {
      saved = {
        id: progress.id || this.generateId(),
        user_id: progress.user_id,
        lesson_key: progress.lesson_key,
        completed_at: progress.completed_at || new Date().toISOString(),
        created_at: progress.created_at || new Date().toISOString(),
      };
      this.memoryStore.lesson_progress.push(saved);
    }

    this.saveState();
    return { ...saved };
  }

  // --------------------------------------------------------------------------
  // Demo / Maintenance
  // --------------------------------------------------------------------------
  async clearUserData(userId: string): Promise<void> {
    this.memoryStore.profiles = this.memoryStore.profiles.filter((p) => p.user_id !== userId);
    this.memoryStore.income_sources = this.memoryStore.income_sources.filter((i) => i.user_id !== userId);
    this.memoryStore.categories = this.memoryStore.categories.filter((c) => c.user_id !== userId);
    this.memoryStore.transactions = this.memoryStore.transactions.filter((t) => t.user_id !== userId);
    this.memoryStore.obligations = this.memoryStore.obligations.filter((o) => o.user_id !== userId);
    this.memoryStore.goals = this.memoryStore.goals.filter((g) => g.user_id !== userId);
    this.memoryStore.budget_plans = this.memoryStore.budget_plans.filter((bp) => bp.user_id !== userId);
    this.memoryStore.plan_lines = this.memoryStore.plan_lines.filter((pl) => pl.user_id !== userId);
    this.memoryStore.reminders = this.memoryStore.reminders.filter((r) => r.user_id !== userId);
    this.memoryStore.risk_profiles = this.memoryStore.risk_profiles.filter((rp) => rp.user_id !== userId);
    this.memoryStore.lesson_progress = this.memoryStore.lesson_progress.filter((lp) => lp.user_id !== userId);
    this.saveState();
  }
}
