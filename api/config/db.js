import pg from 'pg';
import { DB_CONFIG } from './index.js';

const { Pool } = pg;

const pool = new Pool(DB_CONFIG);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ DB connection FAILED:', err.message);
  } else {
    console.log('✅ DB connected successfully');
    release();
  }
});

export async function initSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.system_logs (
        id        SERIAL PRIMARY KEY,
        type      VARCHAR(20),
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        user_name VARCHAR(100),
        message   TEXT
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.admin_logs (
        id          SERIAL PRIMARY KEY,
        admin_id    INTEGER,
        action      TEXT,
        target_type VARCHAR(50) DEFAULT 'general',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      ALTER TABLE public.admins
        ADD COLUMN IF NOT EXISTS avatar        TEXT,
        ADD COLUMN IF NOT EXISTS display_name  VARCHAR(100)
    `);
    await pool.query(`
      ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS location       VARCHAR(100),
        ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ
    `);
    await pool.query(`
      DO $$
      DECLARE fk_name TEXT;
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'admin_logs'
            AND column_name = 'admin_id' AND data_type = 'uuid'
        ) THEN
          SELECT tc.constraint_name INTO fk_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'admin_logs'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'admin_id'
          LIMIT 1;
          IF fk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.admin_logs DROP CONSTRAINT ' || quote_ident(fk_name);
          END IF;
          ALTER TABLE public.admin_logs ALTER COLUMN admin_id DROP NOT NULL;
          ALTER TABLE public.admin_logs ALTER COLUMN admin_id TYPE INTEGER USING NULL;
        END IF;
      END $$
    `);
    console.log('✅ Schema checks passed');
  } catch (err) {
    console.error('⚠️  Schema init warning:', err.message);
  }
}

export default pool;