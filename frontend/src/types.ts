/**
 * Shared frontend types. `SpeedReading` mirrors the backend's domain object
 * (the shape streamed over Socket.IO and returned by the REST API).
 */
export interface SpeedReading {
  deviceId: string;
  /** Speed in km/h. */
  speed: number;
  /** ISO-8601 timestamp. */
  time: string;
}

export interface RecentResponse {
  deviceId: string;
  count: number;
  readings: SpeedReading[];
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
