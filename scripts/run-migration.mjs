import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import postgres from 'postgres';

const migrationArg = process.argv[2];
if (!migrationArg) {
  console.error('Uso: node scripts/run-migration.mjs <migration-file>');
  console.error('Ej:  node scripts/run-migration.mjs 0001_tenants.sql');
  process.exit(1);
}

const filename = migrationArg.endsWith('.sql') ? migrationArg : `${migrationArg}.sql`;
const path = `drizzle/${filename}`;

if (!fs.existsSync(path)) {
  console.error(`❌ No existe el archivo: ${path}`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const migration = fs.readFileSync(path, 'utf8');

console.log(`🚀 Applying ${filename}...`);
try {
  await sql.unsafe(migration);
  console.log(`✅ ${filename} applied successfully`);
} catch (err) {
  console.error(`❌ ${filename} failed:`, err.message);
  process.exit(1);
} finally {
  await sql.end();
}
