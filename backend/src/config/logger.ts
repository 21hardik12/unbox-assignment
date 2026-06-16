/**
 * Structured logging via Pino.
 *
 * In production we emit newline-delimited JSON (cheap to parse, ideal for log
 * aggregators). In development we pretty-print for human readability.
 */
import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Redact anything that looks like a secret if it ever ends up in a log object.
  redact: ['*.password', '*.DATABASE_URL', 'DATABASE_URL'],
  ...(env.isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
});
