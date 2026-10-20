import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log('Initializing in-memory PGlite instance...');
  const db = new PGlite();

  const migrationPath = path.resolve('supabase/migrations/20261020000000_initial_schema.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration...');
  await db.exec(migrationSql);
  console.log('Migration applied successfully!');

  const seedPath = path.resolve('supabase/seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  console.log('Applying seed data...');
  await db.exec(seedSql);
  console.log('Seed data applied successfully!');

  // Query verification
  const profiles = await db.query('select user_id, display_name, mode, language from public.profiles');
  console.log('Profiles in DB:', profiles.rows);

  const txCount = await db.query('select count(*) as count from public.transactions');
  console.log('Total transactions in DB:', txCount.rows[0]);

  const catCount = await db.query('select count(*) as count from public.categories');
  console.log('Total categories in DB:', catCount.rows[0]);

  await db.close();
  console.log('Database verification closed cleanly.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
