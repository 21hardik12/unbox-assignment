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
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            color: '#0f172a',
          }}
          labelStyle={{ color: '#475569' }}
          formatter={(value) => [`${value} km/h`, 'Speed']}
        />
        <Line
          type="monotone"
          dataKey="speed"
          stroke="#0284c7"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
