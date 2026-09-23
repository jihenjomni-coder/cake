import fs from 'fs';
import path from 'path';
import { getDatabase } from './index';
import { sql } from 'drizzle-orm';

export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  const db = getDatabase();

  const drizzleDir = path.join(process.cwd(), 'drizzle');
  if (!fs.existsSync(drizzleDir)) {
    console.warn('⚠️ No drizzle directory found at:', drizzleDir);
    return;
  }

  const sqlFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    const filePath = path.join(drizzleDir, file);
    console.log(`Executing migration file: ${file}`);
    const rawSql = fs.readFileSync(filePath, 'utf-8');

    // Split statements if needed or execute raw statements
    const statements = rawSql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
      } catch (err: any) {
        // DrizzleQueryError wraps the pg error in err.cause
        const cause = err?.cause || err;
        const msg = String(err?.message || '') + ' ' + String(cause?.message || '');
        const code = String(err?.code || '') + ' ' + String(cause?.code || '');

        if (
          msg.includes('already exists') ||
          code.includes('42710') ||
          code.includes('42P07')
        ) {
          // already exists, proceed
        } else {
          console.error(`Error executing statement in ${file}:`, err);
          throw err;
        }
      }
    }
  }

  console.log('✅ All migrations applied successfully!');
}

if (require.main === module || process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
