/** Thin REST client for the backend history API. */
import { config } from '../config';
import type { RecentResponse } from '../types';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Fetch the most recent `limit` readings for a device (oldest → newest). */
export function fetchRecent(
  deviceId: string,
  limit: number,
): Promise<RecentResponse> {
  const params = new URLSearchParams({ deviceId, limit: String(limit) });
  return getJson<RecentResponse>(`/api/readings/recent?${params.toString()}`);
}
