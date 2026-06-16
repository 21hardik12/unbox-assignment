/** Validated configuration for the simulator (see backend/src/config/env.ts). */
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MQTT_URL: z.string().min(1, 'MQTT_URL is required'),
  DEVICE_ID: z.string().min(1).default('vehicle-01'),
  INTERVAL_MS: z.coerce.number().int().min(50).max(60_000).default(1000),
  MAX_SPEED: z.coerce.number().positive().max(1000).default(220),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
} as const;
