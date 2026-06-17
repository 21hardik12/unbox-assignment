/**
 * Simulated speed sensor.
 *
 * Connects to MQTT and, once connected, publishes a JSON speed sample every
 * INTERVAL_MS to `sensors/<DEVICE_ID>/speed`. The payload matches the contract
 * the backend validates (see backend/src/domain/reading.ts):
 *   { deviceId: string, speed: number, ts: ISO-8601 string }
 */
import mqtt from 'mqtt';
import { env } from './env.js';
import { logger } from './logger.js';
import { SpeedModel } from './speed-model.js';

const topic = `sensors/${env.DEVICE_ID}/speed`;
const model = new SpeedModel({ maxSpeed: env.MAX_SPEED });

const client = mqtt.connect(env.MQTT_URL, {
  clientId: `speedometer-sim-${env.DEVICE_ID}-${process.pid}`,
  reconnectPeriod: 2000,
  connectTimeout: 10_000,
  clean: true,
});

let timer: NodeJS.Timeout | undefined;

function publishOnce(): void {
  const speed = model.next();
  const payload = JSON.stringify({
    deviceId: env.DEVICE_ID,
    speed,
    ts: new Date().toISOString(),
  });
  // QoS 1 matches the backend subscription (at-least-once delivery).
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) logger.error({ err }, 'Failed to publish sample');
  });
}

client.on('connect', () => {
  logger.info(
    { url: env.MQTT_URL, topic, intervalMs: env.INTERVAL_MS },
    'Simulator connected to broker; publishing samples',
  );
  // Guard against starting multiple timers across reconnects.
  if (!timer) {
    timer = setInterval(publishOnce, env.INTERVAL_MS);
  }
});

client.on('reconnect', () => logger.warn('Reconnecting to MQTT broker...'));
client.on('error', (err) => logger.error({ err }, 'MQTT client error'));
client.on('close', () => logger.warn('MQTT connection closed'));

// --- Graceful shutdown -------------------------------------------------------
function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down simulator...');
  if (timer) clearInterval(timer);
  client.end(false, () => process.exit(0)); // false: 'don't send the disconnect packet'
  // Safety net if the broker never acknowledges the disconnect.
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
