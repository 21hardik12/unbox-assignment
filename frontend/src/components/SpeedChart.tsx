/** Live line chart of the rolling speed window, rendered with Recharts. */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { config } from '../config';
import type { SpeedReading } from '../types';

interface SpeedChartProps {
  data: SpeedReading[];
}

export function SpeedChart({ data }: SpeedChartProps) {
  const chartData = data.map((reading) => ({
    time: new Date(reading.time).toLocaleTimeString(),
    speed: reading.speed,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, bottom: 4, left: -12 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#64748b', fontSize: 11 }}
          minTickGap={48}
        />
        <YAxis
          domain={[0, config.maxSpeed]}
          tick={{ fill: '#64748b', fontSize: 11 }}
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            color: '#e2e8f0',
          }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value) => [`${value} km/h`, 'Speed']}
        />
        <Line
          type="monotone"
          dataKey="speed"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
