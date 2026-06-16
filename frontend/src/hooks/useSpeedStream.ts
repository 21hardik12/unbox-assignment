/**
 * useSpeedStream — the single source of live data for the dashboard.
 *
 * On mount it seeds a rolling window from the REST history endpoint (so the
 * chart isn't empty on first paint), then opens a Socket.IO connection and
 * appends every incoming reading. It also tracks connection status for the UI.
 *
 * Returns the latest reading, a bounded rolling history, and the status.
 */
import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { config } from '../config';
import { fetchRecent } from '../api/client';
import type { ConnectionStatus, SpeedReading } from '../types';

interface SpeedStream {
  status: ConnectionStatus;
  latest: SpeedReading | null;
  history: SpeedReading[];
}

export function useSpeedStream(): SpeedStream {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [latest, setLatest] = useState<SpeedReading | null>(null);
  const [history, setHistory] = useState<SpeedReading[]>([]);

  // Append a reading, keeping only the most recent `chartPoints` entries.
  const pushReading = useCallback((reading: SpeedReading) => {
    setLatest(reading);
    setHistory((prev) => {
      const next = [...prev, reading];
      return next.length > config.chartPoints
        ? next.slice(next.length - config.chartPoints)
        : next;
    });
  }, []);

  // Seed the rolling window from history (best-effort; the live feed is primary).
  useEffect(() => {
    let cancelled = false;
    fetchRecent(config.deviceId, config.chartPoints)
      .then((response) => {
        if (cancelled || response.readings.length === 0) return;
        setHistory(response.readings);
        setLatest(response.readings[response.readings.length - 1] ?? null);
      })
      .catch(() => {
        /* History is optional; ignore and rely on the live stream. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Open the live Socket.IO stream.
  useEffect(() => {
    const socket: Socket = config.apiBaseUrl ? io(config.apiBaseUrl) : io();

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.io.on('reconnect_attempt', () => setStatus('connecting'));
    socket.on('reading', (reading: SpeedReading) => {
      // Ignore other devices in case multiple simulators share the broker.
      if (reading.deviceId === config.deviceId) pushReading(reading);
    });

    return () => {
      socket.close();
    };
  }, [pushReading]);

  return { status, latest, history };
}
