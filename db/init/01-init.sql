-- =============================================================================
-- TimescaleDB schema for the speedometer telemetry pipeline.
--
-- This file is mounted into /docker-entrypoint-initdb.d and runs automatically
-- the first time the database container initialises an empty data directory.
-- It is fully idempotent, and the backend runs the same DDL on startup
-- (see backend/src/db/schema.ts), so the schema is guaranteed to exist no
-- matter how the database was provisioned.
-- =============================================================================

-- TimescaleDB ships as a PostgreSQL extension; the image preloads the shared
-- library, we just need to register the extension in this database.
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Raw time-series of speed samples. One row per sensor sample (~1 Hz).
--   time      - sample timestamp (the time-series dimension)
--   device_id - logical sensor / vehicle identifier
--   speed     - instantaneous speed in km/h
CREATE TABLE IF NOT EXISTS speed_readings (
    time      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    device_id TEXT             NOT NULL,
    speed     DOUBLE PRECISION NOT NULL CHECK (speed >= 0)
);

-- Convert the plain table into a TimescaleDB hypertable. This transparently
-- partitions rows into time-based "chunks", which keeps inserts fast and makes
-- time-range queries (the only kind we run) prune to just the relevant chunks.
-- by_range() is the modern dimension-builder API (TimescaleDB 2.13+).
SELECT create_hypertable(
    'speed_readings',
    by_range('time'),
    if_not_exists => TRUE
);

-- Composite index supporting our hottest query: "latest N samples for a device",
-- i.e. WHERE device_id = $1 ORDER BY time DESC.
CREATE INDEX IF NOT EXISTS speed_readings_device_time_idx
    ON speed_readings (device_id, time DESC);

-- -----------------------------------------------------------------------------
-- Production hardening (left as documented examples; not enabled so they cannot
-- interfere with the live demo). In a real deployment you would enable native
-- columnar compression on older chunks and a retention policy to drop ancient
-- data automatically:
--
--   ALTER TABLE speed_readings SET (
--       timescaledb.compress,
--       timescaledb.compress_segmentby = 'device_id'
--   );
--   SELECT add_compression_policy('speed_readings', INTERVAL '7 days');
--   SELECT add_retention_policy('speed_readings', INTERVAL '90 days');
--
-- Downsampled history for the UI chart is computed on the fly with time_bucket()
-- in the API layer; for very high cardinality you would promote that to a
-- continuous aggregate (materialized, incrementally refreshed) instead.
-- -----------------------------------------------------------------------------
