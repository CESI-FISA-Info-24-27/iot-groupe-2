// constants/config.ts
import { SensorConfig } from '@/types/sensors';

// À remplacer par l'adresse IP du serveur IoT quand on l'aura
export const API_BASE_URL = 'http://192.168.1.100:8080';

export const API_ENDPOINTS = {
  temperature: `${API_BASE_URL}/api/temperature`,
  pressure: `${API_BASE_URL}/api/pressure`,
  distance: `${API_BASE_URL}/api/distance`,
  sound: `${API_BASE_URL}/api/sound`,
  camera: `http://honjin1.miemasu.net/nphMotionJpeg?Resolution=640x480&Quality=Standard`, // Pour tester le flux caméra
};

// Configuration de chaque capteur
export const SENSOR_CONFIGS: Record<string, SensorConfig> = {
  temperature: {
    name: 'Température',
    unit: '°C',
    icon: '🌡️',
    minValue: -10,
    maxValue: 50,
    warningThreshold: 30,
    criticalThreshold: 40,
  },
  pressure: {
    name: 'Pression',
    unit: 'hPa',
    icon: '🌪️',
    minValue: 950,
    maxValue: 1050,
    warningThreshold: 1020,
    criticalThreshold: 1030,
  },
  distance: {
    name: 'Distance',
    unit: 'cm',
    icon: '📏',
    minValue: 0,
    maxValue: 400,
    warningThreshold: 50,
    criticalThreshold: 20,
  },
  sound: {
    name: 'Son',
    unit: 'dB',
    icon: '🔊',
    minValue: 0,
    maxValue: 120,
    warningThreshold: 80,
    criticalThreshold: 100,
  },
};

// Intervalle de rafraîchissement des données (en ms)
export const REFRESH_INTERVAL = 2000; // 2 secondes