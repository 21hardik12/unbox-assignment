/**
 * Domain types and the wire contract for the pipeline.
 *
 * `SpeedSampleSchema` is the authoritative shape of the JSON the simulator
 * publishes to MQTT. The same shape (plus a server-assigned `time`) is what the
 * backend persists and streams to the UI as a `SpeedReading`. The simulator and
 * frontend mirror this contract by convention so each service stays
 * independently deployable.
 */
import { z } from 'zod';

/** Raw sample as published by a sensor to `sensors/<deviceId>/speed`. */
export const SpeedSampleSchema = z.object({
  deviceId: z.string().min(1).max(128),
  // Instantaneous speed in km/h. Bounds reject NaN/Infinity and absurd values.
  speed: z.number().min(0).max(1000),
  // Optional ISO-8601 sensor timestamp; the server stamps the time if absent.
  ts: z.string().min(1).optional(),
});

export type SpeedSample = z.infer<typeof SpeedSampleSchema>;

/** A persisted reading as returned to API/Socket.IO clients. */
export interface SpeedReading {
  deviceId: string;
  /** Speed in km/h. */
  speed: number;
  /** ISO-8601 timestamp of when the sample was recorded. */
  time: string;
}
