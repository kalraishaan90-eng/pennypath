# PennyPath — Comprehensive Product Design & Architecture Review

> **Evaluator Profile:** Senior Product Designer & Staff Systems Architect (Judging for Seed/Series-A FinTech Investor Panel)  
> **Target Application:** PennyPath — Bharat Personal Finance PWA  
> **Evaluation Date:** October 2026  
> **Status:** Review Only — No code changes executed.

---

## Executive Summary & Investor Scorecard

| Dimension | Investor Grade | Assessment |
| :--- | :---: | :--- |
| **First 10-Second Clarity** | **B+** | Hero daily figure is mathematically solid but visually competed with by sibling controls and debug simulation banners. |
| **Design System & Palette** | **B** | Beautiful "Passbook" motif, but impaired by severe WCAG AA contrast failures on muted text (2.1:1 - 3.1:1) and motif overuse. |
| **Localization (Hindi)** | **C+** | Translation files lack 200+ screen keys, leaving core navigation and calculators showing raw programmatic strings (`nav.home`). |
| **Engine Architecture** | **A-** | Core engine algorithms (`finance.ts`, `budget.ts`, `homeEngine.ts`) are exemplary, but money math has leaked into 5 UI components. |
| **Production Readiness** | **B-** | Parallel data repositories exist; 800+ lines of insights & pitch code are orphaned; RLS has cross-tenant foreign key gaps. |

---

# SECTION A: Design Critique

## 1. First 10 Seconds Assessment: Does Home Communicate "Safe to Spend Today" Instantly?

### The Verdict: Partially (3 to 5-Second Delay)
When an investor panel opens PennyPath on mobile or desktop, the primary value proposition — **"How much can I safely spend before dinner without derailing my rent or savings?"** — is communicated, but its impact is diluted by three visual competitors:

1. **The Demo Simulation Banner Steals Dominance:**
   - Sitting directly between the header and the Hero Card, `DemoTransactionSimulator.tsx` renders a high-contrast sand-colored banner with prominent `+₹200` and `-₹200` buttons. The human eye instinctively tracks interactive colored buttons before static typography.
2. **Dual Metric Tension (Hero vs. Savings Alert):**
   - In the earner demo (Rohan), variable spending is at 97% (`₹83/day` left). Simultaneously, the adjacent `SavingsTrackerCard.tsx` turns bright maroon with an "Alert" badge and a projected deficit. The user's eye oscillates between the two numbers rather than anchoring on `₹83`.
3. **Hero Visual Urgency Mismatch:**
   - At `₹83/day` with 12 days remaining out of ₹38,000 income, the user is in a critical cash squeeze. Yet `HeroSafeToSpendCard.tsx` renders the big number in standard `#0F414A` (ink) rather than an urgent warning amber/maroon state. The critical banner only triggers when `variableRemaining <= 0`.

---

## 2. Visual Hierarchy Per Screen

### A. Home Dashboard (`src/components/home/HomeDashboard.tsx`)
- **Strengths:** 2-column desktop grid organizes information logically (daily spending + category caps on the left; savings trajectory + health score on the right; dues on the bottom).
- **Weaknesses:**
  - On mobile (<1024px), the stack is 6 cards deep. The user must scroll past 3 full viewports to see upcoming bills.
  - The Quick-Add FAB (`fixed bottom-6 right-6`) collides visually with the bottom navigation bar and creates redundancy with the central `nav.add` button.

### B. Budget / Plan Screen (`src/components/BudgetScreen.tsx`)
- **Strengths:** Top 4 summary metrics (Income, Total Spent, Remaining, Health Score) establish strong context.
- **Weaknesses:**
  - The Recharts Donut chart on the right column has an oversized inner radius and generic color cycling (`CHART_COLORS`), visually disconnecting it from the envelope list on the left.
  - Envelope action buttons (`+₹100`, `+₹500`, `Add Expense`, `Adjust Limit`) are crowded into a single line per row, causing horizontal wrapping and inconsistent card heights.

