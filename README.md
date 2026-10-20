# Pennypath

**Pennypath** is a personal finance management platform built for India. It helps individuals and families take control of their finances through intelligent envelope budgeting, all while keeping data private and completely offline.

## Problem

Many Indians struggle to track spending, save consistently, and plan for future financial goals without feeling overwhelmed by complex financial tools. Western budgeting rules (like the 50/30/20 rule) often break in Indian contexts where rent, EMIs, and family expenses can take 60%+ of income. There's a need for a financial platform that:

- Adapts to Indian lifestyles and expense categories
- Works 100% offline (including airplane mode)
- Provides culturally relevant envelope budgeting (rent, chai, mess, EMIs, chit funds)
- Keeps all financial data private and encrypted on the user's device
- Helps users avoid debt traps and understand EMI costs transparently

## Who It Helps

| User Type | Description |
| :--- | :--- |
| **Students** | Managing monthly pocket money, hostel mess, study books, and campus life |
| **Households** | Managing family ration, kids' school fees, utilities, chit funds, and festive gold savings |
| **First-Job Earners** | Managing first monthly salary, PG rent, bike EMI, weekend outings, and starter investments |

## Feature List

### Core Features
- **100% Offline Capable** - Works anywhere without internet, including airplane mode
- **Envelope Budgeting** - Smart Indian expense envelopes for rent, chai, mess, and EMIs
- **Zero Data Collection** - All records stay strictly encrypted on your local device
- **Demo Mode** - Explore with realistic demo data (~60 days of authentic Indian transactions)
- **Language Support** - Toggle between English (English) and Hindi (हिंदी)

### Budget Management
- **Monthly Income Tracking** - Take-home salary & net earnings
- **Fixed Obligations** - Auto-summed from obligations list (rent, EMIs, chit funds, bills)
- **Savings Target** - Goal contribution & emergency fund
- **Disposable Allowance (D)** - Daily safe-to-spend limit (Disposable / 30)
- **Category Caps** - Top 5 categories with spent vs cap tracking

### Financial Planning
- **Engine Recommended Fixes** - Adjust savings, trim fixed costs, extend timeline, increase income
- **What-If Simulation** - Temporary changes are local and never affect live ledger until confirmed
- **Plan Saving** - Save plan to home dashboard

### Calculators Hub
- **EMI Calculator** - Calculate monthly installments, total interest, amortization schedule
- **Goal Calculator** - Determine monthly SIP required to achieve future financial targets
- **Compound Growth & SIP** - Compare lump sum and monthly SIP growth with inflation adjustment

### Insights & Health
- **Financial Health Score** - Four pillars: savings rate, budget discipline, goal cushion, bills & dues
- **Month-over-Month Comparison** - Spend vs Income vs Saved across active months
- **Spending Pace vs Ideal Pace** - Cumulative daily expenditure compared against linear budget run-rate
- **Category Breakdown** - Ranked spending & envelope distribution

### Reminders & Due Dates
- **Upcoming Bills & EMIs** - Track recurring commitments
- **Notification Alerts** - Get alerts 3 days and 1 day before payments are due
- **Snooze Reminders** - 1 day or 3 days snooze option

### Investment Lab
- **Emergency Fund Readiness** - Step 1: Ensure 3-6 month safety buffer is funded
- **Asset Allocation Simulator** - Step 2: Simulate ideal asset mix between debt, equities, gold, and liquid funds
- **SEBI Compliance** - Educational asset allocation simulator. No real money transactions or stock tips.

### Micro-Lessons
- **Bite-sized Personal Finance** - <= 90 seconds lessons with knowledge checks
- **Topics**: Needs vs Wants, 50/30/20 adaptation for India, Emergency Funds, How EMIs work, Compound Interest, SIP vs Lump Sum, Inflation, Risk vs Return, The Bharat Trio (Gold, FD, Mutual Funds)

### Navigation
- Home, Budget, Plan, Insights, Add, Goals, Calculators, Reminders, Invest Lab, Lessons, More

## Architecture Diagram

