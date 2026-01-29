// types/sensors.ts
export interface SensorData {
  temperature: number | null;
  pressure: number | null;
  distance: number | null;
  sound: number | null;
  timestamp: number;
}

export interface SensorReading {
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: Date;
}

export type SensorType = 'temperature' | 'pressure' | 'distance' | 'sound';

export interface SensorConfig {
  name: string;
  unit: string;
  icon: string;
  minValue?: number;
  maxValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
} 
