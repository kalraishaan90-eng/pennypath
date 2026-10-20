import { UserMode, BudgetEnvelope } from '../engine/budget';
import { FinancialGoal, DueReminder, MicroLesson, MarketRateSnapshot, DemoPersona, Transaction } from '../types';

export const INITIAL_ENVELOPES: Record<UserMode, BudgetEnvelope[]> = {
  student: [
    { id: 'env-st-1', categoryKey: 'budget.cat.tuition_books', allocated: 3500, spent: 2800, icon: 'GraduationCap', type: 'need' },
    { id: 'env-st-2', categoryKey: 'budget.cat.food_mess', allocated: 3000, spent: 2950, icon: 'Utensils', type: 'need' },
    { id: 'env-st-3', categoryKey: 'budget.cat.canteen_fun', allocated: 1500, spent: 1850, icon: 'Coffee', type: 'want' },
    { id: 'env-st-4', categoryKey: 'budget.cat.transport', allocated: 1500, spent: 1100, icon: 'Bus', type: 'need' },
    { id: 'env-st-5', categoryKey: 'budget.cat.laptop_goal', allocated: 2500, spent: 2500, icon: 'Target', type: 'goal' },
  ],
  household: [
    { id: 'env-hh-1', categoryKey: 'budget.cat.groceries_ration', allocated: 14000, spent: 12800, icon: 'ShoppingBag', type: 'need' },
    { id: 'env-hh-2', categoryKey: 'budget.cat.utilities_bills', allocated: 6000, spent: 5400, icon: 'Zap', type: 'need' },
    { id: 'env-hh-3', categoryKey: 'budget.cat.kids_education', allocated: 8000, spent: 8000, icon: 'BookOpen', type: 'need' },
    { id: 'env-hh-4', categoryKey: 'budget.cat.household_buffer', allocated: 4000, spent: 2500, icon: 'Shield', type: 'buffer' },
    { id: 'env-hh-5', categoryKey: 'budget.cat.diwali_gold_fund', allocated: 5000, spent: 5000, icon: 'Sparkles', type: 'goal' },
    { id: 'env-hh-6', categoryKey: 'budget.cat.family_dining', allocated: 4000, spent: 4300, icon: 'UtensilsCrossed', type: 'want' },
    { id: 'env-hh-7', categoryKey: 'budget.cat.emergency_stash', allocated: 4000, spent: 4000, icon: 'Lock', type: 'goal' },
  ],
  earner: [
    { id: 'env-er-1', categoryKey: 'budget.cat.pg_rent', allocated: 12000, spent: 12000, icon: 'Home', type: 'need' },
    { id: 'env-er-2', categoryKey: 'budget.cat.food_groceries', allocated: 7000, spent: 6200, icon: 'Utensils', type: 'need' },
    { id: 'env-er-3', categoryKey: 'budget.cat.commute', allocated: 3000, spent: 2700, icon: 'Navigation', type: 'need' },
    { id: 'env-er-4', categoryKey: 'budget.cat.weekend_hangouts', allocated: 4500, spent: 5100, icon: 'PartyPopper', type: 'want' },
    { id: 'env-er-5', categoryKey: 'budget.cat.gadgets_shopping', allocated: 3500, spent: 3000, icon: 'Smartphone', type: 'want' },
    { id: 'env-er-6', categoryKey: 'budget.cat.emergency_sip', allocated: 5000, spent: 5000, icon: 'Coins', type: 'goal' },
    { id: 'env-er-7', categoryKey: 'budget.cat.upskilling_courses', allocated: 3000, spent: 2500, icon: 'Award', type: 'goal' },
  ],
};

export const INITIAL_GOALS: Record<UserMode, FinancialGoal[]> = {
  student: [
    {
      id: 'goal-st-1',
      titleKey: 'goals.items.laptop_fund',
      targetAmount: 48000,
      currentAmount: 24000,
      targetDate: '2026-12-31',
      category: 'education',
      priority: 'high',
    },
    {
      id: 'goal-st-2',
      titleKey: 'goals.items.cert_exam',
      targetAmount: 8000,
      currentAmount: 5000,
      targetDate: '2026-08-15',
      category: 'education',
      priority: 'medium',
    },
  ],
  household: [
    {
      id: 'goal-hh-1',
      titleKey: 'goals.items.emergency_corpus',
      targetAmount: 200000,
      currentAmount: 130000,
      targetDate: '2027-03-31',
      category: 'safety',
      priority: 'high',
    },
    {
      id: 'goal-hh-2',
      titleKey: 'goals.items.diwali_gold_coin',
      targetAmount: 40000,
      currentAmount: 25000,
      targetDate: '2026-11-01',
      category: 'asset',
      priority: 'medium',
    },
    {
      id: 'goal-hh-3',
      titleKey: 'goals.items.school_annual_term',
      targetAmount: 60000,
      currentAmount: 45000,
      targetDate: '2026-07-01',
      category: 'education',
      priority: 'high',
    },
  ],
  earner: [
    {
      id: 'goal-er-1',
      titleKey: 'goals.items.three_month_emergency',
      targetAmount: 120000,
      currentAmount: 75000,
      targetDate: '2026-12-31',
      category: 'safety',
      priority: 'high',
    },
    {
      id: 'goal-er-2',
      titleKey: 'goals.items.first_bike',
      targetAmount: 90000,
      currentAmount: 40000,
      targetDate: '2027-02-28',
      category: 'lifestyle',
      priority: 'medium',
    },
    {
      id: 'goal-er-3',
      titleKey: 'goals.items.nifty_index_corpus',
      targetAmount: 250000,
      currentAmount: 85000,
      targetDate: '2028-03-31',
      category: 'asset',
      priority: 'high',
    },
  ],
};

