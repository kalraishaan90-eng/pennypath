export interface RiskQuizOption {
  text: string;
  subtext?: string;
  score: number; // 1 to 5
}

export interface RiskQuizQuestion {
  id: string;
  categoryKey: 'horizon' | 'income_stability' | 'reaction_drop' | 'goal_type' | 'experience' | 'dependents';
  title: string;
  question: string;
  options: RiskQuizOption[];
}

export const RISK_QUIZ_QUESTIONS: RiskQuizQuestion[] = [
  {
    id: 'q1',
    categoryKey: 'horizon',
    title: 'Time Horizon',
    question: 'How long do you plan to keep your invested money untouched before needing it?',
    options: [
      { text: 'Under 1 year', subtext: 'Very short-term; capital safety is primary', score: 1 },
      { text: '1 to 3 years', subtext: 'Short-term buffer or known near-future expense', score: 2 },
      { text: '3 to 5 years', subtext: 'Medium-term goal like higher studies or down payment', score: 3 },
      { text: '5 to 10 years', subtext: 'Long-term wealth building; can ride cycles', score: 4 },
      { text: 'More than 10 years', subtext: 'Ultra long-term; maximum compounding runway', score: 5 },
    ],
  },
  {
    id: 'q2',
    categoryKey: 'income_stability',
    title: 'Income Stability',
    question: 'How consistent and predictable is your monthly income or cash inflow?',
    options: [
      { text: 'Unpredictable / Allowance', subtext: 'Student or dependent with no steady income', score: 1 },
      { text: 'Variable / Freelance', subtext: 'Gig, freelance, or seasonal income that fluctuates', score: 2 },
      { text: 'Moderate stability', subtext: 'Small business or commission-dependent job', score: 3 },
      { text: 'Steady monthly salary', subtext: 'Regular salaried job in an established company', score: 4 },
      { text: 'Highly secure & predictable', subtext: 'Tenured employment with emergency savings buffer', score: 5 },
    ],
  },
  {
    id: 'q3',
    categoryKey: 'reaction_drop',
    title: 'Reaction to a 20% Drop',
    question: 'If the broader stock market drops 20% in a month and your portfolio declines, what is your first instinct?',
    options: [
      { text: 'Sell everything immediately', subtext: 'Cut losses instantly to protect remaining cash', score: 1 },
      { text: 'Sell a portion to reduce risk', subtext: 'Feel stressed and shift some money to fixed deposits', score: 2 },
      { text: 'Wait and do nothing', subtext: 'Feel uncomfortable, but wait patiently for market recovery', score: 3 },
      { text: 'Continue regular SIPs unaffected', subtext: 'Understand market cycles and keep investing steadily', score: 4 },
      { text: 'Invest extra cash at lower prices', subtext: 'View broad market downturns as attractive entry points', score: 5 },
    ],
  },
  {
    id: 'q4',
    categoryKey: 'goal_type',
    title: 'Goal Type',
    question: 'What is the primary objective for this pool of money?',
    options: [
      { text: 'Capital preservation first', subtext: 'Cannot tolerate any drop in principal value', score: 1 },
      { text: 'Beat inflation with low risk', subtext: 'Slightly better than savings accounts with steady capital safety', score: 2 },
      { text: 'Balanced growth & stability', subtext: 'Moderate capital growth with a debt cushion', score: 3 },
      { text: 'Long-term wealth creation', subtext: 'Focus on index compounding over 5+ years', score: 4 },
      { text: 'Maximum long-term compounding', subtext: 'Aggressive growth trajectory over 10+ years', score: 5 },
    ],
  },
  {
    id: 'q5',
    categoryKey: 'experience',
    title: 'Investing Experience',
    question: 'What is your prior experience with investments in mutual funds or financial markets?',
    options: [
      { text: 'Zero experience', subtext: 'Only used bank savings accounts or cash till date', score: 1 },
      { text: 'Beginner / Bank FDs', subtext: 'Have placed money in fixed deposits or recurring deposits', score: 2 },
      { text: 'Starter in mutual funds', subtext: 'Have run a basic SIP for less than 2 years', score: 3 },
      { text: 'Comfortable with index funds', subtext: 'Invested in mutual funds through market ups and downs for 2–4 years', score: 4 },
      { text: 'Seasoned investor', subtext: 'Active investor for 5+ years with asset allocation experience', score: 5 },
    ],
  },
  {
    id: 'q6',
    categoryKey: 'dependents',
    title: 'Financial Dependents',
    question: 'How many individuals rely directly on your income for essential daily expenses?',
    options: [
      { text: '3 or more dependents', subtext: 'Sole breadwinner for a large family', score: 1 },
      { text: '2 dependents', subtext: 'Supporting parents or a spouse and child', score: 2 },
      { text: '1 dependent', subtext: 'Supporting one family member', score: 3 },
      { text: 'Shared household income', subtext: 'Dual-earner home sharing major expenses', score: 4 },
      { text: 'No dependents', subtext: 'Financially independent student or single earner', score: 5 },
    ],
  },
];

export interface BandExplanation {
  band: 'conservative' | 'balanced' | 'growth';
  title: string;
  line1: string;
  line2: string;
  color: string;
  badgeBg: string;
}

export const BAND_EXPLANATIONS: Record<'conservative' | 'balanced' | 'growth', BandExplanation> = {
  conservative: {
    band: 'conservative',
    title: 'Conservative',
    line1: 'You prioritize capital preservation and peace of mind over high market returns.',
    line2: 'Your ideal mix focuses on debt and liquid instruments with minimal exposure to market volatility.',
    color: '#0F414A',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  balanced: {
    band: 'balanced',
    title: 'Balanced',
    line1: 'You seek a sensible middle ground between wealth accumulation and downside cushioning.',
    line2: 'A diversified blend of broad index equity and steady fixed income helps smooth market cycles.',
    color: '#2563EB',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  growth: {
    band: 'growth',
    title: 'Growth',
    line1: 'You have a long-term investment horizon and can absorb short-term market dips for compounding.',
    line2: 'A broad index-equity heavy approach maximizes compounding over multi-year horizons.',
    color: '#7C3AED',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
  },
};