### C. Financial Health Detail & Calculators (`src/components/CalculatorsScreen.tsx`)
- **Strengths:** Amortization tables and SIP growth trajectory bar charts provide high credibility.
- **Weaknesses:**
  - Range sliders use default browser track styling with minimal tactile feedback.
  - The Real Purchasing Power callout card uses high-saturation maroon fills (`bg-sand/30 border-ink/15`) that compete with the primary output figures.

### D. Goals Screen (`src/components/GoalsScreen.tsx`)
- **Strengths:** Card progress bars and priority badges are clean and legible.
- **Weaknesses:**
  - Missing empty state when no goals exist.
  - Action buttons (`+₹500`, `+₹2000`, `Contribute`) are fixed amounts that make little sense for a ₹2,00,000 corpus vs a ₹5,000 goal.

---

## 3. Palette Conformance & Contrast Violations

The design system specifies five foundational tokens:
- **Paper:** `#EFE8DF` (Background / Surface)
- **Ink:** `#0F414A` (Primary typography & structures)
- **Accent:** `#7F0303` (Maroon brand motif & danger/alerts)
- **Sand:** `#D8BA98` (Warm secondary fills & borders)
- **Sky:** `#96C0CE` (Active callouts & goal accents)

### Strict Contrast Failures (Failing WCAG 2.1 AA — Minimum 4.5:1 for Normal Text):

| File | Component / Line | Element | Foreground | Background | Actual Contrast | Required | Verdict |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `AppShell.tsx` | Line 123 | Sidebar footer version tag | `#0F414A` @ 50% (`text-ink/50`) | `#EFE8DF` (Paper) | **2.47 : 1** | 4.5 : 1 | **FAIL (Severe)** |
| `AppShell.tsx` | Line 96 | Nav auxiliary link | `#0F414A` @ 60% (`text-ink/60`) | `#EFE8DF` (Paper) | **3.18 : 1** | 4.5 : 1 | **FAIL** |
| `FinancialHealthScoreCard.tsx` | Line 88, 116 | Warning health badge text | `#C29D74` (sand-dark) | `#EFE8DF` + 15% tint | **2.12 : 1** | 4.5 : 1 | **FAIL (Severe)** |
| `HeroSafeToSpendCard.tsx` | Line 55 | "Daily allowance" badge | `#0F414A` @ 60% (`text-ink/60`) | `#0F414A` @ 5% on Paper | **3.05 : 1** | 4.5 : 1 | **FAIL** |
| `CategoryCapsCard.tsx` | Line 90 | Subtitle text | `#0F414A` @ 60% (`text-ink/60`) | `#EFE8DF` (Paper) | **3.18 : 1** | 4.5 : 1 | **FAIL** |
| `CategoryCapsCard.tsx` | Line 120 | Divider slash (` / `) | `#0F414A` @ 40% (`text-ink/40`) | `#EFE8DF` (Paper) | **1.94 : 1** | 4.5 : 1 | **FAIL (Severe)** |
| `SavingsTrackerCard.tsx` | Lines 85, 94 | Uppercase stat labels | `#0F414A` @ 60% (`text-ink/60`) | `#EFE8DF` (Paper) | **3.18 : 1** | 4.5 : 1 | **FAIL** |
| `Next7DaysDuesStrip.tsx` | Line 127 | Category pill tag | `#0F414A` @ 50% (`text-ink/50`) | `#0F414A` @ 5% on Paper | **2.38 : 1** | 4.5 : 1 | **FAIL (Severe)** |
| `BudgetScreen.tsx` | Line 343 | Subtext denominator | `#0F414A` @ 50% (`text-ink/50`) | `#EFE8DF` (Paper) | **2.47 : 1** | 4.5 : 1 | **FAIL (Severe)** |
| `DesignShowcase.tsx` | Line 323 | Test status pill | `#15803d` (`text-green-700`) | `#EFE8DF` (Paper) | N/A | Token | **OFF-PALETTE COLOR** |

