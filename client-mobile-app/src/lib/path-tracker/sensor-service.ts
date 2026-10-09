// Sensor service for mobile (accelerometer / movement detection support).

export interface SensorState {
  isShaking: boolean;
  pedometerAvailable: boolean;
  stepCount: number;
}

type SensorCallback = (state: SensorState) => void;

class SensorService {
  private listeners = new Set<SensorCallback>();
  private active = false;
  private currentState: SensorState = {
    isShaking: false,
    pedometerAvailable: false,
    stepCount: 0,
  };

  start(): void {
    this.active = true;
    this.emit();
  }

  stop(): void {
    this.active = false;
  }

  subscribe(fn: SensorCallback): () => void {
    this.listeners.add(fn);
    fn(this.currentState);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.currentState);
  }
}

export const sensorService = new SensorService();
