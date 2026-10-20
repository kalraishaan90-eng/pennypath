-- ============================================================================
-- PennyPath Supabase Postgres Initial Schema Migration
-- ============================================================================
-- Version: 20261020000000
-- Rules:
-- 1. All monetary amounts stored as integer PAISE (bigint), never floats.
-- 2. Every table has: id uuid pk default gen_random_uuid(), user_id uuid, created_at timestamptz.
-- 3. Row Level Security (RLS) enabled on every table with strict owner-only policies.
-- 4. Composite indexes on (user_id, occurred_on) and (user_id, due_day).
-- 5. Automatic trigger for seeding default bilingual categories for every new user.
-- ============================================================================

-- gen_random_uuid() is built into PostgreSQL 13+ and Supabase by default

-- In standalone/test environments where auth schema may not be pre-installed,
-- safely declare auth schema and auth.users / auth.uid()
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- auth.uid() function returns the current authenticated user's ID
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  mode text not null check (mode in ('student', 'household', 'earner')),
  language text not null default 'en' check (language in ('en', 'hi')),
  month_start_day int not null default 1 check (month_start_day between 1 and 31),
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. INCOME SOURCES
-- ----------------------------------------------------------------------------
create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount_paise bigint not null check (amount_paise >= 0),
  frequency text not null check (frequency in ('monthly', 'weekly', 'one_time')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. CATEGORIES
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name_en text not null,
  name_hi text not null,
  kind text not null check (kind in ('need', 'want', 'saving')),
  icon text not null,
  is_default bool not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. TRANSACTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_paise bigint not null check (amount_paise >= 0),
  category_id uuid references public.categories(id) on delete set null,
  note text,
  occurred_on date not null default current_date,
  payment_mode text not null check (payment_mode in ('cash', 'upi', 'card', 'other')),
  source text not null check (source in ('manual', 'sms')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. OBLIGATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('emi', 'rent', 'subscription', 'insurance', 'chit', 'other')),
  amount_paise bigint not null check (amount_paise >= 0),
  due_day int not null check (due_day between 1 and 31),
  principal_paise bigint null check (principal_paise is null or principal_paise >= 0),
  annual_rate numeric null check (annual_rate is null or annual_rate >= 0),
  tenure_months int null check (tenure_months is null or tenure_months > 0),
  start_date date null,
  active bool not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. GOALS
-- ----------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  target_paise bigint not null check (target_paise > 0),
  target_date date not null,
  saved_paise bigint not null default 0 check (saved_paise >= 0),
  priority int not null default 1 check (priority >= 1),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. BUDGET PLANS
-- ----------------------------------------------------------------------------
create table if not exists public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  income_paise bigint not null default 0 check (income_paise >= 0),
  fixed_paise bigint not null default 0 check (fixed_paise >= 0),
  savings_target_paise bigint not null default 0 check (savings_target_paise >= 0),
  variable_budget_paise bigint not null default 0 check (variable_budget_paise >= 0),
  shortfall_paise bigint not null default 0 check (shortfall_paise >= 0),
  created_at timestamptz not null default now(),
  constraint uq_budget_plans_user_month unique (user_id, month)
);

-- ----------------------------------------------------------------------------
-- 8. PLAN LINES
-- ----------------------------------------------------------------------------
create table if not exists public.plan_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.budget_plans(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  cap_paise bigint not null default 0 check (cap_paise >= 0),
  created_at timestamptz not null default now(),
  constraint uq_plan_lines_plan_category unique (plan_id, category_id)
);

-- ----------------------------------------------------------------------------
-- 9. REMINDERS
-- ----------------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  obligation_id uuid null references public.obligations(id) on delete set null,
  label text not null,
  remind_on date not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'snoozed')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10. RISK PROFILES
-- ----------------------------------------------------------------------------
create table if not exists public.risk_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null check (score between 0 and 100),
  band text not null check (band in ('conservative', 'balanced', 'growth')),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_risk_profiles_user unique (user_id)
);

-- ----------------------------------------------------------------------------
-- 11. LESSON PROGRESS
-- ----------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint uq_lesson_progress_user_lesson unique (user_id, lesson_key)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Required composite indexes:
create index if not exists idx_transactions_user_occurred_on
  on public.transactions (user_id, occurred_on desc);

create index if not exists idx_obligations_user_due_day
  on public.obligations (user_id, due_day);

