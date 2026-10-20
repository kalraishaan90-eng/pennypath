import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { repository } from '../repository';
import { useApp } from './AppContext';
import { useAuth } from '../auth/AuthContext';
import { buildPlan } from '../engine/budget';

export interface ScriptStep {
  id: string;
  number: number;
  timeRange: string;
  titleKey: string;
  cueKey: string;
  buttonLabelKey: string;
  action: () => Promise<void>;
}

export interface PitchContextType {
  isPitchMode: boolean;
  setIsPitchMode: (active: boolean) => void;
  togglePitchMode: () => void;
  isBigScreen: boolean;
  toggleBigScreen: () => void;
  isMinimized: boolean;
  toggleMinimized: () => void;
  panelPosition: 'bottom-right' | 'top-right' | 'dock-bottom';
  setPanelPosition: (pos: 'bottom-right' | 'top-right' | 'dock-bottom') => void;
  currentStepIndex: number;
  setCurrentStepIndex: (idx: number) => void;
  steps: ScriptStep[];
  executeStep: (idx: number) => Promise<void>;
  resetDemoDataFast: () => Promise<number>;
  lastResetDurationMs: number | null;
  resetFeedback: string | null;
  handleLogoTap: () => void;
  tapCount: number;
  // 5-minute timer
  timerSeconds: number;
  isTimerRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

const PitchContext = createContext<PitchContextType | undefined>(undefined);

export const PitchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { refreshData, updateIncome } = useApp();
  const { startDemo } = useAuth();

  const [isPitchMode, setIsPitchModeState] = useState<boolean>(() => {
    return (
      location.pathname === '/pitch' ||
      localStorage.getItem('pennypath_pitch_mode') === 'true'
    );
  });

  const [isBigScreen, setIsBigScreenState] = useState<boolean>(() => {
    return localStorage.getItem('pennypath_big_screen') === 'true';
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [panelPosition, setPanelPosition] = useState<'bottom-right' | 'top-right' | 'dock-bottom'>('bottom-right');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [lastResetDurationMs, setLastResetDurationMs] = useState<number | null>(null);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // 5-minute presentation countdown timer (300 seconds)
  const [timerSeconds, setTimerSeconds] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Logo tap detector state
  const [tapCount, setTapCount] = useState<number>(0);

  // Sync Big Screen class on document root
  useEffect(() => {
    if (isBigScreen) {
      document.documentElement.classList.add('big-screen-mode');
    } else {
      document.documentElement.classList.remove('big-screen-mode');
    }
    localStorage.setItem('pennypath_big_screen', isBigScreen ? 'true' : 'false');
  }, [isBigScreen]);

  // Synchronize with URL /pitch
  useEffect(() => {
    if (location.pathname === '/pitch') {
      setIsPitchModeState(true);
      localStorage.setItem('pennypath_pitch_mode', 'true');
      // If demo mode is not active, auto-seed Rohan
      if (!repository.isDemoMode()) {
        startDemo('rohan').then(() => refreshData());
      }
    }
  }, [location.pathname]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const togglePitchMode = useCallback(() => {
    setIsPitchModeState((prev) => {
      const next = !prev;
      localStorage.setItem('pennypath_pitch_mode', next ? 'true' : 'false');
      if (next && !repository.isDemoMode()) {
        startDemo('rohan').then(() => refreshData());
      }
      return next;
    });
  }, [startDemo, refreshData]);

  const toggleBigScreen = useCallback(() => {
    setIsBigScreenState((prev) => !prev);
  }, []);

  const toggleMinimized = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const startTimer = useCallback(() => setIsTimerRunning(true), []);
  const pauseTimer = useCallback(() => setIsTimerRunning(false), []);
  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimerSeconds(300);
  }, []);

  // Instant Reset in < 1 second (< 1000ms)
  const resetDemoDataFast = useCallback(async (): Promise<number> => {
    const t0 = performance.now();
    await repository.seedPersona('rohan');
    await refreshData();
    const duration = Math.round(performance.now() - t0);
    setLastResetDurationMs(duration);
    setResetFeedback(`Restored Rohan in ${duration}ms (< 1s)`);
    setTimeout(() => setResetFeedback(null), 3000);
    return duration;
  }, [refreshData]);

  // 5 Taps on logo handler
  const handleLogoTap = useCallback(() => {
    setTapCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 5) {
        togglePitchMode();
        return 0;
      }
      return nextCount;
    });

