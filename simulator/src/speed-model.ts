/**
 * Realistic vehicle-speed model.
 *
 * A naive `Math.random() * maxSpeed` produces jittery noise that looks nothing
 * like a real vehicle and makes the needle jump around. Instead we model
 * *acceleration* as a damped, mean-reverting random walk and integrate it into
 * speed. The result is smooth, momentum-carrying motion: the vehicle gently
 * accelerates, cruises, and slows — exactly what a speedometer should show.
 *
 * The random source is injectable so the behaviour is fully deterministic (and
 * therefore unit-testable).
 */
export interface SpeedModelOptions {
  /** Maximum attainable speed in km/h. */
  maxSpeed: number;
  /** Speed to start from in km/h (default 0). */
  initialSpeed?: number;
  /** Max change in acceleration per tick, km/h per tick (default 6). */
  accelNoise?: number;
  /** Acceleration damping factor in [0, 1) (default 0.8). Higher = smoother. */
  damping?: number;
  /** Random source returning [0, 1); injectable for tests (default Math.random). */
  rng?: () => number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round1 = (value: number): number => Math.round(value * 10) / 10;

export class SpeedModel {
  private speed: number;
  private accel = 0;
  private readonly maxSpeed: number;
  private readonly accelNoise: number;
  private readonly damping: number;
  private readonly rng: () => number;

  constructor(options: SpeedModelOptions) {
    this.maxSpeed = options.maxSpeed;
    this.speed = clamp(options.initialSpeed ?? 0, 0, options.maxSpeed);
    this.accelNoise = options.accelNoise ?? 6;
    this.damping = options.damping ?? 0.8;
    this.rng = options.rng ?? Math.random;
  }

  /** Current speed in km/h, rounded to one decimal. */
  get current(): number {
    return round1(this.speed);
  }

  /**
   * Advance the model by one tick (conceptually ~1 second) and return the new
   * speed in km/h. Output is always within [0, maxSpeed].
   */
  next(): number {
    // Acceleration is a damped random walk: it keeps some of its previous value
    // (momentum) plus a small random nudge centred on zero.
    const nudge = (this.rng() - 0.5) * 2 * this.accelNoise;
    this.accel = this.accel * this.damping + nudge;

    // Soft bounds: when pressed against a limit, reflect acceleration inward so
    // the vehicle eases away from 0 / maxSpeed instead of sticking to it.
    if (this.speed <= 0 && this.accel < 0) {
      this.accel = -this.accel * 0.5;
    } else if (this.speed >= this.maxSpeed && this.accel > 0) {
      this.accel = -this.accel * 0.5;
    }

    this.speed = clamp(this.speed + this.accel, 0, this.maxSpeed);
    return this.current;
  }
}
