import React, { useState, useEffect, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { repository } from '../repository';
import { formatINR } from '../engine/currency';
import {
  calculateEMI,
  calculatePrepaymentImpact,
  evaluateAffordability,
  calculateGoalSIP,
  evaluateGoalPlanFit,
  calculateSIP,
  calculateCompoundInterest,
  compareEarlyInvesting,
  AffordabilityResult,
  GoalFitResult,
} from '../engine/calculators';
import { Obligation, BudgetPlan } from '../types';
import {
  Calculator,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookmarkCheck,
  PlusCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const CalculatorsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile, mode, setMode, addGoal, refreshData } = useApp();

  const [calcTab, setCalcTab] = useState<'emi' | 'goal' | 'compound'>('emi');

  // Plan data for affordability and plan fit
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [activePersona, setActivePersona] = useState<'rohan' | 'aarav' | null>(() => {
    return repository.getDemoPersona() === 'aarav' ? 'aarav' : 'rohan';
  });

  // Action notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Accordion state for "How is this calculated?"
  const [isHowCalculatedOpen, setIsHowCalculatedOpen] = useState<boolean>(false);

  // Amortization table collapsible state
  const [isAmortizationOpen, setIsAmortizationOpen] = useState<boolean>(false);
  const [showAllAmortization, setShowAllAmortization] = useState<boolean>(false);

  // Affordability check triggered state
  const [hasCheckedAffordability, setHasCheckedAffordability] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // 1. EMI CALCULATOR STATE
  // Defaults set to P3 test vector: ₹5,00,000 @ 10% / 60 months => EMI ~10,624
  // --------------------------------------------------------------------------
  const [loanPrincipal, setLoanPrincipal] = useState<number>(500000);
  const [loanInterestRate, setLoanInterestRate] = useState<number>(10.0);
  const [loanTenureMonths, setLoanTenureMonths] = useState<number>(60);
  const [extraPrepayment, setExtraPrepayment] = useState<number>(1000);

  // --------------------------------------------------------------------------
  // 2. GOAL CALCULATOR STATE
  // Defaults set to P3 test vector: Target ₹10,00,000 @ 12% / 60 months => ~12,12x
  // --------------------------------------------------------------------------
  const [goalName, setGoalName] = useState<string>('Dream Goal');
  const [targetAmount, setTargetAmount] = useState<number>(1000000);
  const [goalMonths, setGoalMonths] = useState<number>(60);
  const [goalReturnRate, setGoalReturnRate] = useState<number>(12.0);
  const [enableInflation, setEnableInflation] = useState<boolean>(false);
  const [inflationRate, setInflationRate] = useState<number>(6.0);
  const [targetDateStr, setTargetDateStr] = useState<string>(() => {
    const d = new Date('2026-10-20');
    d.setMonth(d.getMonth() + 60);
    return d.toISOString().substring(0, 10);
  });

  // --------------------------------------------------------------------------
  // 3. COMPOUND / SIP CALCULATOR STATE
  // Defaults set to P3 test vector: ₹5,000/mo @ 12% / 120 months => ~11,61,695
  // --------------------------------------------------------------------------
  const [compoundMode, setCompoundMode] = useState<'sip' | 'lump_sum'>('sip');
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState<number>(5000);
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(10000);
  const [compoundReturnRate, setCompoundReturnRate] = useState<number>(12.0);
  const [compoundYears, setCompoundYears] = useState<number>(10);
  const [compoundFreq, setCompoundFreq] = useState<number>(4); // Quarterly

  // Unique accessible IDs for form inputs
  const loanPrincipalId = useId();
  const loanRateId = useId();
  const loanTenureId = useId();
  const extraPrepayId = useId();

  const goalNameId = useId();
  const targetAmountId = useId();
  const targetDateId = useId();
  const goalRateId = useId();
  const inflationCheckId = useId();
  const inflationRateId = useId();

  const compoundAmountId = useId();
  const compoundRateId = useId();
  const compoundYearsId = useId();
  const compoundFreqId = useId();

  // Load user plan and obligations
  const loadPlanContext = async () => {
    try {
      const [obList, plan] = await Promise.all([
        repository.getObligations(mode),
        repository.getBudgetPlan('2026-10'),
      ]);
      setObligations(obList);
      setBudgetPlan(plan);
      const demoPersona = repository.getDemoPersona();
      if (demoPersona === 'rohan' || demoPersona === 'aarav') {
        setActivePersona(demoPersona);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadPlanContext();
  }, [mode]);

  // Derived plan values
  const monthlyIncome = profile?.monthlyIncome || (mode === 'student' ? 12000 : 38000);
  const fixedTotal = obligations.reduce((sum, o) => sum + o.amount, 0);
  const existingDebtMonthly = obligations
    .filter((o) => o.type === 'emi')
    .reduce((sum, o) => sum + o.amount, 0);
  const savingsTarget = budgetPlan?.savingsTarget || (mode === 'student' ? 2400 : 5000);
  const planDisposable = budgetPlan?.discretionaryTotal ?? Math.max(0, monthlyIncome - fixedTotal - savingsTarget);
  const currentDti = monthlyIncome > 0 ? Math.round((existingDebtMonthly / monthlyIncome) * 100) : 0;

  // Handler to switch persona quickly to test "Can I afford this?" for Rohan vs Aarav
  const handleSwitchPersona = async (personaId: 'rohan' | 'aarav') => {
    await repository.seedPersona(personaId);
    setMode(personaId === 'rohan' ? 'earner' : 'student');
    setActivePersona(personaId);
    await loadPlanContext();
    await refreshData();
    showToast(`Switched plan context to ${personaId === 'rohan' ? 'Rohan Sharma (Earner)' : 'Aarav Verma (Student)'}`);
  };

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --------------------------------------------------------------------------
  // ENGINE CALCULATIONS (ALL MATH VIA /src/engine ONLY)
  // --------------------------------------------------------------------------

  // 1. EMI Calculations
  const emiResult = useMemo(() => {
    return calculateEMI(loanPrincipal, loanInterestRate, loanTenureMonths);
  }, [loanPrincipal, loanInterestRate, loanTenureMonths]);

  const prepaymentResult = useMemo(() => {
    return calculatePrepaymentImpact(
      loanPrincipal,
      loanInterestRate,
      loanTenureMonths,
      extraPrepayment
    );
  }, [loanPrincipal, loanInterestRate, loanTenureMonths, extraPrepayment]);

  const affordabilityResult: AffordabilityResult = useMemo(() => {
    return evaluateAffordability({
      emi: emiResult.monthlyEMI,
      disposable: planDisposable,
      monthlyIncome,
      existingDebtMonthly,
      existingObligationsMonthly: fixedTotal,
    });
  }, [emiResult.monthlyEMI, planDisposable, monthlyIncome, existingDebtMonthly, fixedTotal]);

  // 2. Goal SIP Calculations
  const goalResult = useMemo(() => {
    return calculateGoalSIP({
      targetAmount,
      annualReturnRate: goalReturnRate,
      tenureMonths: goalMonths,
      inflationRate: enableInflation ? inflationRate : undefined,
    });
  }, [targetAmount, goalReturnRate, goalMonths, enableInflation, inflationRate]);

  const goalFitResult: GoalFitResult = useMemo(() => {
    return evaluateGoalPlanFit(
      goalResult.requiredMonthlySIP,
      planDisposable,
      goalResult.inflationAdjustedTarget
    );
  }, [goalResult.requiredMonthlySIP, planDisposable, goalResult.inflationAdjustedTarget]);

  // 3. Compound / SIP Calculations
  const sipResult = useMemo(() => {
    return calculateSIP(sipMonthlyAmount, compoundReturnRate, compoundYears);
  }, [sipMonthlyAmount, compoundReturnRate, compoundYears]);

  const compoundResult = useMemo(() => {
    return calculateCompoundInterest(
      lumpSumAmount,
      compoundReturnRate,
      compoundYears,
      compoundFreq,
      inflationRate
    );
  }, [lumpSumAmount, compoundReturnRate, compoundYears, compoundFreq, inflationRate]);

  const earlyInvestingComparison = useMemo(() => {
    const amount = compoundMode === 'sip' ? sipMonthlyAmount : lumpSumAmount;
    return compareEarlyInvesting(
      compoundMode,
      amount,
      compoundReturnRate,
      compoundYears,
      compoundFreq,
      5 // 5 years delay comparison
    );
  }, [compoundMode, sipMonthlyAmount, lumpSumAmount, compoundReturnRate, compoundYears, compoundFreq]);

  // Handlers for action buttons
  const handleAddObligation = async () => {
    try {
      await repository.addObligation({
        title: `Loan EMI (₹${loanPrincipal.toLocaleString('en-IN')})`,
        type: 'emi',
        amount: emiResult.monthlyEMI,
        dueDay: 10,
        isPaid: false,
        emiDetails: {
          principal: loanPrincipal,
          annualInterestRate: loanInterestRate,
          tenureMonths: loanTenureMonths,
          remainingMonths: loanTenureMonths,
          remainingPrincipal: loanPrincipal,
        },
      });
      await loadPlanContext();
      await refreshData();
      showToast(t('calculators.emi.obligation_added'));
    } catch {
      showToast('Error adding obligation.');
    }
  };

  const handleSaveGoal = async () => {
    try {
      await addGoal({
        titleKey: 'goals.items.custom_goal',
        customTitle: goalName || 'My Goal',
        targetAmount: goalResult.inflationAdjustedTarget,
        currentAmount: 0,
        targetDate: targetDateStr,
        category: 'asset',
        priority: 'high',
      });
      await loadPlanContext();
      await refreshData();
      showToast(t('calculators.goal.goal_saved'));
    } catch {
      showToast('Error saving goal.');
    }
  };

  // Sync date input with months
  const handleDateChange = (dateVal: string) => {
    setTargetDateStr(dateVal);
    if (!dateVal) return;
    const selected = new Date(dateVal);
    const now = new Date('2026-10-20');
    const diffMonths = Math.max(
      1,
      Math.round((selected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
    );
    setGoalMonths(diffMonths);
  };

  const handleGoalMonthsChange = (m: number) => {
    const safeM = Math.max(1, m);
    setGoalMonths(safeM);
    const d = new Date('2026-10-20');
    d.setMonth(d.getMonth() + safeM);
    setTargetDateStr(d.toISOString().substring(0, 10));
  };

  // Pie chart data for EMI
  const emiPieData = [
    { name: t('calculators.emi.principal_ratio'), value: loanPrincipal, color: '#0F414A' },
    { name: t('calculators.emi.interest_ratio'), value: emiResult.totalInterest, color: '#7F0303' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-50 bg-ink text-paper px-4 py-3 rounded-btn shadow-xl border border-sand/30 flex items-center gap-2.5 text-xs sm:text-sm animate-bounce"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Plan Connection Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/15 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center text-paper">
              <Calculator className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-fraunces font-bold text-ink">
              {t('calculators.title')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-ink/75 mt-1">
            {t('calculators.subtitle')}
          </p>
        </div>

        {/* Live Plan Connection Pill & Persona Switcher */}
        <div className="p-3 bg-sand/30 border border-ink/15 rounded-card flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-ink/70 font-semibold uppercase text-[10px]">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>{t('calculators.connected_plan_banner')}</span>
            </div>
            <div className="font-bold text-ink text-sm font-fraunces">
              {profile?.name || (mode === 'student' ? 'Aarav Verma' : 'Rohan Sharma')}
            </div>
            <div className="text-ink/75">
              {t('calculators.plan_disposable')}:{' '}
              <span className="font-bold text-ink">{formatINR(planDisposable)}</span>
            </div>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-ink/15 pt-2 sm:pt-0 sm:pl-3 flex flex-col gap-1">
            <span className="text-[10px] text-ink/60 uppercase font-semibold">
              {t('calculators.switch_persona_preview')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSwitchPersona('rohan')}
                className={`touch-target px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  activePersona === 'rohan'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'bg-paper text-ink/80 border border-ink/20 hover:border-ink'
                }`}
                title="Rohan: ₹38k salary, ₹14.8k disposable"
              >
                Rohan (₹38k)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPersona('aarav')}
                className={`touch-target px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  activePersona === 'aarav'
                    ? 'bg-ink text-paper shadow-xs'
                    : 'bg-paper text-ink/80 border border-ink/20 hover:border-ink'
                }`}
                title="Aarav: ₹12k pocket, ₹4k disposable"
              >
                Aarav (₹12k)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink/15 gap-2 sm:gap-4 overflow-x-auto no-scrollbar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={calcTab === 'emi'}
          onClick={() => {
            setCalcTab('emi');
            setIsHowCalculatedOpen(false);
          }}
          className={`touch-target py-2.5 px-4 font-inter text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            calcTab === 'emi'
              ? 'border-ink text-ink bg-sand/30 rounded-t-btn shadow-xs'
              : 'border-transparent text-ink/70 hover:text-ink hover:bg-sand/15'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{t('calculators.tab_emi')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={calcTab === 'goal'}
          onClick={() => {
            setCalcTab('goal');
            setIsHowCalculatedOpen(false);
          }}
          className={`touch-target py-2.5 px-4 font-inter text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            calcTab === 'goal'
              ? 'border-ink text-ink bg-sand/30 rounded-t-btn shadow-xs'
              : 'border-transparent text-ink/70 hover:text-ink hover:bg-sand/15'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>{t('calculators.tab_goal')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={calcTab === 'compound'}
          onClick={() => {
            setCalcTab('compound');
            setIsHowCalculatedOpen(false);
          }}
          className={`touch-target py-2.5 px-4 font-inter text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            calcTab === 'compound'
              ? 'border-ink text-ink bg-sand/30 rounded-t-btn shadow-xs'
              : 'border-transparent text-ink/70 hover:text-ink hover:bg-sand/15'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{t('calculators.tab_compound')}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1. EMI CALCULATOR TOOL                                               */}
      {/* ==================================================================== */}
      {calcTab === 'emi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-6 p-5 rounded-card bg-paper border border-ink/15 space-y-5 shadow-xs">
              <div>
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  {t('calculators.emi.title')}
                </h2>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t('calculators.emi.subtitle')}
                </p>
              </div>

              {/* Loan Amount */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  <label htmlFor={loanPrincipalId}>{t('calculators.emi.loan_amount')}</label>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-xs text-ink/60">₹</span>
                    <input
                      type="number"
                      min="1000"
                      max="10000000"
                      step="1000"
                      value={loanPrincipal}
                      onChange={(e) => setLoanPrincipal(Math.max(0, Number(e.target.value)))}
                      className="w-28 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                    />
                  </div>
                </div>
                <input
                  id={loanPrincipalId}
                  type="range"
                  min="10000"
                  max="5000000"
                  step="10000"
                  value={loanPrincipal}
                  onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink/60 mt-0.5 font-mono">
                  <span>{formatINR(10000)}</span>
                  <span>{formatINR(5000000)}</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  <label htmlFor={loanRateId}>{t('calculators.emi.interest_rate')}</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="0.1"
                      max="40"
                      step="0.1"
                      value={loanInterestRate}
                      onChange={(e) => setLoanInterestRate(Math.max(0, Number(e.target.value)))}
                      className="w-20 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                    />
                    <span className="text-xs text-ink/70">%</span>
                  </div>
                </div>
                <input
                  id={loanRateId}
                  type="range"
                  min="5"
                  max="24"
                  step="0.25"
                  value={loanInterestRate}
                  onChange={(e) => setLoanInterestRate(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink/60 mt-0.5">
                  <span>{t('calculators.emi.rate_hint_gold')}</span>
                  <span>{t('calculators.emi.rate_hint_personal')}</span>
                </div>
              </div>

              {/* Tenure Months */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  <label htmlFor={loanTenureId}>
                    {t('calculators.emi.tenure')} ({loanTenureMonths} {t('calculators.emi.tenure_months')})
                  </label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="1"
                      max="360"
                      step="1"
                      value={loanTenureMonths}
                      onChange={(e) => setLoanTenureMonths(Math.max(1, Number(e.target.value)))}
                      className="w-20 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                    />
                    <span className="text-xs text-ink/70">Mo</span>
                  </div>
                </div>
                <input
                  id={loanTenureId}
                  type="range"
                  min="6"
                  max="120"
                  step="6"
                  value={loanTenureMonths}
                  onChange={(e) => setLoanTenureMonths(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink/60 mt-0.5">
                  <span>6 Mo (0.5 Yr)</span>
                  <span>60 Mo (5 Yrs)</span>
                  <span>120 Mo (10 Yrs)</span>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-5 rounded-card bg-sand/30 border border-ink/15 space-y-4 shadow-xs">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                    {t('calculators.emi.monthly_emi')}
                  </span>
                  <div
                    data-testid="emi-output"
                    className="text-3xl sm:text-4xl font-fraunces font-bold text-ink mt-1 tracking-tight"
                  >
                    {formatINR(emiResult.monthlyEMI)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink/15">
                  <div>
                    <span className="text-xs text-ink/70 block">
                      {t('calculators.emi.total_interest')}
                    </span>
                    <span className="text-lg font-fraunces font-bold text-accent">
                      {formatINR(emiResult.totalInterest)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-ink/70 block">
                      {t('calculators.emi.total_payable')}
                    </span>
                    <span className="text-lg font-fraunces font-bold text-ink">
                      {formatINR(emiResult.totalPayment)}
                    </span>
                  </div>
                </div>

                {/* Pie Chart & Ratio */}
                <div className="pt-3 border-t border-ink/15">
                  <div className="flex justify-between text-xs font-semibold text-ink/80 mb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-ink inline-block" />
                      {t('calculators.emi.principal_ratio')}: {emiResult.principalRatio}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
                      {t('calculators.emi.interest_ratio')}: {emiResult.interestRatio}%
                    </span>
                  </div>

                  {/* Accessible Visual Donut / Pie */}
                  <div
                    role="region"
                    aria-label="Loan Principal vs Total Interest Breakdown Donut Chart"
                    className="h-44 w-full flex items-center justify-center"
                  >
                    <div className="sr-only">
                      Loan breakdown summary: Principal is {formatINR(loanPrincipal)}, Total Interest is {formatINR(emiResult.totalInterest)} ({emiResult.interestRatio}% of total payment), with monthly EMI of {formatINR(emiResult.monthlyEMI)}.
                    </div>
                    <div className="w-full h-full" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={emiPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {emiPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [formatINR(Number(value) || 0), 'Amount']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Affordability & Add Obligation Action Buttons */}
                <div className="pt-3 border-t border-ink/15 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => setHasCheckedAffordability(true)}
                    className="touch-target flex-1 py-2.5 px-4 rounded-btn font-semibold text-xs sm:text-sm bg-ink text-paper hover:bg-ink-light active:bg-ink-dark transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-sand" />
                    <span>{t('calculators.affordability.button')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddObligation}
                    className="touch-target flex-1 py-2.5 px-4 rounded-btn font-semibold text-xs sm:text-sm bg-sand text-ink hover:bg-sand-light active:bg-sand-dark transition-colors flex items-center justify-center gap-2 border border-ink/20 shadow-xs"
                  >
                    <BookmarkCheck className="w-4 h-4 text-ink" />
                    <span>{t('calculators.emi.add_obligation_btn')}</span>
                  </button>
                </div>
              </div>

              {/* Affordability Check Panel (Shows clear yes/careful/no with reason) */}
              {(hasCheckedAffordability || affordabilityResult.status) && (
                <div
                  data-testid="affordability-panel"
                  className={`p-4 rounded-card border transition-all ${
                    affordabilityResult.status === 'yes'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : affordabilityResult.status === 'careful'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base font-fraunces">
                    {affordabilityResult.status === 'yes' && (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{t('calculators.affordability.yes_title')}</span>
                      </>
                    )}
                    {affordabilityResult.status === 'careful' && (
                      <>
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>{t('calculators.affordability.careful_title')}</span>
                      </>
                    )}
                    {affordabilityResult.status === 'no' && (
                      <>
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>{t('calculators.affordability.no_title')}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm mt-1.5 leading-relaxed font-inter">
                    {t(affordabilityResult.reasonKey, {
                      ...affordabilityResult.reasonParams,
                      emi: formatINR(emiResult.monthlyEMI),
                      disposable: formatINR(planDisposable),
                      diff: formatINR(Math.abs(emiResult.monthlyEMI - planDisposable)),
                      remaining: formatINR(affordabilityResult.metrics.remainingDisposable),
                    }) || affordabilityResult.reason}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-black/10 text-xs">
                    <div>
                      <span className="text-[11px] opacity-75 block">EMI vs Disposable</span>
                      <span className="font-bold font-mono">
                        {affordabilityResult.metrics.emiToDisposableRatio}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] opacity-75 block">Projected DTI</span>
                      <span className="font-bold font-mono">
                        {affordabilityResult.metrics.projectedDebtToIncome}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] opacity-75 block">Buffer Left</span>
                      <span className="font-bold font-mono">
                        {formatINR(affordabilityResult.metrics.remainingDisposable)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prepayment What-If Section */}
          <div className="p-5 rounded-card bg-paper border border-ink/15 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-3">
              <div>
                <h3 className="font-fraunces font-bold text-base text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>{t('calculators.emi.prepayment_title')}</span>
                </h3>
                <p className="text-xs text-ink/70">
                  {t('calculators.emi.prepayment_subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor={extraPrepayId} className="text-xs font-semibold text-ink/80">
                  {t('calculators.emi.extra_per_month')}:
                </label>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-xs text-ink/60">₹</span>
                  <input
                    id={extraPrepayId}
                    type="number"
                    min="0"
                    max="100000"
                    step="500"
                    value={extraPrepayment}
                    onChange={(e) => setExtraPrepayment(Math.max(0, Number(e.target.value)))}
                    className="w-24 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-btn bg-sand/20 border border-ink/10">
                <span className="text-xs text-ink/70 block uppercase font-semibold">
                  {t('calculators.emi.months_saved')}
                </span>
                <span className="text-2xl font-fraunces font-bold text-ink block mt-0.5">
                  {prepaymentResult.monthsSaved} Mo
                </span>
                <span className="text-[11px] text-ink/60 mt-0.5 block">
                  {loanTenureMonths} Mo &rarr; {prepaymentResult.newTenureMonths} Mo
                </span>
              </div>

              <div className="p-3.5 rounded-btn bg-sand/20 border border-ink/10">
                <span className="text-xs text-ink/70 block uppercase font-semibold">
                  {t('calculators.emi.interest_saved')}
                </span>
                <span className="text-2xl font-fraunces font-bold text-accent block mt-0.5">
                  {formatINR(prepaymentResult.interestSaved)}
                </span>
                <span className="text-[11px] text-ink/60 mt-0.5 block">
                  Direct savings in your pocket
                </span>
              </div>

              <div className="p-3.5 rounded-btn bg-sand/20 border border-ink/10">
                <span className="text-xs text-ink/70 block uppercase font-semibold">
                  {t('calculators.emi.new_duration')}
                </span>
                <span className="text-2xl font-fraunces font-bold text-ink block mt-0.5">
                  {Math.round((prepaymentResult.newTenureMonths / 12) * 10) / 10} Yrs
                </span>
                <span className="text-[11px] text-ink/60 mt-0.5 block">
                  Accelerated debt-free milestone
                </span>
              </div>
            </div>
          </div>

          {/* Amortization Table (Collapsible) */}
          <div className="p-4 sm:p-5 rounded-card bg-paper border border-ink/15 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-fraunces font-bold text-base text-ink">
                  {t('calculators.emi.schedule_title')}
                </h3>
                <span className="text-xs text-ink/70">
                  Month-by-month principal & interest breakdown
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAmortizationOpen(!isAmortizationOpen)}
                className="touch-target px-3 py-1.5 rounded-btn bg-sand/30 border border-ink/15 hover:bg-sand/50 text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors"
                aria-expanded={isAmortizationOpen}
              >
                <span>
                  {isAmortizationOpen
                    ? t('calculators.emi.hide_schedule')
                    : t('calculators.emi.show_schedule', { months: loanTenureMonths })}
                </span>
                {isAmortizationOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {isAmortizationOpen && (
              <div className="mt-4 border-t border-ink/15 pt-3 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-ink/15 text-ink/70 uppercase">
                      <th scope="col" className="py-2">{t('calculators.emi.month')}</th>
                      <th scope="col" className="py-2">{t('calculators.emi.principal')}</th>
                      <th scope="col" className="py-2">{t('calculators.emi.interest')}</th>
                      <th scope="col" className="py-2">{t('calculators.emi.total_payment')}</th>
                      <th scope="col" className="py-2 text-right">{t('calculators.emi.balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 font-mono">
                    {(showAllAmortization
                      ? emiResult.amortizationSchedule
                      : emiResult.amortizationSummary
                    ).map((row) => (
                      <tr key={row.month} className="hover:bg-sand/20">
                        <td className="py-2 font-medium">{row.month}</td>
                        <td className="py-2">{formatINR(row.principalPart)}</td>
                        <td className="py-2 text-accent">{formatINR(row.interestPart)}</td>
                        <td className="py-2">{formatINR(row.totalPayment)}</td>
                        <td className="py-2 text-right font-medium">
                          {formatINR(row.remainingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {emiResult.amortizationSchedule.length > 12 && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllAmortization(!showAllAmortization)}
                      className="touch-target px-3 py-1.5 text-xs font-semibold text-ink underline hover:text-accent"
                    >
                      {showAllAmortization
                        ? 'Show first 12 months only'
                        : `Show all ${emiResult.amortizationSchedule.length} months`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. GOAL SIP CALCULATOR TOOL                                          */}
      {/* ==================================================================== */}
      {calcTab === 'goal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-6 p-5 rounded-card bg-paper border border-ink/15 space-y-5 shadow-xs">
              <div>
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  {t('calculators.goal.title')}
                </h2>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t('calculators.goal.subtitle')}
                </p>
              </div>

              {/* Goal Name */}
              <div>
                <label
                  htmlFor={goalNameId}
                  className="block text-xs font-semibold uppercase text-ink/80 mb-1.5"
                >
                  {t('calculators.goal.goal_name')}
                </label>
                <input
                  id={goalNameId}
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder={t('calculators.goal.goal_name_placeholder')}
                  className="w-full px-3 py-2 border border-ink/20 rounded-btn text-sm text-ink focus:border-ink bg-paper"
                />
              </div>

              {/* Target Amount */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  <label htmlFor={targetAmountId}>{t('calculators.goal.target_amount')}</label>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-xs text-ink/60">₹</span>
                    <input
                      type="number"
                      min="5000"
                      max="50000000"
                      step="5000"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(Math.max(0, Number(e.target.value)))}
                      className="w-28 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                    />
                  </div>
                </div>
                <input
                  id={targetAmountId}
                  type="range"
                  min="50000"
                  max="5000000"
                  step="25000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink/60 mt-0.5 font-mono">
                  <span>{formatINR(50000)}</span>
                  <span>{formatINR(5000000)}</span>
                </div>
              </div>

              {/* Target Date & Months */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={targetDateId}
                    className="block text-xs font-semibold uppercase text-ink/80 mb-1.5"
                  >
                    {t('calculators.goal.target_date')}
                  </label>
                  <input
                    id={targetDateId}
                    type="date"
                    value={targetDateStr}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-ink/30 rounded text-xs font-mono text-ink focus:border-ink bg-paper"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold uppercase text-ink/80 mb-1.5">
                    <span>Tenure ({goalMonths} Mo)</span>
                    <span className="font-mono text-ink font-bold">
                      {Math.round((goalMonths / 12) * 10) / 10} Yrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="180"
                    step="6"
                    value={goalMonths}
                    onChange={(e) => handleGoalMonthsChange(Number(e.target.value))}
                    className="w-full accent-ink cursor-pointer"
                  />
                </div>
              </div>

              {/* Expected Return Rate */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  <label htmlFor={goalRateId}>{t('calculators.goal.expected_return')}</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="0.5"
                      value={goalReturnRate}
                      onChange={(e) => setGoalReturnRate(Math.max(0, Number(e.target.value)))}
                      className="w-20 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                    />
                    <span className="text-xs text-ink/70">%</span>
                  </div>
                </div>
                <input
                  id={goalRateId}
                  type="range"
                  min="4"
                  max="20"
                  step="0.5"
                  value={goalReturnRate}
                  onChange={(e) => setGoalReturnRate(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-ink/60 mt-0.5">
                  <span>7% (FD / Debt)</span>
                  <span>12% (Nifty Index)</span>
                  <span>15% (Equity)</span>
                </div>
              </div>

              {/* Optional Inflation Adjustment */}
              <div className="p-3.5 rounded-btn bg-sand/20 border border-ink/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={inflationCheckId}
                    className="text-xs font-semibold text-ink cursor-pointer flex items-center gap-2"
                  >
                    <input
                      id={inflationCheckId}
                      type="checkbox"
                      checked={enableInflation}
                      onChange={(e) => setEnableInflation(e.target.checked)}
                      className="w-4 h-4 rounded text-ink accent-ink cursor-pointer"
                    />
                    <span>{t('calculators.goal.inflation_toggle')}</span>
                  </label>
                  {enableInflation && (
                    <span className="font-mono text-xs font-bold text-accent">
                      {inflationRate}% p.a.
                    </span>
                  )}
                </div>

                {enableInflation && (
                  <div>
                    <input
                      id={inflationRateId}
                      type="range"
                      min="3"
                      max="10"
                      step="0.5"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-ink/60 mt-0.5">
                      <span>4% (Low)</span>
                      <span>6% (Standard India CPI)</span>
                      <span>8% (Lifestyle)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-5 rounded-card bg-sand/30 border border-ink/15 space-y-4 shadow-xs">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                    {t('calculators.goal.required_sip')}
                  </span>
                  <div
                    data-testid="goal-sip-output"
                    className="text-3xl sm:text-4xl font-fraunces font-bold text-ink mt-1 tracking-tight"
                  >
                    {formatINR(goalResult.requiredMonthlySIP)} / mo
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink/15">
                  <div>
                    <span className="text-xs text-ink/70 block">
                      {t('calculators.goal.inflation_adjusted_target')}
                    </span>
                    <span className="text-lg font-fraunces font-bold text-ink">
                      {formatINR(goalResult.inflationAdjustedTarget)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-ink/70 block">
                      {t('calculators.goal.total_invested')}
                    </span>
                    <span className="text-lg font-fraunces font-bold text-ink">
                      {formatINR(goalResult.totalInvested)}
                    </span>
                  </div>
                </div>

                {/* Plan Fit Check Card */}
                <div
                  data-testid="goal-fit-panel"
                  className={`p-4 rounded-btn border text-xs sm:text-sm ${
                    goalFitResult.status === 'yes'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : goalFitResult.status === 'careful'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold font-fraunces text-sm">
                    {goalFitResult.status === 'yes' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t('calculators.goal.fit_yes')}</span>
                      </>
                    )}
                    {goalFitResult.status === 'careful' && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{t('calculators.goal.fit_careful')}</span>
                      </>
                    )}
                    {goalFitResult.status === 'no' && (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{t('calculators.goal.fit_no')}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 leading-relaxed text-xs">
                    {t(goalFitResult.reasonKey, {
                      ...goalFitResult.reasonParams,
                      sip: formatINR(goalResult.requiredMonthlySIP),
                      disposable: formatINR(planDisposable),
                      diff: formatINR(Math.abs(goalResult.requiredMonthlySIP - planDisposable)),
                      remaining: formatINR(goalFitResult.metrics.remainingDisposable),
                    }) || goalFitResult.reason}
                  </p>
                </div>

                {/* Save as Goal Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveGoal}
                    className="w-full touch-target py-2.5 px-4 rounded-btn font-semibold text-xs sm:text-sm bg-ink text-paper hover:bg-ink-light active:bg-ink-dark transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4 text-sand" />
                    <span>{t('calculators.goal.save_goal_btn')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. COMPOUND / SIP CALCULATOR TOOL                                    */}
      {/* ==================================================================== */}
      {calcTab === 'compound' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-6 p-5 rounded-card bg-paper border border-ink/15 space-y-5 shadow-xs">
              <div>
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  {t('calculators.compound.title')}
                </h2>
                <p className="text-xs text-ink/70 mt-0.5">
                  {t('calculators.compound.subtitle')}
                </p>
              </div>

              {/* Mode Toggle: Monthly SIP vs Lump Sum */}
              <div className="flex bg-sand/30 p-1 rounded-btn border border-ink/15">
                <button
                  type="button"
                  onClick={() => setCompoundMode('sip')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
                    compoundMode === 'sip'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-ink/75 hover:text-ink'
                  }`}
                >
                  {t('calculators.compound.mode_sip')}
                </button>
                <button
                  type="button"
                  onClick={() => setCompoundMode('lump_sum')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-btn transition-colors ${
                    compoundMode === 'lump_sum'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-ink/75 hover:text-ink'
                  }`}
                >
                  {t('calculators.compound.mode_lump_sum')}
                </button>
              </div>

              {/* Investment Amount */}
              {compoundMode === 'sip' ? (
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                    <label htmlFor={compoundAmountId}>
                      {t('calculators.compound.monthly_amount')}
                    </label>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-xs text-ink/60">₹</span>
                      <input
                        type="number"
                        min="500"
                        max="500000"
                        step="500"
                        value={sipMonthlyAmount}
                        onChange={(e) => setSipMonthlyAmount(Math.max(0, Number(e.target.value)))}
                        className="w-28 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                      />
                    </div>
                  </div>
                  <input
                    id={compoundAmountId}
                    type="range"
                    min="500"
                    max="100000"
                    step="500"
                    value={sipMonthlyAmount}
                    onChange={(e) => setSipMonthlyAmount(Number(e.target.value))}
                    className="w-full accent-ink cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-ink/60 mt-0.5 font-mono">
                    <span>{formatINR(500)}</span>
                    <span>{formatINR(100000)}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                    <label htmlFor={compoundAmountId}>
                      {t('calculators.compound.lump_sum_amount')}
                    </label>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-xs text-ink/60">₹</span>
                      <input
                        type="number"
                        min="1000"
                        max="10000000"
                        step="1000"
                        value={lumpSumAmount}
                        onChange={(e) => setLumpSumAmount(Math.max(0, Number(e.target.value)))}
                        className="w-28 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                      />
                    </div>
                  </div>
                  <input
                    id={compoundAmountId}
                    type="range"
                    min="5000"
                    max="1000000"
                    step="5000"
                    value={lumpSumAmount}
                    onChange={(e) => setLumpSumAmount(Number(e.target.value))}
                    className="w-full accent-ink cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-ink/60 mt-0.5 font-mono">
                    <span>{formatINR(5000)}</span>
                    <span>{formatINR(1000000)}</span>
                  </div>
                </div>
              )}

              {/* Return Rate */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  <label htmlFor={compoundRateId}>{t('calculators.compound.annual_rate')}</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="0.25"
                      value={compoundReturnRate}
                      onChange={(e) => setCompoundReturnRate(Math.max(0, Number(e.target.value)))}
                      className="w-20 px-2 py-1 border border-ink/30 rounded text-right font-fraunces font-bold text-sm text-ink focus:border-ink"
                    />
                    <span className="text-xs text-ink/70">%</span>
                  </div>
                </div>
                <input
                  id={compoundRateId}
                  type="range"
                  min="4"
                  max="24"
                  step="0.5"
                  value={compoundReturnRate}
                  onChange={(e) => setCompoundReturnRate(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
              </div>

              {/* Tenure Years & Compounding Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold uppercase text-ink/80 mb-1.5">
                    <label htmlFor={compoundYearsId}>{t('calculators.compound.years')}</label>
                    <span className="font-mono text-ink font-bold">{compoundYears} Yrs</span>
                  </div>
                  <input
                    id={compoundYearsId}
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={compoundYears}
                    onChange={(e) => setCompoundYears(Math.max(1, Number(e.target.value)))}
                    className="w-full accent-ink cursor-pointer"
                  />
                </div>

                <div>
                  <label
                    htmlFor={compoundFreqId}
                    className="block text-xs font-semibold uppercase text-ink/80 mb-1.5"
                  >
                    {t('calculators.compound.frequency')}
                  </label>
                  <select
                    id={compoundFreqId}
                    value={compoundFreq}
                    onChange={(e) => setCompoundFreq(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-btn bg-paper border border-ink/30 text-ink text-xs focus:border-ink"
                  >
                    <option value={12}>{t('calculators.compound.freq_monthly')}</option>
                    <option value={4}>{t('calculators.compound.freq_quarterly')}</option>
                    <option value={2}>{t('calculators.compound.freq_half_yearly')}</option>
                    <option value={1}>{t('calculators.compound.freq_annual')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-5 rounded-card bg-sand/30 border border-ink/15 space-y-4 shadow-xs">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                    {t('calculators.compound.maturity_value')}
                  </span>
                  <div
                    data-testid="compound-maturity-output"
                    className="text-3xl sm:text-4xl font-fraunces font-bold text-ink mt-1 tracking-tight"
                  >
                    {formatINR(
                      compoundMode === 'sip' ? sipResult.totalValue : compoundResult.maturityAmount
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink/15">
                  <div>
                    <span className="text-xs text-ink/70 block">
                      {t('calculators.compound.total_invested')}
                    </span>
                    <span className="text-lg font-fraunces font-bold text-ink">
                      {formatINR(
                        compoundMode === 'sip'
                          ? sipResult.investedAmount
                          : lumpSumAmount
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-ink/70 block">
                      {t('calculators.compound.wealth_gained')}
                    </span>
                    <span className="text-lg font-fraunces font-bold text-emerald-800">
                      {formatINR(
                        compoundMode === 'sip'
                          ? sipResult.estimatedReturns
                          : compoundResult.interestEarned
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Power of Starting Early Comparison Card */}
              <div className="p-4 sm:p-5 rounded-card bg-paper border border-ink/15 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h3 className="font-fraunces font-bold text-sm sm:text-base text-ink">
                      {t('calculators.compound.early_title')}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-sand/40 text-ink">
                    Start Now vs. 5 Yrs Later
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-btn bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                      {t('calculators.compound.start_now')} ({compoundYears} Yrs)
                    </span>
                    <span className="font-fraunces font-bold text-lg text-emerald-950 block mt-0.5">
                      {formatINR(earlyInvestingComparison.startNow.maturityValue)}
                    </span>
                    <span className="text-[10px] text-emerald-700 block">
                      Gain: {formatINR(earlyInvestingComparison.startNow.wealthGain)}
                    </span>
                  </div>

                  <div className="p-3 rounded-btn bg-sand/20 border border-ink/15">
                    <span className="text-[11px] font-semibold text-ink/70 uppercase block">
                      {t('calculators.compound.start_delayed')} ({Math.max(0, compoundYears - 5)} Yrs)
                    </span>
                    <span className="font-fraunces font-bold text-lg text-ink block mt-0.5">
                      {formatINR(earlyInvestingComparison.startDelayed.maturityValue)}
                    </span>
                    <span className="text-[10px] text-ink/60 block">
                      Gain: {formatINR(earlyInvestingComparison.startDelayed.wealthGain)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-btn bg-sand/30 border border-ink/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-accent block">
                      {t('calculators.compound.cost_of_delay')}
                    </span>
                    <span className="font-fraunces font-bold text-sm text-accent">
                      {formatINR(earlyInvestingComparison.costOfDelay)} foregone
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-ink">
                      {earlyInvestingComparison.multiplier}x Multiplier
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart: Wealth Trajectory */}
          <div
            role="region"
            aria-label="Early vs Delayed Investing Wealth Trajectory Chart"
            className="p-4 sm:p-5 rounded-card bg-paper border border-ink/15 shadow-xs"
          >
            <h3 className="font-fraunces font-bold text-base text-ink mb-3">
              {t('calculators.compound.chart_title')}
            </h3>
            <div className="sr-only">
              Compound growth trajectory summary: Starting now yields {formatINR(earlyInvestingComparison.startNow.maturityValue)} after {earlyInvestingComparison.yearlyTrajectory.length} years. Starting 5 years later yields {formatINR(earlyInvestingComparison.startDelayed.maturityValue)}, a cost of delay of {formatINR(earlyInvestingComparison.costOfDelay)}.
            </div>
            <div className="h-64 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earlyInvestingComparison.yearlyTrajectory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0d7cd" />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(y) => `Yr ${y}`}
                    stroke="#0F414A"
                    fontSize={11}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      formatINR(val, { compact: true, includeSymbol: false })
                    }
                    stroke="#0F414A"
                    fontSize={11}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatINR(Number(value) || 0),
                      name === 'wealthNow'
                        ? 'Total Wealth (Start Now)'
                        : name === 'wealthDelayed'
                          ? 'Total Wealth (5 Yrs Later)'
                          : 'Capital Invested',
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="wealthNow"
                    name="Start Now (Wealth)"
                    stroke="#0F414A"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wealthDelayed"
                    name="Start 5 Yrs Later"
                    stroke="#7F0303"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="investedNow"
                    name="Capital Invested"
                    stroke="#D8BA98"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* "HOW IS THIS CALCULATED?" ACCORDION (Plain Language + Formula)      */}
      {/* ==================================================================== */}
      <div className="rounded-card bg-paper border border-ink/15 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsHowCalculatedOpen(!isHowCalculatedOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-sand/20 transition-colors"
          aria-expanded={isHowCalculatedOpen}
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-accent" />
            <div>
              <h3 className="font-fraunces font-bold text-base text-ink">
                {t('calculators.accordion.title')}
              </h3>
              <p className="text-xs text-ink/70">
                {t('calculators.accordion.plain_title')} &amp; {t('calculators.accordion.formula_title')}
              </p>
            </div>
          </div>
          {isHowCalculatedOpen ? (
            <ChevronUp className="w-5 h-5 text-ink/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-ink/60" />
          )}
        </button>

        {isHowCalculatedOpen && (
          <div className="px-5 pb-5 border-t border-ink/15 space-y-4 pt-4 text-xs sm:text-sm">
            {calcTab === 'emi' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-ink uppercase text-xs tracking-wider">
                    {t('calculators.accordion.plain_title')}
                  </h4>
                  <p className="text-ink/80 mt-1 leading-relaxed">
                    {t('calculators.accordion.emi_plain')}
                  </p>
                </div>

                <div className="p-3.5 rounded-btn bg-sand/30 border border-ink/15 space-y-1.5 font-mono">
                  <div className="text-xs text-ink/60 uppercase font-semibold">
                    {t('calculators.accordion.formula_title')}
                  </div>
                  <div className="text-sm font-bold text-ink">
                    {t('calculators.accordion.emi_formula')}
                  </div>
                  <div className="text-[11px] text-ink/75 pt-1 border-t border-ink/10">
                    {t('calculators.accordion.emi_where')}
                  </div>
                </div>
              </div>
            )}

            {calcTab === 'goal' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-ink uppercase text-xs tracking-wider">
                    {t('calculators.accordion.plain_title')}
                  </h4>
                  <p className="text-ink/80 mt-1 leading-relaxed">
                    {t('calculators.accordion.goal_plain')}
                  </p>
                </div>

                <div className="p-3.5 rounded-btn bg-sand/30 border border-ink/15 space-y-1.5 font-mono">
                  <div className="text-xs text-ink/60 uppercase font-semibold">
                    {t('calculators.accordion.formula_title')}
                  </div>
                  <pre className="text-xs font-bold text-ink whitespace-pre-wrap font-mono">
                    {t('calculators.accordion.goal_formula')}
                  </pre>
                  <div className="text-[11px] text-ink/75 pt-1 border-t border-ink/10">
                    {t('calculators.accordion.goal_where')}
                  </div>
                </div>
              </div>
            )}

            {calcTab === 'compound' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-ink uppercase text-xs tracking-wider">
                    {t('calculators.accordion.plain_title')}
                  </h4>
                  <p className="text-ink/80 mt-1 leading-relaxed">
                    {t('calculators.accordion.compound_plain')}
                  </p>
                </div>

                <div className="p-3.5 rounded-btn bg-sand/30 border border-ink/15 space-y-1.5 font-mono">
                  <div className="text-xs text-ink/60 uppercase font-semibold">
                    {t('calculators.accordion.formula_title')}
                  </div>
                  <pre className="text-xs font-bold text-ink whitespace-pre-wrap font-mono">
                    {t('calculators.accordion.compound_formula')}
                  </pre>
                  <div className="text-[11px] text-ink/75 pt-1 border-t border-ink/10">
                    {t('calculators.accordion.compound_where')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
