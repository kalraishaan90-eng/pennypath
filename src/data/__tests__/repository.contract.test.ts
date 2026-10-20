import { describe, it, expect, beforeEach } from 'vitest';
import {
  type Repository,
  SupabaseRepository,
  LocalRepository,
} from '../repository';
import { createMockSupabaseClient } from './mockSupabase';

function testRepositoryContract(name: string, createRepo: () => Repository) {
  describe(`Repository Contract Suite: ${name}`, () => {
    let repo: Repository;
    const testUserId = 'test-user-uuid-1111';
    const otherUserId = 'test-user-uuid-2222';

    beforeEach(async () => {
      repo = createRepo();
      await repo.clearUserData(testUserId);
      await repo.clearUserData(otherUserId);
    });

    // ------------------------------------------------------------------------
    // 1. Profile & Categories Seeding
    // ------------------------------------------------------------------------
    it('creates profile and seeds default bilingual categories', async () => {
      const created = await repo.upsertProfile({
        user_id: testUserId,
        display_name: 'Test Earner',
        mode: 'earner',
        language: 'hi',
        month_start_day: 1,
        currency: 'INR',
      });

      expect(created.user_id).toBe(testUserId);
      expect(created.mode).toBe('earner');
      expect(created.language).toBe('hi');

      const fetched = await repo.getProfile(testUserId);
      expect(fetched).not.toBeNull();
      expect(fetched?.display_name).toBe('Test Earner');

      // Check default categories
      const categories = await repo.getCategories(testUserId);
      expect(categories.length).toBe(12);

      const rent = categories.find((c) => c.name_en === 'Rent');
      expect(rent).toBeDefined();
      expect(rent?.name_hi).toBe('किराया');
      expect(rent?.kind).toBe('need');

      const gold = categories.find((c) => c.name_en === 'Gold/Savings');
      expect(gold).toBeDefined();
      expect(gold?.name_hi).toBe('सोना / बचत');
      expect(gold?.kind).toBe('saving');

      const food = categories.find((c) => c.name_en === 'Eating out');
      expect(food).toBeDefined();
      expect(food?.name_hi).toBe('बाहर खाना');
      expect(food?.kind).toBe('want');
    });

    // ------------------------------------------------------------------------
    // 2. Strict Integer Paise Rule (No Floats)
    // ------------------------------------------------------------------------
    it('strictly forbids floating point money amounts across all operations', async () => {
      // Income source float rejection
      await expect(
        repo.createIncomeSource({
          user_id: testUserId,
          label: 'Salary',
          amount_paise: 50000.5 as any, // Illegal float
          frequency: 'monthly',
        })
      ).rejects.toThrow(/PennyPath Currency Rule Violation/);

      // Transaction float rejection
      await expect(
        repo.createTransaction({
          user_id: testUserId,
          amount_paise: 125.75 as any, // Illegal float
          payment_mode: 'upi',
          source: 'sms',
          occurred_on: '2026-10-20',
          category_id: null,
          note: 'Invalid float',
        })
      ).rejects.toThrow(/PennyPath Currency Rule Violation/);

      // Obligation float rejection
      await expect(
        repo.createObligation({
          user_id: testUserId,
          label: 'EMI',
          kind: 'emi',
          amount_paise: 4500.25 as any, // Illegal float
          due_day: 5,
          active: true,
          principal_paise: null,
          annual_rate: null,
          tenure_months: null,
          start_date: null,
        })
      ).rejects.toThrow(/PennyPath Currency Rule Violation/);

      // Goal float rejection
      await expect(
        repo.createGoal({
          user_id: testUserId,
          label: 'Car',
          target_paise: 500000.99 as any, // Illegal float
          target_date: '2027-01-01',
          saved_paise: 0,
          priority: 1,
        })
      ).rejects.toThrow(/PennyPath Currency Rule Violation/);

      // Budget Plan float rejection
      await expect(
        repo.createBudgetPlan({
          user_id: testUserId,
          month: '2026-10-01',
          income_paise: 5000000.5 as any,
          fixed_paise: 2000000,
          savings_target_paise: 1000000,
          variable_budget_paise: 2000000,
          shortfall_paise: 0,
        })
      ).rejects.toThrow(/PennyPath Currency Rule Violation/);
    });

    // ------------------------------------------------------------------------
    // 3. Income Sources CRUD
    // ------------------------------------------------------------------------
    it('manages income sources with exact integer paise', async () => {
      const inc = await repo.createIncomeSource({
        user_id: testUserId,
        label: 'TCS Consulting',
        amount_paise: 7500000, // ₹75,000 in paise
        frequency: 'monthly',
      });

      expect(inc.id).toBeDefined();
      expect(inc.amount_paise).toBe(7500000);

      const all = await repo.getIncomeSources(testUserId);
      expect(all.length).toBe(1);
      expect(all[0].label).toBe('TCS Consulting');

      const updated = await repo.updateIncomeSource(inc.id, {
        amount_paise: 8000000, // ₹80,000
      });
      expect(updated.amount_paise).toBe(8000000);

      await repo.deleteIncomeSource(inc.id);
      const afterDelete = await repo.getIncomeSources(testUserId);
      expect(afterDelete.length).toBe(0);
    });

    // ------------------------------------------------------------------------
    // 4. Transactions CRUD and Filtering
    // ------------------------------------------------------------------------
    it('records and filters transactions accurately', async () => {
      const t1 = await repo.createTransaction({
        user_id: testUserId,
        amount_paise: 450000, // ₹4,500
        category_id: null,
        note: 'Supermarket Groceries',
        occurred_on: '2026-10-05',
        payment_mode: 'card',
        source: 'manual',
      });

      const t2 = await repo.createTransaction({
        user_id: testUserId,
        amount_paise: 6000, // ₹60
        category_id: null,
        note: 'Chai tapri',
        occurred_on: '2026-10-15',
        payment_mode: 'upi',
        source: 'sms',
      });

      const fetchedById = await repo.getTransactionById(t1.id);
      expect(fetchedById?.note).toBe('Supermarket Groceries');

      // Date range filter
      const octFiltered = await repo.getTransactions(testUserId, {
        startDate: '2026-10-10',
        endDate: '2026-10-20',
      });
      expect(octFiltered.length).toBe(1);
      expect(octFiltered[0].note).toBe('Chai tapri');

      // Payment mode filter
      const cardOnly = await repo.getTransactions(testUserId, {
        paymentMode: 'card',
      });
      expect(cardOnly.length).toBe(1);
      expect(cardOnly[0].amount_paise).toBe(450000);

      // Update transaction
      const updated = await repo.updateTransaction(t2.id, {
        note: 'Special Masala Chai & Samosa',
        amount_paise: 7500, // ₹75
      });
      expect(updated.note).toBe('Special Masala Chai & Samosa');
      expect(updated.amount_paise).toBe(7500);

      // Delete transaction
      await repo.deleteTransaction(t1.id);
      const remaining = await repo.getTransactions(testUserId);
      expect(remaining.length).toBe(1);
    });

    // ------------------------------------------------------------------------
    // 5. Obligations (EMIs, Rent, Subscriptions)
    // ------------------------------------------------------------------------
    it('manages recurring obligations and active filtering', async () => {
      const obl1 = await repo.createObligation({
        user_id: testUserId,
        label: 'EV Scooter EMI',
        kind: 'emi',
        amount_paise: 385000, // ₹3,850
        due_day: 10,
        principal_paise: 12000000, // ₹1,20,000
        annual_rate: 9.8,
        tenure_months: 36,
        start_date: '2025-08-10',
        active: true,
      });

      await repo.createObligation({
        user_id: testUserId,
        label: 'Old Gym Membership',
        kind: 'subscription',
        amount_paise: 150000,
        due_day: 1,
        principal_paise: null,
        annual_rate: null,
        tenure_months: null,
        start_date: null,
        active: false,
      });

      const all = await repo.getObligations(testUserId);
      expect(all.length).toBe(2);

      const activeOnly = await repo.getObligations(testUserId, true);
      expect(activeOnly.length).toBe(1);
      expect(activeOnly[0].label).toBe('EV Scooter EMI');

      await repo.updateObligation(obl1.id, { active: false });
      const activeAfterUpdate = await repo.getObligations(testUserId, true);
      expect(activeAfterUpdate.length).toBe(0);
    });

    // ------------------------------------------------------------------------
    // 6. Goals Management
    // ------------------------------------------------------------------------
    it('manages savings goals with priority ordering', async () => {
      const g1 = await repo.createGoal({
        user_id: testUserId,
        label: 'Emergency Fund',
        target_paise: 20000000, // ₹2,00,000
        target_date: '2027-06-30',
        saved_paise: 5000000, // ₹50,000
        priority: 1,
      });

      const g2 = await repo.createGoal({
        user_id: testUserId,
        label: 'Diwali Gold',
        target_paise: 8000000, // ₹80,000
        target_date: '2026-11-01',
        saved_paise: 2000000,
        priority: 2,
      });

      const goals = await repo.getGoals(testUserId);
      expect(goals.length).toBe(2);
      expect(goals[0].label).toBe('Emergency Fund');

      const updated = await repo.updateGoal(g1.id, { saved_paise: 6000000 });
      expect(updated.saved_paise).toBe(6000000);

      await repo.deleteGoal(g2.id);
      const afterDelete = await repo.getGoals(testUserId);
      expect(afterDelete.length).toBe(1);
    });

    // ------------------------------------------------------------------------
    // 7. Budget Plans & Plan Lines
    // ------------------------------------------------------------------------
    it('creates budget plan with category cap lines', async () => {
      const categories = await repo.getCategories(testUserId);
      const groceryCat = categories.find((c) => c.name_en.toLowerCase().includes('grocer')) || categories[0];

      const plan = await repo.createBudgetPlan(
        {
          user_id: testUserId,
          month: '2026-10-01',
          income_paise: 8000000, // ₹80,000
          fixed_paise: 2500000, // ₹25,000
          savings_target_paise: 2000000, // ₹20,000
          variable_budget_paise: 3500000, // ₹35,000
          shortfall_paise: 0,
        },
        [
          {
            category_id: groceryCat.id,
            cap_paise: 1200000, // ₹12,000
          } as any,
        ]
      );

      expect(plan.month).toBe('2026-10-01');
      expect(plan.lines.length).toBe(1);
      expect(plan.lines[0].cap_paise).toBe(1200000);

      const fetchedByMonth = await repo.getBudgetPlanByMonth(testUserId, '2026-10-01');
      expect(fetchedByMonth).not.toBeNull();
      expect(fetchedByMonth?.lines.length).toBe(1);
    });

    // ------------------------------------------------------------------------
    // 8. Reminders, Risk Profiles, Lesson Progress
    // ------------------------------------------------------------------------
    it('manages reminders, risk profile, and lesson progress', async () => {
      // Reminders
      const rem = await repo.createReminder({
        user_id: testUserId,
        label: 'Pay Electricity Bill',
        remind_on: '2026-10-25',
        obligation_id: null,
        status: 'pending',
      });
      expect(rem.status).toBe('pending');

      const updatedRem = await repo.updateReminder(rem.id, { status: 'done' });
      expect(updatedRem.status).toBe('done');

      // Risk Profile
      const rp = await repo.upsertRiskProfile({
        user_id: testUserId,
        score: 72,
        band: 'growth',
        answers: { horizon: '10y', risk: 'high' },
      });
      expect(rp.band).toBe('growth');

      const fetchedRp = await repo.getRiskProfile(testUserId);
      expect(fetchedRp?.score).toBe(72);

      // Lesson Progress
      const lp = await repo.recordLessonCompleted({
        user_id: testUserId,
        lesson_key: '50_30_20_rule',
        completed_at: '2026-10-20T10:00:00Z',
      });
      expect(lp.lesson_key).toBe('50_30_20_rule');

      const progressList = await repo.getLessonProgress(testUserId);
      expect(progressList.length).toBe(1);
      expect(progressList[0].lesson_key).toBe('50_30_20_rule');
    });

    // ------------------------------------------------------------------------
    // 9. Multi-Tenant Isolation
    // ------------------------------------------------------------------------
    it('isolates user records completely', async () => {
      await repo.createIncomeSource({
        user_id: testUserId,
        label: 'User 1 Salary',
        amount_paise: 5000000,
        frequency: 'monthly',
      });

      await repo.createIncomeSource({
        user_id: otherUserId,
        label: 'User 2 Salary',
        amount_paise: 9000000,
        frequency: 'monthly',
      });

      const u1Incomes = await repo.getIncomeSources(testUserId);
      const u2Incomes = await repo.getIncomeSources(otherUserId);

      expect(u1Incomes.length).toBe(1);
      expect(u1Incomes[0].label).toBe('User 1 Salary');

      expect(u2Incomes.length).toBe(1);
      expect(u2Incomes[0].label).toBe('User 2 Salary');
    });
  });
}

// Execute the identical contract test suite against LocalRepository
testRepositoryContract('LocalRepository', () => new LocalRepository('test_local_repo_db'));

// Execute the identical contract test suite against SupabaseRepository with mock client
testRepositoryContract('SupabaseRepository', () => new SupabaseRepository(createMockSupabaseClient()));
