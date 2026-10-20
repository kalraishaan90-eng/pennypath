import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('Supabase PostgreSQL RLS Isolation Integration', () => {
  let db: PGlite;
  const u1_id = 'a1111111-1111-4111-8111-111111111111';
  const u2_id = 'b2222222-2222-4222-8222-222222222222';

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

  beforeAll(async () => {
    db = new PGlite();

    // 1. Apply Migration
    const migrationSql = fs.readFileSync(path.resolve('supabase/migrations/20261020000000_initial_schema.sql'), 'utf8');
    await db.exec(migrationSql);

    // Setup Supabase-style non-superuser roles
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
  }, 60000);

  afterAll(async () => {
    if (db) await db.close();
  });

  it('allows User 1 to read only their own seeded profile, transactions, and obligations', async () => {
    await setAuthUser(u1_id);

    const profiles = await db.query<any>('select * from public.profiles');
    expect(profiles.rows.length).toBe(1);
    expect(profiles.rows[0].user_id).toBe(u1_id);
    expect(profiles.rows[0].display_name).toBe('Aarav Sharma');

    const tx = await db.query<any>('select * from public.transactions');
    expect(tx.rows.length).toBe(8);
    for (const r of tx.rows) {
      expect(r.user_id).toBe(u1_id);
    }

    const categories = await db.query<any>('select * from public.categories');
    expect(categories.rows.length).toBe(12);

    const obligations = await db.query<any>('select * from public.obligations');
    expect(obligations.rows.length).toBe(5);
  });

  it('allows User 2 to read only their own rows and blocks reading User 1 rows', async () => {
    await setAuthUser(u2_id);

    const profiles = await db.query<any>('select * from public.profiles');
    expect(profiles.rows.length).toBe(1);
    expect(profiles.rows[0].user_id).toBe(u2_id);
    expect(profiles.rows[0].display_name).toBe('Priya Patel');

    const tx = await db.query<any>('select * from public.transactions');
    expect(tx.rows.length).toBe(2);
    for (const r of tx.rows) {
      expect(r.user_id).toBe(u2_id);
    }

    // Explicit cross-tenant query for User 1 data returns 0 rows
    const crossTenantTx = await db.query<any>(`select * from public.transactions where user_id = '${u1_id}'`);
    expect(crossTenantTx.rows.length).toBe(0);

    const crossTenantObl = await db.query<any>(`select * from public.obligations where user_id = '${u1_id}'`);
    expect(crossTenantObl.rows.length).toBe(0);
  });

  it('blocks User 2 from updating or deleting User 1 records', async () => {
    await setAuthUser(u2_id);

    // Attempt to update User 1's obligation
    const updateRes = await db.query<any>(
      `update public.obligations set amount_paise = 0 where user_id = '${u1_id}'`
    );
    expect((updateRes as any).affectedRows ?? 0).toBe(0);

    // Attempt to delete User 1's goal
    const deleteRes = await db.query<any>(
      `delete from public.goals where user_id = '${u1_id}'`
    );
    expect((deleteRes as any).affectedRows ?? 0).toBe(0);
  });

  it('blocks User 2 from inserting rows spoofing User 1 user_id', async () => {
    await setAuthUser(u2_id);

    await expect(
      db.query(`
        insert into public.transactions (user_id, amount_paise, note, payment_mode, source)
        values ('${u1_id}', 100000, 'Malicious Spoofed Transaction', 'cash', 'manual')
      `)
    ).rejects.toThrow(/violates row-level security policy/);
  });

  it('blocks unauthenticated access from seeing any rows', async () => {
    await setAuthUser(null);

    const profiles = await db.query<any>('select * from public.profiles');
    expect(profiles.rows.length).toBe(0);

    const tx = await db.query<any>('select * from public.transactions');
    expect(tx.rows.length).toBe(0);

    const goals = await db.query<any>('select * from public.goals');
    expect(goals.rows.length).toBe(0);
  });
});
