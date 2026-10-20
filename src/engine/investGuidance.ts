/**
 * Educational Investment Guidance Engine.
 * 
 * COMPLIANCE MANDATE:
 * Educational only. Not investment advice. Returns are not guaranteed.
 * Consult a SEBI-registered adviser.
 */

import { UserMode } from './budget';

export interface EmergencyReadiness {
  monthsCovered: number;
  targetMonths: number;
  targetAmount: number;
  currentSavings: number;
  shortfall: number;
  isReady: boolean;
  status: 'critical' | 'building' | 'secure';
}

export function calculateEmergencyReadiness(
  currentSavings: number,
  monthlyExpenses: number,
  targetMonths: number = 6
): EmergencyReadiness {
  if (monthlyExpenses <= 0) {
    return {
      monthsCovered: 0,
      targetMonths,
      targetAmount: 0,
      currentSavings,
      shortfall: 0,
      isReady: true,
      status: 'secure',
    };
  }

  const targetAmount = Math.round(monthlyExpenses * targetMonths);
  const monthsCovered = Number((currentSavings / monthlyExpenses).toFixed(1));
  const shortfall = Math.max(0, targetAmount - currentSavings);
  const isReady = monthsCovered >= targetMonths;

  let status: 'critical' | 'building' | 'secure' = 'building';
  if (monthsCovered < 2) {
    status = 'critical';
  } else if (monthsCovered >= targetMonths) {
    status = 'secure';
  }

  return {
    monthsCovered,
    targetMonths,
    targetAmount,
    currentSavings,
    shortfall,
    isReady,
    status,
  };
}

export type RiskProfile = 'conservative' | 'moderate' | 'growth';

export interface EducationalAssetAllocation {
  fixedIncomePercent: number; // FDs, Liquid Funds, PPF
  equityIndexPercent: number; // Nifty 50 / Broad Index Funds
  goldPercent: number;        // Sovereign Gold Bonds / Gold ETFs
  liquidEmergencyPercent: number; // Bank Savings / Liquid Funds
  rationales: string[];
}

/**
 * Educational asset allocation rule-of-thumb based on persona, risk profile, and horizon.
 */
export function suggestAssetAllocation(
  mode: UserMode,
  risk: RiskProfile,
  horizonYears: number
): EducationalAssetAllocation {
  // If short horizon (< 2 years), capital preservation comes first regardless of risk
  if (horizonYears <= 2) {
    return {
      fixedIncomePercent: 50,
      equityIndexPercent: 10,
      goldPercent: 10,
      liquidEmergencyPercent: 30,
      rationales: [
        'invest.guidance.short_term_capital_preservation',
        'invest.guidance.liquid_accessibility',
      ],
    };
  }

  if (mode === 'student') {
    if (risk === 'growth') {
      return {
        fixedIncomePercent: 20,
        equityIndexPercent: 55,
        goldPercent: 10,
        liquidEmergencyPercent: 15,
        rationales: [
          'invest.guidance.student_long_compounding_horizon',
          'invest.guidance.low_cost_index_learning',
        ],
      };
    }
    return {
      fixedIncomePercent: 40,
      equityIndexPercent: 35,
      goldPercent: 10,
      liquidEmergencyPercent: 15,
      rationales: [
        'invest.guidance.student_balanced_learning',
        'invest.guidance.cushion_exam_transition',
      ],
    };
  }

  if (mode === 'household') {
    if (risk === 'conservative') {
      return {
        fixedIncomePercent: 50,
        equityIndexPercent: 20,
        goldPercent: 20,
        liquidEmergencyPercent: 10,
        rationales: [
          'invest.guidance.family_safety_first',
          'invest.guidance.gold_cultural_hedge',
        ],
      };
    }
    return {
      fixedIncomePercent: 35,
      equityIndexPercent: 40,
      goldPercent: 15,
      liquidEmergencyPercent: 10,
      rationales: [
        'invest.guidance.household_beat_inflation',
        'invest.guidance.children_education_runway',
      ],
    };
  }

  // Earner
  if (risk === 'growth') {
    return {
      fixedIncomePercent: 15,
      equityIndexPercent: 65,
      goldPercent: 10,
      liquidEmergencyPercent: 10,
      rationales: [
        'invest.guidance.early_career_growth_acceleration',
        'invest.guidance.diversified_index_core',
      ],
    };
  }

  return {
    fixedIncomePercent: 30,
    equityIndexPercent: 50,
    goldPercent: 10,
    liquidEmergencyPercent: 10,
    rationales: [
      'invest.guidance.balanced_wealth_accumulation',
      'invest.guidance.tax_efficient_compounding',
    ],
  };
}

/**
 * Educational asset instrument benchmarks with SEBI compliant descriptive metadata
 */
export interface EducationalInstrument {
  id: string;
  nameKey: string;
  category: 'debt' | 'equity' | 'commodity' | 'liquid';
  typicalReturnRange: string;
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high';
  lockIn: string;
  taxNoteKey: string;
  suitabilityKey: string;
}

export const EDUCATIONAL_INSTRUMENTS: EducationalInstrument[] = [
  {
    id: 'liquid_fund',
    nameKey: 'invest.instruments.liquid_fund.name',
    category: 'liquid',
    typicalReturnRange: '6.0% - 6.7%',
    riskLevel: 'low',
    lockIn: 'invest.instruments.liquid_fund.lock_in',
    taxNoteKey: 'invest.instruments.liquid_fund.tax',
    suitabilityKey: 'invest.instruments.liquid_fund.suitability',
  },
  {
    id: 'bank_fd',
    nameKey: 'invest.instruments.bank_fd.name',
    category: 'debt',
    typicalReturnRange: '6.5% - 7.5%',
    riskLevel: 'very_low',
    lockIn: 'invest.instruments.bank_fd.lock_in',
    taxNoteKey: 'invest.instruments.bank_fd.tax',
    suitabilityKey: 'invest.instruments.bank_fd.suitability',
  },
  {
    id: 'index_fund',
    nameKey: 'invest.instruments.index_fund.name',
    category: 'equity',
    typicalReturnRange: '11.0% - 13.0%',
    riskLevel: 'moderate',
    lockIn: 'invest.instruments.index_fund.lock_in',
    taxNoteKey: 'invest.instruments.index_fund.tax',
    suitabilityKey: 'invest.instruments.index_fund.suitability',
  },
  {
    id: 'gold_etf',
    nameKey: 'invest.instruments.gold_etf.name',
    category: 'commodity',
    typicalReturnRange: '8.5% - 10.0%',
    riskLevel: 'moderate',
    lockIn: 'invest.instruments.gold_etf.lock_in',
    taxNoteKey: 'invest.instruments.gold_etf.tax',
    suitabilityKey: 'invest.instruments.gold_etf.suitability',
  },
];