> [!WARNING]
> Tailwind arbitrary opacity modifiers (`text-ink/40`, `text-ink/50`, `text-ink/60`) blended over the warm `#EFE8DF` paper background drop luminance contrast well below the legal WCAG AA 4.5:1 threshold. Muted text must be pinned to a solid hex (e.g. `#1B5B67` or `rgba(15, 65, 74, 0.82)` = 5.2:1).

---

## 4. Type Scale & Spacing Consistency

1. **Heading vs Body Pairing:**
   - Headings correctly apply Fraunces (`font-fraunces`), providing an authentic banking/passbook editorial feel.
   - However, numbers inside cards oscillate between `font-fraunces` (`HeroSafeToSpendCard`), standard sans-serif Inter (`CategoryCapsCard`), and mixed tabular numerals.
2. **Spacing Grid Discrepancies:**
   - 8pt grid is respected in container gaps (`gap-4 sm:gap-6`), but broken in micro-elements (`text-[9px]`, `text-[11px]`, `w-13 h-13` custom tailwind classes).
   - In `CategoryCapsCard.tsx`, category name labels have varying vertical alignments when icons wrap.
3. **Tap Targets:**
   - While `.touch-target` (44px) is declared in `index.css`, several buttons override it with `py-0.5 px-2` or `text-[10px]`, causing missed taps on small mobile touchscreens.

---

## 5. Motif Usage & Overuse Analysis

The Passbook **Diagonal Maroon/Paper Awning Stripe** (`repeating-linear-gradient(-45deg, #7F0303, ...)`):
- **Current Locations:**
  1. Full-width sticky top band in `AppShell.tsx`
  2. Absolute top border of `HeroSafeToSpendCard.tsx`
  3. Inside the progress bar fill of `HeroSafeToSpendCard.tsx`
  4. Top sticky band in `LandingPage.tsx`
  5. Stepper bar in `OnboardingWizard.tsx`
  6. Variant badge in `Badge.tsx`
  7. Top border on all stub cards in `Stubs.tsx`
- **Critique:**
  The awning stripe is a striking brand asset, but **stacking three stripes simultaneously within the initial 400px of scroll** (Top viewport banner + Card header border + Progress bar fill) creates optical vibration (Moiré effect).
- **Recommendation:**
  Reserve the awning stripe strictly for the **global app banner** and **completed milestone cards**. Replace the progress bar fill inside `HeroSafeToSpendCard` with a solid `#0F414A` or `#7F0303` fill with rounded ends.

---

## 6. Mobile Viewport (360px) vs. Desktop (1024px+)

- **Mobile (360px width test):**
  - **Bottom Navigation Overlap:** The `QuickAddFAB` sits at `bottom-6 right-6`. On mobile devices (<1024px), the fixed bottom navigation bar also occupies the bottom screen real estate, causing the FAB to partially obscure card content or sit awkwardly right above the bottom tab bar.
  - **Simultaneous "Add" CTAs:** Mobile users see two different "+" buttons on screen at the same time: one in the exact center of the bottom navigation bar (`nav.add`), and one floating on the bottom right (`QuickAddFAB`).
  - **Horizontal Chip Scrolling:** In `DemoTransactionSimulator.tsx`, buttons wrap into 3 awkward vertical lines on 360px screens.
- **Desktop (1024px+):**
  - **Sidebar vs Main Content:** The fixed left sidebar (`w-64`) is clean and stable.
  - **Dues Strip Stretching:** On wide desktop screens (1440px+), `Next7DaysDuesStrip` spans the full 2 columns. A 3-item grid stretches bills across wide aspect ratios, leaving awkward negative space in each card.

---

## 7. Hindi (Devanagari) Layout & Font Rendering Issues

