/**
 * Shared PostgreSQL / TimescaleDB connection pool.
 *
 * node-postgres is CommonJS, so under Node ESM we default-import the package
 * and destructure `Pool` from it (the documented interop pattern).
 */
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// A pool error usually means a backend connection dropped; log it rather than
// letting an unhandled 'error' event crash the process.
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});
