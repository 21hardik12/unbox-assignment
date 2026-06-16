/**
 * Summary statistics computed over the live rolling window. (The backend also
 * exposes a server-side /api/readings/stats endpoint; here we derive them from
 * the same buffer that feeds the chart so the numbers always agree with it.)
 */
import type { SpeedReading } from '../types';

interface StatsPanelProps {
  history: SpeedReading[];
  latest: SpeedReading | null;
}

function StatCard({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className={accent ? 'stat stat--accent' : 'stat'}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}
        {unit ? <span className="stat__unit">{unit}</span> : null}
      </span>
    </div>
  );
}

export function StatsPanel({ history, latest }: StatsPanelProps) {
  const speeds = history.map((reading) => reading.speed);
  const count = speeds.length;
  const avg = count ? speeds.reduce((sum, s) => sum + s, 0) / count : 0;
  const max = count ? Math.max(...speeds) : 0;
  const min = count ? Math.min(...speeds) : 0;
  const current = latest?.speed ?? 0;
  const fmt = (n: number): string => n.toFixed(1);

  return (
    <div className="stats">
      <StatCard label="Current" value={fmt(current)} unit="km/h" accent />
      <StatCard label="Average" value={fmt(avg)} unit="km/h" />
      <StatCard label="Max" value={fmt(max)} unit="km/h" />
      <StatCard label="Min" value={fmt(min)} unit="km/h" />
      <StatCard label="Samples" value={String(count)} />
    </div>
  );
}