1. **Ascender/Descender Clipping from `leading-none`:**
   - In `AppShell.tsx:51`, `AppShell.tsx:138`, and `HeroSafeToSpendCard.tsx:62`, classes with `leading-none` or `leading-tight` crop upper vowel matras (े, ै, ो, ौ, ं) and lower conjuncts (ु, ू, ृ).
2. **Missing Devanagari Glyph Fallbacks in Fraunces Headings:**
   - When language is toggled to Hindi, elements styled with `font-fraunces` fall back to the system serif or Noto Sans Devanagari. The difference in x-height causes noticeable layout reflow and jitter when switching languages.
3. **Hardcoded Date Locales:**
   - In `GoalsScreen.tsx:163`: `toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })` hardcodes the English locale. When the user selects Hindi, goals still display "Aug 2026" instead of "अगस्त 2026".
4. **Text Expansion Budget:**
   - Hindi phrases are on average 25% wider than English equivalents.
   - Example: In `CategoryCapsCard.tsx`, "Within limit" (12 chars) becomes "सीमा के भीतर" (12 chars, but wider glyph footprint), causing the status badge and currency numbers to crowd each other on screens under 390px.

---

## 8. Ranked Design Findings

| Rank | Severity | File & Component | Finding Description |
| :---: | :---: | :--- | :--- |
| **D-01** | **CRITICAL** | `AppShell.tsx` (`<nav>`) | **Missing i18n keys render raw code in navigation:** Desktop sidebar and mobile bottom nav render `nav.home`, `nav.plan`, `nav.add`, `nav.invest`, `nav.more`. Disastrous for investor demo. |
| **D-02** | **CRITICAL** | `AppShell.tsx` / `QuickAddFAB.tsx` | **Conflicting Dual Add CTAs on Mobile:** Floating action button overlaps bottom nav bar and duplicates the primary central navigation icon. |
| **D-03** | **MAJOR** | `HeroSafeToSpendCard.tsx` | **Visual Over-Saturation of Awning Stripe:** 3 competing diagonal stripe patterns visible in a single 250px vertical block. |
| **D-04** | **MAJOR** | Whole app (`text-ink/40-60`) | **Severe WCAG Contrast Violations:** Subtext, denominators, and captions drop to 1.94:1 - 3.18:1 against `#EFE8DF` paper. |
| **D-05** | **MAJOR** | `FinancialHealthScoreCard.tsx` | **Warning Badge Illegibility:** Amber/sand-dark text `#C29D74` on Paper has 2.12:1 contrast ratio, failing accessibility standards. |
| **D-06** | **MAJOR** | `AppShell.tsx`, `HeroCard.tsx` | **Hindi Matra Clipping:** `leading-none` and `leading-tight` truncate Devanagari vowel marks on high-density displays. |
| **D-07** | **MINOR** | `DesignShowcase.tsx:323` | **Off-Palette Tailwind Color:** Uses standard Tailwind `text-green-700 dark:text-green-300` instead of design token ink/paper/accent. |
| **D-08** | **MINOR** | `BudgetScreen.tsx` | **Card Button Crowding:** 4 action buttons packed horizontally wrap onto multiple lines on mid-sized tablet displays. |
| **D-09** | **MINOR** | `GoalsScreen.tsx:163` | **Hardcoded English Date Locale:** English month names rendered even when user is in Hindi mode. |
| **D-10** | **MINOR** | `DemoTransactionSimulator.tsx` | **Demo Visual Intrusion:** Debug simulation controls look like production banking features and dominate the top of Home. |

---

# SECTION B: Code Review

## 1. Money Math Outside `/src/engine`

The architecture enforces: *All financial arithmetic must reside strictly in `/src/engine`.* Five critical breaches were identified:

