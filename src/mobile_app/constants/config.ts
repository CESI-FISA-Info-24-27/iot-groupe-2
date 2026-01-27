// constants/config.ts
import { SensorConfig } from "@/types/sensors";

// À remplacer par l'adresse IP du serveur IoT quand on l'aura
export const API_BASE_URL = "http://10.41.12.112:3000";

export const API_ENDPOINTS = {
  sensorsHistory: `${API_BASE_URL}/api/sensors/history`,
  health: `${API_BASE_URL}/health`,
  camera: `http://honjin1.miemasu.net/nphMotionJpeg?Resolution=640x480&Quality=Standard`, // Pour tester le flux caméra
  cameraSnapshot: `${API_BASE_URL}/api/camera/snapshot`,
};

// Configuration de chaque capteur
export const SENSOR_CONFIGS: Record<string, SensorConfig> = {
  temperature: {
    name: "Température",
    unit: "°C",
    icon: "thermometer",
    minValue: -10,
    maxValue: 50,
    warningThreshold: 30,
    criticalThreshold: 40,
  },
  pressure: {
    name: "Pression",
    unit: "hPa",
    icon: "gauge",
    minValue: 950,
    maxValue: 1050,
    warningThreshold: 1020,
    criticalThreshold: 1030,
  },
  distance: {
    name: "Distance",
    unit: "cm",
    icon: "ruler",
    minValue: 0,
    maxValue: 400,
    warningThreshold: 50,
    criticalThreshold: 20,
  },
  sound: {
    name: "Son",
    unit: "dB",
    icon: "volume-high",
    minValue: 0,
    maxValue: 120,
    warningThreshold: 80,
    criticalThreshold: 100,
  },
};

// Intervalle de rafraîchissement des données (en ms)
export const REFRESH_INTERVAL = 2000; // 2 secondes
