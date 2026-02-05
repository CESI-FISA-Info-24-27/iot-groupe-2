#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <WiFi.h>
#include <PubSubClient.h>

// ===== CONFIGURATION WIFI / MQTT =====
// Renseigne ici tes paramètres réseau et MQTT
const char* WIFI_SSID = "Iphone13NRV";
const char* WIFI_PASSWORD = "cesiot-0102";
const char* MQTT_HOST = "172.20.10.10";
const int MQTT_PORT = 1883;
const char* MQTT_USERNAME = "ecoguard";
const char* MQTT_PASSWORD = "ecoguard123";

// ===== CONFIGURATION PROJET =====
const char* room_id = "C4";
const char* device_id = "esp32_sensor_001";
const char* sensor_id_bmp280 = "bmp280";
const char* sensor_id_hcsr04 = "hcsr04";
const char* sensor_id_mic = "mic";

// ===== MQTT =====
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
bool is_awake = true;

// ---------- BMP280 ----------
#define BMP_CS   4
#define BMP_SCK  18
#define BMP_SDO 19
#define BMP_SDI 23

// ---------- MICRO MAX4466 ----------
#define MIC_PIN 34
#define NB_ECHANTILLONS 100

// ---------- HC-SR04 ----------
#define TRIG_PIN 26
#define ECHO_PIN 27

Adafruit_BMP280 bmp(BMP_CS, BMP_SDI, BMP_SDO, BMP_SCK);

static void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

static void ensureMQTT() {
  if (mqttClient.connected()) {
    return;
  }
  while (!mqttClient.connected()) {
    if (mqttClient.connect(device_id, MQTT_USERNAME, MQTT_PASSWORD)) {
      break;
    }
    delay(1000);
  }
}

static void publishJSON(const char* topic, const char* payload) {
  mqttClient.publish(topic, payload, true);
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("Démarrage ESP32...");

  // BMP280
  if (!bmp.begin()) {
    Serial.println("❌ BMP280 NON détecté");
  } else {
    Serial.println("✅ BMP280 détecté");
  }

  // ADC ESP32
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // HC-SR04
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Wi-Fi + MQTT
  ensureWiFi();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  ensureMQTT();
  Serial.println("[MQTT] Connexion MQTT établie !");
}

float lireDistanceCM() 
{
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duree = pulseIn(ECHO_PIN, HIGH, 1000000);
  if (duree == 0) return -1;

  return duree * 0.0343 / 2.0;
}

void loop() 
{
  ensureWiFi();
  ensureMQTT();
  mqttClient.loop();

  if (!is_awake) {
    delay(100);
    return;
  }

  // ---------- BMP280 ----------
  float temp = bmp.readTemperature();
  float press = bmp.readPressure() / 100.0;

  // ---------- MICRO ----------
  int minVal = 4095;
  int maxVal = 0;
  for (int i = 0; i < NB_ECHANTILLONS; i++) {
    int v = analogRead(MIC_PIN);
    minVal = min(minVal, v);
    maxVal = max(maxVal, v);
    delayMicroseconds(200);
  }
  int amplitude = maxVal - minVal;
  amplitude = max(amplitude, 20);
  float niveau = 20.0 * log10((float)amplitude / 20);

  // ---------- HC-SR04 ----------
  float distance = lireDistanceCM();

  // ---------- MQTT ENVOI (JSON par type) ----------
  unsigned long timestamp = millis();
  char json_msg[256];
  char topic[128];

  snprintf(
    json_msg,
    sizeof(json_msg),
    "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
    "\"sensor_type\":\"temperature\",\"value\":%.2f,\"unit\":\"C\",\"timestamp\":%lu}",
    sensor_id_bmp280, device_id, room_id, temp, timestamp
  );
  snprintf(topic, sizeof(topic), "ecoguard/sensors/%s/temperature", room_id);
  publishJSON(topic, json_msg);

  snprintf(
    json_msg,
    sizeof(json_msg),
    "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
    "\"sensor_type\":\"pressure\",\"value\":%.2f,\"unit\":\"hPa\",\"timestamp\":%lu}",
    sensor_id_bmp280, device_id, room_id, press, timestamp
  );
  snprintf(topic, sizeof(topic), "ecoguard/sensors/%s/pressure", room_id);
  publishJSON(topic, json_msg);

  snprintf(
    json_msg,
    sizeof(json_msg),
    "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
    "\"sensor_type\":\"sound\",\"value\":%.2f,\"unit\":\"dB\",\"timestamp\":%lu}",
    sensor_id_mic, device_id, room_id, niveau, timestamp
  );
  snprintf(topic, sizeof(topic), "ecoguard/sensors/%s/sound", room_id);
  publishJSON(topic, json_msg);

  if (distance >= 0) {
    snprintf(
      json_msg,
      sizeof(json_msg),
      "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
      "\"sensor_type\":\"distance\",\"value\":%.2f,\"unit\":\"cm\",\"timestamp\":%lu}",
      sensor_id_hcsr04, device_id, room_id, distance, timestamp
    );
    snprintf(topic, sizeof(topic), "ecoguard/sensors/%s/distance", room_id);
    publishJSON(topic, json_msg);
  }

  delay(1000);
}
