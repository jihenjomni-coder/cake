import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { Pool as NodePool } from 'pg';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Neon serverless WebSocket configuration for non-browser environments if needed
if (typeof WebSocket === 'undefined') {
  try {
    // ws is optional or polyfilled in node
  } catch {
    // ignore
  }
}

let dbInstance: any = null;
let pgliteInstance: PGlite | null = null;

export function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  // 1. Production or explicit Postgres / Neon URL
  if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
    if (databaseUrl.includes('neon.tech') || databaseUrl.includes('pooler')) {
      const pool = new NeonPool({ connectionString: databaseUrl });
      dbInstance = drizzleNeon(pool, { schema });
      return dbInstance;
    } else {
      const pool = new NodePool({ connectionString: databaseUrl });
      dbInstance = drizzleNodePg(pool, { schema });
      return dbInstance;
    }
  }

  // 2. Embedded Postgres (PGlite) for zero-friction local development, CI, and test execution
  const dbDir = path.join(process.cwd(), '.data', 'pglite');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  pgliteInstance = new PGlite(dbDir);
  dbInstance = drizzlePglite(pgliteInstance, { schema });
  return dbInstance;
}

export function createInMemoryPglite() {
  const pglite = new PGlite();
  return {
    pglite,
    db: drizzlePglite(pglite, { schema }),
  };
}

export const db = getDatabase();
export { schema };
