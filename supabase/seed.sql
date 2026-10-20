-- ============================================================================
-- PennyPath Supabase Seed Script
-- ============================================================================
-- Seed realistic demonstration and testing data.
-- All monetary amounts stored as integer PAISE (bigint), never floats.
-- 1 Rupee = 100 Paise.
-- ============================================================================

do $$
declare
  -- User 1: Aarav Sharma (Earner / Tech Professional)
  u1_id uuid := 'a1111111-1111-4111-8111-111111111111'::uuid;
  -- User 2: Priya Patel (Household Manager)
  u2_id uuid := 'b2222222-2222-4222-8222-222222222222'::uuid;

  -- User 1 Category IDs
  u1_cat_rent uuid;
  u1_cat_groc uuid;
  u1_cat_trans uuid;
  u1_cat_bills uuid;
  u1_cat_health uuid;
  u1_cat_eat uuid;
  u1_cat_ent uuid;
  u1_cat_shop uuid;
  u1_cat_gold uuid;
  u1_cat_other uuid;

  -- User 2 Category IDs
  u2_cat_groc uuid;
  u2_cat_bills uuid;

  -- User 1 Obligation IDs
  u1_obl_rent uuid;
  u1_obl_emi uuid;
  u1_obl_sub uuid;

  -- User 1 Budget Plan ID
  u1_plan_id uuid;
