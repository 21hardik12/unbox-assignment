/**
 * Socket.IO server: pushes each persisted reading to all connected UIs.
 *
 * Events are typed via Socket.IO generics so both ends share a compile-time
 * contract. `connectionStateRecovery` lets a client that drops for a moment
 * (e.g. a tab switch or flaky wifi) resume without missing the gap.
 */
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { SpeedReading } from '../domain/reading.js';

interface ServerToClientEvents {
  reading: (reading: SpeedReading) => void;
}

// The UI is a pure consumer; it emits nothing back to the server.
type ClientToServerEvents = Record<string, never>;

export type AppSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents
>;

export function createSocketServer(httpServer: HttpServer): AppSocketServer {
  const io: AppSocketServer = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigins, methods: ['GET', 'POST'] },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  io.on('connection', (socket) => {
    logger.info(
      { socketId: socket.id, clients: io.engine.clientsCount },
      'UI client connected',
    );
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'UI client disconnected');
    });
  });

  return io;
}

/** Broadcast a persisted reading to every connected client. */
export function broadcastReading(
  io: AppSocketServer,
  reading: SpeedReading,
): void {
  io.emit('reading', reading);
}