    // Reset tap count if no taps within 2.5s
    setTimeout(() => {
      setTapCount((current) => (current < 5 ? 0 : current));
    }, 2500);
  }, [togglePitchMode]);

  // STEP ACTIONS
  // 1. Load Rohan
  const stepActionLoadRohan = useCallback(async () => {
    await resetDemoDataFast();
    if (location.pathname !== '/' && location.pathname !== '/pitch') {
      navigate('/');
    }
  }, [resetDemoDataFast, location.pathname, navigate]);

  // 2. Open Home / Inspect Safe-to-Spend
  const stepActionOpenHome = useCallback(async () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [location.pathname, navigate]);

  // 3. Open Plan & Set income 30k save 20k to show shortfall
  const stepActionTriggerShortfall = useCallback(async () => {
    const income = 30000;
    const savingsTarget = 20000;
    const obligations = await repository.getObligations('earner');
    const fixedTotal = obligations.reduce((sum, o) => sum + o.amount, 0) || 17700;

    // Compute shortfall with budget engine
    const planResult = buildPlan({
      income,
      fixedTotal,
      savingsTarget,
      mode: 'earner',
      daysInMonth: 30,
    });

    // Save profile with new income
    const profile = await repository.getProfile('earner');
    if (profile) {
      await repository.saveProfile({ ...profile, monthlyIncome: income });
    } else {
      await updateIncome(income);
    }

    // Save active budget plan with shortfall
    await repository.saveBudgetPlan({
      id: 'bp-rohan-shortfall',
      month: '2026-10',
      income,
      fixedTotal,
      savingsTarget,
      discretionaryTotal: planResult.discretionaryTotal,
      dailyDiscretionary: planResult.dailyDiscretionary,
      shortfall: planResult.shortfall,
      hasShortfall: planResult.hasShortfall,
      createdAt: new Date().toISOString(),
      status: 'active',
    });

    // Save scaled envelopes
    await repository.saveEnvelopes('earner', planResult.envelopes);
    await refreshData();

    if (location.pathname !== '/plan') {
      navigate('/plan');
    }
  }, [updateIncome, refreshData, location.pathname, navigate]);

  // 4. Open Invest Lab
  const stepActionOpenInvest = useCallback(async () => {
    if (location.pathname !== '/invest') {
      navigate('/invest');
    }
  }, [location.pathname, navigate]);

  // 5. Switch to Hindi
  const stepActionSwitchHindi = useCallback(async () => {
    const nextLang = i18n.language === 'hi' ? 'en' : 'hi';
    await i18n.changeLanguage(nextLang);
    localStorage.setItem('pennypath_lang', nextLang);
  }, [i18n]);

  // 5-Minute Script Steps Definition
  const steps: ScriptStep[] = [
    {
      id: 'step-1-rohan',
      number: 1,
      timeRange: '0:00 - 1:00',
      titleKey: 'pitch.step1.title',
      cueKey: 'pitch.step1.cue',
      buttonLabelKey: 'pitch.step1.btn',
      action: stepActionLoadRohan,
    },
    {
      id: 'step-2-safetospend',
      number: 2,
      timeRange: '1:00 - 2:00',
      titleKey: 'pitch.step2.title',
      cueKey: 'pitch.step2.cue',
      buttonLabelKey: 'pitch.step2.btn',
      action: stepActionOpenHome,
    },
    {
      id: 'step-3-shortfall',
      number: 3,
      timeRange: '2:00 - 3:00',
      titleKey: 'pitch.step3.title',
      cueKey: 'pitch.step3.cue',
      buttonLabelKey: 'pitch.step3.btn',
      action: stepActionTriggerShortfall,
    },
    {
      id: 'step-4-investlab',
      number: 4,
      timeRange: '3:00 - 4:00',
      titleKey: 'pitch.step4.title',
      cueKey: 'pitch.step4.cue',
      buttonLabelKey: 'pitch.step4.btn',
      action: stepActionOpenInvest,
    },
    {
      id: 'step-5-hindi',
      number: 5,
      timeRange: '4:00 - 5:00',
      titleKey: 'pitch.step5.title',
      cueKey: 'pitch.step5.cue',
      buttonLabelKey: 'pitch.step5.btn',
      action: stepActionSwitchHindi,
    },
  ];

  const executeStep = useCallback(
    async (idx: number) => {
      if (idx >= 0 && idx < steps.length) {
        setCurrentStepIndex(idx);
        await steps[idx].action();
      }
    },
    [steps]
  );

  return (
    <PitchContext.Provider
      value={{
        isPitchMode,
        setIsPitchMode: setIsPitchModeState,
        togglePitchMode,
        isBigScreen,
        toggleBigScreen,
        isMinimized,
        toggleMinimized,
        panelPosition,
        setPanelPosition,
        currentStepIndex,
        setCurrentStepIndex,
        steps,
        executeStep,
        resetDemoDataFast,
        lastResetDurationMs,
        resetFeedback,
        handleLogoTap,
        tapCount,
        timerSeconds,
        isTimerRunning,
        startTimer,
        pauseTimer,
        resetTimer,
      }}
    >
      {children}
    </PitchContext.Provider>
  );
};

export const usePitch = (): PitchContextType => {
  const context = useContext(PitchContext);
  if (!context) {
    throw new Error('usePitch must be used within a PitchProvider');
  }
  return context;
};
