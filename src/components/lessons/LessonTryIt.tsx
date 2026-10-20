import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatINR } from '../../engine/currency';
import { LessonTopicId } from '../../types';
import {
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Calculator,
  ArrowRight,
  HelpCircle,
  Percent,
} from 'lucide-react';

interface LessonTryItProps {
  topicId: LessonTopicId;
  monthlyIncome?: number;
  userMode?: 'student' | 'household' | 'earner';
}

export const LessonTryIt: React.FC<LessonTryItProps> = ({
  topicId,
  monthlyIncome = 38000,
  userMode = 'earner',
}) => {
  const { t } = useTranslation();

  // 1. Needs vs Wants State
  const [needsWantsItems, setNeedsWantsItems] = useState([
    { id: 1, nameEn: 'Monthly Grocery Ration / Mess', nameHi: 'महीने का राशन / मेस', amount: 3500, isNeed: true },
    { id: 2, nameEn: 'Weekend Dining / Canteen Hangout', nameHi: 'बाहर खाना / कैंटीन पार्टी', amount: 1800, isNeed: false },
    { id: 3, nameEn: 'Mobile 5G Recharge / Internet', nameHi: 'मोबाइल रिचार्ज / इंटरनेट', amount: 399, isNeed: true },
    { id: 4, nameEn: 'Branded Shoes / Gaming Gear', nameHi: 'ब्रांडेड जूते / गेमिंग', amount: 2500, isNeed: false },
  ]);

  const toggleItemNeed = (id: number) => {
    setNeedsWantsItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isNeed: !item.isNeed } : item))
    );
  };

  const totalNeeds = needsWantsItems.filter((i) => i.isNeed).reduce((s, i) => s + i.amount, 0);
  const totalWants = needsWantsItems.filter((i) => !i.isNeed).reduce((s, i) => s + i.amount, 0);
  const totalSpentAll = totalNeeds + totalWants;
  const wantPercent = totalSpentAll > 0 ? Math.round((totalWants / totalSpentAll) * 100) : 0;

  // 2. 50/30/20 Adapted Rule State
  const [incomeInput, setIncomeInput] = useState<number>(monthlyIncome);
  const [fixedInput, setFixedInput] = useState<number>(Math.round(monthlyIncome * 0.42)); // ~16k
  const [savingsInput, setSavingsInput] = useState<number>(Math.round(monthlyIncome * 0.20)); // 20%
  const discretionary = Math.max(0, incomeInput - fixedInput - savingsInput);
  const dailyDiscretionary = Math.round(discretionary / 30);

  // 3. Emergency Fund State
  const [emergencyExpense, setEmergencyExpense] = useState<number>(Math.round(monthlyIncome * 0.65));
  const [emergencyMonths, setEmergencyMonths] = useState<number>(userMode === 'household' ? 6 : userMode === 'student' ? 2 : 3);
  const emergencyTarget = emergencyExpense * emergencyMonths;
  const monthlyToTarget = Math.round(emergencyTarget / 6);

  // 4. EMI True Cost State
  const [gadgetPrice, setGadgetPrice] = useState<number>(30000);
  const upfrontDiscount = Math.round(gadgetPrice * 0.05); // 5% cash discount = 1500
  const upfrontTotal = gadgetPrice - upfrontDiscount;
  const noCostProcessingFee = 299;
  const noCostGstOnInterest = Math.round(gadgetPrice * 0.009); // ~270
  const noCostTotal = gadgetPrice + noCostProcessingFee + noCostGstOnInterest;
  const emiHiddenExtra = noCostTotal - upfrontTotal;

  // 5. Compound Interest State
  const [sipMonthly, setSipMonthly] = useState<number>(userMode === 'student' ? 1000 : 2500);
  // Early bird: age 20 to 30 (10 yrs), compounds to 50
  // Late bird: age 30 to 50 (20 yrs)
  const calcEarlyLate = (monthly: number) => {
    const r = 0.12 / 12; // 12% p.a.
    // Early Bird: 120 months of SIP
    const fv10 = monthly * ((Math.pow(1 + r, 120) - 1) / r) * (1 + r);
    // Compounded for next 20 years (240 months) without further contributions
    const earlyTotal = fv10 * Math.pow(1 + r, 240);
    const earlyInvested = monthly * 120;

    // Late Starter: 240 months of SIP
    const lateTotal = monthly * ((Math.pow(1 + r, 240) - 1) / r) * (1 + r);
    const lateInvested = monthly * 240;

    return {
      earlyInvested: Math.round(earlyInvested),
      earlyTotal: Math.round(earlyTotal),
      lateInvested: Math.round(lateInvested),
      lateTotal: Math.round(lateTotal),
    };
  };
  const compResult = calcEarlyLate(sipMonthly);

  // 6. SIP vs Lump Sum State
  const [sipSum] = useState<number>(6000);
  // Lump sum at NAV 100: buys 60 units. Market drops to 80, recovers to 100.
  // Lump sum value = 60 * 100 = 6000.
  // SIP: 2000 @ 100 (20u), 2000 @ 80 (25u), 2000 @ 100 (20u) = 65 units.
  // SIP value = 65 * 100 = 6500.
  const sipUnits = 65;
  const lumpUnits = 60;
  const sipValueFinal = 6500;
  const lumpValueFinal = 6000;

  // 7. Inflation State
  const [inflationYears, setInflationYears] = useState<number>(10);
  const [savingsDeposit, setSavingsDeposit] = useState<number>(50000);
  // Bank account at 3% p.a.
  const bankNominal = Math.round(savingsDeposit * Math.pow(1 + 0.03, inflationYears));
  // Purchasing power discounted at 6% inflation
  const realPurchasingPower = Math.round(savingsDeposit / Math.pow(1 + 0.06, inflationYears));
  // If invested at 11% Index Fund
  const indexFundNominal = Math.round(savingsDeposit * Math.pow(1 + 0.11, inflationYears));
  const indexFundReal = Math.round(indexFundNominal / Math.pow(1 + 0.06, inflationYears));

  // 8. Risk vs Return State
  const [selectedHorizon, setSelectedHorizon] = useState<'short' | 'medium' | 'long'>('medium');

  // 9. Gold, FD, Mutual Funds State
  const [threePillarsMonthly, setThreePillarsMonthly] = useState<number>(5000);
  const [pillarMode, setPillarMode] = useState<'household' | 'student' | 'earner'>(userMode);

  const getPillarSplit = (m: 'household' | 'student' | 'earner') => {
    switch (m) {
      case 'household':
        return { fd: 0.4, gold: 0.3, mf: 0.3 };
      case 'student':
        return { fd: 0.3, gold: 0.1, mf: 0.6 };
      case 'earner':
      default:
        return { fd: 0.25, gold: 0.15, mf: 0.6 };
    }
  };
  const split = getPillarSplit(pillarMode);
  const fdAlloc = Math.round(threePillarsMonthly * split.fd);
  const goldAlloc = Math.round(threePillarsMonthly * split.gold);
  const mfAlloc = Math.round(threePillarsMonthly * split.mf);

  // 10. Scam Red Flags State
  const [checkedFlags, setCheckedFlags] = useState<Record<string, boolean>>({
    flag1: false,
    flag2: false,
    flag3: false,
    flag4: false,
    flag5: false,
  });

  const toggleFlag = (k: string) => {
    setCheckedFlags((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const flaggedCount = Object.values(checkedFlags).filter(Boolean).length;

  return (
    <div className="mt-4 p-4 rounded-card bg-sand/15 border border-ink/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
          <Calculator className="w-4 h-4 text-accent" />
          <span>{t('lessons.try_it_title')}</span>
        </div>
        <span className="text-[11px] text-ink/70 font-semibold px-2 py-0.5 rounded-full bg-paper border border-ink/10">
          Interactive Simulation
        </span>
      </div>

      {/* TOPIC 1: NEEDS VS WANTS */}
      {topicId === 'needs_vs_wants' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Tap any item to toggle between <strong>Need (ज़रूरत)</strong> and <strong>Want (शौक)</strong>:
          </p>

          <div className="space-y-2">
            {needsWantsItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItemNeed(item.id)}
                className={`p-2.5 rounded-btn border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  item.isNeed
                    ? 'bg-paper border-ink/30 text-ink'
                    : 'bg-sand/30 border-sand-dark text-ink'
                }`}
              >
                <div>
                  <span className="font-semibold block">{item.nameEn}</span>
                  <span className="text-[11px] text-ink/60">{item.nameHi}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatINR(item.amount)}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.isNeed ? 'bg-ink text-paper' : 'bg-accent/20 text-accent border border-accent/30'
                    }`}
                  >
                    {item.isNeed ? 'Need' : 'Want'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-btn bg-paper border border-ink/15 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span>Needs: {formatINR(totalNeeds)}</span>
              <span>Wants: {formatINR(totalWants)} ({wantPercent}%)</span>
            </div>
            <div className="w-full h-2.5 bg-ink/10 rounded-full overflow-hidden flex">
              <div
                className="bg-ink h-full transition-all duration-300"
                style={{ width: `${100 - wantPercent}%` }}
              />
              <div
                className={`h-full transition-all duration-300 ${wantPercent <= 30 ? 'bg-sky-dark' : 'bg-accent'}`}
                style={{ width: `${wantPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-ink/75">
              {wantPercent <= 30
                ? '✅ Excellent! Wants are within the healthy <=30% limit.'
                : '⚠️ Caution: Wants exceed 30% of your expenses. Trim dining or shopping to protect savings.'}
            </p>
          </div>
        </div>
      )}

      {/* TOPIC 2: 50/30/20 ADAPTED */}
      {topicId === 'rule_50_30_20' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            See how locking Fixed Commitments and Savings Target yields your daily safe-to-spend allowance:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-ink/70 block mb-1">
                Income (आमदनी)
              </label>
              <input
                type="number"
                value={incomeInput}
                onChange={(e) => setIncomeInput(Number(e.target.value) || 0)}
                className="w-full p-2 rounded-btn border border-ink/20 text-xs font-semibold bg-paper"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink/70 block mb-1">
                Fixed Costs (किराया, बिल, EMI)
              </label>
              <input
                type="number"
                value={fixedInput}
                onChange={(e) => setFixedInput(Number(e.target.value) || 0)}
                className="w-full p-2 rounded-btn border border-ink/20 text-xs font-semibold bg-paper"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink/70 block mb-1">
                Savings Target (बचत लक्ष्य)
              </label>
              <input
                type="number"
                value={savingsInput}
                onChange={(e) => setSavingsInput(Number(e.target.value) || 0)}
                className="w-full p-2 rounded-btn border border-ink/20 text-xs font-semibold bg-paper"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-card bg-paper border border-ink/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60 block">
                PennyPath Daily Safe-to-Spend
              </span>
              <div className="text-xl sm:text-2xl font-fraunces font-bold text-ink">
                {formatINR(dailyDiscretionary)} <span className="text-xs font-normal text-ink/70">/ day</span>
              </div>
              <span className="text-xs text-ink/75">
                Monthly allowance (D): {formatINR(discretionary)}
              </span>
            </div>
            <div className="text-right text-xs border-t sm:border-t-0 sm:border-l border-ink/10 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-ink/60 block">Fixed Share: {incomeInput > 0 ? Math.round((fixedInput / incomeInput) * 100) : 0}%</span>
              <span className="text-ink/60 block">Savings Rate: {incomeInput > 0 ? Math.round((savingsInput / incomeInput) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 3: EMERGENCY FUND */}
      {topicId === 'emergency_fund' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Calculate your family or student emergency airbag:
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">Mandatory Monthly Spend:</span>
              <span className="font-bold">{formatINR(emergencyExpense)}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={80000}
              step={1000}
              value={emergencyExpense}
              onChange={(e) => setEmergencyExpense(Number(e.target.value))}
              className="w-full accent-ink"
            />
          </div>

          <div className="flex gap-2">
            {[
              { label: 'Student (2 mo)', months: 2 },
              { label: 'Earner (3 mo)', months: 3 },
              { label: 'Household (6 mo)', months: 6 },
            ].map((btn) => (
              <button
                key={btn.months}
                type="button"
                onClick={() => setEmergencyMonths(btn.months)}
                className={`flex-1 py-1.5 px-2 rounded-btn text-xs font-semibold border transition-all ${
                  emergencyMonths === btn.months
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper text-ink border-ink/20 hover:border-ink/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-card bg-paper border border-ink/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60 block">
                Target Airbag Corpus
              </span>
              <span className="text-lg sm:text-xl font-fraunces font-bold text-ink">
                {formatINR(emergencyTarget)}
              </span>
            </div>
            <div className="text-right text-xs">
              <span className="text-ink/70 block">To build in 6 months:</span>
              <span className="font-bold text-accent">{formatINR(monthlyToTarget)} / month</span>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 4: HOW EMIs REALLY WORK */}
      {topicId === 'how_emis_work' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Unmask the hidden costs in "No-Cost EMI" vs upfront payment:
          </p>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">Product Retail Price:</span>
              <span className="font-bold">{formatINR(gadgetPrice)}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={150000}
              step={5000}
              value={gadgetPrice}
              onChange={(e) => setGadgetPrice(Number(e.target.value))}
              className="w-full accent-ink"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-btn bg-paper border border-ink/20 space-y-1">
              <span className="font-bold text-ink block">Option A: Pay Upfront Cash</span>
              <div className="flex justify-between text-ink/70">
                <span>Instant 5% discount:</span>
                <span className="text-sky-dark font-semibold">-{formatINR(upfrontDiscount)}</span>
              </div>
              <div className="flex justify-between font-bold text-ink border-t border-ink/10 pt-1">
                <span>Total Out of Pocket:</span>
                <span>{formatINR(upfrontTotal)}</span>
              </div>
            </div>

            <div className="p-3 rounded-btn bg-paper border border-accent/30 space-y-1">
              <span className="font-bold text-accent block">Option B: 6-Month 'No-Cost' EMI</span>
              <div className="flex justify-between text-ink/70">
                <span>Processing fee:</span>
                <span>+{formatINR(noCostProcessingFee)}</span>
              </div>
              <div className="flex justify-between text-ink/70">
                <span>18% GST on interest:</span>
                <span>+{formatINR(noCostGstOnInterest)}</span>
              </div>
              <div className="flex justify-between font-bold text-accent border-t border-ink/10 pt-1">
                <span>Total Out of Pocket:</span>
                <span>{formatINR(noCostTotal)}</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-btn bg-accent/10 border border-accent/30 text-xs text-accent-dark font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-accent" />
            <span>
              The 'No-Cost EMI' actually costs <strong>{formatINR(emiHiddenExtra)} MORE</strong> than paying upfront with discount!
            </span>
          </div>
        </div>
      )}

      {/* TOPIC 5: COMPOUND INTEREST */}
      {topicId === 'compound_interest' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Compare Person A (starts at age 20, invests 10 yrs) vs Person B (starts at age 30, invests 20 yrs):
          </p>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">Monthly SIP Contribution:</span>
              <span className="font-bold">{formatINR(sipMonthly)}</span>
            </div>
            <input
              type="range"
              min={500}
              max={10000}
              step={500}
              value={sipMonthly}
              onChange={(e) => setSipMonthly(Number(e.target.value))}
              className="w-full accent-ink"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-btn bg-paper border border-ink/20 space-y-1">
              <span className="font-bold text-ink block">Early Bird (Age 20 to 30)</span>
              <p className="text-[11px] text-ink/70">Invests for 10 yrs then stops</p>
              <div className="flex justify-between text-ink/70">
                <span>Total Invested:</span>
                <span>{formatINR(compResult.earlyInvested)}</span>
              </div>
              <div className="flex justify-between font-bold text-ink border-t border-ink/10 pt-1 text-sm">
                <span>Value at Age 50:</span>
                <span className="text-sky-dark">{formatINR(compResult.earlyTotal)}</span>
              </div>
            </div>

            <div className="p-3 rounded-btn bg-paper border border-ink/20 space-y-1">
              <span className="font-bold text-ink block">Late Starter (Age 30 to 50)</span>
              <p className="text-[11px] text-ink/70">Invests for 20 yrs (double time!)</p>
              <div className="flex justify-between text-ink/70">
                <span>Total Invested:</span>
                <span>{formatINR(compResult.lateInvested)}</span>
              </div>
              <div className="flex justify-between font-bold text-ink border-t border-ink/10 pt-1 text-sm">
                <span>Value at Age 50:</span>
                <span>{formatINR(compResult.lateTotal)}</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-btn bg-sky/30 border border-sky-dark/30 text-xs text-ink font-medium">
            Starting 10 years earlier created <strong>{formatINR(compResult.earlyTotal - compResult.lateTotal)} MORE</strong> wealth while investing <strong>HALF</strong> the money!
          </div>
        </div>
      )}

      {/* TOPIC 6: SIP VS LUMP SUM */}
      {topicId === 'sip_vs_lump_sum' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Market Dip Simulation: ₹{sipSum} invested through a market correction (NAV drops 20% then recovers):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-btn bg-paper border border-ink/20 space-y-1">
              <span className="font-bold text-ink block">Lump Sum (₹6,000 on Day 1)</span>
              <span className="text-[11px] text-ink/60 block">Bought @ NAV ₹100: {lumpUnits} units</span>
              <div className="flex justify-between font-semibold pt-1 border-t border-ink/10">
                <span>Final Value:</span>
                <span>{formatINR(lumpValueFinal)} (0%)</span>
              </div>
            </div>

            <div className="p-3 rounded-btn bg-paper border border-ink/20 space-y-1">
              <span className="font-bold text-sky-dark block">Monthly SIP (₹2,000 × 3 mos)</span>
              <span className="text-[11px] text-ink/60 block">Month 2 bought cheap @ ₹80! Total {sipUnits} units</span>
              <div className="flex justify-between font-bold text-ink pt-1 border-t border-ink/10">
                <span>Final Value:</span>
                <span className="text-sky-dark">{formatINR(sipValueFinal)} (+8.3%)</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-ink/75 italic">
            "Rupee-cost averaging automatically acquires more units during a dip, turning volatility into extra profit."
          </p>
        </div>
      )}

      {/* TOPIC 7: INFLATION EATS SAVINGS */}
      {topicId === 'inflation_savings' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Watch inflation steadily erode ₹{savingsDeposit.toLocaleString('en-IN')} over time:
          </p>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">Years in Bank Account:</span>
              <span className="font-bold">{inflationYears} Years</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={inflationYears}
              onChange={(e) => setInflationYears(Number(e.target.value))}
              className="w-full accent-ink"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-btn bg-paper border border-accent/25 space-y-1">
              <span className="font-bold text-accent block">In 3% Savings Account</span>
              <div className="flex justify-between text-ink/70">
                <span>Account Balance:</span>
                <span>{formatINR(bankNominal)}</span>
              </div>
              <div className="flex justify-between font-bold text-accent border-t border-ink/10 pt-1">
                <span>Real Purchasing Power:</span>
                <span>{formatINR(realPurchasingPower)}</span>
              </div>
            </div>

            <div className="p-3 rounded-btn bg-paper border border-sky-dark/30 space-y-1">
              <span className="font-bold text-ink block">In 11% Index Fund</span>
              <div className="flex justify-between text-ink/70">
                <span>Portfolio Balance:</span>
                <span>{formatINR(indexFundNominal)}</span>
              </div>
              <div className="flex justify-between font-bold text-ink border-t border-ink/10 pt-1">
                <span>Real Purchasing Power:</span>
                <span className="text-sky-dark">{formatINR(indexFundReal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 8: RISK VS RETURN */}
      {topicId === 'risk_vs_return' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Match your goal time horizon with the appropriate risk asset mix:
          </p>

          <div className="flex gap-1.5">
            {[
              { id: 'short', label: '< 1 Year (Near)' },
              { id: 'medium', label: '1 - 3 Years' },
              { id: 'long', label: '5+ Years (Growth)' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedHorizon(btn.id as any)}
                className={`flex-1 py-1.5 px-2 rounded-btn text-xs font-semibold border transition-all ${
                  selectedHorizon === btn.id
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper text-ink border-ink/20 hover:border-ink/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="p-3.5 rounded-card bg-paper border border-ink/20 text-xs space-y-2">
            {selectedHorizon === 'short' && (
              <>
                <span className="font-bold text-ink block">100% Fixed Deposit / Liquid Buffer</span>
                <p className="text-ink/80 text-[11px]">
                  Zero market risk. You cannot afford an equity correction when money is needed within 12 months for exams, bike repairs, or rent.
                </p>
              </>
            )}
            {selectedHorizon === 'medium' && (
              <>
                <span className="font-bold text-ink block">70% Debt / FD + 30% Equity Index</span>
                <p className="text-ink/80 text-[11px]">
                  Balanced approach. Preserves capital while dipping a toe into market growth to offset inflation.
                </p>
              </>
            )}
            {selectedHorizon === 'long' && (
              <>
                <span className="font-bold text-ink block">70% Equity Index + 20% FD + 10% Gold</span>
                <p className="text-ink/80 text-[11px]">
                  Growth engine. Short-term drops don't matter because you have 5+ years to let compounding and Indian economic growth multiply wealth.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOPIC 9: GOLD, FD, MUTUAL FUNDS */}
      {topicId === 'gold_fd_mutual_funds' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Allocate your monthly savings across the 3 pillars of Indian finance:
          </p>

          <div className="flex gap-2">
            {[
              { id: 'household', label: 'Household (Gold tilt)' },
              { id: 'student', label: 'Student (Starter MF)' },
              { id: 'earner', label: 'Earner (Growth)' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setPillarMode(btn.id as any)}
                className={`flex-1 py-1.5 px-1.5 rounded-btn text-[11px] font-semibold border transition-all ${
                  pillarMode === btn.id
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper text-ink border-ink/20 hover:border-ink/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-btn bg-paper border border-ink/20 text-center">
              <span className="text-[10px] uppercase font-bold text-ink/60 block">1. Bank FD</span>
              <span className="font-bold text-ink text-sm block mt-0.5">{formatINR(fdAlloc)}</span>
              <span className="text-[10px] text-ink/70">Liquidity & Safety</span>
            </div>

            <div className="p-2.5 rounded-btn bg-paper border border-sand-dark text-center">
              <span className="text-[10px] uppercase font-bold text-ink/60 block">2. Digital Gold</span>
              <span className="font-bold text-ink text-sm block mt-0.5">{formatINR(goldAlloc)}</span>
              <span className="text-[10px] text-ink/70">Crisis Hedge</span>
            </div>

            <div className="p-2.5 rounded-btn bg-paper border border-ink text-center">
              <span className="text-[10px] uppercase font-bold text-ink/60 block">3. Index MF</span>
              <span className="font-bold text-ink text-sm block mt-0.5">{formatINR(mfAlloc)}</span>
              <span className="text-[10px] text-ink/70">Wealth Builder</span>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 10: AVOIDING SCAMS */}
      {topicId === 'scam_safety' && (
        <div className="space-y-3">
          <p className="text-xs text-ink/85">
            Test any investment pitch with the Red Flag Scam Meter:
          </p>

          <div className="space-y-1.5 text-xs">
            {[
              { id: 'flag1', text: '"Guaranteed 20%+ annual returns with zero risk"' },
              { id: 'flag2', text: 'VIP Telegram / WhatsApp tip channel demanding fees' },
              { id: 'flag3', text: 'Earn ₹500/day by liking YouTube videos or review tasks' },
              { id: 'flag4', text: 'Transfer funds to a personal UPI ID or unofficial app' },
              { id: 'flag5', text: 'Not registered or verifiable on SEBI or RBI portals' },
            ].map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 p-2 rounded-btn bg-paper border border-ink/15 cursor-pointer hover:bg-sand/20 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checkedFlags[f.id]}
                  onChange={() => toggleFlag(f.id)}
                  className="rounded text-accent focus:ring-accent"
                />
                <span className="text-xs text-ink">{f.text}</span>
              </label>
            ))}
          </div>

          <div
            className={`p-3 rounded-card border flex items-center justify-between text-xs ${
              flaggedCount === 0
                ? 'bg-sky/20 border-sky-dark/30 text-ink'
                : flaggedCount <= 2
                ? 'bg-sand/40 border-sand-dark text-ink font-semibold'
                : 'bg-accent/15 border-accent text-accent-dark font-bold'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <span className="block font-bold">
                  {flaggedCount === 0
                    ? 'No Red Flags Detected'
                    : flaggedCount <= 2
                    ? 'Suspicious: Exercise Caution'
                    : '100% FRAUD / PONZI TRAP! DO NOT INVEST'}
                </span>
                <span className="text-[11px] font-normal opacity-90">
                  {flaggedCount > 0
                    ? 'Legitimate brokers never guarantee high zero-risk returns. Always verify on sebi.gov.in.'
                    : 'Select any suspicious claim above to check risk level.'}
                </span>
              </div>
            </div>
            <span className="text-sm font-fraunces font-bold shrink-0">{flaggedCount} / 5</span>
          </div>
        </div>
      )}
    </div>
  );
};
