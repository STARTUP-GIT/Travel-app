/**
 * Platform boundary for the original Path-Tracker sensor service.
 *
 * Path-Tracker/src/services/sensor-service.ts starts with:
 *
 *   start() { if (this.running) return; if (Platform.OS === 'web') return; ... }
 *
 * so on the web platform the original deliberately runs with NO accelerometer
 * and NO pedometer, leaving SensorState at its documented defaults. This port
 * reproduces exactly that web behaviour: no sensors are subscribed, the state
 * machine is inert, and subscribers still receive the default state (on
 * subscribe and on stop), which is what the engine's confidence fusion sees.
 *
 * The accelerometer / step-counter implementation is intentionally NOT
 * re-invented here — inventing a different sensor source would change the
 * movement-confidence behaviour of the engine.
 */

export interface SensorState {
  /** Accelerometer magnitude (g-force). 1.0 = gravity at rest. */
  accelerometerMagnitude: number;
  /** True when high-frequency oscillation consistent with phone shake. */
  isShaking: boolean;
  /** Step events detected since last reset. */
  stepCount: number;
  /** True if pedometer is available on this device. */
  pedometerAvailable: boolean;
}

type SensorCallback = (state: SensorState) => void;

class SensorService {
  private state: SensorState = {
    accelerometerMagnitude: 1.0,
    isShaking: false,
    stepCount: 0,
    pedometerAvailable: false,
  };

  private listeners = new Set<SensorCallback>();
  private running = false;

  /**
   * No-op on web — matches the original `Platform.OS === 'web'` guard.
   */
  start(): void {
    if (this.running) return;
  }

  /**
   * Stop all sensor subscriptions and emit the reset default state.
   */
  stop(): void {
    this.running = false;
    this.state = {
      accelerometerMagnitude: 1.0,
      isShaking: false,
      stepCount: 0,
      pedometerAvailable: false,
    };
    this.emit();
  }

  subscribe(fn: SensorCallback): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  getState(): SensorState {
    return { ...this.state };
  }

  resetSteps(): void {
    this.state.stepCount = 0;
  }

  private emit(): void {
    const snapshot = { ...this.state };
    for (const l of this.listeners) l(snapshot);
  }
}

/** Singleton sensor service. */
export const sensorService = new SensorService();