1. **`src/components/home/PlanScreenModal.tsx` (Lines 25–26):**
   ```ts
   const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
   const unallocated = monthlyIncome - totalAllocated;
   ```
   *Violation:* Aggregating allocations and computing unallocated budget in a presentation modal.
2. **`src/components/BudgetScreen.tsx` (Lines 52–59):**
   ```ts
   const totalAllocated = envelopes.reduce((acc, e) => acc + e.allocated, 0);
   const totalSpent = envelopes.reduce((acc, e) => acc + e.spent, 0);
   const remainingBudget = monthlyIncome - totalSpent;
   const goalCommitments = envelopes.filter(e => e.type === 'goal').reduce((acc, e) => acc + e.allocated, 0);
   ```
   *Violation:* Budget remainder, utilization, and goal commitments calculated directly in React render loop.
3. **`src/components/BudgetScreen.tsx` (Line 327):**
   ```ts
   formatINR(env.spent - env.allocated)
   ```
   *Violation:* Over-budget deficit subtraction in inline JSX.
4. **`src/components/GoalsScreen.tsx` (Lines 84–92):**
   ```ts
   const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
   const requiredMonthly = Math.ceil(remainingAmount / monthsRemaining);
   const progressPercent = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100));
   ```
   *Violation:* Goal pace, shortfall, and required monthly contribution computed inside component helper.
5. **`src/components/InvestLabScreen.tsx` (Line 32):**
   ```ts
   const monthlyExpenses = Math.round((profile?.monthlyIncome || 30000) * 0.7);
   ```
   *Violation:* Heuristic expense estimation calculated inline with float multiplier `0.7`.

---

## 2. Float Money Precision Risks

