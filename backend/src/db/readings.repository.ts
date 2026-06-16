/**
 * Data-access layer for speed readings. All SQL lives here so the rest of the
 * app deals only in typed domain objects, and queries are easy to review/tune.
 */
import { pool } from './pool.js';
import type { SpeedReading } from '../domain/reading.js';

/** Shape of a raw `speed_readings` row as returned by pg. */
interface ReadingRow {
  time: Date;
  device_id: string;
  speed: number;
}

function rowToReading(row: ReadingRow): SpeedReading {
  return {
    deviceId: row.device_id,
    speed: Number(row.speed),
    time: row.time.toISOString(),
  };
}

/** Persist a single sample and return the stored row (with its final time). */
export async function insertReading(
  deviceId: string,
  speed: number,
  time: Date,
): Promise<SpeedReading> {
  const result = await pool.query<ReadingRow>(
    `INSERT INTO speed_readings (time, device_id, speed)
     VALUES ($1, $2, $3)
     RETURNING time, device_id, speed`,
    [time, deviceId, speed],
  );
  const row = result.rows[0];
  if (!row) {
    // Should be unreachable for a successful INSERT ... RETURNING.
    throw new Error('INSERT did not return the persisted row');
  }
  return rowToReading(row);
}

/** Most recent `limit` readings for a device, returned oldest → newest. */
export async function getRecentReadings(
  deviceId: string,
  limit: number,
): Promise<SpeedReading[]> {
  const result = await pool.query<ReadingRow>(
    `SELECT time, device_id, speed
       FROM speed_readings
      WHERE device_id = $1
      ORDER BY time DESC
      LIMIT $2`,
    [deviceId, limit],
  );
  // Query is newest-first (uses the index efficiently); reverse for charting.
  return result.rows.reverse().map(rowToReading);
}

export interface SpeedStats {
  deviceId: string;
  windowSeconds: number;
  count: number;
  current: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
}

/** Aggregate stats over the last `windowSeconds` for a device. */
export async function getStats(
  deviceId: string,
  windowSeconds: number,
): Promise<SpeedStats> {
  const result = await pool.query<{
    count: string;
    avg: number | null;
    min: number | null;
    max: number | null;
    current: number | null;
  }>(
    `SELECT count(*)::bigint                       AS count,
            avg(speed)                             AS avg,
            min(speed)                             AS min,
            max(speed)                             AS max,
            (SELECT speed
               FROM speed_readings
              WHERE device_id = $1
              ORDER BY time DESC
              LIMIT 1)                             AS current
       FROM speed_readings
      WHERE device_id = $1
        AND time > now() - make_interval(secs => $2::int)`,
    [deviceId, windowSeconds],
  );
  const row = result.rows[0];
  return {
    deviceId,
    windowSeconds,
    count: row ? Number(row.count) : 0,
    current: row?.current ?? null,
    avg: row?.avg ?? null,
    min: row?.min ?? null,
    max: row?.max ?? null,
  };
}

export interface BucketedPoint {
  time: string;
  avgSpeed: number;
  maxSpeed: number;
}

/**
 * Downsampled history using TimescaleDB's `time_bucket()`: averages each
 * `bucketSeconds` window over the last `windowSeconds`. This keeps the payload
 * small and the chart smooth regardless of how much raw data exists.
 */
export async function getBucketedHistory(
  deviceId: string,
  windowSeconds: number,
  bucketSeconds: number,
): Promise<BucketedPoint[]> {
  const result = await pool.query<{
    bucket: Date;
    avg_speed: number;
    max_speed: number;
  }>(
    `SELECT time_bucket(make_interval(secs => $3::int), time) AS bucket,
            avg(speed)                                        AS avg_speed,
            max(speed)                                        AS max_speed
       FROM speed_readings
      WHERE device_id = $1
        AND time > now() - make_interval(secs => $2::int)
      GROUP BY bucket
      ORDER BY bucket ASC`,
    [deviceId, windowSeconds, bucketSeconds],
  );
  return result.rows.map((row) => ({
    time: row.bucket.toISOString(),
    avgSpeed: Number(row.avg_speed),
    maxSpeed: Number(row.max_speed),
  }));
}
