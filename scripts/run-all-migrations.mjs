import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const MIGRATIONS = [
  '0001_tenants.sql',
  '0002_pedidos_tenant_id.sql',
  '0003_admin_rpcs.sql',
  '0004_ventas_rapidas.sql',
];

console.log(`🚀 Applying ${MIGRATIONS.length} migrations in order...\n`);

for (const filename of MIGRATIONS) {
  const fullPath = path.join('drizzle', filename);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing migration: ${fullPath}`);
    await sql.end();
    process.exit(1);
  }
  console.log(`▶ ${filename}`);
  try {
    const migration = fs.readFileSync(fullPath, 'utf8');
    await sql.unsafe(migration);
    console.log(`  ✅ OK\n`);
  } catch (err) {
    console.error(`  ❌ FAILED:`, err.message);
    await sql.end();
    process.exit(1);
  }
}

console.log('🎉 All migrations applied. Schema is up-to-date.');
await sql.end();