export const INITIAL_REMINDERS: Record<UserMode, DueReminder[]> = {
  student: [
    { id: 'rem-st-1', titleKey: 'reminders.items.semester_exam_fee', amount: 2200, dueDate: '2026-10-25', category: 'fee', isPaid: false, isRecurring: false },
    { id: 'rem-st-2', titleKey: 'reminders.items.hostel_mess_bill', amount: 3000, dueDate: '2026-11-05', category: 'bill', isPaid: false, isRecurring: true },
    { id: 'rem-st-3', titleKey: 'reminders.items.mobile_recharge', amount: 299, dueDate: '2026-10-28', category: 'bill', isPaid: true, isRecurring: true },
  ],
  household: [
    { id: 'rem-hh-1', titleKey: 'reminders.items.electricity_bill', amount: 2450, dueDate: '2026-10-24', category: 'bill', isPaid: false, isRecurring: true },
    { id: 'rem-hh-2', titleKey: 'reminders.items.piped_gas_cylinder', amount: 950, dueDate: '2026-10-29', category: 'bill', isPaid: false, isRecurring: true },
    { id: 'rem-hh-3', titleKey: 'reminders.items.school_bus_fee', amount: 3200, dueDate: '2026-11-02', category: 'fee', isPaid: false, isRecurring: true },
    { id: 'rem-hh-4', titleKey: 'reminders.items.wifi_broadband', amount: 799, dueDate: '2026-10-22', category: 'subscription', isPaid: true, isRecurring: true },
  ],
  earner: [
    { id: 'rem-er-1', titleKey: 'reminders.items.pg_rent_transfer', amount: 12000, dueDate: '2026-11-01', category: 'bill', isPaid: false, isRecurring: true },
    { id: 'rem-er-2', titleKey: 'reminders.items.index_fund_sip', amount: 5000, dueDate: '2026-11-05', category: 'sip', isPaid: false, isRecurring: true },
    { id: 'rem-er-3', titleKey: 'reminders.items.credit_card_bill', amount: 4850, dueDate: '2026-10-27', category: 'loan', isPaid: false, isRecurring: true },
    { id: 'rem-er-4', titleKey: 'reminders.items.cloud_ai_sub', amount: 1650, dueDate: '2026-10-20', category: 'subscription', isPaid: true, isRecurring: true },
    {
      id: 'rem-er-bike-emi',
      titleKey: 'reminders.items.bike_loan_emi',
      customTitle: 'Bike Loan EMI (Bajaj Pulsar)',
      amount: 3200,
      dueDate: '2026-10-22',
      category: 'loan',
      obligationType: 'emi',
      isPaid: false,
      isRecurring: true,
      emiDetails: {
        principal: 90000,
        annualInterestRate: 11,
        tenureMonths: 36,
        remainingMonths: 22,
        remainingPrincipal: 58500,
      },
    },
  ],
};

