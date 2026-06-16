/**
 * Idempotent schema bootstrap.
 *
 * Running this on startup makes the backend self-sufficient against any
 * PostgreSQL/TimescaleDB instance (local dev, CI, or a DB provisioned outside
 * Docker). It mirrors db/init/01-init.sql, which the Docker image runs on first
 * boot. Every statement is `IF NOT EXISTS`, so it is a harmless no-op when the
 * schema already exists.
 */
import { pool } from './pool.js';
import { logger } from '../config/logger.js';

const SCHEMA_DDL = `
  CREATE EXTENSION IF NOT EXISTS timescaledb;

  CREATE TABLE IF NOT EXISTS speed_readings (
    time      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    device_id TEXT             NOT NULL,
    speed     DOUBLE PRECISION NOT NULL CHECK (speed >= 0)
  );

  SELECT create_hypertable('speed_readings', by_range('time'), if_not_exists => TRUE);

  CREATE INDEX IF NOT EXISTS speed_readings_device_time_idx
    ON speed_readings (device_id, time DESC);
`;

export async function ensureSchema(): Promise<void> {
  // No bind parameters → node-postgres uses the simple query protocol, which
  // allows several statements in one round-trip.
  await pool.query(SCHEMA_DDL);
  logger.info('Database schema ready (TimescaleDB hypertable: speed_readings)');
}