-- Recommended performance indexes for RLS & joins:
create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_income_sources_user_id on public.income_sources (user_id);
create index if not exists idx_categories_user_id on public.categories (user_id);
create index if not exists idx_transactions_category_id on public.transactions (category_id);
create index if not exists idx_goals_user_id on public.goals (user_id);
create index if not exists idx_budget_plans_user_month on public.budget_plans (user_id, month);
create index if not exists idx_plan_lines_user_id on public.plan_lines (user_id);
create index if not exists idx_plan_lines_plan_id on public.plan_lines (plan_id);
create index if not exists idx_reminders_user_remind_on on public.reminders (user_id, remind_on);
create index if not exists idx_risk_profiles_user_id on public.risk_profiles (user_id);
create index if not exists idx_lesson_progress_user_id on public.lesson_progress (user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable and FORCE RLS on all tables so security policies apply universally
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.income_sources enable row level security;
alter table public.income_sources force row level security;

alter table public.categories enable row level security;
alter table public.categories force row level security;

alter table public.transactions enable row level security;
alter table public.transactions force row level security;

alter table public.obligations enable row level security;
alter table public.obligations force row level security;

alter table public.goals enable row level security;
alter table public.goals force row level security;

alter table public.budget_plans enable row level security;
alter table public.budget_plans force row level security;

alter table public.plan_lines enable row level security;
alter table public.plan_lines force row level security;

alter table public.reminders enable row level security;
alter table public.reminders force row level security;

alter table public.risk_profiles enable row level security;
alter table public.risk_profiles force row level security;

alter table public.lesson_progress enable row level security;
alter table public.lesson_progress force row level security;

-- 1. profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- 2. income_sources
create policy "income_sources_select_own" on public.income_sources
  for select using (auth.uid() = user_id);
create policy "income_sources_insert_own" on public.income_sources
  for insert with check (auth.uid() = user_id);
create policy "income_sources_update_own" on public.income_sources
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "income_sources_delete_own" on public.income_sources
  for delete using (auth.uid() = user_id);

-- 3. categories
create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- 4. transactions
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- 5. obligations
create policy "obligations_select_own" on public.obligations
  for select using (auth.uid() = user_id);
create policy "obligations_insert_own" on public.obligations
  for insert with check (auth.uid() = user_id);
create policy "obligations_update_own" on public.obligations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "obligations_delete_own" on public.obligations
  for delete using (auth.uid() = user_id);

-- 6. goals
create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals
  for delete using (auth.uid() = user_id);

-- 7. budget_plans
create policy "budget_plans_select_own" on public.budget_plans
  for select using (auth.uid() = user_id);
create policy "budget_plans_insert_own" on public.budget_plans
  for insert with check (auth.uid() = user_id);
create policy "budget_plans_update_own" on public.budget_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budget_plans_delete_own" on public.budget_plans
  for delete using (auth.uid() = user_id);

-- 8. plan_lines
create policy "plan_lines_select_own" on public.plan_lines
  for select using (auth.uid() = user_id);
create policy "plan_lines_insert_own" on public.plan_lines
  for insert with check (auth.uid() = user_id);
create policy "plan_lines_update_own" on public.plan_lines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_lines_delete_own" on public.plan_lines
  for delete using (auth.uid() = user_id);

-- 9. reminders
create policy "reminders_select_own" on public.reminders
  for select using (auth.uid() = user_id);
create policy "reminders_insert_own" on public.reminders
  for insert with check (auth.uid() = user_id);
create policy "reminders_update_own" on public.reminders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_delete_own" on public.reminders
  for delete using (auth.uid() = user_id);

-- 10. risk_profiles
create policy "risk_profiles_select_own" on public.risk_profiles
  for select using (auth.uid() = user_id);
create policy "risk_profiles_insert_own" on public.risk_profiles
  for insert with check (auth.uid() = user_id);
create policy "risk_profiles_update_own" on public.risk_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "risk_profiles_delete_own" on public.risk_profiles
  for delete using (auth.uid() = user_id);

-- 11. lesson_progress
create policy "lesson_progress_select_own" on public.lesson_progress
  for select using (auth.uid() = user_id);
create policy "lesson_progress_insert_own" on public.lesson_progress
  for insert with check (auth.uid() = user_id);
create policy "lesson_progress_update_own" on public.lesson_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lesson_progress_delete_own" on public.lesson_progress
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- DEFAULT CATEGORIES SEED FUNCTION & TRIGGERS
-- ============================================================================
create or replace function public.seed_default_categories_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.categories where user_id = target_user_id) then
    insert into public.categories (user_id, name_en, name_hi, kind, icon, is_default) values
      (target_user_id, 'Rent', 'किराया', 'need', 'home', true),
      (target_user_id, 'Groceries', 'राशन / किराना', 'need', 'shopping-cart', true),
      (target_user_id, 'Transport', 'यातायात', 'need', 'bus', true),
      (target_user_id, 'Bills', 'बिजली-पानी-बिल', 'need', 'zap', true),
      (target_user_id, 'Health', 'स्वास्थ्य और दवाएँ', 'need', 'heart-pulse', true),
      (target_user_id, 'Education', 'शिक्षा', 'need', 'graduation-cap', true),
      (target_user_id, 'Eating out', 'बाहर खाना', 'want', 'utensils', true),
      (target_user_id, 'Entertainment', 'मनोरंजन', 'want', 'film', true),
      (target_user_id, 'Shopping', 'खरीदारी', 'want', 'shopping-bag', true),
      (target_user_id, 'Family', 'परिवार सहायता', 'need', 'users', true),
      (target_user_id, 'Gold/Savings', 'सोना / बचत', 'saving', 'coins', true),
      (target_user_id, 'Other', 'अन्य खर्च', 'want', 'more-horizontal', true);
  end if;
end;
$$;

-- Trigger A: When a new profile is created
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_categories_for_user(new.user_id);
  return new;
end;
$$;

drop trigger if exists on_profile_created_seed_categories on public.profiles;
create trigger on_profile_created_seed_categories
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- Trigger B: When a new user signs up in auth.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Auto-create profile if absent
  insert into public.profiles (user_id, display_name, mode, language, month_start_day, currency)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, 'User'), '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'mode', 'earner'),
    coalesce(new.raw_user_meta_data->>'language', 'en'),
    1,
    'INR'
  )
  on conflict (user_id) do nothing;

  -- Ensure categories are seeded
  perform public.seed_default_categories_for_user(new.id);

  return new;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_auth_user();
  end if;
end $$;
