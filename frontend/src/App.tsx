/** Dashboard layout: header + connection badge, gauge, stats, and live chart. */
import { ConnectionBadge } from './components/ConnectionBadge';
import { SpeedChart } from './components/SpeedChart';
import { Speedometer } from './components/Speedometer';
import { StatsPanel } from './components/StatsPanel';
import { config } from './config';
import { useSpeedStream } from './hooks/useSpeedStream';

export default function App() {
  const { status, latest, history } = useSpeedStream();
  const currentSpeed = latest?.speed ?? 0;

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Real-Time Speedometer</h1>
          <p className="app__subtitle">
            Device <code>{config.deviceId}</code> · MQTT → TimescaleDB →
            WebSocket
          </p>
        </div>
        <ConnectionBadge status={status} />
      </header>

      <main className="app__grid">
        <section className="panel panel--gauge">
          <Speedometer value={currentSpeed} />
        </section>

        <section className="panel panel--stats">
          <h2 className="panel__heading">Live statistics</h2>
          <StatsPanel history={history} latest={latest} />
        </section>

        <section className="panel panel--chart">
          <h2 className="panel__heading">
            Speed over time
            <span className="panel__hint">
              last {history.length} samples
            </span>
          </h2>
          <SpeedChart data={history} />
        </section>
      </main>

      <footer className="app__footer">
        Unbox assignment · Node.js · MQTT · TimescaleDB · React
      </footer>
    </div>
  );
}
