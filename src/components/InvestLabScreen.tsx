import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { formatINR } from '../engine/currency';
import {
  emergencyFundTarget,
  allocationFor,
  sipFutureValue,
  riskScore,
} from '../engine/finance';
import { repository } from '../repository';
import {
  fetchIndexFundSnapshots,
  getCachedIndexFunds,
  IndexFundSnapshot,
  MarketSnapshotResult,
} from '../services/mfIndexFunds';
import {
  RISK_QUIZ_QUESTIONS,
  BAND_EXPLANATIONS,
} from '../data/riskQuizData';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  GraduationCap,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

export const InvestLabScreen: React.FC = () => {
  const { t } = useTranslation();
  const { mode, profile, envelopes, goals } = useApp();

  // --------------------------------------------------------------------------
  // 1. EMERGENCY FUND READINESS & GATE CALCULATION
  // --------------------------------------------------------------------------
  // Monthly essential expenses (need envelopes sum, or 50% of monthly income fallback)
  const needEnvelopesTotal = envelopes
    .filter((e) => e.type === 'need')
    .reduce((sum, e) => sum + e.allocated, 0);

  const monthlyEssentials =
    needEnvelopesTotal > 0
      ? needEnvelopesTotal
      : Math.round((profile?.monthlyIncome || 30000) * 0.5);

  // Default savings from user's safety goal (or fallback 0 for users with no safety net)
  const initialSafetyGoalAmount = useMemo(() => {
    const safetyGoal = goals.find(
      (g) => g.category === 'safety' || g.titleKey?.includes('emergency')
    );
    return safetyGoal ? safetyGoal.currentAmount : 0;
  }, [goals]);

  const [emergencySavings, setEmergencySavings] = useState<number>(initialSafetyGoalAmount);

  // Sync if goals load after initial mount
  useEffect(() => {
    if (initialSafetyGoalAmount > 0 && emergencySavings === 0) {
      setEmergencySavings(initialSafetyGoalAmount);
    }
  }, [initialSafetyGoalAmount]);

  const emergencyMonthsCovered =
    monthlyEssentials > 0 ? emergencySavings / monthlyEssentials : 0;

  // Gate Condition: if emergency fund < 1 month of essentials
  const isGated = emergencyMonthsCovered < 1.0;

  // Savings plan computed from engine.emergencyFundTarget
  const savingsPlan = useMemo(() => {
    return emergencyFundTarget(monthlyEssentials, mode);
  }, [monthlyEssentials, mode]);

  // Suggested monthly savings allocation to build safety net (approx 20% of monthly income or 30% of essentials)
  const suggestedMonthlySavings = Math.max(
    1000,
    Math.round((profile?.monthlyIncome || 30000) * 0.2)
  );
  const monthsTo1MonthMilestone = Math.max(
    1,
    Math.ceil(Math.max(0, monthlyEssentials - emergencySavings) / suggestedMonthlySavings)
  );

  // --------------------------------------------------------------------------
  // 2. RISK QUIZ STATE (6 Questions, One per screen, Result with band & explanation)
  // --------------------------------------------------------------------------
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([3, 3, 3, 3, 3, 3]);
  const [storedBand, setStoredBand] = useState<'conservative' | 'balanced' | 'growth'>('balanced');
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState<boolean>(false);

  // Load stored risk profile on mount
  useEffect(() => {
    async function loadRisk() {
      try {
        const rp = await repository.getRiskProfile();
        if (rp) {
          setStoredBand(rp.band);
          setHasCompletedQuiz(true);
          if (Array.isArray(rp.answers?.scores) && rp.answers.scores.length === 6) {
            setQuizAnswers(rp.answers.scores);
          }
        }
      } catch (err) {
        console.error('Error loading risk profile:', err);
      }
    }
    loadRisk();
  }, []);

  const handleSelectOption = (score: number) => {
    const updated = [...quizAnswers];
    updated[currentQuestionIndex] = score;
    setQuizAnswers(updated);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < RISK_QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Quiz complete: calculate score & band
      const calculated = riskScore(quizAnswers);
      let band: 'conservative' | 'balanced' | 'growth' = 'balanced';
      if (calculated.score <= 35) {
        band = 'conservative';
      } else if (calculated.score > 70) {
        band = 'growth';
      }

      setStoredBand(band);
      setHasCompletedQuiz(true);
      setQuizActive(false);

      // Store in repository & risk_profiles
      try {
        await repository.saveRiskProfile({
          user_id: profile?.id || 'current_user',
          score: calculated.score,
          band,
          answers: {
            scores: quizAnswers,
            horizon: quizAnswers[0],
            incomeStability: quizAnswers[1],
            reactionDrop: quizAnswers[2],
            goalType: quizAnswers[3],
            experience: quizAnswers[4],
            dependents: quizAnswers[5],
          },
        });
      } catch (err) {
        console.error('Failed to save risk profile:', err);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setQuizActive(true);
  };

  // --------------------------------------------------------------------------
  // 3. ILLUSTRATIVE ALLOCATION (engine.allocationFor -> donut + table)
  // --------------------------------------------------------------------------
  const [horizonYears, setHorizonYears] = useState<number>(5);
  const [selectedBand, setSelectedBand] = useState<'conservative' | 'balanced' | 'growth'>(storedBand);

  // Sync selected band with stored band when changed
  useEffect(() => {
    setSelectedBand(storedBand);
  }, [storedBand]);

  // Compute allocation via engine.allocationFor
  const rawAllocation = useMemo(() => {
    return allocationFor({
      band: selectedBand,
      horizonYears,
      emergencyFundMonths: emergencyMonthsCovered,
    });
  }, [selectedBand, horizonYears, emergencyMonthsCovered]);

  const allocationResult = typeof rawAllocation === 'string'
    ? { equity: 0, debt: 0, gold: 0, cash: 100 }
    : rawAllocation;

  const donutData = [
    { name: 'Equity (Index Funds)', value: allocationResult.equity, color: '#0F414A' },
    { name: 'Liquid & Debt Funds', value: allocationResult.debt, color: '#4A7C59' },
    { name: 'Gold (ETFs / SGB)', value: allocationResult.gold, color: '#D8BA98' },
    { name: 'Liquid Cash / Buffer', value: allocationResult.cash, color: '#96C0CE' },
  ].filter((d) => d.value > 0);

  const ASSET_CLASS_DETAILS = [
    {
      key: 'equity',
      name: 'Broad Market Index Funds',
      share: allocationResult.equity,
      color: '#0F414A',
      whatIsIt: 'Low-cost mutual funds tracking broad market indices (e.g., Nifty 50) providing diversified ownership of India\'s top businesses.',
      typicalRisk: 'Moderate to High (values fluctuate with business cycles)',
      typicalHorizon: '5+ Years (Long Term)',
    },
    {
      key: 'debt',
      name: 'Liquid & Low-Duration Debt Funds',
      share: allocationResult.debt,
      color: '#4A7C59',
      whatIsIt: 'Fixed income instruments and short-term bonds aimed at capital preservation and predictable interest yields.',
      typicalRisk: 'Low (minimal principal volatility)',
      typicalHorizon: '1 to 3 Years (Short to Medium)',
    },
    {
      key: 'gold',
      name: 'Gold ETFs / Sovereign Gold',
      share: allocationResult.gold,
      color: '#D8BA98',
      whatIsIt: 'Regulated digital/financial gold that acts as a hedge against currency inflation and macroeconomic uncertainty.',
      typicalRisk: 'Moderate (moves with global commodity cycles and inflation)',
      typicalHorizon: '3 to 5 Years (Medium Term)',
    },
    {
      key: 'cash',
      name: 'Liquid Cash & Savings Buffer',
      share: allocationResult.cash,
      color: '#96C0CE',
      whatIsIt: 'Instantly accessible money held in bank savings or overnight funds for near-term contingencies.',
      typicalRisk: 'Very Low (zero market volatility, highly liquid)',
      typicalHorizon: 'Immediate to 6 Months',
    },
  ];

  // --------------------------------------------------------------------------
  // 4. GROWTH LAB (Sliders, sipFutureValue, 5-Year Ghost Line)
  // --------------------------------------------------------------------------
  const [monthlySip, setMonthlySip] = useState<number>(5000);
  const [growthYears, setGrowthYears] = useState<number>(15);
  const [assumedReturn, setAssumedReturn] = useState<number>(12);

  const growthChartData = useMemo(() => {
    const data: Array<{
      year: number;
      label: string;
      invested: number;
      projected: number;
      delayedProjected: number;
    }> = [];

    for (let y = 1; y <= growthYears; y++) {
      const months = y * 12;
      const invested = monthlySip * months;
      const projected = sipFutureValue({
        monthly: monthlySip,
        annualRate: assumedReturn,
        months,
      });

      // Ghost line: if you start 5 years later
      let delayedProjected = 0;
      if (y > 5) {
        const delayedMonths = (y - 5) * 12;
        delayedProjected = sipFutureValue({
          monthly: monthlySip,
          annualRate: assumedReturn,
          months: delayedMonths,
        });
      }

      data.push({
        year: y,
        label: `Yr ${y}`,
        invested,
        projected,
        delayedProjected,
      });
    }

    return data;
  }, [monthlySip, growthYears, assumedReturn]);

  const finalYearData = growthChartData[growthChartData.length - 1] || {
    invested: 0,
    projected: 0,
    delayedProjected: 0,
  };
  const delayOpportunityCost = finalYearData.projected - finalYearData.delayedProjected;

  // --------------------------------------------------------------------------
  // 5. MARKET SNAPSHOT WIDGET (mfapi.in, localStorage cache, trailing returns)
  // --------------------------------------------------------------------------
  const [marketResult, setMarketResult] = useState<MarketSnapshotResult>(() => {
    const cached = getCachedIndexFunds();
    return cached || {
      funds: [],
      lastUpdated: 'Checking live data...',
      isCached: false,
      status: 'cached',
    };
  });
  const [isRefreshingMarket, setIsRefreshingMarket] = useState<boolean>(false);

  const loadMarketData = async () => {
    setIsRefreshingMarket(true);
    try {
      const result = await fetchIndexFundSnapshots(6000);
      setMarketResult(result);
    } catch {
      // Degrades gracefully
    } finally {
      setIsRefreshingMarket(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, []);

  // --------------------------------------------------------------------------
  // MANDATORY FOOTER DISCLAIMER
  // Educational only. Not investment advice. Returns are not guaranteed. Consult a SEBI-registered adviser.
  // --------------------------------------------------------------------------
  const FooterDisclaimer = () => (
    <footer
      role="contentinfo"
      aria-label="SEBI Regulatory Disclaimer"
      className="mt-8 p-4 rounded-card bg-sand/40 border border-ink/15 text-center space-y-1 text-ink/80"
    >
      <div className="flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider text-ink">
        <ShieldAlert className="w-4 h-4 text-accent shrink-0" />
        <span>Mandatory Investor Education Disclosure</span>
      </div>
      <p className="text-xs font-semibold text-ink">
        Educational only. Not investment advice. Returns are not guaranteed. Consult a SEBI-registered adviser.
      </p>
      <p className="text-[11px] text-ink/65 max-w-2xl mx-auto">
        PennyPath is a personal finance education simulator. We do not distribute financial products, execute trades, handle money, or promise investment returns. Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing.
      </p>
    </footer>
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Page Title & Mission Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sand border border-ink/20 text-ink">
            SEBI Education Framework
          </span>
          <span className="text-xs text-ink/60">No Brokerage • No Stock Tips</span>
        </div>
        <h1 className="text-3xl font-fraunces font-bold text-ink mt-1">
          {t('invest.title', 'Invest Lab')}
        </h1>
        <p className="text-sm text-ink/75 max-w-2xl mt-0.5">
          {t(
            'invest.compliance_sub',
            'Master core principles of asset allocation, index compounding, and risk budgeting through risk-free interactive simulations.'
          )}
        </p>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 1. GATE SCREEN / SAFETY NET CONTROLLER */}
      {/* -------------------------------------------------------------------- */}
      <section
        role="region"
        aria-label="Emergency Safety Net Gate"
        className={`p-6 rounded-card border-2 transition-all ${
          isGated
            ? 'bg-amber-50/60 border-amber-300 shadow-sm'
            : 'bg-paper border-ink/15'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-btn flex items-center justify-center shrink-0 ${
                isGated ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {isGated ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-fraunces font-bold text-xl text-ink">
                  {isGated ? 'Build your safety net first' : 'Safety Net Shield Active'}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                    isGated
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {emergencyMonthsCovered.toFixed(1)} Months Saved
                </span>
              </div>
              <p className="text-xs text-ink/80 mt-1 max-w-xl">
                {isGated
                  ? 'Investing in market instruments without a safety net risks forcing you to sell at a loss during emergencies. SEBI guidelines and sound financial planning require at least 1 month of essential expenses saved before investing.'
                  : 'Great job! You have at least 1 month of essential living expenses safeguarded. Your emergency shield protects your long-term investments from untimely withdrawals.'}
              </p>
            </div>
          </div>

          {/* Interactive Emergency Fund Simulator Toggle */}
          <div className="p-3 rounded-btn bg-paper/80 border border-ink/15 flex flex-col gap-1.5 shrink-0 min-w-[240px]">
            <div className="flex justify-between items-center text-xs font-semibold text-ink">
              <span>Your Emergency Savings:</span>
              <span className="font-fraunces font-bold text-sm text-ink">
                {formatINR(emergencySavings)}
              </span>
            </div>
            <input
              id="emergency-fund-slider"
              type="range"
              min="0"
              max={monthlyEssentials * 6}
              step={Math.max(500, Math.round(monthlyEssentials / 10))}
              value={emergencySavings}
              onChange={(e) => setEmergencySavings(Number(e.target.value))}
              className="w-full accent-ink cursor-pointer"
              aria-label="Simulate emergency fund savings"
            />
            <div className="flex justify-between text-[10px] text-ink/60">
              <button
                type="button"
                onClick={() => setEmergencySavings(0)}
                className="underline hover:text-ink cursor-pointer"
              >
                Set ₹0 (Test Gate)
              </button>
              <button
                type="button"
                onClick={() => setEmergencySavings(monthlyEssentials)}
                className="underline hover:text-ink cursor-pointer"
              >
                1 Month ({formatINR(monthlyEssentials)})
              </button>
              <button
                type="button"
                onClick={() => setEmergencySavings(monthlyEssentials * 3)}
                className="underline hover:text-ink cursor-pointer"
              >
                3 Months
              </button>
            </div>
          </div>
        </div>

        {/* Gate Progress Bar & Savings Plan */}
        <div className="mt-5 pt-4 border-t border-ink/10 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-ink mb-1">
              <span>
                <strong>Progress towards 1-Month Safety Milestone:</strong> {formatINR(emergencySavings)} / {formatINR(monthlyEssentials)}
              </span>
              <span className="font-bold text-ink">
                {Math.min(100, Math.round((emergencySavings / Math.max(1, monthlyEssentials)) * 100))}%
              </span>
            </div>
            <div className="w-full bg-sand/40 rounded-full h-3 overflow-hidden border border-ink/15">
              <div
                className={`h-full transition-all duration-300 ${
                  isGated ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
                style={{
                  width: `${Math.min(100, (emergencySavings / Math.max(1, monthlyEssentials)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Savings Plan from engine.emergencyFundTarget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-btn bg-sand/30 border border-ink/10">
              <span className="text-[11px] font-semibold text-ink/70 block uppercase tracking-wider">
                1-Month Immediate Goal
              </span>
              <div className="font-fraunces font-bold text-lg text-ink mt-0.5">
                {formatINR(monthlyEssentials)}
              </div>
              <p className="text-[11px] text-ink/75 mt-0.5">
                Unlocks the interactive Invest Lab suite.
              </p>
            </div>

            <div className="p-3 rounded-btn bg-sand/30 border border-ink/10">
              <span className="text-[11px] font-semibold text-ink/70 block uppercase tracking-wider">
                Recommended Reserve Target
              </span>
              <div className="font-fraunces font-bold text-lg text-ink mt-0.5">
                {formatINR(savingsPlan.minAmount)} – {formatINR(savingsPlan.maxAmount)}
              </div>
              <p className="text-[11px] text-ink/75 mt-0.5">
                {savingsPlan.minMonths} to {savingsPlan.maxMonths} months of essentials for {mode} mode.
              </p>
            </div>

            <div className="p-3 rounded-btn bg-sand/30 border border-ink/10">
              <span className="text-[11px] font-semibold text-ink/70 block uppercase tracking-wider">
                Actionable Savings Plan
              </span>
              <div className="font-fraunces font-bold text-base text-ink mt-0.5">
                Save {formatINR(suggestedMonthlySavings)} / mo
              </div>
              <p className="text-[11px] text-ink/75 mt-0.5">
                {isGated
                  ? `Reach your 1-month safety buffer in approx. ${monthsTo1MonthMilestone} month${monthsTo1MonthMilestone > 1 ? 's' : ''}.`
                  : 'Keep this buffer in a high-interest savings account or liquid fund.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* GATED CONTENT WRAPPER: LOCKED, NOT HIDDEN */}
      {/* When isGated === true, content is shown as locked with visual indicators */}
      {/* -------------------------------------------------------------------- */}
      <div className={`space-y-8 relative ${isGated ? 'select-none' : ''}`}>
        {isGated && (
          <div
            role="status"
            className="sticky top-2 z-20 p-3 rounded-btn bg-amber-100/95 border-2 border-amber-400 text-amber-900 shadow-sm flex items-center justify-between gap-3 backdrop-blur-xs"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-700 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                Invest Lab Gated Content Locked: Build at least 1 month of essential expenses ({formatINR(monthlyEssentials)}) to unlock full interactive simulations.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEmergencySavings(monthlyEssentials)}
              className="px-3 py-1 rounded-btn bg-amber-800 text-paper text-xs font-bold shrink-0 hover:bg-amber-900 cursor-pointer"
            >
              Unlock Preview
            </button>
          </div>
        )}

        <div className={`space-y-8 transition-opacity ${isGated ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
          {/* ---------------------------------------------------------------- */}
          {/* 2. RISK QUIZ (6 Questions, One question per screen, Progress bar) */}
          {/* ---------------------------------------------------------------- */}
          <section
            role="region"
            aria-label="Risk Assessment Quiz"
            className="p-6 rounded-card bg-paper border border-ink/15 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-btn bg-sand/50 text-ink flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="font-fraunces font-bold text-lg text-ink">
                    Risk Assessment Quiz
                  </h2>
                  <p className="text-xs text-ink/70">
                    6 plain-English questions to evaluate your risk capacity and horizon.
                  </p>
                </div>
              </div>

              {hasCompletedQuiz && !quizActive && (
                <button
                  type="button"
                  onClick={handleRetakeQuiz}
                  className="px-3 py-1.5 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink border border-ink/15 text-xs font-semibold cursor-pointer"
                >
                  Retake Quiz
                </button>
              )}
            </div>

            {/* Quiz Flow: Either Active Question or Result Screen */}
            {quizActive ? (
              <div className="space-y-4">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-ink mb-1">
                    <span>
                      Question {currentQuestionIndex + 1} of {RISK_QUIZ_QUESTIONS.length}: {RISK_QUIZ_QUESTIONS[currentQuestionIndex].title}
                    </span>
                    <span className="text-ink/60">
                      {Math.round(((currentQuestionIndex + 1) / RISK_QUIZ_QUESTIONS.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-sand/30 rounded-full h-2 overflow-hidden border border-ink/10">
                    <div
                      className="h-full bg-ink transition-all duration-300"
                      style={{
                        width: `${((currentQuestionIndex + 1) / RISK_QUIZ_QUESTIONS.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="pt-2">
                  <h3 className="font-fraunces font-bold text-base text-ink mb-3">
                    {RISK_QUIZ_QUESTIONS[currentQuestionIndex].question}
                  </h3>

                  <div className="space-y-2">
                    {RISK_QUIZ_QUESTIONS[currentQuestionIndex].options.map((opt, idx) => {
                      const isSelected = quizAnswers[currentQuestionIndex] === opt.score;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOption(opt.score)}
                          className={`w-full p-3 rounded-btn border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'bg-ink text-paper border-ink shadow-xs'
                              : 'bg-sand/15 text-ink border-ink/15 hover:bg-sand/30'
                          }`}
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-bold">
                              {opt.text}
                            </div>
                            {opt.subtext && (
                              <div
                                className={`text-[11px] mt-0.5 ${
                                  isSelected ? 'text-paper/80' : 'text-ink/65'
                                }`}
                              >
                                {opt.subtext}
                              </div>
                            )}
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                              isSelected
                                ? 'bg-paper text-ink border-paper'
                                : 'border-ink/30 text-ink/60'
                            }`}
                          >
                            {isSelected ? '✓' : idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nav buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-ink/10">
                  <button
                    type="button"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 rounded-btn border border-ink/15 text-xs font-semibold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-5 py-2 rounded-btn bg-ink text-paper text-xs font-bold hover:bg-ink/90 cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {currentQuestionIndex === RISK_QUIZ_QUESTIONS.length - 1 ? (
                      <>Complete & View Band <Sparkles className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Next <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz Result Screen */
              <div className="p-4 rounded-btn bg-sand/20 border border-ink/15 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/60">
                      Your Evaluated Risk Profile Band
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-sm px-3 py-1 rounded-full font-fraunces font-bold border uppercase tracking-wider ${
                          BAND_EXPLANATIONS[storedBand].badgeBg
                        }`}
                      >
                        {BAND_EXPLANATIONS[storedBand].title}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRetakeQuiz}
                    className="px-4 py-1.5 rounded-btn bg-paper border border-ink/20 text-ink text-xs font-bold hover:bg-sand/30 cursor-pointer self-start sm:self-auto"
                  >
                    {hasCompletedQuiz ? 'Retake 6-Question Quiz' : 'Take 6-Question Quiz'}
                  </button>
                </div>

                {/* 2-Line Plain Explanation */}
                <div className="p-3.5 rounded-btn bg-paper border border-ink/15 space-y-1">
                  <p className="text-xs font-bold text-ink">
                    {BAND_EXPLANATIONS[storedBand].line1}
                  </p>
                  <p className="text-xs text-ink/80">
                    {BAND_EXPLANATIONS[storedBand].line2}
                  </p>
                </div>

                <div className="text-[11px] text-ink/60 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Your assessment is stored in <code className="bg-sand/40 px-1 py-0.5 rounded-xs font-mono">risk_profiles</code> and informs your illustrative asset allocation below.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* 3. ILLUSTRATIVE ALLOCATION (engine.allocationFor -> Donut + Table) */}
          {/* ---------------------------------------------------------------- */}
          <section
            role="region"
            aria-label="Illustrative Asset Allocation"
            className="p-6 rounded-card bg-paper border border-ink/15 space-y-5"
          >
            <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
              <div className="w-8 h-8 rounded-btn bg-sand/50 text-ink flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  Illustrative Asset Allocation
                </h2>
                <p className="text-xs text-ink/70">
                  Calculated by <code className="font-mono text-[11px]">engine.allocationFor</code> based on your risk band and time horizon.
                </p>
              </div>
            </div>

            {/* Allocation Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-band-select" className="block text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  Risk Band
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['conservative', 'balanced', 'growth'] as const).map((b) => (
                    <button
                      key={b}
                      id={`inv-band-${b}`}
                      type="button"
                      onClick={() => setSelectedBand(b)}
                      className={`p-2 rounded-btn text-xs font-bold border transition-all capitalize cursor-pointer ${
                        selectedBand === b
                          ? 'bg-ink text-paper border-ink shadow-xs'
                          : 'bg-sand/15 text-ink/80 border-ink/15 hover:bg-sand/30'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1.5">
                  <label htmlFor="inv-horizon-slider">Planned Horizon</label>
                  <span className="font-fraunces font-bold text-sm text-ink">
                    {horizonYears} Years
                  </span>
                </div>
                <input
                  id="inv-horizon-slider"
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={horizonYears}
                  onChange={(e) => setHorizonYears(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink/60 mt-0.5">
                  <span>1 Year (Short)</span>
                  <span>5 Years (Medium)</span>
                  <span>15 Years (Long)</span>
                </div>
              </div>
            </div>

            {/* Donut Chart & Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
              {/* Donut Chart */}
              <div
                role="region"
                aria-label="Asset Allocation Donut Chart"
                className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-btn bg-sand/20 border border-ink/10"
              >
                <div className="sr-only">
                  Asset Allocation breakdown for {BAND_EXPLANATIONS[selectedBand].title}:{' '}
                  {donutData.map((d) => `${d.name}: ${d.value}%`).join(', ')}.
                </div>
                <div className="h-48 w-full" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => [`${val}%`, 'Allocation']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-xs font-fraunces font-bold text-ink">
                  {BAND_EXPLANATIONS[selectedBand].title} • {horizonYears}Y Horizon
                </div>
              </div>

              {/* Table of Asset Classes */}
              <div className="lg:col-span-8 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink/15 text-[11px] font-bold uppercase tracking-wider text-ink/70">
                      <th className="py-2 pr-3">Asset Class</th>
                      <th className="py-2 px-2 text-center">Share</th>
                      <th className="py-2 px-3">What each is</th>
                      <th className="py-2 px-3">Typical Risk</th>
                      <th className="py-2 pl-3">Typical Horizon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {ASSET_CLASS_DETAILS.map((ac) => (
                      <tr key={ac.key} className="hover:bg-sand/15 transition-colors">
                        <td className="py-2.5 pr-3 font-bold text-ink">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ac.color }}
                            />
                            <span>{ac.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-fraunces font-bold text-sm text-ink">
                          {ac.share}%
                        </td>
                        <td className="py-2.5 px-3 text-ink/80 text-[11px] max-w-[200px]">
                          {ac.whatIsIt}
                        </td>
                        <td className="py-2.5 px-3 text-ink/80 text-[11px]">
                          {ac.typicalRisk}
                        </td>
                        <td className="py-2.5 pl-3 text-ink font-medium text-[11px] whitespace-nowrap">
                          {ac.typicalHorizon}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Students: Practice Portfolio Explainer (No Real Money) */}
            {mode === 'student' && (
              <div
                role="note"
                aria-label="Student Practice Portfolio Sandbox"
                className="p-4 rounded-btn bg-sky/20 border border-sky-dark/30 space-y-2 mt-4"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-ink shrink-0" />
                  <h3 className="font-fraunces font-bold text-sm text-ink">
                    Student Practice Portfolio (Zero Real Money Sandbox)
                  </h3>
                </div>
                <p className="text-xs text-ink/80 leading-relaxed">
                  As a student, you have time on your side, but capital is precious. SEBI education principles recommend creating a virtual <strong>"Practice Portfolio"</strong>: track a fictional ₹2,000 monthly allocation across the asset classes above in a spreadsheet or journal for 3 to 6 months. Watch how the Nifty 50 moves during market cycles without risking actual rupees!
                </p>
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* 4. GROWTH LAB (Sliders, sipFutureValue, 5-Year Ghost Line) */}
          {/* ---------------------------------------------------------------- */}
          <section
            role="region"
            aria-label="Compounding Growth Lab"
            className="p-6 rounded-card bg-paper border border-ink/15 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-btn bg-sand/50 text-ink flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="font-fraunces font-bold text-lg text-ink">
                    Growth Lab: Compounding Simulator
                  </h2>
                  <p className="text-xs text-ink/70">
                    Calculated using <code className="font-mono text-[11px]">sipFutureValue</code> with cost-of-delay ghost line.
                  </p>
                </div>
              </div>

              {/* Mandatory Prominent Label */}
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                Assumption, not a promise
              </span>
            </div>

            <p className="text-xs text-ink/70 bg-sand/20 p-2.5 rounded-btn border border-ink/10">
              <strong>Historical Context (AMFI Data):</strong> Broad Indian equity indices have historically compounded between 10%–13% over 10+ year horizons, while debt funds typically range 6%–7%. Your chosen rate is an <strong>educational assumption, not a promise or guarantee</strong>.
            </p>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              {/* Monthly Amount */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1">
                  <label htmlFor="inv-monthly-amount">Monthly SIP Amount</label>
                  <span className="font-fraunces font-bold text-base text-ink">
                    {formatINR(monthlySip)}
                  </span>
                </div>
                <input
                  id="inv-monthly-amount"
                  type="range"
                  min="500"
                  max="50000"
                  step="500"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink/60 mt-0.5">
                  <span>₹500</span>
                  <span>₹25,000</span>
                  <span>₹50,000</span>
                </div>
              </div>

              {/* Horizon Years */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1">
                  <label htmlFor="inv-growth-years">Investment Tenure</label>
                  <span className="font-fraunces font-bold text-base text-ink">
                    {growthYears} Years
                  </span>
                </div>
                <input
                  id="inv-growth-years"
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={growthYears}
                  onChange={(e) => setGrowthYears(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink/60 mt-0.5">
                  <span>5 Yrs</span>
                  <span>15 Yrs</span>
                  <span>30 Yrs</span>
                </div>
              </div>

              {/* Assumed Return Rate */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase text-ink/80 mb-1">
                  <label htmlFor="inv-assumed-rate">Assumed Annual Return</label>
                  <span className="font-fraunces font-bold text-base text-ink">
                    {assumedReturn}% p.a.
                  </span>
                </div>
                <input
                  id="inv-assumed-rate"
                  type="range"
                  min="4"
                  max="15"
                  step="0.5"
                  value={assumedReturn}
                  onChange={(e) => setAssumedReturn(Number(e.target.value))}
                  className="w-full accent-ink cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink/60 mt-0.5">
                  <span>4% (Debt)</span>
                  <span>10%–12% (Index)</span>
                  <span>15%</span>
                </div>
              </div>
            </div>

            {/* Stat Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-btn bg-sand/20 border border-ink/10">
                <span className="text-[11px] font-semibold text-ink/70 block uppercase tracking-wider">
                  Total Invested
                </span>
                <div className="font-fraunces font-bold text-lg text-ink mt-0.5">
                  {formatINR(finalYearData.invested)}
                </div>
                <span className="text-[10px] text-ink/60">
                  Principal from pocket
                </span>
              </div>

              <div className="p-3 rounded-btn bg-sand/20 border border-ink/10">
                <span className="text-[11px] font-semibold text-ink/70 block uppercase tracking-wider">
                  Projected Value
                </span>
                <div className="font-fraunces font-bold text-lg text-emerald-800 mt-0.5">
                  {formatINR(finalYearData.projected)}
                </div>
                <span className="text-[10px] text-ink/60">
                  Compounded corpus
                </span>
              </div>

              <div className="p-3 rounded-btn bg-sand/20 border border-ink/10">
                <span className="text-[11px] font-semibold text-ink/70 block uppercase tracking-wider">
                  Estimated Wealth Gain
                </span>
                <div className="font-fraunces font-bold text-lg text-ink mt-0.5">
                  {formatINR(finalYearData.projected - finalYearData.invested)}
                </div>
                <span className="text-[10px] text-ink/60">
                  Compounding multiplier
                </span>
              </div>

              <div className="p-3 rounded-btn bg-amber-50/70 border border-amber-200">
                <span className="text-[11px] font-semibold text-amber-900 block uppercase tracking-wider">
                  Cost of 5-Yr Delay
                </span>
                <div className="font-fraunces font-bold text-lg text-amber-900 mt-0.5">
                  -{formatINR(delayOpportunityCost)}
                </div>
                <span className="text-[10px] text-amber-800/80">
                  Starting 5 years later
                </span>
              </div>
            </div>

            {/* Line Chart of Invested vs Projected vs 5-Yr Delay Ghost Line */}
            <div
              role="region"
              aria-label="SIP Wealth Growth and 5-Year Delay Projection Chart"
              className="p-4 rounded-btn bg-sand/15 border border-ink/10"
            >
              <div className="sr-only">
                SIP Projection Summary: Monthly investment of {formatINR(monthlySip)} over {growthYears} years at {assumedReturn}% projected corpus is {formatINR(finalYearData?.projected || 0)} from {formatINR(finalYearData?.invested || 0)} invested capital. Delaying 5 years reduces projected corpus to {formatINR(finalYearData?.delayedProjected || 0)}.
              </div>
              <div className="h-64 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthChartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0dcd3" />
                    <XAxis dataKey="label" stroke="#333" fontSize={11} />
                    <YAxis
                      stroke="#333"
                      fontSize={11}
                      tickFormatter={(val) => {
                        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                        return `₹${val}`;
                      }}
                    />
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [
                        formatINR(val),
                        name === 'projected'
                          ? 'Projected Corpus'
                          : name === 'invested'
                          ? 'Total Invested'
                          : 'If you start 5 years later',
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value) => {
                        if (value === 'projected') return 'Projected Corpus (On Time)';
                        if (value === 'invested') return 'Total Invested Principal';
                        if (value === 'delayedProjected') return 'If you start 5 years later (Ghost Line)';
                        return value;
                      }}
                    />
                    {/* Line 1: Projected Corpus */}
                    <Line
                      type="monotone"
                      dataKey="projected"
                      stroke="#0F414A"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                    {/* Line 2: Invested Principal */}
                    <Line
                      type="monotone"
                      dataKey="invested"
                      stroke="#64748B"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    {/* Line 3: 5-Year Delay Ghost Line */}
                    <Line
                      type="monotone"
                      dataKey="delayedProjected"
                      stroke="#D97706"
                      strokeWidth={2}
                      strokeDasharray="2 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* 5. MARKET SNAPSHOT WIDGET (mfapi.in, localStorage cache, trailing returns) */}
          {/* ---------------------------------------------------------------- */}
          <section
            role="region"
            aria-label="Live Market Snapshot Widget"
            className="p-6 rounded-card bg-paper border border-ink/15 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-ink shrink-0" />
                <div>
                  <h2 className="font-fraunces font-bold text-lg text-ink">
                    Market Snapshot: Key Index Funds
                  </h2>
                  <p className="text-xs text-ink/70">
                    Live NAV benchmarks and computed trailing returns from AMFI Open Data via <code className="font-mono text-[11px]">mfapi.in</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] text-ink/65 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated: <strong>{marketResult.lastUpdated}</strong>
                </span>

                <button
                  type="button"
                  onClick={loadMarketData}
                  disabled={isRefreshingMarket}
                  className="p-1.5 rounded-btn bg-sand/30 hover:bg-sand/60 text-ink border border-ink/15 text-xs cursor-pointer disabled:opacity-50"
                  title="Refresh live NAVs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMarket ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Prominent Label: past performance does not guarantee future returns */}
            <div className="p-2.5 rounded-btn bg-sand/30 border border-ink/10 text-xs text-ink/80 flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-ink">
                ⚠️ Note: Past performance does not guarantee future returns.
              </span>
              <span className="text-[11px] text-ink/60">
                {marketResult.status === 'cached'
                  ? 'Showing locally cached NAV records'
                  : marketResult.status === 'live'
                  ? 'Live data synced with AMFI'
                  : 'Offline snapshot mode'}
              </span>
            </div>

            {/* Index Fund Cards or Graceful Unavailable Fallback */}
            {marketResult.funds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {marketResult.funds.map((fund) => (
                  <div
                    key={fund.schemeCode}
                    className="p-3.5 rounded-btn bg-sand/20 border border-ink/15 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-xs text-ink line-clamp-1">
                          {fund.shortName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-xs font-mono bg-paper border border-ink/10 text-ink/70 shrink-0">
                          {fund.schemeCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink/60 mt-0.5">
                        {fund.fundHouse}
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="font-fraunces font-bold text-xl text-ink">
                          ₹{fund.nav.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-ink/50 font-medium">
                          as of {fund.navDate}
                        </span>
                      </div>
                    </div>

                    {/* Trailing Returns */}
                    <div className="pt-2 border-t border-ink/10 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-ink/70 text-[11px]">1-Yr Trailing Return:</span>
                        <span
                          className={`font-bold ${
                            fund.trailingReturn1Y === null
                              ? 'text-ink/50'
                              : fund.trailingReturn1Y >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {fund.trailingReturn1Y !== null
                            ? `${fund.trailingReturn1Y >= 0 ? '+' : ''}${fund.trailingReturn1Y}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink/70 text-[11px]">3-Yr Annualized CAGR:</span>
                        <span
                          className={`font-bold ${
                            fund.trailingReturn3Y === null
                              ? 'text-ink/50'
                              : fund.trailingReturn3Y >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {fund.trailingReturn3Y !== null
                            ? `${fund.trailingReturn3Y >= 0 ? '+' : ''}${fund.trailingReturn3Y}%`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Clear Graceful Unavailable State */
              <div
                role="status"
                className="p-6 rounded-btn bg-sand/20 border border-dashed border-ink/20 text-center space-y-2"
              >
                <AlertTriangle className="w-6 h-6 text-ink/60 mx-auto" />
                <h3 className="font-fraunces font-bold text-base text-ink">
                  Market Snapshot Currently Unavailable
                </h3>
                <p className="text-xs text-ink/70 max-w-md mx-auto">
                  Live AMFI mutual fund data could not be fetched and no local cache was found. Please check your internet connection and refresh. Past performance does not guarantee future returns.
                </p>
                <button
                  type="button"
                  onClick={loadMarketData}
                  className="px-4 py-1.5 rounded-btn bg-ink text-paper text-xs font-bold hover:bg-ink/90 cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* 6. "READY TO INVEST?" CARD: OUTBOUND LINKS TO REGULATED PLATFORMS */}
          {/* ---------------------------------------------------------------- */}
          <section
            role="region"
            aria-label="Regulated Platforms Outbound Information"
            className="p-6 rounded-card bg-paper border border-ink/15 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
              <ExternalLink className="w-5 h-5 text-ink shrink-0" />
              <div>
                <h2 className="font-fraunces font-bold text-lg text-ink">
                  Ready to Invest? Direct Regulated Platforms
                </h2>
                <p className="text-xs text-ink/70">
                  When you are ready to invest real money, always choose SEBI-registered direct mutual fund platforms.
                </p>
              </div>
            </div>

            {/* Clear "You are leaving Pennypath" notice */}
            <div
              role="note"
              className="p-3.5 rounded-btn bg-sand/30 border border-ink/15 text-xs text-ink/80 flex items-start gap-2.5"
            >
              <Info className="w-4 h-4 text-ink shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">
                  You are leaving Pennypath.
                </p>
                <p className="text-[11px] text-ink/75 mt-0.5 leading-relaxed">
                  Pennypath is strictly an educational simulator. We do not provide brokerage services, hold custody of funds, execute transactions, or earn affiliate commissions. Clicking external links opens third-party SEBI-regulated platforms in a new tab.
                </p>
              </div>
            </div>

            {/* Outbound Platform Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {[
                {
                  name: 'Groww Direct Mutual Funds',
                  url: 'https://groww.in/mutual-funds',
                  desc: 'SEBI Registered Stock Broker & MF Distributor (Direct Plans)',
                },
                {
                  name: 'SBI Mutual Fund Portal',
                  url: 'https://www.sbimf.com',
                  desc: 'Official AMC Portal for direct fund investments and SIPs',
                },
                {
                  name: 'Zerodha Coin',
                  url: 'https://coin.zerodha.com',
                  desc: 'Zero-commission direct mutual fund investment platform',
                },
                {
                  name: 'UTI Mutual Fund Portal',
                  url: 'https://www.utimf.com',
                  desc: 'Official direct investment portal for UTI index schemes',
                },
              ].map((platform, idx) => (
                <a
                  key={idx}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-btn bg-sand/15 hover:bg-sand/30 border border-ink/15 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between text-ink font-bold text-xs sm:text-sm">
                      <span>{platform.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-ink/60 group-hover:text-ink shrink-0 transition-colors" />
                    </div>
                    <p className="text-[11px] text-ink/65 mt-1">
                      {platform.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] text-ink/60 font-medium">
                    <span>Direct Plan Zero-Fee</span>
                    <span className="text-ink font-semibold group-hover:underline">Open Platform ↗</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 7. FOOTER DISCLAIMER ON EVERY INVEST VIEW */}
      {/* -------------------------------------------------------------------- */}
      <FooterDisclaimer />
    </div>
  );
};
