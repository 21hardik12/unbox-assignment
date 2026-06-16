/**
 * REST endpoints for historical / aggregated data. The live feed goes over
 * Socket.IO; these endpoints let the UI render history on first load and show
 * summary stats. Query params are validated with Zod (sensible defaults), and
 * any ZodError is turned into a 400 by the central error handler.
 *
 * Express 5 automatically forwards rejected promises from async handlers to the
 * error-handling middleware, so these handlers can simply `await` and throw.
 */
import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  getBucketedHistory,
  getRecentReadings,
  getStats,
} from '../db/readings.repository.js';

export const readingsRouter = express.Router();

const deviceId = z.string().min(1).max(128).default(env.DEFAULT_DEVICE_ID);

const RecentQuery = z.object({
  deviceId,
  limit: z.coerce.number().int().min(1).max(5000).default(120),
});

const StatsQuery = z.object({
  deviceId,
  window: z.coerce.number().int().min(1).max(86_400).default(300),
});

const HistoryQuery = z.object({
  deviceId,
  window: z.coerce.number().int().min(1).max(86_400).default(300),
  bucket: z.coerce.number().int().min(1).max(3600).default(5),
});

// GET /api/readings/recent?deviceId&limit — raw recent samples (oldest→newest).
readingsRouter.get('/recent', async (req, res) => {
  const q = RecentQuery.parse(req.query);
  const readings = await getRecentReadings(q.deviceId, q.limit);
  res.json({ deviceId: q.deviceId, count: readings.length, readings });
});

// GET /api/readings/stats?deviceId&window — current/avg/min/max over a window.
readingsRouter.get('/stats', async (req, res) => {
  const q = StatsQuery.parse(req.query);
  res.json(await getStats(q.deviceId, q.window));
});

// GET /api/readings/history?deviceId&window&bucket — time_bucket downsampling.
readingsRouter.get('/history', async (req, res) => {
  const q = HistoryQuery.parse(req.query);
  const points = await getBucketedHistory(q.deviceId, q.window, q.bucket);
  res.json({
    deviceId: q.deviceId,
    windowSeconds: q.window,
    bucketSeconds: q.bucket,
    points,
  });
});