export const INITIAL_LESSONS: MicroLesson[] = [
  {
    id: 'lesson-1',
    topicId: 'needs_vs_wants',
    titleKey: 'lessons.lesson1.title',
    tagKey: 'lessons.tags.budgeting',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson1.summary',
    contentKey: 'lessons.lesson1.content',
    takeawayKey: 'lessons.lesson1.takeaway',
    quiz: {
      questionKey: 'lessons.lesson1.quiz_q',
      optionsKeys: [
        'lessons.lesson1.quiz_opt_1',
        'lessons.lesson1.quiz_opt_2',
        'lessons.lesson1.quiz_opt_3',
      ],
      correctOptionIndex: 1, // Smartphone upgrade
      explanationKey: 'lessons.lesson1.quiz_expl',
    },
  },
  {
    id: 'lesson-2',
    topicId: 'rule_50_30_20',
    titleKey: 'lessons.lesson2.title',
    tagKey: 'lessons.tags.budgeting',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson2.summary',
    contentKey: 'lessons.lesson2.content',
    takeawayKey: 'lessons.lesson2.takeaway',
    quiz: {
      questionKey: 'lessons.lesson2.quiz_q',
      optionsKeys: [
        'lessons.lesson2.quiz_opt_1',
        'lessons.lesson2.quiz_opt_2',
        'lessons.lesson2.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Daily Safe-to-Spend
      explanationKey: 'lessons.lesson2.quiz_expl',
    },
  },
  {
    id: 'lesson-3',
    topicId: 'emergency_fund',
    titleKey: 'lessons.lesson3.title',
    tagKey: 'lessons.tags.safety',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson3.summary',
    contentKey: 'lessons.lesson3.content',
    takeawayKey: 'lessons.lesson3.takeaway',
    quiz: {
      questionKey: 'lessons.lesson3.quiz_q',
      optionsKeys: [
        'lessons.lesson3.quiz_opt_1',
        'lessons.lesson3.quiz_opt_2',
        'lessons.lesson3.quiz_opt_3',
      ],
      correctOptionIndex: 1, // Liquid bank FD / sweep-in
      explanationKey: 'lessons.lesson3.quiz_expl',
    },
  },
  {
    id: 'lesson-4',
    topicId: 'how_emis_work',
    titleKey: 'lessons.lesson4.title',
    tagKey: 'lessons.tags.debt',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson4.summary',
    contentKey: 'lessons.lesson4.content',
    takeawayKey: 'lessons.lesson4.takeaway',
    quiz: {
      questionKey: 'lessons.lesson4.quiz_q',
      optionsKeys: [
        'lessons.lesson4.quiz_opt_1',
        'lessons.lesson4.quiz_opt_2',
        'lessons.lesson4.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Processing fee + 18% GST + missed cash discount
      explanationKey: 'lessons.lesson4.quiz_expl',
    },
  },
  {
    id: 'lesson-5',
    topicId: 'compound_interest',
    titleKey: 'lessons.lesson5.title',
    tagKey: 'lessons.tags.investing',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson5.summary',
    contentKey: 'lessons.lesson5.content',
    takeawayKey: 'lessons.lesson5.takeaway',
    quiz: {
      questionKey: 'lessons.lesson5.quiz_q',
      optionsKeys: [
        'lessons.lesson5.quiz_opt_1',
        'lessons.lesson5.quiz_opt_2',
        'lessons.lesson5.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Returns earn returns
      explanationKey: 'lessons.lesson5.quiz_expl',
    },
  },
  {
    id: 'lesson-6',
    topicId: 'sip_vs_lump_sum',
    titleKey: 'lessons.lesson6.title',
    tagKey: 'lessons.tags.investing',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson6.summary',
    contentKey: 'lessons.lesson6.content',
    takeawayKey: 'lessons.lesson6.takeaway',
    quiz: {
      questionKey: 'lessons.lesson6.quiz_q',
      optionsKeys: [
        'lessons.lesson6.quiz_opt_1',
        'lessons.lesson6.quiz_opt_2',
        'lessons.lesson6.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Buys more units when cheap
      explanationKey: 'lessons.lesson6.quiz_expl',
    },
  },
  {
    id: 'lesson-7',
    topicId: 'inflation_savings',
    titleKey: 'lessons.lesson7.title',
    tagKey: 'lessons.tags.basics',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson7.summary',
    contentKey: 'lessons.lesson7.content',
    takeawayKey: 'lessons.lesson7.takeaway',
    quiz: {
      questionKey: 'lessons.lesson7.quiz_q',
      optionsKeys: [
        'lessons.lesson7.quiz_opt_1',
        'lessons.lesson7.quiz_opt_2',
        'lessons.lesson7.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Purchasing power falls ~3%
      explanationKey: 'lessons.lesson7.quiz_expl',
    },
  },
  {
    id: 'lesson-8',
    topicId: 'risk_vs_return',
    titleKey: 'lessons.lesson8.title',
    tagKey: 'lessons.tags.investing',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson8.summary',
    contentKey: 'lessons.lesson8.content',
    takeawayKey: 'lessons.lesson8.takeaway',
    quiz: {
      questionKey: 'lessons.lesson8.quiz_q',
      optionsKeys: [
        'lessons.lesson8.quiz_opt_1',
        'lessons.lesson8.quiz_opt_2',
        'lessons.lesson8.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Safe FD/Liquid fund
      explanationKey: 'lessons.lesson8.quiz_expl',
    },
  },
  {
    id: 'lesson-9',
    topicId: 'gold_fd_mutual_funds',
    titleKey: 'lessons.lesson9.title',
    tagKey: 'lessons.tags.investing',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson9.summary',
    contentKey: 'lessons.lesson9.content',
    takeawayKey: 'lessons.lesson9.takeaway',
    quiz: {
      questionKey: 'lessons.lesson9.quiz_q',
      optionsKeys: [
        'lessons.lesson9.quiz_opt_1',
        'lessons.lesson9.quiz_opt_2',
        'lessons.lesson9.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Gold ETFs or Sovereign Digital Gold
      explanationKey: 'lessons.lesson9.quiz_expl',
    },
  },
  {
    id: 'lesson-10',
    topicId: 'scam_safety',
    titleKey: 'lessons.lesson10.title',
    tagKey: 'lessons.tags.safety',
    readTimeMinutes: 1.5,
    mode: 'all',
    summaryKey: 'lessons.lesson10.summary',
    contentKey: 'lessons.lesson10.content',
    takeawayKey: 'lessons.lesson10.takeaway',
    quiz: {
      questionKey: 'lessons.lesson10.quiz_q',
      optionsKeys: [
        'lessons.lesson10.quiz_opt_1',
        'lessons.lesson10.quiz_opt_2',
        'lessons.lesson10.quiz_opt_3',
      ],
      correctOptionIndex: 0, // Guaranteed high return with zero risk
      explanationKey: 'lessons.lesson10.quiz_expl',
    },
  },
];

export const BENCHMARK_MARKET_SNAPSHOTS: MarketRateSnapshot[] = [
  {
    benchmarkName: 'RBI Policy Repo Rate',
    rateOrValue: '6.50%',
    change: 'Unchanged',
    isPositive: true,
    lastUpdated: 'Oct 2026 Policy Bulletin',
    source: 'Reserve Bank of India (RBI)',
  },
  {
    benchmarkName: '10-Yr India G-Sec Yield',
    rateOrValue: '6.82%',
    change: '-0.04%',
    isPositive: true,
    lastUpdated: '19 Oct 2026 17:00 IST',
    source: 'CCIL / RBI E-Kuber',
  },
  {
    benchmarkName: 'Nifty 50 Index (P/E ~21.4)',
    rateOrValue: '25,280',
    change: '+0.38%',
    isPositive: true,
    lastUpdated: '19 Oct 2026 15:30 IST',
    source: 'NSE India Daily Close',
  },
  {
    benchmarkName: 'Gold 24K (MCX 10g)',
    rateOrValue: '₹76,400',
    change: '+0.25%',
    isPositive: true,
    lastUpdated: '19 Oct 2026 23:00 IST',
    source: 'MCX India Spot',
  },
];

export const DEMO_PERSONAS: Record<'rohan' | 'meena' | 'aarav', DemoPersona> = {
  rohan: {
    id: 'rohan',
    name: 'Rohan Sharma',
    roleTitleKey: 'demo.rohan.role',
    mode: 'earner',
    age: 24,
    bioKey: 'demo.rohan.bio',
    monthlyIncome: 38000,
    savingsGoal: {
      titleKey: 'goals.items.emergency_corpus',
      targetAmount: 50000,
      currentAmount: 22000,
      monthlyTarget: 5000,
      targetDate: '2027-04-30',
      category: 'safety',
    },
    obligations: [
      {
        title: 'PG Rent & Maintenance',
        type: 'rent',
        amount: 12000,
        dueDay: 5,
        isPaid: true,
      },
      {
        title: 'Bike Loan EMI (Bajaj Pulsar)',
        type: 'emi',
        amount: 3200,
        dueDay: 22,
        isPaid: false,
        emiDetails: {
          principal: 90000,
          annualInterestRate: 11,
          tenureMonths: 36,
          remainingMonths: 22,
          remainingPrincipal: 58500,
        },
      },
      {
        title: 'High-speed Fiber Broadband',
        type: 'utilities',
        amount: 999,
        dueDay: 15,
        isPaid: true,
      },
      {
        title: 'Neighborhood Gym Membership',
        type: 'subscription',
        amount: 1500,
        dueDay: 1,
        isPaid: true,
      },
      {
        title: 'OTT Bundle (Netflix & Hotstar)',
        type: 'subscription',
        amount: 499,
        dueDay: 20,
        isPaid: false,
      },
    ],
  },
  meena: {
    id: 'meena',
    name: 'Meena Patel',
    roleTitleKey: 'demo.meena.role',
    mode: 'household',
    age: 38,
    bioKey: 'demo.meena.bio',
    monthlyIncome: 55000,
    savingsGoal: {
      titleKey: 'goals.items.diwali_gold_fund',
      targetAmount: 60000,
      currentAmount: 35000,
      monthlyTarget: 5000,
      targetDate: '2026-11-15',
      category: 'asset',
    },
    obligations: [
      {
        title: 'Monthly Ration & Kirana Store',
        type: 'other',
        amount: 14000,
        dueDay: 3,
        isPaid: true,
      },
      {
        title: 'Children School Tuition & Bus',
        type: 'other',
        amount: 8000,
        dueDay: 10,
        isPaid: true,
      },
      {
        title: 'Neighborhood Chit Fund / BC',
        type: 'chit',
        amount: 5000,
        dueDay: 15,
        isPaid: true,
      },
      {
        title: 'Electricity & Piped Gas Bill',
        type: 'utilities',
        amount: 4500,
        dueDay: 12,
        isPaid: true,
      },
      {
        title: 'Family Health & Term Insurance',
        type: 'insurance',
        amount: 3500,
        dueDay: 25,
        isPaid: false,
      },
    ],
  },
  aarav: {
    id: 'aarav',
    name: 'Aarav Verma',
    roleTitleKey: 'demo.aarav.role',
    mode: 'student',
    age: 20,
    bioKey: 'demo.aarav.bio',
    monthlyIncome: 12000,
    savingsGoal: {
      titleKey: 'goals.items.laptop_fund',
      targetAmount: 45000,
      currentAmount: 16800,
      monthlyTarget: 2400,
      targetDate: '2027-02-28',
      category: 'education',
    },
    obligations: [
      {
        title: 'Hostel Mess & Tiffin Bill',
        type: 'other',
        amount: 3500,
        dueDay: 5,
        isPaid: true,
      },
      {
        title: '5G Unlimited Mobile Recharge',
        type: 'utilities',
        amount: 399,
        dueDay: 12,
        isPaid: true,
      },
      {
        title: 'LeetCode & Cloud Dev Lab Sub',
        type: 'subscription',
        amount: 499,
        dueDay: 8,
        isPaid: true,
      },
      {
        title: 'Metro Pass & Two-Wheeler Petrol',
        type: 'other',
        amount: 1200,
        dueDay: 1,
        isPaid: true,
      },
    ],
  },
};

/**
 * Generates ~60 days of realistic transactions (Aug 21 - Oct 20, 2026) for the chosen persona.
 * Reflects authentic Indian merchant names, UPI apps, salaries, and realistic mid-month spending.
 */
export function generate60DaysTransactions(personaId: 'rohan' | 'meena' | 'aarav'): Transaction[] {
  const transactions: Transaction[] = [];
  let txIndex = 1;

  const createTx = (
    dateStr: string,
    amount: number,
    type: 'income' | 'expense',
    categoryKey: string,
    description: string,
    isObligation = false
  ): Transaction => ({
    id: `tx-${personaId}-${txIndex++}`,
    date: dateStr,
    amount,
    type,
    categoryKey,
    description,
    isObligation,
  });

  if (personaId === 'rohan') {
    // --- Month 1: September 2026 ---
    // Salary credit
    transactions.push(createTx('2026-09-01', 38000, 'income', 'budget.cat.income', 'Salary Credit - TechCorp Solutions'));
    // Fixed obligations
    transactions.push(createTx('2026-09-01', 1500, 'expense', 'budget.cat.weekend_hangouts', 'Gym Membership Renewal - Cult.Fit', true));
    transactions.push(createTx('2026-09-05', 12000, 'expense', 'budget.cat.pg_rent', 'PG Rent & Maintenance - UPI Owner', true));
    transactions.push(createTx('2026-09-10', 3200, 'expense', 'budget.cat.commute', 'Bajaj Auto Finance Bike EMI (Auto-debit)', true));
    transactions.push(createTx('2026-09-15', 999, 'expense', 'budget.cat.commute', 'Airtel Xstream Fiber Broadband', true));
    transactions.push(createTx('2026-09-20', 499, 'expense', 'budget.cat.weekend_hangouts', 'Netflix India Auto-pay', true));
    transactions.push(createTx('2026-09-05', 5000, 'expense', 'budget.cat.emergency_sip', 'Goa & Emergency Fund Transfer'));

    // Daily & weekly expenses for September
    transactions.push(createTx('2026-09-02', 340, 'expense', 'budget.cat.food_groceries', 'Swiggy Biryani Delivery'));
    transactions.push(createTx('2026-09-03', 40, 'expense', 'budget.cat.food_groceries', 'Chai & bun maska - Tapri UPI'));
    transactions.push(createTx('2026-09-04', 500, 'expense', 'budget.cat.commute', 'Namma Metro Card Recharge'));
    transactions.push(createTx('2026-09-06', 720, 'expense', 'budget.cat.food_groceries', 'Blinkit Instant Groceries'));
    transactions.push(createTx('2026-09-08', 650, 'expense', 'budget.cat.commute', 'HPCL Petrol Pump Bike Fuel'));
    transactions.push(createTx('2026-09-09', 180, 'expense', 'budget.cat.food_groceries', 'Subway Veg Sub Lunch'));
    transactions.push(createTx('2026-09-11', 45, 'expense', 'budget.cat.food_groceries', 'Evening Chai with colleagues'));
    transactions.push(createTx('2026-09-12', 1450, 'expense', 'budget.cat.weekend_hangouts', 'Weekend Dinner - Social Koramangala'));
    transactions.push(createTx('2026-09-14', 380, 'expense', 'budget.cat.food_groceries', 'Zepto Dairy & Snacks'));
    transactions.push(createTx('2026-09-16', 350, 'expense', 'budget.cat.weekend_hangouts', 'Movie Ticket - PVR Cinemas'));
    transactions.push(createTx('2026-09-17', 220, 'expense', 'budget.cat.food_groceries', 'McDonalds Burger & Fries'));
    transactions.push(createTx('2026-09-18', 700, 'expense', 'budget.cat.commute', 'IndianOil Petrol Fill-up'));
    transactions.push(createTx('2026-09-19', 850, 'expense', 'budget.cat.gadgets_shopping', 'Fastrack USB-C Braided Cable & Adapter'));
    transactions.push(createTx('2026-09-22', 290, 'expense', 'budget.cat.food_groceries', 'Zomato Lunch Bowl'));
    transactions.push(createTx('2026-09-24', 50, 'expense', 'budget.cat.food_groceries', 'Chai & samosa break'));
    transactions.push(createTx('2026-09-25', 500, 'expense', 'budget.cat.commute', 'Metro SmartCard Top-up'));
    transactions.push(createTx('2026-09-26', 1600, 'expense', 'budget.cat.weekend_hangouts', 'Team Dinner Splitwise UPI'));
    transactions.push(createTx('2026-09-28', 420, 'expense', 'budget.cat.food_groceries', 'BigBasket Staples Order'));
    transactions.push(createTx('2026-09-29', 240, 'expense', 'budget.cat.food_groceries', 'Apollo Pharmacy multivitamin'));

    // --- Month 2: October 2026 (Mid-Month state: up to Oct 20) ---
    // Salary credit
    transactions.push(createTx('2026-10-01', 38000, 'income', 'budget.cat.income', 'Salary Credit - TechCorp Solutions'));
    // Fixed obligations
    transactions.push(createTx('2026-10-01', 1500, 'expense', 'budget.cat.weekend_hangouts', 'Gym Membership Renewal - Cult.Fit', true));
    transactions.push(createTx('2026-10-05', 12000, 'expense', 'budget.cat.pg_rent', 'PG Rent & Maintenance - UPI Owner', true));
    transactions.push(createTx('2026-10-10', 3200, 'expense', 'budget.cat.commute', 'Bajaj Auto Finance Bike EMI (Auto-debit)', true));
    transactions.push(createTx('2026-10-15', 999, 'expense', 'budget.cat.commute', 'Airtel Xstream Fiber Broadband', true));
    transactions.push(createTx('2026-10-05', 5000, 'expense', 'budget.cat.emergency_sip', 'Goa & Emergency Fund Transfer'));

    // Mid-month October daily expenses
    transactions.push(createTx('2026-10-02', 450, 'expense', 'budget.cat.food_groceries', 'Swiggy Weekend treat'));
    transactions.push(createTx('2026-10-03', 45, 'expense', 'budget.cat.food_groceries', 'Tea & biscuits at corner shop'));
    transactions.push(createTx('2026-10-04', 500, 'expense', 'budget.cat.commute', 'Metro Card Recharge via PhonePe'));
    transactions.push(createTx('2026-10-06', 680, 'expense', 'budget.cat.food_groceries', 'Zepto Quick Grocery'));
    transactions.push(createTx('2026-10-08', 750, 'expense', 'budget.cat.commute', 'BPCL Petrol Bike Refill'));
    transactions.push(createTx('2026-10-11', 1250, 'expense', 'budget.cat.weekend_hangouts', 'Friend Birthday Dinner Share'));
    transactions.push(createTx('2026-10-13', 290, 'expense', 'budget.cat.food_groceries', 'EatFit Healthy Lunch'));
    transactions.push(createTx('2026-10-14', 60, 'expense', 'budget.cat.food_groceries', 'Chai & evening puff'));
    transactions.push(createTx('2026-10-16', 890, 'expense', 'budget.cat.food_groceries', 'Blinkit Weekend provisions'));
    transactions.push(createTx('2026-10-17', 1200, 'expense', 'budget.cat.gadgets_shopping', 'Boat Bluetooth Earphones'));
    transactions.push(createTx('2026-10-18', 420, 'expense', 'budget.cat.food_groceries', 'Pizza Slice & Beverage'));
    transactions.push(createTx('2026-10-19', 700, 'expense', 'budget.cat.commute', 'Bike Petrol Top-up'));
    transactions.push(createTx('2026-10-20', 40, 'expense', 'budget.cat.food_groceries', 'Morning Ginger Chai Tapri'));
  } else if (personaId === 'meena') {
    // --- Month 1: September 2026 ---
    transactions.push(createTx('2026-09-01', 55000, 'income', 'budget.cat.income', 'Monthly Household Fund Transfer'));
    transactions.push(createTx('2026-09-03', 14000, 'expense', 'budget.cat.groceries_ration', 'Monthly Kirana & Whole Grains - Laxmi Provision', true));
    transactions.push(createTx('2026-09-05', 5000, 'expense', 'budget.cat.diwali_gold_fund', 'Diwali Gold Savings Deposit'));
    transactions.push(createTx('2026-09-10', 8000, 'expense', 'budget.cat.kids_education', 'School Quarter Fee & Van - D.A.V Public', true));
    transactions.push(createTx('2026-09-12', 4500, 'expense', 'budget.cat.utilities_bills', 'Electricity Board & Adani Piped Gas', true));
    transactions.push(createTx('2026-09-15', 5000, 'expense', 'budget.cat.household_buffer', 'Mahila Chit Fund Monthly Kitty', true));
    transactions.push(createTx('2026-09-25', 3500, 'expense', 'budget.cat.household_buffer', 'Star Health Family Floater Premium', true));

    // Daily & weekly September
    transactions.push(createTx('2026-09-02', 320, 'expense', 'budget.cat.groceries_ration', 'Subzi Mandi Fresh Veggies'));
    transactions.push(createTx('2026-09-04', 1400, 'expense', 'budget.cat.groceries_ration', 'Amul Milk 30-day coupon sheet'));
    transactions.push(createTx('2026-09-07', 450, 'expense', 'budget.cat.kids_education', 'Navneet Notebooks & Camlin Geometry box'));
    transactions.push(createTx('2026-09-09', 280, 'expense', 'budget.cat.groceries_ration', 'Local Dairy Paneer & Curd'));
    transactions.push(createTx('2026-09-11', 650, 'expense', 'budget.cat.household_buffer', 'Plumber Tap Leakage Repair'));
    transactions.push(createTx('2026-09-13', 1850, 'expense', 'budget.cat.family_dining', 'Family Sunday Thali Dinner'));
    transactions.push(createTx('2026-09-16', 310, 'expense', 'budget.cat.groceries_ration', 'Fruit vendor apples & bananas'));
    transactions.push(createTx('2026-09-18', 420, 'expense', 'budget.cat.household_buffer', 'Chemist BP & Calcium tablets'));
    transactions.push(createTx('2026-09-21', 950, 'expense', 'budget.cat.utilities_bills', 'Indane Gas Cylinder Delivery'));
    transactions.push(createTx('2026-09-23', 380, 'expense', 'budget.cat.groceries_ration', 'Weekly Vegetable Market'));
    transactions.push(createTx('2026-09-26', 800, 'expense', 'budget.cat.family_dining', 'Snacks & Sweets for visiting guests'));
    transactions.push(createTx('2026-09-28', 550, 'expense', 'budget.cat.household_buffer', 'Kids Project Craft Materials'));

    // --- Month 2: October 2026 (Mid-Month state: up to Oct 20) ---
    transactions.push(createTx('2026-10-01', 55000, 'income', 'budget.cat.income', 'Monthly Household Fund Transfer'));
    transactions.push(createTx('2026-10-03', 14000, 'expense', 'budget.cat.groceries_ration', 'Monthly Kirana & Ration - Laxmi Provision', true));
    transactions.push(createTx('2026-10-05', 5000, 'expense', 'budget.cat.diwali_gold_fund', 'Diwali Gold Savings Deposit'));
    transactions.push(createTx('2026-10-10', 8000, 'expense', 'budget.cat.kids_education', 'School Term Fee - D.A.V Public', true));
    transactions.push(createTx('2026-10-12', 4500, 'expense', 'budget.cat.utilities_bills', 'State Electricity Board Online Payment', true));
    transactions.push(createTx('2026-10-15', 5000, 'expense', 'budget.cat.household_buffer', 'Mahila Chit Fund Monthly Kitty', true));

    // Mid-month October daily
    transactions.push(createTx('2026-10-02', 340, 'expense', 'budget.cat.groceries_ration', 'Fresh Spinach, Coriander & Veggies'));
    transactions.push(createTx('2026-10-04', 1450, 'expense', 'budget.cat.groceries_ration', 'Mother Dairy Monthly Token'));
    transactions.push(createTx('2026-10-07', 480, 'expense', 'budget.cat.kids_education', 'School Drawing Books & Color sets'));
    transactions.push(createTx('2026-10-09', 260, 'expense', 'budget.cat.groceries_ration', 'Farm fresh tomatoes & potatoes'));
    transactions.push(createTx('2026-10-13', 2100, 'expense', 'budget.cat.family_dining', 'Family Weekend Dinner'));
    transactions.push(createTx('2026-10-16', 1200, 'expense', 'budget.cat.household_buffer', 'Diwali Diyas & Festive Decoration prep'));
    transactions.push(createTx('2026-10-17', 450, 'expense', 'budget.cat.groceries_ration', 'Dry Fruits for Diwali Sweets'));
    transactions.push(createTx('2026-10-18', 350, 'expense', 'budget.cat.household_buffer', 'Household disinfectant & cleaners'));
    transactions.push(createTx('2026-10-20', 220, 'expense', 'budget.cat.groceries_ration', 'Morning Fresh Milk & Bread'));
  } else {
    // --- Aarav (Student) ---
    // --- Month 1: September 2026 ---
    transactions.push(createTx('2026-09-01', 12000, 'income', 'budget.cat.income', 'Monthly Allowance from Parents UPI'));
    transactions.push(createTx('2026-09-01', 1200, 'expense', 'budget.cat.transport', 'Metro SmartCard 30-Day Pass', true));
    transactions.push(createTx('2026-09-05', 3500, 'expense', 'budget.cat.food_mess', 'Hostel Mess Monthly Fees', true));
    transactions.push(createTx('2026-09-05', 2400, 'expense', 'budget.cat.laptop_goal', 'Coding Laptop Target Savings'));
    transactions.push(createTx('2026-09-08', 499, 'expense', 'budget.cat.tuition_books', 'LeetCode Premium Monthly Subscription', true));
    transactions.push(createTx('2026-09-12', 399, 'expense', 'budget.cat.transport', 'Jio 5G Unlimited 84 Days Recharge', true));

    // Daily & weekly September
    transactions.push(createTx('2026-09-02', 50, 'expense', 'budget.cat.canteen_fun', 'Campus Canteen Chai & Samosa'));
    transactions.push(createTx('2026-09-03', 120, 'expense', 'budget.cat.tuition_books', 'Engineering Lab Manual Printouts'));
    transactions.push(createTx('2026-09-06', 75, 'expense', 'budget.cat.canteen_fun', 'Hostel Maggi & Nescafe at Night'));
    transactions.push(createTx('2026-09-07', 350, 'expense', 'budget.cat.tuition_books', 'Second-hand DSA Algorithm Textbook'));
    transactions.push(createTx('2026-09-09', 40, 'expense', 'budget.cat.canteen_fun', 'Lemon tea with study group'));
    transactions.push(createTx('2026-09-11', 180, 'expense', 'budget.cat.canteen_fun', 'Shawarma roll with roommates'));
    transactions.push(createTx('2026-09-14', 250, 'expense', 'budget.cat.canteen_fun', 'Weekend Student Movie Discount Ticket'));
    transactions.push(createTx('2026-09-16', 60, 'expense', 'budget.cat.canteen_fun', 'Patties & Cold Drink at Canteen'));
    transactions.push(createTx('2026-09-18', 150, 'expense', 'budget.cat.tuition_books', 'Spiral Notebooks Pack of 3'));
    transactions.push(createTx('2026-09-20', 95, 'expense', 'budget.cat.canteen_fun', 'Splitwise auto-settle coffee'));
    transactions.push(createTx('2026-09-22', 45, 'expense', 'budget.cat.canteen_fun', 'Evening Bun Maska'));
    transactions.push(createTx('2026-09-24', 200, 'expense', 'budget.cat.transport', 'Shared Auto Fare across city'));
    transactions.push(createTx('2026-09-27', 80, 'expense', 'budget.cat.canteen_fun', 'Dosa at hostel canteen'));
    transactions.push(createTx('2026-09-29', 110, 'expense', 'budget.cat.tuition_books', 'Exam blue pens & clipboard'));

    // --- Month 2: October 2026 (Mid-Month state: up to Oct 20) ---
    transactions.push(createTx('2026-10-01', 12000, 'income', 'budget.cat.income', 'Monthly Allowance from Parents UPI'));
    transactions.push(createTx('2026-10-01', 1200, 'expense', 'budget.cat.transport', 'Metro Pass Monthly Top-up', true));
    transactions.push(createTx('2026-10-05', 3500, 'expense', 'budget.cat.food_mess', 'Hostel Mess Monthly Fees', true));
    transactions.push(createTx('2026-10-05', 2400, 'expense', 'budget.cat.laptop_goal', 'Coding Laptop Target Savings'));
    transactions.push(createTx('2026-10-08', 499, 'expense', 'budget.cat.tuition_books', 'LeetCode Premium Monthly Subscription', true));
    transactions.push(createTx('2026-10-12', 399, 'expense', 'budget.cat.transport', 'Jio Recharge Payment', true));

    // Mid-month October daily
    transactions.push(createTx('2026-10-02', 65, 'expense', 'budget.cat.canteen_fun', 'Canteen Tea & Vada Pav'));
    transactions.push(createTx('2026-10-04', 160, 'expense', 'budget.cat.tuition_books', 'Final Project Report Binding'));
    transactions.push(createTx('2026-10-06', 45, 'expense', 'budget.cat.canteen_fun', 'Hostel late night chai'));
    transactions.push(createTx('2026-10-09', 220, 'expense', 'budget.cat.canteen_fun', 'Biryani with college friends'));
    transactions.push(createTx('2026-10-13', 80, 'expense', 'budget.cat.canteen_fun', 'Samosas & Cold Drink'));
    transactions.push(createTx('2026-10-15', 150, 'expense', 'budget.cat.transport', 'Metro SmartCard Quick Add'));
    transactions.push(createTx('2026-10-17', 280, 'expense', 'budget.cat.canteen_fun', 'Weekend Pizza Slice & Drink'));
    transactions.push(createTx('2026-10-19', 70, 'expense', 'budget.cat.canteen_fun', 'Hostel Maggi & Chai break'));
    transactions.push(createTx('2026-10-20', 35, 'expense', 'budget.cat.canteen_fun', 'Morning Canteen Chai'));
  }

  return transactions;
}
