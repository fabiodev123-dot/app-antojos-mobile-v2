import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const migration = fs.readFileSync('drizzle/0003_admin_rpcs.sql', 'utf8');

console.log('🚀 Applying migration 0003_admin_rpcs...');
try {
  await sql.unsafe(migration);
  console.log('✅ Migration applied successfully');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
