/**
 * Backend entrypoint.
 *
 * Boot order:
 *   1. Ensure the database is reachable and the schema exists.
 *   2. Start the HTTP server (hosts both the REST API and Socket.IO).
 *   3. Connect the MQTT subscriber and wire it to the ingest pipeline.
 *
 * Plus a graceful shutdown that drains MQTT, closes sockets, the HTTP server,
 * and the DB pool on SIGTERM/SIGINT (so `docker stop` is clean).
 */
import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './db/pool.js';
import { ensureSchema } from './db/schema.js';
import { createApp } from './api/server.js';
import { createSocketServer } from './realtime/socket.js';
import { createMqttSubscriber } from './mqtt/subscriber.js';
import { createIngestHandler } from './ingest/ingest.service.js';

async function main(): Promise<void> {
  logger.info({ nodeEnv: env.NODE_ENV }, 'Starting speedometer backend');

  // 1. Database must be ready before we accept and persist samples.
  await ensureSchema();

  // 2. One HTTP server hosts the REST API and the Socket.IO endpoint.
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);

  // 3. MQTT → ingest pipeline (parse → validate → persist → broadcast).
  const ingest = createIngestHandler(io);
  const mqttClient = createMqttSubscriber(ingest);

  await new Promise<void>((resolve) => {
    httpServer.listen(env.PORT, env.HOST, resolve);
  });
  logger.info(
    { host: env.HOST, port: env.PORT },
    'HTTP + Socket.IO server listening',
  );

  // --- Graceful shutdown -----------------------------------------------------
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully...');

    // Hard safety net: never hang forever waiting on a stuck connection.
    const forceExit = setTimeout(() => {
      logger.error('Shutdown timed out; forcing exit');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      mqttClient.end(false); // stop ingesting new samples
      await new Promise<void>((resolve) => io.close(() => resolve())); // closes sockets + HTTP server
      await pool.end();
      clearTimeout(forceExit);
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
