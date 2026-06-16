/**
 * MQTT subscriber. Connects to the broker, subscribes to the speed topic, and
 * forwards every message to the supplied handler. mqtt.js handles automatic
 * reconnection with backoff; we just log the lifecycle transitions.
 */
import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export type MessageHandler = (
  topic: string,
  payload: Buffer,
) => void | Promise<void>;

export function createMqttSubscriber(onMessage: MessageHandler): MqttClient {
  const client = mqtt.connect(env.MQTT_URL, {
    clientId: `speedometer-backend-${process.pid}`,
    reconnectPeriod: 2000,
    connectTimeout: 10_000,
    clean: true,
  });

  client.on('connect', () => {
    logger.info({ url: env.MQTT_URL }, 'Connected to MQTT broker');
    // QoS 1 (at-least-once) so a brief disconnect does not silently drop samples.
    client.subscribe(env.MQTT_TOPIC, { qos: 1 }, (err) => {
      if (err) {
        logger.error({ err, topic: env.MQTT_TOPIC }, 'MQTT subscribe failed');
      } else {
        logger.info({ topic: env.MQTT_TOPIC }, 'Subscribed to MQTT topic');
      }
    });
  });

  client.on('message', (topic, payload) => {
    // Never let a handler rejection bubble into mqtt.js internals.
    void Promise.resolve(onMessage(topic, payload)).catch((err: unknown) => {
      logger.error({ err, topic }, 'Unhandled error while processing message');
    });
  });

  client.on('reconnect', () => logger.warn('Reconnecting to MQTT broker...'));
  client.on('error', (err) => logger.error({ err }, 'MQTT client error'));
  client.on('close', () => logger.warn('MQTT connection closed'));

  return client;
}
