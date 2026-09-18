import { Accelerometer, Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

/**
 * Sensor service providing supporting signals for movement detection.
 *
 * These sensors are SUPPLEMENTARY — GPS remains the geographic position source.
 * Sensor data feeds into the movement confidence score to help distinguish:
 *   - Phone shake / rotation  →  STATIONARY
 *   - User locomotion         →  MOVING
 *
 * All sensors gracefully degrade when unavailable:
 *   - Web platform: sensors unavailable, returns defaults.
 *   - Device hardware missing: listener never fires.
 *   - Permission denied: returns defaults.
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

const SHAKE_THRESHOLD_G = 1.6; // magnitude above 1.6g indicates shake
const SHAKE_WINDOW_MS = 800;   // look-back window for shake detection
const SHAKE_MIN_EVENTS = 3;    // minimum shake events in window

class SensorService {
  private state: SensorState = {
    accelerometerMagnitude: 1.0,
    isShaking: false,
    stepCount: 0,
    pedometerAvailable: false,
  };

  private listeners = new Set<SensorCallback>();
  private accelSub: ReturnType<typeof Accelerometer.addListener> | null = null;
  private pedometerSub: ReturnType<typeof Pedometer.watchStepCount> | null = null;
  private recentAccelMagnitudes: { magnitude: number; time: number }[] = [];
  private running = false;

  /**
   * Start monitoring accelerometer and (optionally) step detector.
   * Safe to call multiple times — no-ops if already running.
   */
  start(): void {
    if (this.running) return;
    if (Platform.OS === 'web') return;

    this.running = true;
    this.startAccelerometer();
    this.startPedometer();
  }

  /**
   * Stop all sensor subscriptions.
   */
  stop(): void {
    this.accelSub?.remove();
    this.accelSub = null;
    this.pedometerSub?.remove();
    this.pedometerSub = null;
    this.running = false;
    this.recentAccelMagnitudes = [];
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

  // ── Private ───────────────────────────────────────────────────────────────

  private startAccelerometer(): void {
    try {
      Accelerometer.setUpdateInterval(100); // 10 Hz
      this.accelSub = Accelerometer.addListener((data) => {
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        const now = Date.now();

        this.state.accelerometerMagnitude = magnitude;

        // Track recent magnitudes for shake detection
        this.recentAccelMagnitudes.push({ magnitude, time: now });
        // Prune old entries
        while (
          this.recentAccelMagnitudes.length > 0 &&
          now - this.recentAccelMagnitudes[0].time > SHAKE_WINDOW_MS
        ) {
          this.recentAccelMagnitudes.shift();
        }

        // Detect shake: multiple high-magnitude events in short window
        const shakeEvents = this.recentAccelMagnitudes.filter(
          (e) => e.magnitude > SHAKE_THRESHOLD_G
        ).length;
        this.state.isShaking = shakeEvents >= SHAKE_MIN_EVENTS;

        this.emit();
      });
    } catch {
      // Accelerometer unavailable on this device — non-fatal
    }
  }

  private startPedometer(): void {
    try {
      const sub = Pedometer.watchStepCount((result) => {
        this.state.stepCount = result.steps;
        this.state.pedometerAvailable = true;
        this.emit();
      });
      this.pedometerSub = sub;
    } catch {
      this.state.pedometerAvailable = false;
    }
  }

  private emit(): void {
    const snapshot = { ...this.state };
    for (const l of this.listeners) l(snapshot);
  }
}

/** Singleton sensor service. */
export const sensorService = new SensorService();