JavaScript IEEE-754 floating-point arithmetic causes rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`).
- **`src/engine/currency.ts` (Line 66):**
  `parseINR` uses `parseFloat(sanitized)`. When parsing decimal Rupee inputs, floats enter the data stream.
- **`src/ui/Money.tsx` (Line 86):**
  `const rupees = inPaise ? numericAmount / 100 : numericAmount;` performs float division.
- **Dual Conflicting `formatINR` Implementations:**
  - `src/engine/currency.ts:15` returns a string: `formatINR(amount: number, options: FormatINROptions): string`
  - `src/ui/Money.tsx:26` returns an object: `formatINR(rupees: number, options): { formattedNumber, isNegative, symbol }`
  This naming collision creates import confusion and subtle runtime formatting inconsistencies.

---

## 3. Missing i18n Keys & Missing Namespaces Audit

A systematic comparison between codebase usage and `src/i18n/locales/en.json` revealed **over 200 missing translation keys**:

| Missing Namespace / Key Set | Calling File(s) | Impact |
| :--- | :--- | :--- |
| `nav.home`, `nav.plan`, `nav.add`, `nav.invest`, `nav.more` | `AppShell.tsx`, `Stubs.tsx` | Main app navigation displays raw dot-notation strings. |
| `common.viewDesign` | `AppShell.tsx` | Sidebar footer displays raw `common.viewDesign`. |
| `budget.*` (`title`, `monthly_income`, `total_spent`, `remaining`, `add_envelope`, `type_*`) | `BudgetScreen.tsx` | Whole budget screen shows raw keys. Only `budget.cat.*` exists in JSON. |
| `calculators.*` (`tab_emi`, `tab_sip`, `tab_compound`, `emi.*`, `sip.*`, `compound.*`) | `CalculatorsScreen.tsx` | Entire calculator suite shows un-translated keys. |
| `goals.*` (`title`, `subtitle`, `create_goal`, `priority_*`, `monthly_target_needed`) | `GoalsScreen.tsx` | Entire goals screen shows un-translated keys. |
| `invest.*` (`title`, `compliance_*`, `emergency_*`, `asset_*`, `risk_*`, `allocation_*`) | `InvestLabScreen.tsx` | Entire investment guidance screen shows un-translated keys. |
| `lessons.*` (`title`, `subtitle`, `minutes`, `completed`, `quiz_title`, `check_answer`) | `MicroLessonsScreen.tsx` | Micro-lessons screen displays raw keys. |
| Hardcoded English Strings | `SavingsTrackerCard.tsx:123`, `Next7DaysDuesStrip.tsx:147`, `AddExpenseSheet.tsx:140,187`, `PlanScreenModal.tsx:61,87` | "Deficit/Surplus", "Due: ", "Presets:", "Spent: ", "Monthly Income" hardcoded in English. |

---

## 4. Missing Empty & Error States

1. **`src/components/GoalsScreen.tsx`:** If the user has 0 goals, `goals.map()` renders nothing. No empty state component (`EmptyState.tsx`) or "Create your first goal" prompt.
2. **`src/components/InvestLabScreen.tsx`:** If market feed or benchmarks fail to load, grid renders blank boxes.
3. **`src/components/MicroLessonsScreen.tsx`:** `useState<MicroLesson>(lessons[0] || null)` assumes lessons always exist. If `lessons` is empty, accessing `selectedLesson.quiz` throws an unhandled `TypeError: Cannot read properties of null` and crashes the entire screen.
4. **Missing Top-Level Error Boundary in `src/main.tsx`:** If any child component throws during render, the React tree unmounts to a completely blank white screen.

---

## 5. Row Level Security (RLS) & Multi-Tenant Disconnect

In `supabase/migrations/20261020000000_initial_schema.sql`:
1. **Foreign Key Tenant Isolation Gaps:**
   - **`plan_lines` policy:** `create policy "plan_lines_insert_own" on public.plan_lines for insert with check (auth.uid() = user_id);`  
     *Vulnerability:* It validates `user_id = auth.uid()`, but does **NOT** verify that `plan_id` belongs to `auth.uid()`. An authenticated attacker can insert plan lines linking into another tenant's budget plan ID.
   - **`transactions` & `reminders`:** Policies do not verify that referenced `category_id` or `obligation_id` belong to the same `auth.uid()`.
2. **Repository Disconnect:**
   - `src/data/repository.ts` contains the complete PostgreSQL Supabase schema, but `src/repository/index.ts` hardcodes `export const repository: IPennyPathRepository = new LocalSeededRepository()`. The production Supabase cloud database is completely disconnected from the active UI.

---

## 6. Secrets & Environment Variables

- **Status:** **PASS (Clean)**.
- No service role keys, Supabase master secrets, or credentials are hardcoded in source files.
- `src/auth/supabase.ts` correctly consumes `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, gracefully defaulting to `isSupabaseConfigured = false`.

---

## 7. Unhandled Promise Rejections & Async Safety

Multiple asynchronous handler functions omit `try / catch` blocks:
- **`HomeDashboard.tsx`:**
  - `handleAddExpense` (Line 67): `await repository.updateEnvelopeSpent(...)` is unhandled.
  - `handleSimulateChange` (Line 74): `await repository.updateEnvelopeSpent(...)` is unhandled.
  - `handleToggleDuePaid` (Line 81): `await repository.toggleReminderPaid(...)` is unhandled.
  - `handleResetDemo` (Line 88): `await repository.resetSeedData(...)` is unhandled.
- **`App.tsx`:**
  - `onComplete` (Line 33): `await refreshData()` is unhandled.
  - `onSelectSuccess` (Lines 70, 112): `await refreshData()` is unhandled.
- **`BudgetScreen.tsx`:**
  - `handleQuickAdd` (Line 73): `await updateEnvelopeSpent(...)` is unhandled.
  - `handleSaveIncome` (Line 77): `await updateIncome(...)` is unhandled.
  - `updateEnvelopeAllocation` (Line 397): Called unawaited and unhandled inside `prompt` callback.

---

## 8. Accessibility Violations (WCAG 2.1 AA)

