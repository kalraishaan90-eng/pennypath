import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { UserMode, BudgetEnvelope } from '../engine/budget';
import type { FinancialGoal, DueReminder, MicroLesson, UserProfile, MarketRateSnapshot, Transaction, PaymentMode } from '../types';
import { repository } from '../repository';

interface AppContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  lang: 'en' | 'hi';
  toggleLang: () => void;
  isOnline: boolean;
  profile: UserProfile | null;
  envelopes: BudgetEnvelope[];
  goals: FinancialGoal[];
  reminders: DueReminder[];
  lessons: MicroLesson[];
  lessonProgress: import('../types').LessonProgressRecord[];
  streakCount: number;
  marketSnapshots: MarketRateSnapshot[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  activeTab: 'budget' | 'goals' | 'calculators' | 'reminders' | 'invest' | 'lessons';
  setActiveTab: (tab: 'budget' | 'goals' | 'calculators' | 'reminders' | 'invest' | 'lessons') => void;
  refreshData: () => Promise<void>;
  updateIncome: (income: number) => Promise<void>;
  updateEnvelopeSpent: (id: string, delta: number) => Promise<void>;
  updateEnvelopeAllocation: (id: string, newAllocated: number) => Promise<void>;
  addEnvelope: (env: Omit<BudgetEnvelope, 'id'>) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number) => Promise<void>;
  addGoal: (goal: Omit<FinancialGoal, 'id'>) => Promise<void>;
  toggleReminderPaid: (reminderId: string, options?: { logTransaction?: boolean; categoryKey?: string }) => Promise<void>;
  markReminderPaid: (reminderId: string, options?: { logTransaction?: boolean; categoryKey?: string }) => Promise<void>;
  snoozeReminder: (reminderId: string, days: 1 | 3) => Promise<void>;
  addReminder: (reminder: Omit<DueReminder, 'id'>) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<Transaction>;
  quickAddIncome: (amount: number, description: string, paymentMode?: PaymentMode, date?: string) => Promise<Transaction>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [mode, setModeState] = useState<UserMode>(() => {
    return (localStorage.getItem('pennypath_mode') as UserMode) || 'earner';
  });
  const [lang, setLangState] = useState<'en' | 'hi'>(() => {
    return (i18n.language as 'en' | 'hi') || 'en';
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [activeTab, setActiveTab] = useState<'budget' | 'goals' | 'calculators' | 'reminders' | 'invest' | 'lessons'>('budget');
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [envelopes, setEnvelopes] = useState<BudgetEnvelope[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [reminders, setReminders] = useState<DueReminder[]>([]);
  const [lessons, setLessons] = useState<MicroLesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<import('../types').LessonProgressRecord[]>([]);
  const [marketSnapshots, setMarketSnapshots] = useState<MarketRateSnapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync document language attribute
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const loadAllData = async (currentMode: UserMode) => {
    setIsLoading(true);
    setError(null);
    try {
      const [profData, envData, goalsData, remData, lessData, mktData, txData, progData] = await Promise.all([
        repository.getProfile(currentMode),
        repository.getEnvelopes(currentMode),
        repository.getGoals(currentMode),
        repository.getReminders(currentMode),
        repository.getLessons(currentMode),
        repository.getMarketSnapshots(),
        repository.getTransactions(currentMode),
        repository.getLessonProgress(),
      ]);

      setProfile(profData);
      setEnvelopes(envData);
      setGoals(goalsData);
      setReminders(remData);
      setLessons(lessData);
      setMarketSnapshots(mktData);
      setTransactions(txData);
      setLessonProgress(progData);
    } catch (err: unknown) {
      console.error('Error loading data:', err);
      setError('common.error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(mode);
  }, [mode]);

  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    localStorage.setItem('pennypath_mode', newMode);
  };

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLangState(nextLang);
    i18n.changeLanguage(nextLang);
    localStorage.setItem('pennypath_lang', nextLang);
  };

  const refreshData = async () => {
    await loadAllData(mode);
  };

  const updateIncome = async (income: number) => {
    await repository.updateIncome(mode, income);
    if (profile) {
      setProfile({ ...profile, monthlyIncome: income });
    }
  };

  const updateEnvelopeSpent = async (id: string, delta: number) => {
    const updated = await repository.updateEnvelopeSpent(mode, id, delta);
    setEnvelopes(prev => prev.map(e => e.id === id ? updated : e));
  };

  const updateEnvelopeAllocation = async (id: string, newAllocated: number) => {
    const updated = await repository.updateEnvelopeAllocation(mode, id, newAllocated);
    setEnvelopes(prev => prev.map(e => e.id === id ? updated : e));
  };

  const addEnvelope = async (env: Omit<BudgetEnvelope, 'id'>) => {
    const created = await repository.addEnvelope(mode, env);
    setEnvelopes(prev => [...prev, created]);
  };

  const contributeToGoal = async (goalId: string, amount: number) => {
    const updated = await repository.contributeToGoal(mode, goalId, amount);
    setGoals(prev => prev.map(g => g.id === goalId ? updated : g));
  };

  const addGoal = async (goal: Omit<FinancialGoal, 'id'>) => {
    const created = await repository.addGoal(mode, goal);
    setGoals(prev => [...prev, created]);
  };

  const toggleReminderPaid = async (
    reminderId: string,
    options?: { logTransaction?: boolean; categoryKey?: string }
  ) => {
    const res = await repository.markReminderPaid(mode, reminderId, options);
    setReminders((prev) => prev.map((r) => (r.id === reminderId ? res.reminder : r)));
    if (res.transaction) {
      setTransactions((prev) => [res.transaction!, ...prev]);
      const updatedEnvelopes = await repository.getEnvelopes(mode);
      setEnvelopes(updatedEnvelopes);
    }
  };

  const markReminderPaid = async (
    reminderId: string,
    options?: { logTransaction?: boolean; categoryKey?: string }
  ) => {
    return toggleReminderPaid(reminderId, options);
  };

  const snoozeReminder = async (reminderId: string, days: 1 | 3) => {
    const updated = await repository.snoozeReminder(mode, reminderId, days);
    setReminders((prev) => prev.map((r) => (r.id === reminderId ? updated : r)));
  };

  const addReminder = async (reminder: Omit<DueReminder, 'id'>) => {
    const created = await repository.addReminder(mode, reminder);
    setReminders((prev) => [...prev, created]);
  };

  const completeLesson = async (lessonId: string) => {
    await repository.markLessonComplete(lessonId);
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, isCompleted: true } : l));
    const updatedProg = await repository.getLessonProgress();
    setLessonProgress(updatedProg);
  };

  const streakCount = lessons.filter(l => l.isCompleted).length;

  const resetDemoData = async () => {
    await repository.resetSeedData(mode);
    await loadAllData(mode);
  };

  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    const created = await repository.addTransaction(tx, mode);
    setTransactions(prev => [created, ...prev]);
    const updatedEnvelopes = await repository.getEnvelopes(mode);
    setEnvelopes(updatedEnvelopes);
    return created;
  };

  const deleteTransaction = async (id: string) => {
    await repository.deleteTransaction(id, mode);
    setTransactions(prev => prev.filter(t => t.id !== id));
    const updatedEnvelopes = await repository.getEnvelopes(mode);
    setEnvelopes(updatedEnvelopes);
  };

  const updateTransaction = async (tx: Transaction) => {
    const updated = await repository.updateTransaction(tx, mode);
    setTransactions(prev => prev.map(t => t.id === tx.id ? updated : t));
    const updatedEnvelopes = await repository.getEnvelopes(mode);
    setEnvelopes(updatedEnvelopes);
    return updated;
  };

  const quickAddIncome = async (
    amount: number,
    description: string,
    paymentMode: PaymentMode = 'upi',
    date?: string
  ) => {
    const created = await repository.addTransaction({
      amount,
      type: 'income',
      categoryKey: 'budget.cat.income',
      description: description || 'Bonus / Gift Income',
      date: date || new Date().toISOString().substring(0, 10),
      paymentMode,
    }, mode);
    setTransactions(prev => [created, ...prev]);
    return created;
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        lang,
        toggleLang,
        isOnline,
        profile,
        envelopes,
        goals,
        reminders,
        lessons,
        lessonProgress,
        streakCount,
        marketSnapshots,
        transactions,
        isLoading,
        error,
        activeTab,
        setActiveTab,
        refreshData,
        updateIncome,
        updateEnvelopeSpent,
        updateEnvelopeAllocation,
        addEnvelope,
        contributeToGoal,
        addGoal,
        toggleReminderPaid,
        markReminderPaid,
        snoozeReminder,
        addReminder,
        completeLesson,
        resetDemoData,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        quickAddIncome,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    return {
      mode: 'earner' as UserMode,
      setMode: () => {},
      lang: 'en' as const,
      toggleLang: () => {},
      isOnline: true,
      profile: null,
      envelopes: [],
      goals: [],
      reminders: [],
      lessons: [],
      lessonProgress: [],
      streakCount: 0,
      marketSnapshots: [],
      transactions: [],
      isLoading: false,
      error: null,
      activeTab: 'budget' as const,
      setActiveTab: () => {},
      refreshData: async () => {},
      updateIncome: async () => {},
      updateEnvelopeSpent: async () => {},
      updateEnvelopeAllocation: async () => {},
      addEnvelope: async () => {},
      contributeToGoal: async () => {},
      addGoal: async () => {},
      toggleReminderPaid: async () => {},
      markReminderPaid: async () => {},
      snoozeReminder: async () => {},
      addReminder: async () => {},
      completeLesson: async () => {},
      resetDemoData: async () => {},
      addTransaction: async (tx: any) => tx,
      deleteTransaction: async () => {},
      updateTransaction: async (tx: any) => tx,
      quickAddIncome: async (amt: any, desc: any) => ({} as any),
    };
  }
  return context;
};