```mermaid
graph TD
    subgraph Frontend
        A[React] -- TypeScript -- B[Vite]
        B -- CSS -- C[TailwindCSS]
        B -- Icons -- D[lucide-react]
        i18n[react-i18next] -- Locale Files[en.json, hi.json]
    end

    subgraph Engine
        F[finance.ts] -- Math G[homeEngine.ts] -- H[budget.ts]
        I[calculators.ts] -- Formulas J[compoundEngine.ts]
    end

    subgraph Data
        K[LocalSeededRepository] -- Demo Data L[seed.sql]
        M[Supabase] -- Anon Key VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY
    end

    A -->|uses| i18n
    A -->|connects| M
    A -->|reads/writes| K
    F -->|provides| G
    G -->|uses| H
    I -->|uses| J
    K -->|seeds| L
```

## Engine Formulas

### EMI Calculation (Reducing Balance)
```
E = P × [ r(1 + r)^n ] / [ (1 + r)^n - 1 ]

Where:
- E = Monthly EMI
- P = Principal loan amount
- r = Monthly interest rate (Annual Rate / 12 / 100)
- n = Loan tenure in months

Total Interest = (E × n) - P
Total Payable = E × n
```

### SIP Goal Calculation (with Inflation Adjustment)
```
FV_adjusted = Target × (1 + inflation)^years

Monthly SIP = FV_adjusted / [ (((1 + r)^n - 1) / r) × (1 + r)]

Where:
- FV_adjusted = Target corpus adjusted for inflation
- r = Monthly return rate
- n = Total months
- inflation = Annual inflation rate
```

### Daily Disposable Allowance
```
D = Income - Fixed - Savings
Daily Allowance = D / 30
```

### Savings Health Tier
- **Excellent**: 20%+ savings rate
- **Fair**: 10-20% savings rate  
- **Needs Attention**: < 10% savings rate

## Test Instructions

### Running Tests
```bash
# Run all tests once
npm test -- --run

# Run tests in watch mode
npm test:watch
```

### Test Coverage
Currently 238 tests across 21 test files covering:
- Engine algorithms (finance, home, budget, calculators, reminders, insights)
- Repository and data layer
- UI components and screens
- Pitch mode and demo flow
- Hindi localization and accessibility

### Adding New Tests
Tests are written using Vitest with React Testing Library. Engine tests follow patterns in `src/engine/__tests__/`. All new components should have corresponding test coverage.

## Demo Mode Instructions

### Starting Demo
1. On the landing page, click **"Try Demo"**
2. Select a persona: **Rohan** (first-job earner), **Meena** (household manager), or **Aarav** (engineering student)
3. The app seeds with ~60 days of authentic Indian transactions, obligations, goals, and mid-month balances

### Demo Personas
| Persona | Age | Monthly Income | Role |
| :--- | :--- | :--- | :--- |
| **Rohan Sharma** | 24 yrs | ₹38,000 / month | First-Job Earner |
| **Meena Patel** | 38 yrs | ₹55,000 / month | Household Manager |
| **Aarav Verma** | 20 yrs | ₹12,000 / month | Engineering Student |

### Exiting Demo
- Click the **"Demo mode"** chip in the header
- Or select **"Exit demo"** from the profile menu

### Demo Data Seedlings
Demo data includes:
- ~60 days of transactions across relevant categories
- Active obligations (EMIs, chit funds, recurring bills)
- Financial goals with targets and timelines
- Mid-month balance calculations
- Realistic spending patterns

## Compliance Note

> **PennyPath Bharat Edition • Zero Data Collection • 100% Offline**

- All financial data remains strictly on the user's device
- No data is collected, transmitted, or stored externally unless explicitly opted via Supabase sync (opt-in only)
- The application works completely offline - all features function without internet connectivity
- No service role keys, Supabase master secrets, or credentials are hardcoded in source files
- VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are client-only exposed variables
- SEBI-compliant educational investment simulator - no real money transactions or stock tips

## Roadmap

| Phase | Features |
| :--- | :--- |
| **Q4 2026** | Supabase sync for cross-device (opt-in), Enhanced Hindi localization, Investment goals |
| **Q1 2027** | Bank account integration (UPI), Recurring payment auto-detection, Tax summary reports |
| **Q2 2027** | Insurance planning, Credit sco