1. **`window.prompt` UX Anti-Pattern (`BudgetScreen.tsx:393`):**
   `const newAlloc = prompt('Enter new allocation limit (₹):', ...)`  
   Browser modal popups cannot be styled, are inaccessible to assistive tech, and break PWA full-screen execution.
2. **Non-Semantic Radio Group (`AddExpenseSheet.tsx:160–193`):**
   Category envelope selector is a grid of `<button>` elements without `role="radiogroup"` / `role="radio"` and missing `aria-checked`.
3. **Missing Progress Bar Labels:**
   `HeroSafeToSpendCard.tsx:84` declares `role="progressbar"` with `aria-valuenow`, but omits `aria-label` or `aria-labelledby`.
4. **Calculators Ratio Bar Inaccessible (`CalculatorsScreen.tsx:230`):**
   Principal vs Interest ratio bar is rendered as unlabelled `<div>` elements with zero screen reader affordance.

---

## 9. Dead Code & Orphaned Architecture

The repository contains substantial orphaned code that is compiled but never executed:
1. **`src/components/Header.tsx` (168 lines):** Legacy header completely superseded by `AppShell.tsx`.
2. **`src/components/Footer.tsx` (45 lines):** Superseded by `AppShell.tsx`.
3. **`src/components/NavTabs.tsx` (50 lines):** Superseded by `AppShell.tsx`.
4. **`src/components/RemindersScreen.tsx` (365 lines):** A fully built screen that is never imported or routed in `App.tsx`.
5. **`src/components/insights/` (7 components, ~800 lines):** `InsightsScreen.tsx`, `SpendingPaceLineCard.tsx`, `WeeklySummaryCard.tsx`, `MonthOverMonthBarsCard.tsx`, `HealthScoreDetailPage.tsx`, `WhereYouCanSaveCards.tsx`, `CategoryBreakdownCard.tsx` — entirely unrouted!
6. **`src/components/pitch/DemoGuidePanel.tsx` (393 lines):** Investor presentation helper with live timer and step script — never rendered!
7. **`src/pages/Stubs.tsx` (`PlanPage`, `InvestPage`, `MorePage`):** Unused export stubs.
8. **`src/context/PWAContext.tsx`:** Provider never mounted in `main.tsx`.

---

## 10. Engine Test Coverage Gaps

While `engine.test.ts` (17 tests), `finance.test.ts` (19 tests), and `homeEngine.test.ts` (9 tests) pass, significant coverage holes exist:

| Engine File | Lines of Code | Existing Tests | Coverage Gaps |
| :--- | :---: | :---: | :--- |
| `src/engine/insightsEngine.ts` | 890 LOC | **0** | Entirely untested (spending pace, month-over-month trends, category breakdowns). |
| `src/engine/remindersEngine.ts` | 420 LOC | **0** | Entirely untested (classified dues, RFC 5545 iCalendar generation, next due dates). |
| `src/engine/calculators.ts` | ~600 LOC | 5 tests | Zero tests for amortization schedule rounding drift across 240+ months; no tests for 0 tenure, extreme interest rates, or zero-return SIPs. |
| `src/engine/investGuidance.ts` | 180 LOC | 2 tests | No tests for division-by-zero when monthly expenses = 0; no boundary tests for horizons > 20 yrs. |
| `src/engine/currency.ts` | 76 LOC | 5 tests | No tests for negative symbol placements (`-₹500` vs `₹-500`) or malformed strings (`₹ 1.2.3`). |

---

# SECTION C: Top 10 Fixes Ranked by (Demo Impact / Effort)

This ranking optimizes for what will immediately elevate a **5-minute investor panel pitch**, divided by engineering effort required.

$$\text{Priority Score} = \frac{\text{Pitch Impact (1–10)}}{\text{Effort (1 = Minutes, 5 = Hours)}}$$

