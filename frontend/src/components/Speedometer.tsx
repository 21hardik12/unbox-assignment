/**
 * The speedometer gauge.
 *
 * react-d3-speedometer draws a fixed-size SVG (it has no viewBox) and its
 * `fluidWidth` auto-sizing is unreliable: it reads the parent's clientWidth at
 * draw time, which is often 0 before layout settles (see the library's issue
 * #69), so the gauge renders empty. We avoid that entirely by measuring the
 * container ourselves with a ResizeObserver and passing explicit width/height.
 *
 * The `key={width}` forces a clean redraw when the size changes (the library
 * only animates on `value` changes, not on dimension changes). Because the key
 * is the width — not the value — value-only updates keep the same key, so the
 * needle still animates smoothly between readings.
 */
import { useEffect, useRef, useState } from 'react';
import ReactSpeedometer from 'react-d3-speedometer';
import { config } from '../config';

const MIN_WIDTH = 260;
const MAX_WIDTH = 400;
// The gauge is a 180° semicircle, but the library sizes the radius from the
// *width* and centres the drawing vertically in a square box — so we must give
// it a square (height = width) to avoid clipping the arc, then clip away the
// empty lower half of that box with the container (VISIBLE_RATIO) so the panel
// isn't needlessly tall.
const VISIBLE_RATIO = 0.66;

export function Speedometer({ value }: { value: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () =>
      setWidth(
        Math.round(Math.max(MIN_WIDTH, Math.min(element.clientWidth, MAX_WIDTH))),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="speedometer"
      ref={containerRef}
      style={{ height: Math.round(width * VISIBLE_RATIO) }}
    >
      <ReactSpeedometer
        key={width}
        width={width}
        height={width}
        value={Math.max(0, Math.min(value, config.maxSpeed))}
        minValue={0}
        maxValue={config.maxSpeed}
        segments={11}
        maxSegmentLabels={6}
        ringWidth={width < 340 ? 18 : 26}
        needleColor="#e2e8f0"
        startColor="#22c55e"
        endColor="#ef4444"
        textColor="#94a3b8"
        needleTransitionDuration={900}
        currentValueText="${value} km/h"
        valueFormat="d"
      />
    </div>
  );
}
