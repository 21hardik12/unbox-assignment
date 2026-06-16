/**
 * Centralised, validated configuration.
 *
 * All environment access goes through this module. The schema fails fast at
 * startup with a readable message if anything is missing or malformed, so the
 * rest of the codebase can treat `env` as guaranteed-valid, fully-typed config.
 */
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // HTTP server (REST API + Socket.IO share one port).
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Browser origins allowed to call the API / open a socket (comma-separated).
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8080'),

  // PostgreSQL / TimescaleDB.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // MQTT broker + topic (the "+" wildcard matches any device id).
  MQTT_URL: z.string().min(1, 'MQTT_URL is required'),
  MQTT_TOPIC: z.string().default('sensors/+/speed'),

  // Default device used by the history API when the client omits one.
  DEFAULT_DEVICE_ID: z.string().min(1).default('vehicle-01'),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // Logger depends on env, so use console here to avoid a circular bootstrap.
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  /** Parsed list form of CORS_ORIGINS. */
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
