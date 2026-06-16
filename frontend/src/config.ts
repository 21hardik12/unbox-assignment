/** Runtime configuration derived from Vite build-time env vars (all optional). */
function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  /** API / Socket.IO origin. Empty string = same origin (proxy/nginx). */
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '',
  /** Device to display; must match the simulator's id. */
  deviceId: import.meta.env.VITE_DEVICE_ID ?? 'vehicle-01',
  /** Speedometer dial maximum (km/h). */
  maxSpeed: positiveNumber(import.meta.env.VITE_MAX_SPEED, 220),
  /** Number of most-recent readings kept in the live chart/stats window. */
  chartPoints: 60,
} as const;