| Rank | Fix Title | File(s) & Component(s) | Impact | Effort | Score | Description |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | **Add Missing i18n Keys for Navigation & Core Screens** | `src/i18n/locales/en.json`, `hi.json`, `AppShell.tsx` | 10 | 1 | **10.0** | Fixes raw `nav.home`, `nav.plan`, `nav.add`, `nav.invest`, `nav.more` in sidebar & bottom nav. Immediate visual Polish. |
| **2** | **Mount the Pre-Built `<DemoGuidePanel />` & Fix Nested Router** | `src/main.tsx`, `src/App.tsx`, `DemoGuidePanel.tsx` | 9.5 | 1 | **9.5** | Removes duplicate `<BrowserRouter>` in `App.tsx` and mounts the existing pitch guide with presenter timer and fast demo reset. |
| **3** | **Route `/add` to `AddExpenseSheet` instead of Disabled Stub** | `src/App.tsx`, `src/pages/Stubs.tsx`, `AppShell.tsx` | 9.0 | 1 | **9.0** | Tapping the center "+" on bottom nav currently displays a "Feature disabled in Phase 1" card. Route it to open `AddExpenseSheet`. |
| **4** | **Fix High-Severity Contrast Failures on Muted Text** | `tailwind.config.js`, `HeroCard.tsx`, `HealthCard.tsx` | 8.5 | 1 | **8.5** | Replace `text-ink/50` and `text-ink/60` with solid `#1B5B67` or `text-ink/85` (reaches 5.2:1 contrast) and fix `#C29D74` badge text. |
| **5** | **Replace `window.prompt` with In-App Allocation Modal** | `src/components/BudgetScreen.tsx:393` | 8.5 | 1.5 | **5.7** | Replace native browser `prompt()` dialog on "Adjust Limit" with a styled passbook-themed modal dialog. |
| **6** | **Eliminate Leaked Money Math Outside Engine** | `PlanScreenModal.tsx:25`, `BudgetScreen.tsx:52`, `GoalsScreen.tsx:84` | 8.0 | 2 | **4.0** | Move `.reduce()` and shortfall math from `PlanScreenModal`, `BudgetScreen`, and `GoalsScreen` into `budget.ts` / `homeEngine.ts`. |
| **7** | **Fix Hindi Clipping & Hardcoded English Strings** | `AppShell.tsx`, `SavingsTrackerCard.tsx`, `Next7DaysDuesStrip.tsx` | 8.5 | 2.5 | **3.4** | Remove `leading-none` on Hindi headers, translate "Deficit/Surplus", "Due: ", and "Presets: ", and fix date locale formatting. |
| **8** | **Wrap Application in `<ErrorBoundary>` & Add Empty States** | `src/main.tsx`, `GoalsScreen.tsx`, `MicroLessonsScreen.tsx` | 7.5 | 2 | **3.75** | Add global crash shield to `main.tsx` and prevent unhandled `null` crashes when lessons or goals arrays are reset. |
| **9** | **Expose Orphaned `InsightsScreen` and `RemindersScreen`** | `src/App.tsx`, `src/layouts/AppShell.tsx` | 7.5 | 2.5 | **3.0** | Add routes for the 7 completed insights cards and reminders screen so investors can explore the full depth of the app. |
| **10** | **Purge Dead Code & Patch RLS Foreign-Key Tenant Isolation** | `src/components/Header.tsx`, `Footer.tsx`, `NavTabs.tsx`, `initial_schema.sql` | 7.0 | 2.5 | **2.8** | Delete 500+ lines of unused legacy components and add `and exists (select 1 from ... user_id = auth.uid())` to PostgreSQL RLS policies. |

---

## Recommended Decision Next Steps

You can now pick any subset of the prioritized items above to implement. The top 4 fixes alone (`#1` through `#4`) take under **45 minutes total** and will instantly transform the application from feeling like an early prototype with broken strings and contrast bugs into an investor-ready, institutional-grade FinTech showcase.
