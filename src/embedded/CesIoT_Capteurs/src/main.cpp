#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>

// ===== CONFIGURATION BLE =====
#define DEVICE_NAME "ESP32_Capteurs"
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_TX_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // ESP32 -> Gateway (notify)
#define CHAR_RX_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"  // Gateway -> ESP32 (write)

// ===== CONFIGURATION PROJET =====
const char* room_id = "C4";
const char* device_id = "esp32_sensor_001";
const char* sensor_id_bmp280 = "bmp280";
const char* sensor_id_hcsr04 = "hcsr04";
const char* sensor_id_mic = "mic";

// ===== ÉTAT BLE =====
BLEServer* pServer = nullptr;
BLECharacteristic* pTxCharacteristic = nullptr;
BLECharacteristic* pRxCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;
bool is_awake = true;
unsigned long last_awake_time = 0;

// Callback BLE
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    String rx = pCharacteristic->getValue().c_str();
    if (rx.length() == 0) {
      return;
    }
    if (rx.indexOf("\"command\":\"wake\"") != -1) {
      is_awake = true;
      last_awake_time = millis();
    } else if (rx.indexOf("\"command\":\"sleep\"") != -1) {
      is_awake = false;
    } else if (rx.indexOf("\"command\":\"reboot\"") != -1) {
      delay(200);
      ESP.restart();
    }
  }
};

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

static void sendBLEMessage(const String& message) {
  if (deviceConnected && pTxCharacteristic != nullptr) {
    pTxCharacteristic->setValue(message.c_str());
    pTxCharacteristic->notify();
  }
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

  // BLE
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pTxCharacteristic = pService->createCharacteristic(
    CHAR_TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  pRxCharacteristic = pService->createCharacteristic(
    CHAR_RX_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new RxCallbacks());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Publicité BLE lancée, serveur prêt !");
}

float lireDistanceCM() 
{
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duree = pulseIn(ECHO_PIN, HIGH, 30000); // timeout 30ms
  if (duree == 0) return -1;

  return duree * 0.0343 / 2.0;
}

void loop() 
{
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

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

  // ---------- HC-SR04 ----------
  float distance = lireDistanceCM();

  // ---------- BLE ENVOI (JSON sur une seule caractéristique) ----------
  unsigned long timestamp = millis();
  char json_msg[256];

  snprintf(
    json_msg,
    sizeof(json_msg),
    "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
    "\"sensor_type\":\"temperature\",\"value\":%.2f,\"unit\":\"C\",\"timestamp\":%lu}",
    sensor_id_bmp280, device_id, room_id, temp, timestamp
  );
  sendBLEMessage(String(json_msg));

  snprintf(
    json_msg,
    sizeof(json_msg),
    "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
    "\"sensor_type\":\"pressure\",\"value\":%.2f,\"unit\":\"hPa\",\"timestamp\":%lu}",
    sensor_id_bmp280, device_id, room_id, press, timestamp
  );
  sendBLEMessage(String(json_msg));

  snprintf(
    json_msg,
    sizeof(json_msg),
    "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
    "\"sensor_type\":\"sound\",\"amplitude\":%d,\"timestamp\":%lu}",
    sensor_id_mic, device_id, room_id, amplitude, timestamp
  );
  sendBLEMessage(String(json_msg));

  if (distance >= 0) {
    snprintf(
      json_msg,
      sizeof(json_msg),
      "{\"device_id\":\"%s\",\"parent_device_id\":\"%s\",\"room_id\":\"%s\","
      "\"sensor_type\":\"distance\",\"value\":%.2f,\"unit\":\"cm\",\"timestamp\":%lu}",
      sensor_id_hcsr04, device_id, room_id, distance, timestamp
    );
    sendBLEMessage(String(json_msg));
  }

  delay(1000);
}
