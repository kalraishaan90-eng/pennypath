import { IPennyPathRepository } from './repository';
import { UserMode, BudgetEnvelope, PERSONA_CONFIGS, buildPlan } from '../engine/budget';
import type {
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
import { fetchMarketData } from '../services/marketApi';
import {
  INITIAL_ENVELOPES,
  INITIAL_GOALS,
  INITIAL_REMINDERS,
  INITIAL_LESSONS,
  DEMO_PERSONAS,
  generate60DaysTransactions,
} from './seedData';
import {
  generateRemindersFromObligations,
  detectEnvelopeCategoryKey,
  snoozeDueDate,
} from '../engine/remindersEngine';

const STORAGE_PREFIX = 'pennypath_';

export class LocalSeededRepository implements IPennyPathRepository {
  private inMemoryFallback: Map<string, string> = new Map();

  private getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // In-memory fallback if localStorage is restricted/disabled
    }
    return this.inMemoryFallback.get(key) || null;
  }

  private setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback
    }
    this.inMemoryFallback.set(key, value);
  }

  private removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Fallback
    }
    this.inMemoryFallback.delete(key);
  }

  private getStorageKey(key: string, mode?: UserMode): string {
    return mode ? `${STORAGE_PREFIX}${mode}_${key}` : `${STORAGE_PREFIX}${key}`;
  }

  isDemoMode(): boolean {
    return this.getItem(`${STORAGE_PREFIX}demo_mode`) === 'true';
  }

  getDemoPersona(): 'rohan' | 'meena' | 'aarav' | null {
    const persona = this.getItem(`${STORAGE_PREFIX}demo_persona`);
    if (persona === 'rohan' || persona === 'meena' || persona === 'aarav') {
      return persona;
    }
    return null;
  }

  getDemoPersonas(): DemoPersona[] {
    return Object.values(DEMO_PERSONAS);
  }

  async getProfile(mode?: UserMode): Promise<UserProfile | null> {
    const activeProfileRaw = this.getItem(this.getStorageKey('active_profile'));
    if (activeProfileRaw) {
      try {
        return JSON.parse(activeProfileRaw);
      } catch {
        // continue
      }
    }

    if (mode) {
      const modeProfileRaw = this.getItem(this.getStorageKey('profile', mode));
      if (modeProfileRaw) {
        try {
          return JSON.parse(modeProfileRaw);
        } catch {
          // continue
        }
      }
    }

    const targetMode = mode || 'earner';
    const defaultProfile: UserProfile = {
      id: `usr-${targetMode}`,
      mode: targetMode,
      name: targetMode === 'earner' ? 'Rohan' : PERSONA_CONFIGS[targetMode].name,
      monthlyIncome: PERSONA_CONFIGS[targetMode].monthlyIncome,
      language: 'en',
    };
    this.setItem(this.getStorageKey('profile', targetMode), JSON.stringify(defaultProfile));
    return defaultProfile;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    this.setItem(this.getStorageKey('active_profile'), JSON.stringify(profile));
    this.setItem(this.getStorageKey('profile', profile.mode), JSON.stringify(profile));
  }

  async updateIncome(mode: UserMode, income: number): Promise<void> {
    const profile = (await this.getProfile(mode)) || {
      id: `usr-${Date.now()}`,
      mode,
      name: PERSONA_CONFIGS[mode].name,
      monthlyIncome: income,
      language: 'en',
    };
    profile.monthlyIncome = income;
    await this.saveProfile(profile);
  }

  async updateLanguage(mode: UserMode, language: 'en' | 'hi'): Promise<void> {
    const profile = await this.getProfile(mode);
    if (profile) {
      profile.language = language;
      await this.saveProfile(profile);
    }
  }

  async getEnvelopes(mode: UserMode): Promise<BudgetEnvelope[]> {
    const key = this.getStorageKey('envelopes', mode);
    const cached = this.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }

    const initial = INITIAL_ENVELOPES[mode] || [];
    this.setItem(key, JSON.stringify(initial));
    return initial;
  }

  async saveEnvelopes(mode: UserMode, envelopes: BudgetEnvelope[]): Promise<void> {
    this.setItem(this.getStorageKey('envelopes', mode), JSON.stringify(envelopes));
  }

  async updateEnvelopeSpent(mode: UserMode, envelopeId: string, deltaSpent: number): Promise<BudgetEnvelope> {
    const envelopes = await this.getEnvelopes(mode);
    const target = envelopes.find(e => e.id === envelopeId);
    if (!target) {
      throw new Error(`Envelope ${envelopeId} not found`);
    }
    target.spent = Math.max(0, target.spent + deltaSpent);
    await this.saveEnvelopes(mode, envelopes);
    return target;
  }

  async updateEnvelopeAllocation(mode: UserMode, envelopeId: string, newAllocated: number): Promise<BudgetEnvelope> {
    const envelopes = await this.getEnvelopes(mode);
    const target = envelopes.find(e => e.id === envelopeId);
    if (!target) {
      throw new Error(`Envelope ${envelopeId} not found`);
    }
    target.allocated = Math.max(0, newAllocated);
    await this.saveEnvelopes(mode, envelopes);
    return target;
  }

  async addEnvelope(mode: UserMode, envelope: Omit<BudgetEnvelope, 'id'>): Promise<BudgetEnvelope> {
    const envelopes = await this.getEnvelopes(mode);
    const newEnv: BudgetEnvelope = {
      ...envelope,
      id: `env-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    envelopes.push(newEnv);
    await this.saveEnvelopes(mode, envelopes);
    return newEnv;
  }

  async getGoals(mode: UserMode): Promise<FinancialGoal[]> {
    const key = this.getStorageKey('goals', mode);
    const cached = this.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }

    const initial = INITIAL_GOALS[mode] || [];
    this.setItem(key, JSON.stringify(initial));
    return initial;
  }

  async addGoal(mode: UserMode, goal: Omit<FinancialGoal, 'id'>): Promise<FinancialGoal> {
    const goals = await this.getGoals(mode);
    const newGoal: FinancialGoal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    goals.push(newGoal);
    this.setItem(this.getStorageKey('goals', mode), JSON.stringify(goals));
    return newGoal;
  }

  async contributeToGoal(mode: UserMode, goalId: string, amount: number): Promise<FinancialGoal> {
    const goals = await this.getGoals(mode);
    const target = goals.find(g => g.id === goalId);
    if (!target) {
      throw new Error(`Goal ${goalId} not found`);
    }
    target.currentAmount = Math.min(target.targetAmount, target.currentAmount + amount);
    this.setItem(this.getStorageKey('goals', mode), JSON.stringify(goals));
    return target;
  }

  async getObligations(mode?: UserMode): Promise<Obligation[]> {
    if (mode) {
      const modeKey = this.getStorageKey('obligations', mode);
      const modeCached = this.getItem(modeKey);
      if (modeCached) {
        try {
          return JSON.parse(modeCached);
        } catch {
          // fallback
        }
      }
    }
    const key = this.getStorageKey('obligations');
    const cached = this.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }
    return [];
  }

  async addObligation(obligation: Omit<Obligation, 'id'>): Promise<Obligation> {
    const current = await this.getObligations();
    const newObligation: Obligation = {
      ...obligation,
      id: `ob-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    current.push(newObligation);
    await this.saveObligations(current);
    return newObligation;
  }

  async updateObligation(obligation: Obligation): Promise<Obligation> {
    const current = await this.getObligations();
    const idx = current.findIndex(o => o.id === obligation.id);
    if (idx >= 0) {
      current[idx] = obligation;
    } else {
      current.push(obligation);
    }
    await this.saveObligations(current);
    return obligation;
  }

  async deleteObligation(obligationId: string): Promise<void> {
    const current = await this.getObligations();
    const filtered = current.filter(o => o.id !== obligationId);
    await this.saveObligations(filtered);
  }

  async toggleObligationPaid(obligationId: string): Promise<Obligation> {
    const current = await this.getObligations();
    const target = current.find(o => o.id === obligationId);
    if (!target) {
      throw new Error(`Obligation ${obligationId} not found`);
    }
    target.isPaid = !target.isPaid;
    await this.saveObligations(current);
    return target;
  }

  async saveObligations(obligations: Obligation[], mode?: UserMode): Promise<void> {
    this.setItem(this.getStorageKey('obligations'), JSON.stringify(obligations));
    if (mode) {
      this.setItem(this.getStorageKey('obligations', mode), JSON.stringify(obligations));
    }
  }

  async getTransactions(mode?: UserMode): Promise<Transaction[]> {
    const modeKey = this.getStorageKey('transactions', mode);
    let cached = this.getItem(modeKey);
    if (!cached && mode) {
      cached = this.getItem(this.getStorageKey('transactions'));
    }
    if (!cached && !mode) {
      const persona = this.getDemoPersona();
      if (persona) {
        cached = this.getItem(this.getStorageKey('transactions', DEMO_PERSONAS[persona]?.mode));
      }
    }
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }

    const persona = this.getDemoPersona() || (mode === 'student' ? 'aarav' : mode === 'household' ? 'meena' : 'rohan');
    const seeded = generate60DaysTransactions(persona);
    const saveKey = mode ? this.getStorageKey('transactions', mode) : this.getStorageKey('transactions');
    this.setItem(saveKey, JSON.stringify(seeded));
    return seeded;
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>, mode?: UserMode): Promise<Transaction> {
    const current = await this.getTransactions(mode);
    const newTx: Transaction = {
      paymentMode: 'upi',
      ...transaction,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    current.unshift(newTx); // most recent first
    this.setItem(this.getStorageKey('transactions'), JSON.stringify(current));
    if (mode) {
      this.setItem(this.getStorageKey('transactions', mode), JSON.stringify(current));
    }

    // Sync with envelope spent if it's an expense
    if (newTx.type === 'expense') {
      const activeMode = mode || (await this.getProfile())?.mode || 'earner';
      try {
        const envelopes = await this.getEnvelopes(activeMode);
        const match = envelopes.find(
          e => (newTx.envelopeId && e.id === newTx.envelopeId) || (newTx.categoryKey && e.categoryKey === newTx.categoryKey)
        );
        if (match) {
          await this.updateEnvelopeSpent(activeMode, match.id, newTx.amount);
        }
      } catch {
        // envelope sync error ignored
      }
    }

    return newTx;
  }

  async deleteTransaction(transactionId: string, mode?: UserMode): Promise<void> {
    const current = await this.getTransactions(mode);
    const targetIdx = current.findIndex(t => t.id === transactionId);
    if (targetIdx === -1) return;

    const target = current[targetIdx];
    current.splice(targetIdx, 1);

    this.setItem(this.getStorageKey('transactions'), JSON.stringify(current));
    if (mode) {
      this.setItem(this.getStorageKey('transactions', mode), JSON.stringify(current));
    }

    if (target.type === 'expense') {
      const activeMode = mode || (await this.getProfile())?.mode || 'earner';
      try {
        const envelopes = await this.getEnvelopes(activeMode);
        const match = envelopes.find(
          e => (target.envelopeId && e.id === target.envelopeId) || (target.categoryKey && e.categoryKey === target.categoryKey)
        );
        if (match) {
          await this.updateEnvelopeSpent(activeMode, match.id, -target.amount);
        }
      } catch {
        // envelope sync error ignored
      }
    }
  }

  async updateTransaction(transaction: Transaction, mode?: UserMode): Promise<Transaction> {
    const current = await this.getTransactions(mode);
    const targetIdx = current.findIndex(t => t.id === transaction.id);
    if (targetIdx === -1) {
      return this.addTransaction(transaction, mode);
    }

    const oldTx = current[targetIdx];
    current[targetIdx] = { ...oldTx, ...transaction };

    this.setItem(this.getStorageKey('transactions'), JSON.stringify(current));
    if (mode) {
      this.setItem(this.getStorageKey('transactions', mode), JSON.stringify(current));
    }

    const activeMode = mode || (await this.getProfile())?.mode || 'earner';
    if (oldTx.type === 'expense' && transaction.type === 'expense') {
      const diff = transaction.amount - oldTx.amount;
      if (diff !== 0) {
        try {
          const envelopes = await this.getEnvelopes(activeMode);
          const match = envelopes.find(
            e => (transaction.envelopeId && e.id === transaction.envelopeId) || (transaction.categoryKey && e.categoryKey === transaction.categoryKey)
          );
          if (match) {
            await this.updateEnvelopeSpent(activeMode, match.id, diff);
          }
        } catch {
          // envelope sync error ignored
        }
      }
    }

    return current[targetIdx];
  }

  async getBudgetPlan(month?: string): Promise<BudgetPlan | null> {
    const currentMonth = month || new Date().toISOString().substring(0, 7);
    const cached = this.getItem(this.getStorageKey(`budget_plan_${currentMonth}`));
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }
    return null;
  }

  async saveBudgetPlan(plan: BudgetPlan, lines?: PlanLine[]): Promise<void> {
    const planToSave: BudgetPlan = {
      ...plan,
      lines: lines || plan.lines,
    };
    this.setItem(this.getStorageKey(`budget_plan_${plan.month}`), JSON.stringify(planToSave));
    this.setItem(this.getStorageKey('active_budget_plan'), JSON.stringify(planToSave));

    const finalLines = lines || plan.lines;
    if (finalLines && finalLines.length > 0) {
      this.setItem(this.getStorageKey(`plan_lines_${plan.id}`), JSON.stringify(finalLines));
      this.setItem(this.getStorageKey(`plan_lines_${plan.month}`), JSON.stringify(finalLines));
      this.setItem(this.getStorageKey('active_plan_lines'), JSON.stringify(finalLines));

      // Synchronize category caps to envelopes so Home and other views update immediately
      try {
        const profile = await this.getProfile();
        const mode = profile?.mode || 'earner';
        const existingEnvelopes = await this.getEnvelopes(mode);

        const updatedEnvelopes: BudgetEnvelope[] = finalLines.map((line, idx) => {
          const cleanName = line.category.toLowerCase().replace(/[^a-z0-9]/g, '');
          const existing = existingEnvelopes.find((e) => {
            const envKey = e.categoryKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            return envKey.includes(cleanName) || cleanName.includes(envKey);
          });

          if (existing) {
            return {
              ...existing,
              allocated: line.cap,
            };
          }

          return {
            id: `env-${mode}-${idx + 1}`,
            categoryKey: line.category,
            allocated: line.cap,
            spent: 0,
            icon: 'Tag',
            type: line.type || 'need',
          };
        });

        await this.saveEnvelopes(mode, updatedEnvelopes);
      } catch (err) {
        console.warn('Could not sync envelopes with plan lines:', err);
      }
    }
  }

  async getPlanLines(planId?: string): Promise<PlanLine[]> {
    if (planId) {
      const cached = this.getItem(this.getStorageKey(`plan_lines_${planId}`));
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }
    }
    const active = this.getItem(this.getStorageKey('active_plan_lines'));
    if (active) {
      try {
        return JSON.parse(active);
      } catch {
        // ignore
      }
    }
    return [];
  }

  async getReminders(mode: UserMode): Promise<DueReminder[]> {
    const key = this.getStorageKey('reminders', mode);
    const cached = this.getItem(key);
    let reminders: DueReminder[] = [];
    if (cached) {
      try {
        reminders = JSON.parse(cached);
      } catch {
        reminders = [];
      }
    } else {
      reminders = [...(INITIAL_REMINDERS[mode] || [])];
    }

    // Auto-generate / sync from obligations
    try {
      const obligations = await this.getObligations(mode);
      if (obligations && obligations.length > 0) {
        reminders = generateRemindersFromObligations(
          obligations,
          reminders,
          new Date('2026-10-20T10:30:00+05:30')
        );
      }
    } catch {
      // obligations sync error ignored
    }

    this.setItem(key, JSON.stringify(reminders));
    return reminders;
  }

  async toggleReminderPaid(
    mode: UserMode,
    reminderId: string,
    options?: { logTransaction?: boolean; categoryKey?: string }
  ): Promise<DueReminder> {
    const res = await this.markReminderPaid(mode, reminderId, options);
    return res.reminder;
  }

  async markReminderPaid(
    mode: UserMode,
    reminderId: string,
    options: { logTransaction?: boolean; categoryKey?: string } = { logTransaction: true }
  ): Promise<{ reminder: DueReminder; transaction?: Transaction }> {
    const reminders = await this.getReminders(mode);
    const target = reminders.find((r) => r.id === reminderId);
    if (!target) {
      throw new Error(`Reminder ${reminderId} not found`);
    }

    let createdTx: Transaction | undefined;

    if (!target.isPaid) {
      target.isPaid = true;

      // Also mark obligation as paid if linked
      if (target.obligationId) {
        const obligations = await this.getObligations(mode);
        const ob = obligations.find((o) => o.id === target.obligationId);
        if (ob) {
          ob.isPaid = true;
          await this.saveObligations(obligations, mode);
        }
      }

      // Log expense transaction if requested and no existing transaction linked
      if (options?.logTransaction !== false && !target.transactionId) {
        const envelopes = await this.getEnvelopes(mode);
        const categoryKey = options?.categoryKey || detectEnvelopeCategoryKey(target, envelopes);

        // Check if matching transaction already exists to avoid any duplicates
        const currentTxs = await this.getTransactions(mode);
        const alreadyExists = currentTxs.some(
          (tx) =>
            tx.isObligation &&
            ((target.obligationId && tx.obligationId === target.obligationId) ||
              tx.description === (target.customTitle || target.titleKey)) &&
            tx.date.startsWith('2026-10') &&
            tx.amount === target.amount
        );

        if (!alreadyExists) {
          createdTx = await this.addTransaction(
            {
              date: '2026-10-20',
              amount: target.amount,
              type: 'expense',
              categoryKey,
              description: target.customTitle || target.titleKey,
              isObligation: true,
              obligationId: target.obligationId,
            },
            mode
          );
          target.transactionId = createdTx.id;
        }
      }
    } else {
      // Toggle back to unpaid if already paid
      target.isPaid = false;
      if (target.obligationId) {
        const obligations = await this.getObligations(mode);
        const ob = obligations.find((o) => o.id === target.obligationId);
        if (ob) {
          ob.isPaid = false;
          await this.saveObligations(obligations, mode);
        }
      }
    }

    this.setItem(this.getStorageKey('reminders', mode), JSON.stringify(reminders));
    return { reminder: target, transaction: createdTx };
  }

  async snoozeReminder(mode: UserMode, reminderId: string, days: 1 | 3): Promise<DueReminder> {
    const reminders = await this.getReminders(mode);
    const target = reminders.find((r) => r.id === reminderId);
    if (!target) {
      throw new Error(`Reminder ${reminderId} not found`);
    }

    target.dueDate = snoozeDueDate(target.dueDate, days);
    target.snoozedUntil = target.dueDate;
    this.setItem(this.getStorageKey('reminders', mode), JSON.stringify(reminders));
    return target;
  }

  async addReminder(mode: UserMode, reminder: Omit<DueReminder, 'id'>): Promise<DueReminder> {
    const reminders = await this.getReminders(mode);
    const newRem: DueReminder = {
      ...reminder,
      id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    reminders.push(newRem);
    this.setItem(this.getStorageKey('reminders', mode), JSON.stringify(reminders));
    return newRem;
  }

  async getLessonProgress(userId: string = 'current_user'): Promise<import('../types').LessonProgressRecord[]> {
    const key = this.getStorageKey('lesson_progress');
    const cached = this.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    const legacyKey = this.getStorageKey('lessons_completed');
    const legacyCached = this.getItem(legacyKey);
    if (legacyCached) {
      try {
        const ids: string[] = JSON.parse(legacyCached);
        return ids.map((id) => ({
          id: `lp-${id}`,
          userId,
          lessonKey: id,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    }
    return [];
  }

  async getLessons(mode: UserMode): Promise<MicroLesson[]> {
    const progress = await this.getLessonProgress();
    const completedSet = new Set<string>(progress.map((p) => p.lessonKey));

    const legacyKey = this.getStorageKey('lessons_completed');
    const cached = this.getItem(legacyKey);
    if (cached) {
      try {
        const parsed: string[] = JSON.parse(cached);
        parsed.forEach((id) => completedSet.add(id));
      } catch {
        // ignore
      }
    }

    const filtered = INITIAL_LESSONS.filter((l) => l.mode === 'all' || l.mode === mode);
    return filtered.map((lesson) => ({
      ...lesson,
      isCompleted: completedSet.has(lesson.id),
    }));
  }

  async markLessonComplete(lessonId: string, userId: string = 'current_user'): Promise<void> {
    const key = this.getStorageKey('lessons_completed');
    let completed: string[] = [];
    const cached = this.getItem(key);
    if (cached) {
      try {
        completed = JSON.parse(cached);
      } catch {
        completed = [];
      }
    }
    if (!completed.includes(lessonId)) {
      completed.push(lessonId);
      this.setItem(key, JSON.stringify(completed));
    }

    const progressKey = this.getStorageKey('lesson_progress');
    let progressList: import('../types').LessonProgressRecord[] = [];
    const progCached = this.getItem(progressKey);
    if (progCached) {
      try {
        progressList = JSON.parse(progCached);
      } catch {
        progressList = [];
      }
    }
    if (!progressList.some((p) => p.lessonKey === lessonId)) {
      progressList.push({
        id: `lp-${Date.now()}-${lessonId}`,
        userId,
        lessonKey: lessonId,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      this.setItem(progressKey, JSON.stringify(progressList));
    }
  }

  async getMarketSnapshots(): Promise<MarketRateSnapshot[]> {
    const result = await fetchMarketData();
    return result.snapshots;
  }

  async getRiskProfile(userId: string = 'current_user'): Promise<RiskProfile | null> {
    const raw = this.getItem(`${STORAGE_PREFIX}risk_profiles`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const found = parsed.find((p: RiskProfile) => p.user_id === userId);
        return found || parsed[0] || null;
      }
      return parsed as RiskProfile;
    } catch {
      return null;
    }
  }

  async saveRiskProfile(
    profile: Partial<RiskProfile> & { band: RiskBand; score: number; answers: Record<string, any> }
  ): Promise<RiskProfile> {
    const userId = profile.user_id || 'current_user';
    const raw = this.getItem(`${STORAGE_PREFIX}risk_profiles`);
    let list: RiskProfile[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        list = [];
      }
    }

    const existingIndex = list.findIndex((p: RiskProfile) => p.user_id === userId);
    const saved: RiskProfile = {
      id: profile.id || `rp-${Date.now()}`,
      user_id: userId,
      score: profile.score,
      band: profile.band,
      answers: profile.answers,
      created_at: profile.created_at || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = saved;
    } else {
      list.push(saved);
    }

    this.setItem(`${STORAGE_PREFIX}risk_profiles`, JSON.stringify(list));
    return saved;
  }

  async seedPersona(personaId: 'rohan' | 'meena' | 'aarav'): Promise<UserProfile> {
    const persona = DEMO_PERSONAS[personaId];
    if (!persona) {
      throw new Error(`Unknown persona ${personaId}`);
    }

    // Mark Demo Mode active
    this.setItem(`${STORAGE_PREFIX}demo_mode`, 'true');
    this.setItem(`${STORAGE_PREFIX}demo_persona`, personaId);

    // 1. Profile
    const profile: UserProfile = {
      id: `demo-${persona.id}`,
      name: persona.name,
      mode: persona.mode,
      monthlyIncome: persona.monthlyIncome,
      language: 'en',
    };
    await this.saveProfile(profile);

    // 2. Obligations with IDs
    const obligations: Obligation[] = persona.obligations.map((ob, idx) => ({
      ...ob,
      id: `ob-demo-${personaId}-${idx + 1}`,
    }));
    await this.saveObligations(obligations, persona.mode);

    // 3. Goal
    const goal: FinancialGoal = {
      id: `goal-demo-${personaId}-1`,
      titleKey: persona.savingsGoal.titleKey,
      customTitle: persona.savingsGoal.titleKey,
      targetAmount: persona.savingsGoal.targetAmount,
      currentAmount: persona.savingsGoal.currentAmount,
      targetDate: persona.savingsGoal.targetDate,
      category: persona.savingsGoal.category,
      priority: 'high',
    };
    this.setItem(this.getStorageKey('goals', persona.mode), JSON.stringify([goal]));

    // 4. ~60 Days of Realistic Transactions
    const txList = generate60DaysTransactions(personaId);
    this.setItem(this.getStorageKey('transactions'), JSON.stringify(txList));
    this.setItem(this.getStorageKey('transactions', persona.mode), JSON.stringify(txList));

    // 5. Build first plan & mid-month Envelopes
    const fixedTotal = obligations.reduce((sum, o) => sum + o.amount, 0);
    const planResult = buildPlan({
      income: persona.monthlyIncome,
      fixedTotal,
      savingsTarget: persona.savingsGoal.monthlyTarget,
      mode: persona.mode,
    });

    const budgetPlan: BudgetPlan = {
      id: `bp-demo-${personaId}-1`,
      month: '2026-10',
      income: persona.monthlyIncome,
      fixedTotal,
      savingsTarget: persona.savingsGoal.monthlyTarget,
      discretionaryTotal: planResult.discretionaryTotal,
      dailyDiscretionary: planResult.dailyDiscretionary,
      shortfall: planResult.shortfall,
      hasShortfall: planResult.hasShortfall,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    await this.saveBudgetPlan(budgetPlan);

    // 6. Mid-month spent calculation for envelopes
    // We calculate current month (October 2026) spending from transactions
    const currentMonthTx = txList.filter(t => t.date.startsWith('2026-10') && t.type === 'expense');
    const spentByCategory = new Map<string, number>();
    currentMonthTx.forEach(t => {
      spentByCategory.set(t.categoryKey, (spentByCategory.get(t.categoryKey) || 0) + t.amount);
    });

    const configuredEnvelopes = planResult.envelopes.map(env => ({
      ...env,
      spent: spentByCategory.get(env.categoryKey) || env.spent,
    }));
    await this.saveEnvelopes(persona.mode, configuredEnvelopes);

    return profile;
  }

  async exitDemo(): Promise<void> {
    this.removeItem(`${STORAGE_PREFIX}demo_mode`);
    this.removeItem(`${STORAGE_PREFIX}demo_persona`);
    await this.resetSeedData();
  }

  async resetSeedData(mode?: UserMode): Promise<void> {
    if (mode) {
      this.removeItem(this.getStorageKey('profile', mode));
      this.removeItem(this.getStorageKey('envelopes', mode));
      this.removeItem(this.getStorageKey('goals', mode));
      this.removeItem(this.getStorageKey('reminders', mode));
      this.removeItem(this.getStorageKey('obligations', mode));
      this.removeItem(this.getStorageKey('transactions', mode));
      this.removeItem(this.getStorageKey('transactions'));
      this.removeItem(this.getStorageKey('lesson_progress'));
      this.removeItem(this.getStorageKey('lessons_completed'));
    } else {
      // Clear all pennypath keys
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => window.localStorage.removeItem(k));
        }
      } catch {
        // ignore
      }
      this.inMemoryFallback.clear();
    }
  }
}