begin
  -- --------------------------------------------------------------------------
  -- 1. AUTH USERS (In environments with auth.users)
  -- --------------------------------------------------------------------------
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    insert into auth.users (id, email, raw_user_meta_data, created_at)
    values
      (u1_id, 'aarav.sharma@example.com', '{"display_name": "Aarav Sharma", "mode": "earner", "language": "hi"}'::jsonb, now() - interval '60 days'),
      (u2_id, 'priya.patel@example.com', '{"display_name": "Priya Patel", "mode": "household", "language": "en"}'::jsonb, now() - interval '45 days')
    on conflict (id) do nothing;
  end if;

  -- --------------------------------------------------------------------------
  -- 2. PROFILES
  -- --------------------------------------------------------------------------
  insert into public.profiles (user_id, display_name, mode, language, month_start_day, currency)
  values
    (u1_id, 'Aarav Sharma', 'earner', 'hi', 1, 'INR'),
    (u2_id, 'Priya Patel', 'household', 'en', 5, 'INR')
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    mode = excluded.mode,
    language = excluded.language;

  -- Ensure categories are seeded for both test users
  perform public.seed_default_categories_for_user(u1_id);
  perform public.seed_default_categories_for_user(u2_id);

  -- Retrieve category IDs for User 1
  select id into u1_cat_rent  from public.categories where user_id = u1_id and name_en = 'Rent' limit 1;
  select id into u1_cat_groc  from public.categories where user_id = u1_id and name_en = 'Groceries' limit 1;
  select id into u1_cat_trans from public.categories where user_id = u1_id and name_en = 'Transport' limit 1;
  select id into u1_cat_bills from public.categories where user_id = u1_id and name_en = 'Bills' limit 1;
  select id into u1_cat_health from public.categories where user_id = u1_id and name_en = 'Health' limit 1;
  select id into u1_cat_eat   from public.categories where user_id = u1_id and name_en = 'Eating out' limit 1;
  select id into u1_cat_ent   from public.categories where user_id = u1_id and name_en = 'Entertainment' limit 1;
  select id into u1_cat_shop  from public.categories where user_id = u1_id and name_en = 'Shopping' limit 1;
  select id into u1_cat_gold  from public.categories where user_id = u1_id and name_en = 'Gold/Savings' limit 1;
  select id into u1_cat_other from public.categories where user_id = u1_id and name_en = 'Other' limit 1;

  -- Retrieve category IDs for User 2
  select id into u2_cat_groc  from public.categories where user_id = u2_id and name_en = 'Groceries' limit 1;
  select id into u2_cat_bills from public.categories where user_id = u2_id and name_en = 'Bills' limit 1;

  -- --------------------------------------------------------------------------
  -- 3. INCOME SOURCES
  -- --------------------------------------------------------------------------
  -- Clean existing to ensure idempotency
  delete from public.income_sources where user_id in (u1_id, u2_id);

  insert into public.income_sources (user_id, label, amount_paise, frequency)
  values
    -- User 1: 65,000 INR Salary + 18,000 INR Freelancing = 83,000 INR (83,00,000 paise)
    (u1_id, 'TCS Tech Lead Salary', 6500000, 'monthly'),
    (u1_id, 'Freelance React Consulting', 1800000, 'monthly'),
    -- User 2: 45,000 INR Allowance + 12,000 INR Boutique = 57,000 INR (57,00,000 paise)
    (u2_id, 'Family Household Budget', 4500000, 'monthly'),
    (u2_id, 'Home Boutique Sales', 1200000, 'monthly');

  -- --------------------------------------------------------------------------
  -- 4. OBLIGATIONS (EMIs, Rent, Subscriptions, Insurance, Chit funds)
  -- --------------------------------------------------------------------------
  delete from public.obligations where user_id in (u1_id, u2_id);

  insert into public.obligations (id, user_id, label, kind, amount_paise, due_day, principal_paise, annual_rate, tenure_months, start_date, active)
  values
    -- User 1 Rent: ₹18,000 (1800000 paise) due on 1st
    ('c1111111-1111-4111-8111-111111111101'::uuid, u1_id, 'HSR Layout 2BHK Rent', 'rent', 1800000, 1, null, null, null, '2025-01-01', true),
    -- User 1 EV Bike EMI: ₹3,850 (385000 paise) due on 10th (Principal ₹1,20,000, 9.8% annual rate, 36 months)
    ('c1111111-1111-4111-8111-111111111102'::uuid, u1_id, 'Ather 450X EV Scooter EMI', 'emi', 385000, 10, 12000000, 9.8, 36, '2025-08-10', true),
    -- User 1 Health Insurance: ₹1,150 (115000 paise) due on 15th
    ('c1111111-1111-4111-8111-111111111103'::uuid, u1_id, 'Care Health Super Top-Up', 'insurance', 115000, 15, null, null, null, '2025-04-15', true),
    -- User 1 Subscription: ₹699 (69900 paise) due on 22nd
    ('c1111111-1111-4111-8111-111111111104'::uuid, u1_id, 'Netflix + Hotstar Combo', 'subscription', 69900, 22, null, null, null, '2024-11-22', true),
    -- User 1 Chit Fund: ₹5,000 (500000 paise) due on 5th
    ('c1111111-1111-4111-8111-111111111105'::uuid, u1_id, 'Mysuru Sangha Chit Fund', 'chit', 500000, 5, null, null, null, '2026-01-05', true),

    -- User 2 Obligations
    ('c2222222-2222-4222-8222-222222222201'::uuid, u2_id, 'Society Maintenance', 'rent', 450000, 5, null, null, null, '2025-01-05', true),
    ('c2222222-2222-4222-8222-222222222202'::uuid, u2_id, 'Kids School Bus Service', 'other', 280000, 10, null, null, null, '2026-06-10', true);

  u1_obl_rent := 'c1111111-1111-4111-8111-111111111101'::uuid;
  u1_obl_emi  := 'c1111111-1111-4111-8111-111111111102'::uuid;
  u1_obl_sub  := 'c1111111-1111-4111-8111-111111111104'::uuid;

  -- --------------------------------------------------------------------------
  -- 5. GOALS
  -- --------------------------------------------------------------------------
  delete from public.goals where user_id in (u1_id, u2_id);

  insert into public.goals (user_id, label, target_paise, target_date, saved_paise, priority)
  values
    -- User 1 Goals
    (u1_id, '6-Month Emergency Fund', 25000000, '2027-06-30', 9500000, 1),
    (u1_id, 'Diwali 24K Gold Coin (10g)', 7800000, '2026-11-01', 3500000, 2),
    (u1_id, 'MacBook Pro M3 Upgrade', 12000000, '2027-03-31', 4000000, 3),

    -- User 2 Goals
    (u2_id, 'Daughter Higher Education Corpus', 100000000, '2030-05-31', 21000000, 1),
    (u2_id, 'Kashmir Family Vacation', 15000000, '2027-04-15', 4500000, 2);

  -- --------------------------------------------------------------------------
  -- 6. BUDGET PLANS & PLAN LINES
  -- --------------------------------------------------------------------------
  delete from public.budget_plans where user_id in (u1_id, u2_id);

  -- User 1 October 2026 Budget Plan:
  -- Income: ₹83,000 (83,00,000 paise)
  -- Fixed: ₹28,699 (Rent 18k + EMI 3.85k + Ins 1.15k + Sub 0.699k + Chit 5k = 2869900 paise)
  -- Savings Target: ₹25,000 (25,00,000 paise)
  -- Variable Budget: ₹29,301 (29,30,100 paise)
  -- Shortfall: 0
  insert into public.budget_plans (id, user_id, month, income_paise, fixed_paise, savings_target_paise, variable_budget_paise, shortfall_paise)
  values
    ('d1111111-1111-4111-8111-111111111101'::uuid, u1_id, '2026-10-01', 8300000, 2869900, 2500000, 2930100, 0),
    ('d2222222-2222-4222-8222-222222222201'::uuid, u2_id, '2026-10-01', 5700000, 730000, 1500000, 3470000, 0);

  u1_plan_id := 'd1111111-1111-4111-8111-111111111101'::uuid;

  -- Plan Lines for User 1
  if u1_cat_groc is not null then
    insert into public.plan_lines (user_id, plan_id, category_id, cap_paise)
    values (u1_id, u1_plan_id, u1_cat_groc, 900000); -- ₹9,000 Groceries
  end if;

  if u1_cat_eat is not null then
    insert into public.plan_lines (user_id, plan_id, category_id, cap_paise)
    values (u1_id, u1_plan_id, u1_cat_eat, 500000); -- ₹5,000 Eating out
  end if;

  if u1_cat_trans is not null then
    insert into public.plan_lines (user_id, plan_id, category_id, cap_paise)
    values (u1_id, u1_plan_id, u1_cat_trans, 400000); -- ₹4,000 Fuel/Metro
  end if;

  if u1_cat_shop is not null then
    insert into public.plan_lines (user_id, plan_id, category_id, cap_paise)
    values (u1_id, u1_plan_id, u1_cat_shop, 600000); -- ₹6,000 Shopping
  end if;

  if u1_cat_bills is not null then
    insert into public.plan_lines (user_id, plan_id, category_id, cap_paise)
    values (u1_id, u1_plan_id, u1_cat_bills, 300000); -- ₹3,000 Electricity & Wifi
  end if;

  -- --------------------------------------------------------------------------
  -- 7. TRANSACTIONS
  -- --------------------------------------------------------------------------
  delete from public.transactions where user_id in (u1_id, u2_id);

  insert into public.transactions (user_id, amount_paise, category_id, note, occurred_on, payment_mode, source)
  values
    -- User 1 Transactions
    (u1_id, 425000, u1_cat_groc, 'D-Mart Monthly Grocery Basket', '2026-10-03', 'card', 'manual'),
    (u1_id, 38000,  u1_cat_groc, 'Zepto Instant delivery - Milk & Fruit', '2026-10-05', 'upi', 'sms'),
    (u1_id, 150000, u1_cat_trans, 'Indian Oil Petrol Full Tank', '2026-10-08', 'upi', 'sms'),
    (u1_id, 74000,  u1_cat_eat, 'Swiggy Dinner Biryani order', '2026-10-10', 'upi', 'sms'),
    (u1_id, 184000, u1_cat_bills, 'BESCOM Electricity Bill Payment', '2026-10-12', 'upi', 'sms'),
    (u1_id, 56000,  u1_cat_health, 'Apollo Pharmacy Cough syrup & Vitamins', '2026-10-14', 'cash', 'manual'),
    (u1_id, 6000,   u1_cat_eat, 'Chai and Onion Samosa at tapri', '2026-10-18', 'upi', 'manual'),
    (u1_id, 120000, u1_cat_ent, 'PVR Cinemas IMAX Weekend Ticket', '2026-10-19', 'card', 'manual'),

    -- User 2 Transactions
    (u2_id, 92000,  u2_cat_groc, 'Weekly Sabzi Mandi vegetables', '2026-10-06', 'cash', 'manual'),
    (u2_id, 65000,  u2_cat_bills, 'Mahanagar Gas piped PNG bill', '2026-10-09', 'upi', 'sms');

  -- --------------------------------------------------------------------------
  -- 8. REMINDERS
  -- --------------------------------------------------------------------------
  delete from public.reminders where user_id in (u1_id, u2_id);

  insert into public.reminders (user_id, obligation_id, label, remind_on, status)
  values
    (u1_id, u1_obl_sub, 'Renew Netflix + Hotstar Combo', '2026-10-22', 'pending'),
    (u1_id, u1_obl_rent, 'Transfer HSR Layout Apartment Rent', '2026-11-01', 'pending'),
    (u2_id, null, 'Pay Quarter Society Maintenance', '2026-11-05', 'pending');

  -- --------------------------------------------------------------------------
  -- 9. RISK PROFILES
  -- --------------------------------------------------------------------------
  delete from public.risk_profiles where user_id in (u1_id, u2_id);

  insert into public.risk_profiles (user_id, score, band, answers)
  values
    (
      u1_id,
      68,
      'balanced',
      '{"age_bracket": "26-35", "experience": "moderate", "horizon": "5-10_years", "emergency_fund_months": 4, "market_dip_action": "buy_more"}'::jsonb
    ),
    (
      u2_id,
      42,
      'conservative',
      '{"age_bracket": "36-45", "experience": "beginner", "horizon": "10+_years", "emergency_fund_months": 6, "market_dip_action": "wait_and_see"}'::jsonb
    );

  -- --------------------------------------------------------------------------
  -- 10. LESSON PROGRESS
  -- --------------------------------------------------------------------------
  delete from public.lesson_progress where user_id in (u1_id, u2_id);

  insert into public.lesson_progress (user_id, lesson_key, completed_at)
  values
    (u1_id, 'emergency_fund_basics', now() - interval '20 days'),
    (u1_id, '50_30_20_inr_framework', now() - interval '14 days'),
    (u1_id, 'understanding_chit_funds_vs_mutual_funds', now() - interval '7 days'),
    (u2_id, 'emergency_fund_basics', now() - interval '10 days');

end $$;
