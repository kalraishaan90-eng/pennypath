import React, { useState, useEffect, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { repository } from '../../repository';
import { AppContext } from '../../context/AppContext';
import {
  financeBuildPlan,
  rebalanceCaps,
  calculateEmiPayoff,
  explainCapsWeighting,
  RebalanceCapItem,
  formatINR,
  parseINR,
  emi,
} from '../../engine';
import { Obligation, ObligationType, BudgetPlan, PlanLine, UserProfile } from '../../types';
import {
  Sliders,
  Wallet,
  PiggyBank,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Save,
  HelpCircle,
  Calendar,
  CreditCard,
  ArrowRight,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { CategoryIcon } from '../common/CategoryIcon';

export interface PlanScreenProps {
  isModal?: boolean;
  onClose?: () => void;
  initialIncome?: number;
  initialSavingsTarget?: number;
  initialFixedObligations?: number;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({
  isModal = false,
  onClose,
  initialIncome,
  initialSavingsTarget,
  initialFixedObligations,
}) => {
  const { t } = useTranslation();
  const appCtx = React.useContext(AppContext);
  const refreshData = appCtx?.refreshData || (async () => {});

  // Baseline data from repository
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [savedPlan, setSavedPlan] = useState<BudgetPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const initialValuesRef = React.useRef({
    income: initialIncome ?? 38000,
    savingsTarget: initialSavingsTarget ?? 10000,
    fixedObligations: initialFixedObligations ?? 18000,
  });

  // Draft "What-If" state
  const [draftIncome, setDraftIncome] = useState<number>(initialIncome ?? 38000);
  const [draftSavingsTarget, setDraftSavingsTarget] = useState<number>(initialSavingsTarget ?? 10000);
  const [draftFixedObligations, setDraftFixedObligations] = useState<number>(initialFixedObligations ?? 18000);
  const [draftCaps, setDraftCaps] = useState<RebalanceCapItem[]>([]);
  const [capsInitialized, setCapsInitialized] = useState<boolean>(false);

  // UI accordion and modal states
  const [showWhyCaps, setShowWhyCaps] = useState<boolean>(false);
  const [showObligationsManager, setShowObligationsManager] = useState<boolean>(false);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);
  const [isAddingObligation, setIsAddingObligation] = useState<boolean>(false);

  // Obligation form state
  const [obTitle, setObTitle] = useState<string>('');
  const [obType, setObType] = useState<ObligationType>('emi');
  const [obAmount, setObAmount] = useState<string>('');
  const [obDueDay, setObDueDay] = useState<number>(5);
  const [obPrincipal, setObPrincipal] = useState<string>('');
  const [obRate, setObRate] = useState<string>('');
  const [obTenureMonths, setObTenureMonths] = useState<string>('');
  const [obRemainingMonths, setObRemainingMonths] = useState<string>('');

  // Load profile, obligations, and plan
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [prof, obs, existingPlan] = await Promise.all([
        repository.getProfile(),
        repository.getObligations(),
        repository.getBudgetPlan('2026-10'),
      ]);

      setProfile(prof);
      setObligations(obs);
      setSavedPlan(existingPlan);

      const computedFixed = obs.reduce((sum, o) => sum + o.amount, 0);

      // Determine initial numbers
      const inc = initialIncome ?? existingPlan?.income ?? prof?.monthlyIncome ?? 38000;
      const sav = initialSavingsTarget ?? existingPlan?.savingsTarget ?? 10000;
      const fix = initialFixedObligations ?? existingPlan?.fixedTotal ?? computedFixed;

      setDraftIncome(inc);
      setDraftSavingsTarget(sav);
      setDraftFixedObligations(fix);
      initialValuesRef.current = { income: inc, savingsTarget: sav, fixedObligations: fix };

      // Compute initial caps from finance engine
      const initPlan = financeBuildPlan({
        income: inc,
        savingsTarget: sav,
        fixedObligations: fix,
        mode: prof?.mode || 'earner',
      });

      setDraftCaps(
        initPlan.caps.map((c) => ({
          category: c.category,
          amount: c.amount,
          type: c.type,
          share: c.share,
          locked: false,
        }))
      );
      setCapsInitialized(true);
    } catch (err) {
      console.error('Failed to load initial plan data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Sync draftFixedObligations whenever obligations list changes (unless initial fixed was explicitly passed)
  useEffect(() => {
    if (obligations.length > 0 && initialFixedObligations === undefined) {
      const total = obligations.reduce((sum, o) => sum + o.amount, 0);
      setDraftFixedObligations(total);
    }
  }, [obligations, initialFixedObligations]);

  // LIVE BINDING to engine.buildPlan
  // Computes disposable D, shortfall, variable budget, and fixes
  const livePlanResult = useMemo(() => {
    return financeBuildPlan({
      income: draftIncome,
      savingsTarget: draftSavingsTarget,
      fixedObligations: draftFixedObligations,
      mode: profile?.mode || 'earner',
    });
  }, [draftIncome, draftSavingsTarget, draftFixedObligations, profile?.mode]);

  // When disposable changes or plan recomputes, ensure caps stay strictly aligned to variableBudget
  useEffect(() => {
    if (!capsInitialized) return;

    if (livePlanResult.variableBudget <= 0) {
      setDraftCaps((prev) => prev.map((c) => ({ ...c, amount: 0, share: 0 })));
    } else {
      const currentCapsSum = draftCaps.reduce((sum, c) => sum + c.amount, 0);
      if (currentCapsSum !== livePlanResult.variableBudget) {
        // Rebalance to match new disposable budget using engine
        if (draftCaps.length === 0) {
          setDraftCaps(
            livePlanResult.caps.map((c) => ({
              category: c.category,
              amount: c.amount,
              type: c.type,
              share: c.share,
              locked: false,
            }))
          );
        } else {
          const rebalanced = rebalanceCaps({
            caps: draftCaps,
            targetIndex: 0,
            newAmount: draftCaps[0]?.amount || 0,
            totalBudget: livePlanResult.variableBudget,
          });
          setDraftCaps(rebalanced);
        }
      }
    }
  }, [livePlanResult.variableBudget, capsInitialized]);

  // "What-if" detection: has user changed anything from baseline plan?
  const isWhatIfMode = useMemo(() => {
    const base = initialValuesRef.current;
    if (draftIncome !== base.income) return true;
    if (draftSavingsTarget !== base.savingsTarget) return true;
    if (draftFixedObligations !== base.fixedObligations) return true;
    return false;
  }, [draftIncome, draftSavingsTarget, draftFixedObligations]);

  // Slider change handler with engine rebalancing
  const handleSliderChange = (index: number, newAmount: number) => {
    if (livePlanResult.variableBudget <= 0) return;
    const rebalanced = rebalanceCaps({
      caps: draftCaps,
      targetIndex: index,
      newAmount,
      totalBudget: livePlanResult.variableBudget,
    });
    setDraftCaps(rebalanced);
  };

  // Toggle category lock
  const handleToggleLock = (index: number) => {
    setDraftCaps((prev) =>
      prev.map((c, i) => (i === index ? { ...c, locked: !c.locked } : c))
    );
  };

  // Apply engine corrective fix
  const handleApplyFix = (fix: (typeof livePlanResult.fixes)[0]) => {
    switch (fix.type) {
      case 'lower_savings':
      case 'reduce_savings':
        if (typeof fix.suggestedValue === 'number') {
          setDraftSavingsTarget(fix.suggestedValue);
        }
        break;
      case 'extend_goal':
      case 'extend_timeline':
        // Extend goal horizon: lowers savings target to feasible amount
        if (typeof fix.suggestedValue === 'number') {
          setDraftSavingsTarget(fix.suggestedValue);
        } else {
          const feasible = Math.max(0, draftIncome - draftFixedObligations);
          setDraftSavingsTarget(feasible);
        }
        break;
      case 'trim_obligations':
      case 'reduce_fixed':
        if (typeof fix.suggestedValue === 'number') {
          setDraftFixedObligations(fix.suggestedValue);
        } else if (typeof fix.effect === 'number') {
          setDraftFixedObligations(Math.max(0, draftFixedObligations - fix.effect));
        }
        break;
      case 'raise_income':
      case 'increase_income':
        if (typeof fix.suggestedValue === 'number') {
          setDraftIncome(fix.suggestedValue);
        } else if (typeof fix.effect === 'number') {
          setDraftIncome(draftIncome + fix.effect);
        }
        break;
      default:
        break;
    }
  };

  // Reset What-If changes back to baseline plan
  const handleDiscardWhatIf = () => {
    const base = initialValuesRef.current;
    setDraftIncome(base.income);
    setDraftSavingsTarget(base.savingsTarget);
    setDraftFixedObligations(base.fixedObligations);
  };

  // Save Plan: Creates budget_plan + plan_lines and updates Home
  const handleSavePlan = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const planId = savedPlan?.id || `bp-${Date.now()}`;
      const month = '2026-10';

      const planLines: PlanLine[] = draftCaps.map((c, idx) => ({
        id: `pl-${planId}-${idx + 1}`,
        planId,
        category: c.category,
        cap: c.amount,
        type: c.type,
        locked: c.locked,
      }));

      const budgetPlan: BudgetPlan = {
        id: planId,
        month,
        income: draftIncome,
        fixedTotal: draftFixedObligations,
        savingsTarget: draftSavingsTarget,
        discretionaryTotal: livePlanResult.disposable,
        dailyDiscretionary: livePlanResult.dailyDiscretionary || Math.floor(livePlanResult.disposable / 30),
        shortfall: livePlanResult.shortfall,
        hasShortfall: livePlanResult.hasShortfall ?? livePlanResult.shortfall > 0,
        createdAt: new Date().toISOString(),
        status: 'active',
        lines: planLines,
      };

      // 1. Save budget plan and plan lines to repository
      await repository.saveBudgetPlan(budgetPlan, planLines);

      // 2. Update user income in profile
      await repository.updateIncome(profile?.mode || 'earner', draftIncome);

      // 3. Save obligations
      await repository.saveObligations(obligations);

      setSavedPlan(budgetPlan);
      setSaveSuccess(true);

      // 4. Trigger context refresh so Home updates immediately
      await refreshData();

      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Failed to save plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Obligations Manager Actions
  const handleOpenAddObligation = () => {
    setEditingObligation(null);
    setObTitle('');
    setObType('emi');
    setObAmount('');
    setObDueDay(5);
    setObPrincipal('');
    setObRate('10.5');
    setObTenureMonths('36');
    setObRemainingMonths('24');
    setIsAddingObligation(true);
  };

  const handleOpenEditObligation = (ob: Obligation) => {
    setEditingObligation(ob);
    setObTitle(ob.title);
    setObType(ob.type);
    setObAmount(ob.amount.toString());
    setObDueDay(ob.dueDay);
    if (ob.emiDetails) {
      setObPrincipal(ob.emiDetails.principal.toString());
      setObRate(ob.emiDetails.annualInterestRate.toString());
      setObTenureMonths(ob.emiDetails.tenureMonths.toString());
      setObRemainingMonths(ob.emiDetails.remainingMonths.toString());
    } else {
      setObPrincipal('');
      setObRate('');
      setObTenureMonths('');
      setObRemainingMonths('');
    }
    setIsAddingObligation(true);
  };

  const handleSaveObligation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseINR(obAmount);
    if (!obTitle.trim() || amountNum <= 0) return;

    let emiDetails: Obligation['emiDetails'] = undefined;
    if (obType === 'emi') {
      const princ = parseINR(obPrincipal) || amountNum * 12;
      const rate = parseFloat(obRate) || 10;
      const tenure = parseInt(obTenureMonths, 10) || 36;
      const rem = parseInt(obRemainingMonths, 10) || 24;
      emiDetails = {
        principal: princ,
        annualInterestRate: rate,
        tenureMonths: tenure,
        remainingMonths: rem,
        remainingPrincipal: Math.round(princ * (rem / tenure)),
      };
    }

    if (editingObligation) {
      const updated: Obligation = {
        ...editingObligation,
        title: obTitle.trim(),
        type: obType,
        amount: amountNum,
        dueDay: Math.max(1, Math.min(31, obDueDay)),
        emiDetails,
      };
      await repository.updateObligation(updated);
      const nextList = obligations.map((o) => (o.id === updated.id ? updated : o));
      setObligations(nextList);
      setDraftFixedObligations(nextList.reduce((s, o) => s + o.amount, 0));
    } else {
      const newOb = await repository.addObligation({
        title: obTitle.trim(),
        type: obType,
        amount: amountNum,
        dueDay: Math.max(1, Math.min(31, obDueDay)),
        emiDetails,
      });
      const nextList = [...obligations, newOb];
      setObligations(nextList);
      setDraftFixedObligations(nextList.reduce((s, o) => s + o.amount, 0));
    }

    setIsAddingObligation(false);
    setEditingObligation(null);
  };

  const handleDeleteObligation = async (id: string) => {
    await repository.deleteObligation(id);
    const nextList = obligations.filter((o) => o.id !== id);
    setObligations(nextList);
    setDraftFixedObligations(nextList.reduce((s, o) => s + o.amount, 0));
  };

  // Plain-language explanation for "Why these caps?"
  const capsExplanation = useMemo(() => {
    return explainCapsWeighting(draftCaps, livePlanResult.variableBudget);
  }, [draftCaps, livePlanResult.variableBudget]);

  const capsSum = draftCaps.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className={`w-full max-w-5xl mx-auto ${isModal ? 'p-2 sm:p-4' : 'px-3 sm:px-6 py-6'} text-ink`}>
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-ink/15 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center shadow-sm shrink-0">
            <Sliders className="w-5 h-5 text-sky" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-fraunces text-ink tracking-tight">
              {t('plan.title', 'Monthly Financial Plan')}
            </h1>
            <p className="text-xs sm:text-sm text-ink/70">
              {t('plan.desc', 'Adjust your envelopes, targets, and savings allocation to restore balance.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {isWhatIfMode && (
            <button
              type="button"
              onClick={handleDiscardWhatIf}
              className="touch-target px-3 py-1.5 rounded-btn border border-ink/20 text-ink/80 hover:text-ink hover:bg-sand/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('plan.discard_changes', 'Discard')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSavePlan}
            disabled={isSaving}
            className="touch-target px-4 py-2 rounded-btn bg-ink hover:bg-ink-light active:bg-ink-dark text-paper text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            aria-label={t('plan.save_plan', 'Save Plan')}
          >
            <Save className="w-4 h-4 text-sky" />
            <span>{isSaving ? t('plan.saving', 'Saving...') : t('plan.save_plan', 'Save Plan')}</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="touch-target px-3 py-1.5 rounded-btn bg-sand/30 hover:bg-sand/50 text-ink text-xs font-semibold flex items-center gap-1 ml-1"
            >
              <span>{t('plan.return_home', 'Back to Dashboard')}</span>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div
          role="status"
          className="mt-4 p-3.5 rounded-card bg-emerald-50 border border-emerald-500/30 text-emerald-900 flex items-center gap-2.5 shadow-xs animate-fadeIn"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">
            {t('plan.plan_saved', 'Plan saved successfully! Home dashboard updated.')}
          </span>
        </div>
      )}

      {/* 6. What-If Mode Banner */}
      {isWhatIfMode && (
        <div
          role="region"
          aria-label="What-If Mode"
          className="mt-4 p-3.5 rounded-card bg-sand/25 border border-sand-dark/30 text-ink flex items-start gap-3 shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-ink uppercase tracking-wider block text-[11px]">
              {t('plan.what_if_title', 'What-If Simulation Active')}
            </span>
            <p className="text-ink/80 mt-0.5">
              {t('plan.what_if_desc', 'Temporary changes are local and never affect your live ledger or dashboard until confirmed.')}
            </p>
          </div>
        </div>
      )}

      {/* 2. Top: Three Big Inputs Bound Live to engine.buildPlan */}
      <section className="mt-6" aria-label="Plan Inputs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Input 1: Monthly Income */}
          <div className="p-4 rounded-card bg-paper border border-ink/15 shadow-xs flex flex-col justify-between focus-within:ring-2 focus-within:ring-ink transition-all">
            <div className="flex items-center justify-between text-xs font-medium text-ink/75 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-ink" />
                {t('plan.income', 'Monthly Income')}
              </span>
              <span className="text-[10px] uppercase font-bold text-ink/50">Input 1</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold font-fraunces text-ink/60">₹</span>
              <input
                type="number"
                aria-label={t('plan.income', 'Monthly Income')}
                value={draftIncome}
                onChange={(e) => setDraftIncome(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-xl sm:text-2xl font-bold font-fraunces text-ink bg-transparent outline-hidden border-b border-dashed border-ink/20 focus:border-ink"
                step="1000"
              />
            </div>
            <p className="text-[11px] text-ink/60 mt-2 truncate">
              {t('plan.income_hint', 'Take-home salary & net earnings')}
            </p>
          </div>

          {/* Input 2: Savings Target */}
          <div className="p-4 rounded-card bg-paper border border-ink/15 shadow-xs flex flex-col justify-between focus-within:ring-2 focus-within:ring-ink transition-all">
            <div className="flex items-center justify-between text-xs font-medium text-ink/75 mb-1.5">
              <span className="flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-emerald-700" />
                {t('plan.savings_target', 'Savings Target')}
              </span>
              <span className="text-[10px] uppercase font-bold text-ink/50">Input 2</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold font-fraunces text-ink/60">₹</span>
              <input
                type="number"
                aria-label={t('plan.savings_target', 'Savings Target')}
                value={draftSavingsTarget}
                onChange={(e) => setDraftSavingsTarget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-xl sm:text-2xl font-bold font-fraunces text-ink bg-transparent outline-hidden border-b border-dashed border-ink/20 focus:border-ink"
                step="500"
              />
            </div>
            <p className="text-[11px] text-ink/60 mt-2 truncate">
              {t('plan.savings_hint', 'Goal contribution & emergency fund')}
            </p>
          </div>

          {/* Input 3: Fixed Obligations (Auto-summed, tap to edit) */}
          <div
            onClick={() => setShowObligationsManager(true)}
            data-testid="fixed-obligations-card"
            className="p-4 rounded-card bg-paper border border-ink/15 shadow-xs flex flex-col justify-between cursor-pointer hover:border-ink hover:bg-sand/10 transition-all group"
            role="button"
            tabIndex={0}
            aria-label={`${t('plan.fixed_obligations', 'Fixed Obligations')}: ${formatINR(draftFixedObligations)}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setShowObligationsManager(true);
            }}
          >
            <div className="flex items-center justify-between text-xs font-medium text-ink/75 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-accent" />
                {t('plan.fixed_obligations', 'Fixed Obligations')}
              </span>
              <span className="text-[10px] uppercase font-bold text-accent group-hover:underline flex items-center gap-1">
                <Edit2 className="w-3 h-3" />
                {t('plan.tap_to_edit', 'Tap to edit')}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-fraunces text-ink">
                {formatINR(draftFixedObligations)}
              </span>
            </div>
            <p className="text-[11px] text-ink/60 mt-2 truncate">
              {obligations.length} commitments • {t('plan.fixed_hint', 'Auto-summed from obligations list')}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Result Panel: Disposable D vs Shortfall */}
      <section className="mt-6" aria-label="Result Panel">
        {livePlanResult.disposable >= 0 ? (
          // Positive Disposable State
          <div className="p-4 sm:p-5 rounded-card bg-sand/30 border border-sand-dark/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all animate-fadeIn">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
                  {t('plan.disposable', 'Disposable Allowance (D)')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Balanced
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-fraunces text-ink mt-1">
                {formatINR(livePlanResult.disposable)}
              </div>
              <p className="text-xs text-ink/75 mt-1">
                Leaves <span className="font-semibold text-ink">{formatINR(Math.floor(livePlanResult.disposable / 30))}/day</span> for everyday expenses.
              </p>
            </div>

            <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-ink/10 text-xs">
              <span className="text-ink/60">Variable Budget Cap:</span>
              <span className="font-bold text-sm sm:text-base font-fraunces text-ink">
                {formatINR(livePlanResult.variableBudget)}
              </span>
            </div>
          </div>
        ) : (
          // Shortfall State: Styled strictly in maroon (#7F0303 / accent)
          <div
            role="alert"
            className="p-4 sm:p-5 rounded-card bg-accent/10 border-l-4 border-accent text-accent-dark shadow-xs transition-all animate-fadeIn"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-fraunces text-accent">
                    {t('plan.shortfall', 'Projected Shortfall')}: {formatINR(livePlanResult.shortfall)}
                  </h3>
                  <p className="text-xs font-medium text-ink/80 mt-0.5">
                    {t('plan.shortfall_banner', 'Expenditure exceeds income. Apply an engine fix below to balance your draft plan.')}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent text-paper shrink-0">
                Action Needed
              </span>
            </div>

            {/* Engine's Fixes as Cards with Numeric Effects */}
            <div className="mt-4 pt-3 border-t border-accent/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-2.5">
                {t('plan.fixes_title', 'Engine Recommended Fixes')} ({livePlanResult.fixes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {livePlanResult.fixes.map((fix, idx) => (
                  <div
                    key={`${fix.type}-${idx}`}
                    onClick={() => handleApplyFix(fix)}
                    aria-label={`Apply Fix ${idx + 1}`}
                    className="p-3 rounded-card bg-paper border border-accent/30 hover:border-accent hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                        {fix.description}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent shrink-0">
                        Fix {idx + 1}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-ink/10 text-xs">
                      <span className="text-[11px] text-ink/60">
                        {typeof fix.effect === 'number'
                          ? fix.type === 'extend_goal'
                            ? `Multiplier: ~${fix.effect}x`
                            : `Effect: ${formatINR(fix.effect)}`
                          : ''}
                      </span>
                      <span className="text-accent font-semibold text-[11px] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{t('plan.apply_fix', 'Apply to Draft')}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Category Caps as Editable Sliders (when D >= 0) */}
      {livePlanResult.disposable >= 0 && (
        <section className="mt-6" aria-label="Category Caps">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-ink/10 gap-1.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-fraunces text-ink">
                {t('plan.category_caps_title', 'Envelope Allocations & Strategy')}
              </h2>
              <p className="text-xs text-ink/70">
                {t('plan.rebalanced_notice', 'Editing one slider rebalances others proportionally. Total always equals disposable income.')}
              </p>
            </div>
            <div className="text-xs font-semibold text-ink self-start sm:self-auto flex items-center gap-2">
              <span className="text-ink/60">Allocated Sum:</span>
              <span className="font-bold font-fraunces text-sm">
                {formatINR(capsSum)} / {formatINR(livePlanResult.disposable)}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {draftCaps.map((cap, idx) => (
              <div
                key={`${cap.category}-${idx}`}
                className={`p-3.5 rounded-card border transition-all ${
                  cap.locked
                    ? 'bg-sand/15 border-ink/30 ring-1 ring-ink/10'
                    : 'bg-paper border-ink/15 hover:border-ink/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-sand/30 flex items-center justify-center shrink-0 text-ink">
                      <CategoryIcon name={cap.category} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink truncate text-sm">
                          {cap.category}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            cap.type === 'need'
                              ? 'bg-ink/10 text-ink'
                              : 'bg-sand text-ink/80'
                          }`}
                        >
                          {cap.type === 'need' ? 'Need' : 'Want'}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink/60">
                        {Math.round((cap.share || 0) * 100)}% of variable budget
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm sm:text-base font-bold font-fraunces text-ink min-w-[70px] text-right">
                      {formatINR(cap.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleLock(idx)}
                      className={`p-1.5 rounded-btn border transition-colors ${
                        cap.locked
                          ? 'bg-ink text-paper border-ink shadow-xs'
                          : 'bg-paper text-ink/50 border-ink/20 hover:text-ink hover:bg-sand/30'
                      }`}
                      title={cap.locked ? t('plan.locked', 'Locked') : t('plan.unlocked', 'Unlocked')}
                      aria-label={`${cap.category} is ${cap.locked ? 'Locked' : 'Unlocked'}`}
                    >
                      {cap.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Slider Input */}
                <div className="mt-2.5 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={livePlanResult.disposable}
                    value={cap.amount}
                    disabled={cap.locked}
                    onChange={(e) => handleSliderChange(idx, parseInt(e.target.value, 10) || 0)}
                    aria-label={`${cap.category} cap slider`}
                    className="w-full accent-ink h-1.5 bg-ink/15 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. "Why these caps?" Expandable Section */}
      <section className="mt-6 border-t border-ink/10 pt-4" aria-label="Why These Caps">
        <button
          type="button"
          onClick={() => setShowWhyCaps((v) => !v)}
          className="w-full touch-target flex items-center justify-between p-3.5 rounded-card bg-sand/20 hover:bg-sand/30 border border-sand-dark/30 text-ink text-xs sm:text-sm font-semibold transition-colors"
          aria-expanded={showWhyCaps}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-ink/75" />
            <span>{t('plan.why_caps', 'Why these caps?')}</span>
          </div>
          {showWhyCaps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showWhyCaps && (
          <div className="mt-3 p-4 rounded-card bg-paper border border-ink/15 shadow-xs text-xs space-y-3 animate-fadeIn">
            <div className="pb-2 border-b border-ink/10">
              <h4 className="font-bold text-sm text-ink font-fraunces">
                {capsExplanation.headline}
              </h4>
              <p className="text-ink/80 mt-1 leading-relaxed">
                {capsExplanation.summary}
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className="px-2 py-0.5 rounded bg-ink/10 text-ink font-semibold text-[11px]">
                  Needs Weight: {capsExplanation.needsWeight}
                </span>
                <span className="px-2 py-0.5 rounded bg-sand text-ink/80 font-semibold text-[11px]">
                  Wants Weight: {capsExplanation.wantsWeight}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-ink/70 block uppercase text-[10px] tracking-wider">
                Category Weighting Rationale (Based on last 3 months)
              </span>
              {capsExplanation.breakdown.map((item, idx) => (
                <div
                  key={`${item.category}-${idx}`}
                  className="p-2.5 rounded-btn bg-sand/15 border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{item.category}</span>
                    <span className="text-ink/60">({item.sharePercent}% share)</span>
                  </div>
                  <span className="text-ink/75">{item.explanation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. Obligations Manager Modal / Drawer */}
      {showObligationsManager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="obligations-modal-title"
        >
          <div className="absolute inset-0" onClick={() => setShowObligationsManager(false)} />

          <div className="relative w-full max-w-2xl bg-paper rounded-card border border-ink/20 shadow-2xl p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-ink/10">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-accent" />
                <div>
                  <h3 id="obligations-modal-title" className="text-lg font-bold font-fraunces text-ink">
                    {t('plan.obligations_title', 'Obligations Manager')}
                  </h3>
                  <p className="text-xs text-ink/70">
                    Total: <span className="font-bold text-ink">{formatINR(draftFixedObligations)}</span> / month
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowObligationsManager(false)}
                className="touch-target p-1.5 rounded-full text-ink/60 hover:text-ink hover:bg-ink/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Obligations */}
            <div className="mt-4 space-y-2.5">
              {obligations.map((ob) => {
                const emiInfo = ob.type === 'emi' && ob.emiDetails
                  ? calculateEmiPayoff(ob.emiDetails.remainingMonths)
                  : null;

                return (
                  <div
                    key={ob.id}
                    className="p-3 rounded-card border border-ink/15 bg-paper flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-sm">{ob.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-sand/50 text-ink">
                          {ob.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink/65 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Due day: {ob.dueDay}th</span>
                        {emiInfo && (
                          <span className="text-accent font-medium">
                            {emiInfo.remainingMonths} months left • Payoff: {emiInfo.payoffDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold font-fraunces text-sm text-ink">
                        {formatINR(ob.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditObligation(ob)}
                        className="p-1.5 rounded-btn hover:bg-sand/30 text-ink/70 hover:text-ink"
                        title="Edit Obligation"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteObligation(ob.id)}
                        className="p-1.5 rounded-btn hover:bg-accent/10 text-accent/70 hover:text-accent"
                        title="Delete Obligation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Obligation Trigger */}
            {!isAddingObligation && (
              <div className="mt-4 pt-3 border-t border-ink/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleOpenAddObligation}
                  className="touch-target px-3.5 py-2 rounded-btn bg-accent hover:bg-accent-light text-paper text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('plan.add_obligation', 'Add Obligation')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowObligationsManager(false)}
                  className="touch-target px-3.5 py-2 rounded-btn bg-ink text-paper text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            )}

            {/* Add / Edit Form */}
            {isAddingObligation && (
              <form onSubmit={handleSaveObligation} className="mt-4 p-4 rounded-card bg-sand/20 border border-sand-dark/30 space-y-3 text-xs">
                <h4 className="font-bold text-sm text-ink font-fraunces">
                  {editingObligation ? t('plan.edit_obligation', 'Edit Obligation') : t('plan.add_obligation', 'Add Obligation')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-ink/80 mb-1">
                      {t('plan.obligation_title', 'Title / Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={obTitle}
                      onChange={(e) => setObTitle(e.target.value)}
                      placeholder="e.g. Bike EMI, Rent, Chit Fund"
                      className="w-full p-2 rounded-btn border border-ink/20 bg-paper text-ink"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-ink/80 mb-1">
                      {t('plan.obligation_type', 'Obligation Type')}
                    </label>
                    <select
                      value={obType}
                      onChange={(e) => setObType(e.target.value as ObligationType)}
                      className="w-full p-2 rounded-btn border border-ink/20 bg-paper text-ink"
                    >
                      <option value="emi">EMI / Loan</option>
                      <option value="rent">Rent / PG</option>
                      <option value="chit">Chit Fund</option>
                      <option value="subscription">Subscription</option>
                      <option value="insurance">Insurance</option>
                      <option value="utilities">Utilities</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-ink/80 mb-1">
                      {t('plan.obligation_amount', 'Monthly Amount (₹)')}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={obAmount}
                      onChange={(e) => setObAmount(e.target.value)}
                      placeholder="3500"
                      className="w-full p-2 rounded-btn border border-ink/20 bg-paper text-ink"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-ink/80 mb-1">
                      {t('plan.due_day', 'Due Day of Month (1-31)')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={obDueDay}
                      onChange={(e) => setObDueDay(parseInt(e.target.value, 10) || 1)}
                      className="w-full p-2 rounded-btn border border-ink/20 bg-paper text-ink"
                    />
                  </div>
                </div>

                {/* Optional Loan / EMI Fields */}
                {obType === 'emi' && (
                  <div className="pt-2 border-t border-ink/10 space-y-2">
                    <span className="font-semibold text-ink text-[11px] block">
                      Optional Loan Details (for payoff forecasting)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-ink/70">Principal (₹)</label>
                        <input
                          type="number"
                          value={obPrincipal}
                          onChange={(e) => setObPrincipal(e.target.value)}
                          placeholder="90000"
                          className="w-full p-1.5 rounded-btn border border-ink/20 bg-paper text-xs text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-ink/70">Rate (% p.a.)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={obRate}
                          onChange={(e) => setObRate(e.target.value)}
                          placeholder="11"
                          className="w-full p-1.5 rounded-btn border border-ink/20 bg-paper text-xs text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-ink/70">Tenure (Months)</label>
                        <input
                          type="number"
                          value={obTenureMonths}
                          onChange={(e) => setObTenureMonths(e.target.value)}
                          placeholder="36"
                          className="w-full p-1.5 rounded-btn border border-ink/20 bg-paper text-xs text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-ink/70">Remaining (Mos)</label>
                        <input
                          type="number"
                          value={obRemainingMonths}
                          onChange={(e) => setObRemainingMonths(e.target.value)}
                          placeholder="22"
                          className="w-full p-1.5 rounded-btn border border-ink/20 bg-paper text-xs text-ink"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingObligation(false);
                      setEditingObligation(null);
                    }}
                    className="touch-target px-3 py-1.5 rounded-btn border border-ink/20 text-ink/70 hover:text-ink text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="touch-target px-4 py-1.5 rounded-btn bg-ink text-paper text-xs font-semibold"
                  >
                    Save Commitment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
