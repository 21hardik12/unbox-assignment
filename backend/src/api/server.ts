/**
 * Express application factory: security headers, CORS, JSON parsing, request
 * logging, a DB-aware health check, the readings API, and a central error
 * handler. Kept free of `listen()` so it is trivially testable.
 */
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { pool } from '../db/pool.js';
import { readingsRouter } from './readings.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '16kb' }));
  app.use(
    pinoHttp({
      logger,
      // The orchestrator polls /api/health every few seconds; don't spam logs.
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );

  // Health check doubles as a readiness probe by pinging the database.
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', uptime: process.uptime() });
    } catch (err) {
      logger.error({ err }, 'Health check failed: database unreachable');
      res.status(503).json({ status: 'degraded', error: 'database unavailable' });
    }
  });

  app.use('/api/readings', readingsRouter);

  // Unmatched routes → 404 JSON.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler. Must declare 4 args to be treated as error-handling
  // middleware by Express. Validation errors become 400s; everything else 500.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request parameters', issues: err.issues });
      return;
    }
    logger.error({ err }, 'Unhandled API error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
