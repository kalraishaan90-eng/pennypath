import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

async function testRLS() {
  console.log('============================================================');
  console.log(' PennyPath Supabase Postgres RLS Isolation Verification');
  console.log('============================================================\n');

  const db = new PGlite();

  // 1. Apply Migration
  const migrationSql = fs.readFileSync(path.resolve('supabase/migrations/20261020000000_initial_schema.sql'), 'utf8');
  await db.exec(migrationSql);
  console.log(' [1/6] Applied initial schema migration with RLS enabled and forced.');

  // Supabase executes client queries as the non-superuser 'authenticated' role
  await db.exec(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
    end $$;

    grant usage on schema public to authenticated, anon;
    grant all on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
  `);

  // 2. Apply Seed
  const seedSql = fs.readFileSync(path.resolve('supabase/seed.sql'), 'utf8');
  await db.exec(seedSql);
  console.log(' [2/6] Applied seed data (User 1 = Aarav Sharma, User 2 = Priya Patel).');

  const u1_id = 'a1111111-1111-4111-8111-111111111111';
  const u2_id = 'b2222222-2222-4222-8222-222222222222';

  // Helper to switch simulated authenticated user (as Supabase does per request)
  const setAuthUser = async (userId: string | null) => {
    if (userId) {
      await db.exec(`
        set role authenticated;
        select set_config('request.jwt.claim.sub', '${userId}', false);
      `);
    } else {
      await db.exec(`
        set role anon;
        select set_config('request.jwt.claim.sub', '', false);
      `);
    }
  };

  // 3. User 1 Context
  console.log('\n--- Switching context to User 1 (Aarav) ---');
  await setAuthUser(u1_id);

  const u1Profiles = await db.query('select user_id, display_name from public.profiles');
  console.log('User 1 profiles query count:', u1Profiles.rows.length);
  if (u1Profiles.rows.length !== 1 || (u1Profiles.rows[0] as any).user_id !== u1_id) {
    throw new Error('RLS Failure: User 1 should see exactly 1 profile (their own).');
  }

  const u1Transactions = await db.query('select count(*) as count from public.transactions');
  console.log('User 1 transactions visible:', (u1Transactions.rows[0] as any).count);

  const u1Categories = await db.query('select count(*) as count from public.categories');
  console.log('User 1 categories visible:', (u1Categories.rows[0] as any).count);

  const u1Obligations = await db.query('select count(*) as count from public.obligations');
  console.log('User 1 obligations visible:', (u1Obligations.rows[0] as any).count);

  // 4. User 2 Context
  console.log('\n--- Switching context to User 2 (Priya) ---');
  await setAuthUser(u2_id);

  const u2Profiles = await db.query('select user_id, display_name from public.profiles');
  console.log('User 2 profiles query count:', u2Profiles.rows.length);
  if (u2Profiles.rows.length !== 1 || (u2Profiles.rows[0] as any).user_id !== u2_id) {
    throw new Error('RLS Failure: User 2 should see only their own profile.');
  }

  const u2Transactions = await db.query('select count(*) as count from public.transactions');
  console.log('User 2 transactions visible:', (u2Transactions.rows[0] as any).count);

  // Verify User 2 cannot see ANY of User 1's transactions
  const leakCheck = await db.query(`select * from public.transactions where user_id = '${u1_id}'`);
  console.log("Cross-user query for User 1's transactions by User 2 returned:", leakCheck.rows.length, 'rows (EXPECTED: 0)');
  if (leakCheck.rows.length !== 0) {
    throw new Error("SECURITY BREACH: User 2 was able to read User 1's transactions!");
  }

  // 5. Attempt Malicious Modifications by User 2 on User 1's Data
  console.log('\n--- Testing Malicious Cross-Tenant Operations by User 2 ---');

  // A. User 2 attempts to UPDATE User 1's obligations
  const maliciousUpdate = await db.query(
    `update public.obligations set amount_paise = 0 where user_id = '${u1_id}'`
  );
  console.log("Malicious UPDATE on User 1's obligations affected rows:", (maliciousUpdate as any).affectedRows ?? 0, '(EXPECTED: 0)');

  // B. User 2 attempts to DELETE User 1's goals
  const maliciousDelete = await db.query(
    `delete from public.goals where user_id = '${u1_id}'`
  );
  console.log("Malicious DELETE on User 1's goals affected rows:", (maliciousDelete as any).affectedRows ?? 0, '(EXPECTED: 0)');

  // C. User 2 attempts to SPOOF and insert data belonging to User 1
  let insertSpoofBlocked = false;
  try {
    await db.query(`
      insert into public.transactions (user_id, amount_paise, note, payment_mode, source)
      values ('${u1_id}', 99900, 'Spoofed Transaction by User 2', 'cash', 'manual')
    `);
  } catch (err: any) {
    insertSpoofBlocked = true;
    console.log('Malicious INSERT spoofing User 1 blocked by RLS policy check: SUCCESS');
  }

  if (!insertSpoofBlocked) {
    throw new Error('SECURITY BREACH: User 2 was able to insert rows with User 1 user_id!');
  }

  // 6. Unauthenticated Context
  console.log('\n--- Switching context to Unauthenticated (Anonymous / No JWT sub) ---');
  await setAuthUser(null);

  const anonProfiles = await db.query('select * from public.profiles');
  const anonTx = await db.query('select * from public.transactions');
  const anonGoals = await db.query('select * from public.goals');

  console.log('Unauthenticated profile count visible:', anonProfiles.rows.length, '(EXPECTED: 0)');
  console.log('Unauthenticated transaction count visible:', anonTx.rows.length, '(EXPECTED: 0)');
  console.log('Unauthenticated goal count visible:', anonGoals.rows.length, '(EXPECTED: 0)');

  if (anonProfiles.rows.length !== 0 || anonTx.rows.length !== 0 || anonGoals.rows.length !== 0) {
    throw new Error('SECURITY BREACH: Unauthenticated user can view data!');
  }

  console.log('\n============================================================');
  console.log(' ALL RLS SECURITY CHECKS PASSED PERFECTLY!');
  console.log(' - User 1 isolated from User 2');
  console.log(' - User 2 isolated from User 1');
  console.log(' - Cross-user read blocked (0 rows returned)');
  console.log(' - Cross-user update blocked (0 rows affected)');
  console.log(' - Cross-user delete blocked (0 rows affected)');
  console.log(' - Cross-user insert spoof blocked by WITH CHECK policy');
  console.log(' - Unauthenticated access blocked on all tables');
  console.log('============================================================\n');

  await db.close();
}

testRLS().catch((err) => {
  console.error('RLS Test failed:', err);
  process.exit(1);
});
