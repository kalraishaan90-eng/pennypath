import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  Home,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Calculator,
  Plus,
  Trash2,
  Sparkles,
  ShieldAlert,
  CreditCard,
  Building,
  Coins,
  Shield,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { UserMode, buildPlan } from '../engine/budget';
import { calculateEMI } from '../engine/calculators';
import { formatINR, parseINR } from '../engine/currency';
import { repository } from '../repository';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';
import { Obligation, ObligationType, BudgetPlan, UserProfile } from '../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { usePWA } from '../context/PWAContext';

interface OnboardingWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const { t, i18n } = useTranslation();
  const { completeOnboarding } = useAuth();
  const { setMode: setAppMode, refreshData } = useApp();
  const { triggerFirstActionSuccess } = usePWA();

  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Language & Mode
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi'>(
    i18n.language.startsWith('hi') ? 'hi' : 'en'
  );
  const [selectedMode, setSelectedMode] = useState<UserMode>('earner');

  // Step 2: Income
  const [incomeStr, setIncomeStr] = useState<string>('38000');
  const [incomeError, setIncomeError] = useState<string | null>(null);

  // Step 3: Savings Goal
  const [savingsStr, setSavingsStr] = useState<string>('5000');
  const [savingsError, setSavingsError] = useState<string | null>(null);

  // Step 4: Fixed Payments
  const [obligations, setObligations] = useState<Omit<Obligation, 'id'>[]>([
    {
      title: 'Rent / PG',
      type: 'rent',
      amount: 12000,
      dueDay: 5,
    },
    {
      title: 'Bike EMI',
      type: 'emi',
      amount: 3200,
      dueDay: 10,
      emiDetails: {
        principal: 90000,
        annualInterestRate: 11,
        tenureMonths: 36,
        remainingMonths: 22,
        remainingPrincipal: 58500,
      },
    },
  ]);

  // Fixed Payment Form State
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ObligationType>('emi');
  const [newAmountStr, setNewAmountStr] = useState('');
  const [newDueDayStr, setNewDueDayStr] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);

  // EMI Calculator Sub-form
  const [showEmiCalc, setShowEmiCalc] = useState(false);
  const [emiPrincipalStr, setEmiPrincipalStr] = useState('100000');
  const [emiRateStr, setEmiRateStr] = useState('11');
  const [emiTenureStr, setEmiTenureStr] = useState('36');

  // Language change handler
  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setSelectedLang(lang);
    i18n.changeLanguage(lang);
  };

  // Numerical inputs
  const incomeNumber = parseINR(incomeStr);
  const savingsNumber = parseINR(savingsStr);
  const fixedTotal = obligations.reduce((sum, o) => sum + o.amount, 0);

  // Calculated EMI
  const emiCalculation = useMemo(() => {
    const p = parseINR(emiPrincipalStr);
    const r = parseFloat(emiRateStr) || 0;
    const n = parseInt(emiTenureStr, 10) || 0;
    if (p > 0 && n > 0) {
      return calculateEMI(p, r, n);
    }
    return null;
  }, [emiPrincipalStr, emiRateStr, emiTenureStr]);

  // Live Plan Calculation from Engine
  const livePlan = useMemo(() => {
    return buildPlan({
      income: incomeNumber,
      fixedTotal,
      savingsTarget: savingsNumber,
      mode: selectedMode,
      daysInMonth: 30,
    });
  }, [incomeNumber, fixedTotal, savingsNumber, selectedMode]);

  // Step 2 Quick Preset Chips
  const incomePresets = {
    student: [6000, 10000, 15000],
    household: [35000, 50000, 75000],
    earner: [25000, 38000, 60000],
  }[selectedMode];

  // Step 3 Quick Savings % Chips
  const applySavingsPercentage = (percent: number) => {
    const amount = Math.round((incomeNumber * percent) / 100);
    setSavingsStr(amount.toString());
    setSavingsError(null);
  };

  // Step 4 Validation & Add
  const handleAddPayment = () => {
    setFormError(null);
    if (!newTitle.trim()) {
      setFormError(t('validation.required'));
      return;
    }
    const amt = parseINR(newAmountStr);
    if (amt <= 0) {
      setFormError(t('validation.positive_only'));
      return;
    }
    const dueDay = parseInt(newDueDayStr, 10);
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      setFormError(t('validation.due_day_range'));
      return;
    }

    const newPayment: Omit<Obligation, 'id'> = {
      title: newTitle.trim(),
      type: newType,
      amount: amt,
      dueDay,
    };

    if (newType === 'emi' && emiCalculation && showEmiCalc) {
      newPayment.emiDetails = {
        principal: parseINR(emiPrincipalStr),
        annualInterestRate: parseFloat(emiRateStr) || 0,
        tenureMonths: parseInt(emiTenureStr, 10) || 12,
        remainingMonths: parseInt(emiTenureStr, 10) || 12,
        remainingPrincipal: parseINR(emiPrincipalStr),
      };
    }

    setObligations((prev) => [...prev, newPayment]);
    setNewTitle('');
    setNewAmountStr('');
    setNewDueDayStr('5');
    setIsAddingPayment(false);
    setShowEmiCalc(false);
  };

  const handleRemovePayment = (index: number) => {
    setObligations((prev) => prev.filter((_, i) => i !== index));
  };

  // Navigation handlers
  const handleNextFromStep1 = () => {
    setAppMode(selectedMode);
    // Initialize defaults based on mode if not already customized
    if (selectedMode === 'student') {
      setIncomeStr('12000');
      setSavingsStr('2400');
      setObligations([
        { title: 'Hostel Mess Bill', type: 'other', amount: 3500, dueDay: 5 },
        { title: '5G Data Pack', type: 'utilities', amount: 399, dueDay: 12 },
      ]);
    } else if (selectedMode === 'household') {
      setIncomeStr('55000');
      setSavingsStr('5000');
      setObligations([
        { title: 'Kirana & Ration', type: 'other', amount: 14000, dueDay: 3 },
        { title: 'School Tuition Fee', type: 'other', amount: 8000, dueDay: 10 },
        { title: 'Mahila Chit Fund', type: 'chit', amount: 5000, dueDay: 15 },
        { title: 'Electricity & Gas', type: 'utilities', amount: 4500, dueDay: 12 },
      ]);
    } else {
      setIncomeStr('38000');
      setSavingsStr('5000');
      setObligations([
        { title: 'PG Rent', type: 'rent', amount: 12000, dueDay: 5 },
        { title: 'Bike EMI', type: 'emi', amount: 3200, dueDay: 10 },
        { title: 'Wifi Broadband', type: 'utilities', amount: 999, dueDay: 15 },
      ]);
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (incomeNumber <= 0) {
      setIncomeError(t('validation.income_min'));
      return;
    }
    setIncomeError(null);
    setStep(3);
  };

  const handleNextFromStep3 = () => {
    if (savingsNumber < 0) {
      setSavingsError(t('validation.positive_only'));
      return;
    }
    setSavingsError(null);
    setStep(4);
  };

  const handleNextFromStep4 = () => {
    setStep(5);
  };

  // Final confirmation
  const handleConfirmPlan = async () => {
    try {
      // 1. Profile
      const profile: UserProfile = {
        id: `usr-${Date.now()}`,
        name: selectedMode === 'student' ? 'Aarav' : selectedMode === 'household' ? 'Meena' : 'Rohan',
        mode: selectedMode,
        monthlyIncome: incomeNumber,
        language: selectedLang,
      };

      // 2. Save Profile
      await completeOnboarding(profile);

      // 3. Save Obligations
      const finalObligations: Obligation[] = obligations.map((ob, idx) => ({
        ...ob,
        id: `ob-usr-${Date.now()}-${idx + 1}`,
      }));
      await repository.saveObligations(finalObligations);

      // 4. Default categories / envelopes scaled from engine plan
      await repository.saveEnvelopes(selectedMode, livePlan.envelopes);

      // 5. Save initial budget plan
      const budgetPlan: BudgetPlan = {
        id: `bp-${Date.now()}`,
        month: new Date().toISOString().substring(0, 7),
        income: incomeNumber,
        fixedTotal,
        savingsTarget: savingsNumber,
        discretionaryTotal: livePlan.discretionaryTotal,
        dailyDiscretionary: livePlan.dailyDiscretionary,
        shortfall: livePlan.shortfall,
        hasShortfall: livePlan.hasShortfall,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      await repository.saveBudgetPlan(budgetPlan);

      // Confetti celebration
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0F414A', '#7F0303', '#D8BA98', '#96C0CE'],
        });
      } catch {
        // ignore in headless test environment
      }

      // Prompt PWA install after successful onboarding plan creation
      triggerFirstActionSuccess('onboarding_confirmed');

      await refreshData();
      onComplete();
    } catch (err: unknown) {
      console.error('Failed to confirm onboarding plan:', err);
    }
  };

  // Apply engine's fix directly
  const handleApplyFix = (suggestedValue?: number) => {
    if (suggestedValue !== undefined) {
      setSavingsStr(suggestedValue.toString());
    }
  };

  // Progress percentage
  const progressPercent = (step / 5) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto py-4 px-2 sm:px-4">
      {/* Top Header & Step Progress Bar with Signature Awning Stripe Edge */}
      <div className="mb-6 bg-paper rounded-card border border-ink/15 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink text-paper font-fraunces text-base font-bold flex items-center justify-center">
              ₹
            </div>
            <div>
              <span className="font-fraunces text-lg font-bold text-ink leading-tight block">
                {t('app.name')}
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-accent block">
                {t('onboarding.step_indicator', { current: step, total: 5 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language switch */}
            <div className="inline-flex rounded-lg border border-ink/20 p-0.5 bg-paper/50">
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  selectedLang === 'en'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  selectedLang === 'hi'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-ink/60 hover:text-ink px-2 py-1"
              >
                Exit
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar with Signature Awning Stripe Edge */}
        <div className="relative w-full h-3 rounded-full bg-sand/30 overflow-hidden border border-ink/15">
          <div
            className="h-full bg-ink transition-all duration-300 relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Awning diagonal stripe edge on the right tip */}
            <div
              className="absolute right-0 top-0 bottom-0 w-6"
              style={{
                background:
                  'repeating-linear-gradient(-45deg, #7F0303, #7F0303 6px, #EFE8DF 6px, #EFE8DF 12px)',
              }}
            />
          </div>
        </div>
      </div>

      {/* STEP 1: Language & Mode */}
      {step === 1 && (
        <div className="bg-paper rounded-card border-2 border-ink/15 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink">
              {t('onboarding.step1.title')}
            </h2>
            <p className="text-sm text-ink/75 mt-1 leading-relaxed">
              {t('onboarding.step1.subtitle')}
            </p>
          </div>

          <div>
            <label id="mode-selection-label" className="block text-xs uppercase font-bold text-ink/60 tracking-wider mb-2">
              {t('onboarding.step1.mode_heading')}
            </label>
            <div
              role="radiogroup"
              aria-labelledby="mode-selection-label"
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {[
                {
                  id: 'student' as const,
                  icon: GraduationCap,
                  titleKey: 'onboarding.step1.modes.student.title',
                  descKey: 'onboarding.step1.modes.student.desc',
                },
                {
                  id: 'household' as const,
                  icon: Home,
                  titleKey: 'onboarding.step1.modes.household.title',
                  descKey: 'onboarding.step1.modes.household.desc',
                },
                {
                  id: 'earner' as const,
                  icon: Briefcase,
                  titleKey: 'onboarding.step1.modes.earner.title',
                  descKey: 'onboarding.step1.modes.earner.desc',
                },
              ].map((modeItem) => {
                const Icon = modeItem.icon;
                const isSelected = selectedMode === modeItem.id;
                return (
                  <button
                    key={modeItem.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedMode(modeItem.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-ink bg-ink/5 shadow-sm ring-1 ring-ink'
                        : 'border-ink/20 hover:border-ink/40 bg-paper'
                    }`}
                  >
                    <div>
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                          isSelected ? 'bg-ink text-paper' : 'bg-sand/30 text-ink'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-fraunces text-base font-bold text-ink">
                        {t(modeItem.titleKey)}
                      </h3>
                      <p className="text-xs text-ink/75 mt-1 leading-relaxed">
                        {t(modeItem.descKey)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-accent">
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 text-ink" />
                          <span className="text-ink">Selected</span>
                        </>
                      ) : (
                        <span className="text-ink/40">Select</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNextFromStep1}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('onboarding.next')}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Monthly Income */}
      {step === 2 && (
        <div className="bg-paper rounded-card border-2 border-ink/15 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink">
              {t('onboarding.step2.title')}
            </h2>
            <p className="text-sm text-ink/75 mt-1 leading-relaxed">
              {t('onboarding.step2.subtitle')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="wizard-income-input" className="block text-sm font-bold text-ink mb-1">
                {t(`onboarding.step2.labels.${selectedMode}`)}
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-fraunces text-xl font-bold text-ink/60">
                  ₹
                </span>
                <input
                  id="wizard-income-input"
                  type="text"
                  inputMode="numeric"
                  value={incomeStr}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^0-9]/g, '');
                    setIncomeStr(sanitized);
                    setIncomeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNextFromStep2();
                    }
                  }}
                  placeholder={t('onboarding.step2.placeholder')}
                  className="w-full pl-10 pr-4 py-3 rounded-btn bg-paper border-2 border-ink/30 focus:border-ink focus:ring-1 focus:ring-ink text-xl font-bold text-ink transition-colors tabular-nums"
                />
              </div>

              {incomeError && (
                <p className="text-xs font-semibold text-accent mt-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {incomeError}
                </p>
              )}

              <p className="text-xs text-ink/60 mt-1 tabular-nums">
                {formatINR(incomeNumber)} / month
              </p>
            </div>

            {/* Quick chips */}
            <div>
              <span className="text-xs font-semibold text-ink/70 block mb-2">
                {t('onboarding.step2.quick_chips')}
              </span>
              <div className="flex flex-wrap gap-2">
                {incomePresets.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setIncomeStr(amount.toString());
                      setIncomeError(null);
                    }}
                    className={`px-3 py-1.5 rounded-btn text-xs font-bold border transition-colors ${
                      incomeNumber === amount
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-sand/20 hover:bg-sand/40 border-sand-dark text-ink'
                    }`}
                  >
                    {formatINR(amount)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {t('onboarding.back')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNextFromStep2}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('onboarding.next')}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Savings Goal with Live Feasibility Hint */}
      {step === 3 && (
        <div className="bg-paper rounded-card border-2 border-ink/15 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink">
              {t('onboarding.step3.title')}
            </h2>
            <p className="text-base font-semibold text-ink mt-1">
              {t('onboarding.step3.question')}
            </p>
            <p className="text-xs sm:text-sm text-ink/75 mt-0.5 leading-relaxed">
              {t('onboarding.step3.subtitle')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-fraunces text-xl font-bold text-ink/60">
                  ₹
                </span>
                <input
                  id="wizard-savings-input"
                  type="text"
                  inputMode="numeric"
                  value={savingsStr}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^0-9]/g, '');
                    setSavingsStr(sanitized);
                    setSavingsError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNextFromStep3();
                    }
                  }}
                  placeholder={t('onboarding.step3.placeholder')}
                  className="w-full pl-10 pr-4 py-3 rounded-btn bg-paper border-2 border-ink/30 focus:border-ink focus:ring-1 focus:ring-ink text-xl font-bold text-ink transition-colors tabular-nums"
                />
              </div>

              {savingsError && (
                <p className="text-xs font-semibold text-accent mt-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {savingsError}
                </p>
              )}
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applySavingsPercentage(10)}
                className="px-3 py-1.5 rounded-btn text-xs font-bold border border-ink/20 bg-paper hover:bg-sand/20 text-ink"
              >
                {t('onboarding.step3.presets.ten')} ({formatINR((incomeNumber * 0.1))})
              </button>
              <button
                type="button"
                onClick={() => applySavingsPercentage(20)}
                className="px-3 py-1.5 rounded-btn text-xs font-bold border border-ink bg-ink/10 hover:bg-ink/20 text-ink"
              >
                {t('onboarding.step3.presets.twenty')} ({formatINR((incomeNumber * 0.2))})
              </button>
              <button
                type="button"
                onClick={() => applySavingsPercentage(30)}
                className="px-3 py-1.5 rounded-btn text-xs font-bold border border-ink/20 bg-paper hover:bg-sand/20 text-ink"
              >
                {t('onboarding.step3.presets.thirty')} ({formatINR((incomeNumber * 0.3))})
              </button>
            </div>

            {/* Live Feasibility Hint from engine.buildPlan */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                livePlan.hasShortfall
                  ? 'bg-accent/10 border-accent text-accent'
                  : livePlan.feasibility === 'tight'
                  ? 'bg-sand/30 border-sand-dark text-ink-dark'
                  : 'bg-sky/20 border-sky-dark text-ink-dark'
              }`}
            >
              <div className="flex items-start gap-3">
                {livePlan.hasShortfall ? (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-accent mt-0.5" />
                ) : (
                  <Sparkles className="w-5 h-5 shrink-0 text-ink mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-bold">
                    {t('onboarding.step3.live_hint_title')} • {livePlan.savingsRate}% of income
                  </h4>
                  <p className="text-sm font-semibold mt-0.5">
                    {t(livePlan.feasibilityMessageKey)}
                  </p>
                  <p className="text-xs opacity-80 mt-1">
                    {livePlan.hasShortfall
                      ? `Projected shortfall of ${formatINR(livePlan.shortfall)} when combined with fixed payments.`
                      : `Leaves ${formatINR(livePlan.discretionaryTotal)} / month (${formatINR(livePlan.dailyDiscretionary)}/day) for everyday expenses.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setStep(2)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {t('onboarding.back')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNextFromStep3}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('onboarding.next')}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Fixed Payments & EMI Calculator */}
      {step === 4 && (
        <div className="bg-paper rounded-card border-2 border-ink/15 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-ink/10">
            <div>
              <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink">
                {t('onboarding.step4.title')}
              </h2>
              <p className="text-xs sm:text-sm text-ink/75 mt-0.5">
                {t('onboarding.step4.subtitle')}
              </p>
            </div>
            {!isAddingPayment && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddingPayment(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {t('onboarding.step4.add_btn')}
              </Button>
            )}
          </div>

          {/* Form to add a commitment */}
          {isAddingPayment && (
            <div className="p-4 sm:p-5 rounded-xl border-2 border-ink/30 bg-paper/90 space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="font-fraunces text-base font-bold text-ink">
                  {t('onboarding.step4.add_btn')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingPayment(false)}
                  className="text-xs text-ink/60 hover:text-ink font-semibold"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded bg-accent/10 border border-accent text-accent text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {t('onboarding.step4.name_label')}
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t('onboarding.step4.name_placeholder')}
                    className="w-full px-3 py-2 rounded-btn bg-paper border border-ink/30 text-sm font-medium text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {t('onboarding.step4.type_label')}
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const tVal = e.target.value as ObligationType;
                      setNewType(tVal);
                      if (tVal === 'emi') setShowEmiCalc(true);
                    }}
                    className="w-full px-3 py-2 rounded-btn bg-paper border border-ink/30 text-sm font-medium text-ink"
                  >
                    <option value="emi">{t('onboarding.step4.types.emi')}</option>
                    <option value="rent">{t('onboarding.step4.types.rent')}</option>
                    <option value="subscription">{t('onboarding.step4.types.subscription')}</option>
                    <option value="chit">{t('onboarding.step4.types.chit')}</option>
                    <option value="insurance">{t('onboarding.step4.types.insurance')}</option>
                    <option value="utilities">{t('onboarding.step4.types.utilities')}</option>
                    <option value="other">{t('onboarding.step4.types.other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {t('onboarding.step4.amount_label')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/60 font-bold">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newAmountStr}
                      onChange={(e) => setNewAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 3,200"
                      className="w-full pl-8 pr-3 py-2 rounded-btn bg-paper border border-ink/30 text-sm font-bold text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {t('onboarding.step4.due_day_label')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newDueDayStr}
                    onChange={(e) => setNewDueDayStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-paper border border-ink/30 text-sm font-medium text-ink"
                  />
                </div>
              </div>

              {/* Optional Loan EMI Calculator */}
              {newType === 'emi' && (
                <div className="mt-3 p-3 rounded-lg border border-ink/20 bg-sand/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowEmiCalc(!showEmiCalc)}
                      className="text-xs font-bold text-ink inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Calculator className="w-3.5 h-3.5 text-accent" />
                      <span>{t('onboarding.step4.emi_calculator.toggle')}</span>
                    </button>
                    {showEmiCalc && emiCalculation && (
                      <span className="text-xs font-bold text-accent">
                        Computed: {formatINR(emiCalculation.monthlyEMI)}/mo
                      </span>
                    )}
                  </div>

                  {showEmiCalc && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-ink/10">
                      <div>
                        <label className="block text-[11px] font-semibold text-ink/70">
                          {t('onboarding.step4.emi_calculator.principal')}
                        </label>
                        <input
                          type="text"
                          value={emiPrincipalStr}
                          onChange={(e) => setEmiPrincipalStr(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-2 py-1.5 rounded bg-paper border border-ink/20 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink/70">
                          {t('onboarding.step4.emi_calculator.rate')}
                        </label>
                        <input
                          type="text"
                          value={emiRateStr}
                          onChange={(e) => setEmiRateStr(e.target.value)}
                          className="w-full px-2 py-1.5 rounded bg-paper border border-ink/20 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink/70">
                          {t('onboarding.step4.emi_calculator.tenure')}
                        </label>
                        <input
                          type="number"
                          value={emiTenureStr}
                          onChange={(e) => setEmiTenureStr(e.target.value)}
                          className="w-full px-2 py-1.5 rounded bg-paper border border-ink/20 text-xs font-bold"
                        />
                      </div>

                      {emiCalculation && (
                        <div className="sm:col-span-3 flex items-center justify-between pt-1">
                          <span className="text-xs text-ink/75">
                            Total Interest: {formatINR(emiCalculation.totalInterest)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setNewAmountStr(emiCalculation.monthlyEMI.toString())}
                            className="px-2.5 py-1 rounded bg-ink text-paper text-xs font-bold hover:bg-ink-light"
                          >
                            {t('onboarding.step4.emi_calculator.apply_emi')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingPayment(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddPayment}
                >
                  {t('onboarding.step4.save_payment')}
                </Button>
              </div>
            </div>
          )}

          {/* Obligations List */}
          <div className="space-y-2">
            {obligations.length === 0 ? (
              <p className="text-xs sm:text-sm text-ink/60 py-4 text-center">
                {t('onboarding.step4.empty_commitments')}
              </p>
            ) : (
              obligations.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-ink/15 bg-paper/60 hover:bg-paper transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sand/30 flex items-center justify-center text-ink shrink-0">
                      {item.type === 'emi' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : item.type === 'rent' ? (
                        <Building className="w-4 h-4" />
                      ) : item.type === 'chit' ? (
                        <Coins className="w-4 h-4" />
                      ) : item.type === 'insurance' ? (
                        <Shield className="w-4 h-4" />
                      ) : item.type === 'utilities' ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <HelpCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink leading-tight">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-ink/60">
                        <Badge variant="sand" size="sm">
                          {t(`onboarding.step4.types.${item.type}`)}
                        </Badge>
                        <span>Due Day: {item.dueDay}th</span>
                        {item.emiDetails && (
                          <span className="text-[11px] font-semibold text-accent">
                            ({item.emiDetails.remainingMonths} mos left)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm sm:text-base font-bold text-ink">
                      {formatINR(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(index)}
                      className="text-ink/40 hover:text-accent p-1 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Fixed Commitments Total */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-sand/20 border border-sand/50 font-bold text-sm text-ink">
            <span>{t('onboarding.step4.total_fixed')}</span>
            <span className="text-base text-accent">{formatINR(fixedTotal)}</span>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setStep(3)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {t('onboarding.back')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNextFromStep4}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t('onboarding.next')}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Review Screen with Big Number D and Engine's Fixes */}
      {step === 5 && (
        <div className="bg-paper rounded-card border-2 border-ink/15 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink">
              {t('onboarding.step5.title')}
            </h2>
            <p className="text-xs sm:text-sm text-ink/75 mt-1 leading-relaxed">
              {t('onboarding.step5.subtitle')}
            </p>
          </div>

          {/* Big Number D Presentation */}
          <div
            className={`p-6 rounded-card border-2 text-center transition-all ${
              livePlan.hasShortfall
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-ink text-paper border-ink'
            }`}
          >
            <span className="text-xs uppercase tracking-wider font-bold block mb-1 opacity-80">
              {t('onboarding.step5.discretionary_label')}
            </span>
            <div className="font-fraunces text-4xl sm:text-5xl font-bold tracking-tight">
              {livePlan.hasShortfall ? '-' : ''}
              {formatINR(Math.abs(livePlan.discretionaryTotal))}
            </div>
            <p className="text-xs sm:text-sm mt-2 opacity-90 font-medium">
              {t('onboarding.step5.daily_label')}{' '}
              <strong className="underline text-sm sm:text-base">
                {livePlan.hasShortfall ? '-' : ''}
                {formatINR(Math.abs(livePlan.dailyDiscretionary))} / day
              </strong>
            </p>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="p-3 rounded-xl border border-ink/15 bg-paper">
              <span className="text-[11px] font-semibold text-ink/60 block">
                {t('onboarding.step5.breakdown.income')}
              </span>
              <span className="font-fraunces text-sm sm:text-base font-bold text-ink block mt-0.5">
                {formatINR(incomeNumber)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-ink/15 bg-paper">
              <span className="text-[11px] font-semibold text-ink/60 block">
                {t('onboarding.step5.breakdown.fixed')}
              </span>
              <span className="font-fraunces text-sm sm:text-base font-bold text-ink block mt-0.5">
                {formatINR(fixedTotal)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-ink/15 bg-paper">
              <span className="text-[11px] font-semibold text-ink/60 block">
                {t('onboarding.step5.breakdown.savings')}
              </span>
              <span className="font-fraunces text-sm sm:text-base font-bold text-ink block mt-0.5">
                {formatINR(savingsNumber)}
              </span>
            </div>
          </div>

          {/* Shortfall State Display in Maroon with Engine's Fixes */}
          {livePlan.hasShortfall ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-accent bg-accent/10 text-accent space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <h3 className="font-fraunces text-base font-bold">
                    {t('onboarding.step5.shortfall_alert.title', {
                      shortfall: formatINR(livePlan.shortfall),
                    })}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-ink/85 leading-relaxed">
                  {t('onboarding.step5.shortfall_alert.desc')}
                </p>
              </div>

              {/* Engine's Recommended Fixes */}
              <div className="space-y-2.5">
                <h4 className="text-xs uppercase tracking-wider font-bold text-ink">
                  {t('onboarding.step5.fixes_heading')}
                </h4>
                {livePlan.fixes.map((fix) => (
                  <div
                    key={fix.id}
                    className="p-3.5 rounded-xl border border-accent/30 bg-paper/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <h5 className="text-sm font-bold text-accent">
                        {t(fix.titleKey)}
                      </h5>
                      <p className="text-xs text-ink/75 mt-0.5">
                        {t(fix.descriptionKey, {
                          value: fix.suggestedValue ? formatINR(fix.suggestedValue) : '',
                          freed: fix.freedAmount ? formatINR(fix.freedAmount) : '',
                        })}
                      </p>
                    </div>

                    {fix.suggestedValue !== undefined && fix.type === 'reduce_savings' && (
                      <button
                        type="button"
                        onClick={() => handleApplyFix(fix.suggestedValue)}
                        className="touch-target px-3 py-1.5 rounded-btn bg-accent hover:bg-accent-light active:bg-accent-dark text-paper text-xs font-bold transition-all shrink-0 shadow-xs"
                      >
                        {t('onboarding.step5.apply_fix')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-sky-dark/40 bg-sky/15 text-ink flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-ink shrink-0" />
              <p className="text-xs sm:text-sm leading-relaxed">
                {t('onboarding.step5.healthy_notice')}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setStep(4)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {t('onboarding.back')}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleConfirmPlan}
              className="px-6 font-bold shadow-md"
            >
              {t('onboarding.step5.confirm_btn')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
