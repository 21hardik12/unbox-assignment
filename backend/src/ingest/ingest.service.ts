/**
 * Ingest pipeline: the heart of the backend.
 *
 *   MQTT message ──▶ parse JSON ──▶ validate ──▶ INSERT (TimescaleDB) ──▶ emit
 *
 * The order matters: we persist the sample first and broadcast the *stored*
 * row, so the UI always reflects exactly what is in the database — directly
 * satisfying the spec ("UI updates in real-time as data is inserted in db").
 * Bad payloads are logged and dropped rather than crashing the pipeline.
 */
import { SpeedSampleSchema } from '../domain/reading.js';
import { insertReading } from '../db/readings.repository.js';
import { broadcastReading, type AppSocketServer } from '../realtime/socket.js';
import type { MessageHandler } from '../mqtt/subscriber.js';
import { logger } from '../config/logger.js';

export function createIngestHandler(io: AppSocketServer): MessageHandler {
  return async (topic, payload) => {
    let json: unknown;
    try {
      json = JSON.parse(payload.toString('utf8'));
    } catch {
      logger.warn({ topic }, 'Discarding non-JSON MQTT payload');
      return;
    }

    const parsed = SpeedSampleSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn(
        { topic, issues: parsed.error.issues },
        'Discarding invalid speed sample',
      );
      return;
    }

    const { deviceId, speed, ts } = parsed.data;
    // Trust the sensor timestamp only if it parses; otherwise stamp server time.
    const time =
      ts && !Number.isNaN(Date.parse(ts)) ? new Date(ts) : new Date();

    const reading = await insertReading(deviceId, speed, time);
    broadcastReading(io, reading);

    logger.debug({ reading }, 'Ingested reading');
  };
}
