#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>

// Callback pour gérer la reconnexion BLE
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    // Client connecté
  }
  void onDisconnect(BLEServer* pServer) override {
    // Client déconnecté, relance de la publicité BLE
    BLEDevice::getAdvertising()->start();
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

// BLE UUIDs pour chaque service et caractéristique
#define SERVICE_UUID_TEMP     "00002a6e-0000-1000-8000-00805f9b34fb"
#define CHAR_UUID_TEMP        "00002a6e-0000-1000-8000-00805f9b34fb"
#define SERVICE_UUID_PRESS    "00002a6d-0000-1000-8000-00805f9b34fb"
#define CHAR_UUID_PRESS       "00002a6d-0000-1000-8000-00805f9b34fb"
#define SERVICE_UUID_SON      "00002a74-0000-1000-8000-00805f9b34fb"
#define CHAR_UUID_SON         "00002a74-0000-1000-8000-00805f9b34fb"
#define SERVICE_UUID_DIST     "12345678-1234-1234-1234-123456789abc"
#define CHAR_UUID_DIST        "12345678-1234-1234-1234-123456789abc"

BLECharacteristic *pCharTemp;
BLECharacteristic *pCharPress;
BLECharacteristic *pCharSon;
BLECharacteristic *pCharDist;

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
  BLEDevice::init("ESP32_Capteurs");
  Serial.println("[BLE] Initialisation BLEDevice OK");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  Serial.println("[BLE] Serveur BLE créé");

  // Service Température
  BLEService *pServiceTemp = pServer->createService(SERVICE_UUID_TEMP);
  pCharTemp = pServiceTemp->createCharacteristic(
    CHAR_UUID_TEMP,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharTemp->addDescriptor(new BLE2902());
  pCharTemp->setValue("Init");
  pServiceTemp->start();
  Serial.println("[BLE] Service Température lancé");

  // Service Pression
  BLEService *pServicePress = pServer->createService(SERVICE_UUID_PRESS);
  pCharPress = pServicePress->createCharacteristic(
    CHAR_UUID_PRESS,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharPress->addDescriptor(new BLE2902());
  pCharPress->setValue("Init");
  pServicePress->start();
  Serial.println("[BLE] Service Pression lancé");

  // Service Son
  BLEService *pServiceSon = pServer->createService(SERVICE_UUID_SON);
  pCharSon = pServiceSon->createCharacteristic(
    CHAR_UUID_SON,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharSon->addDescriptor(new BLE2902());
  pCharSon->setValue("Init");
  pServiceSon->start();
  Serial.println("[BLE] Service Son lancé");

  // Service Distance
  BLEService *pServiceDist = pServer->createService(SERVICE_UUID_DIST);
  pCharDist = pServiceDist->createCharacteristic(
    CHAR_UUID_DIST,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharDist->addDescriptor(new BLE2902());
  pCharDist->setValue("Init");
  pServiceDist->start();
  Serial.println("[BLE] Service Distance lancé");

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID_TEMP);
  pAdvertising->addServiceUUID(SERVICE_UUID_PRESS);
  pAdvertising->addServiceUUID(SERVICE_UUID_SON);
  pAdvertising->addServiceUUID(SERVICE_UUID_DIST);
  pAdvertising->start();
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

  // ---------- BLE ENVOI ----------
  char bufTemp[16], bufPress[16], bufSon[16], bufDist[16];
  snprintf(bufTemp, sizeof(bufTemp), "%.2f", temp);
  snprintf(bufPress, sizeof(bufPress), "%.2f", press);
  snprintf(bufSon, sizeof(bufSon), "%d", amplitude);
  if (distance < 0) {
    snprintf(bufDist, sizeof(bufDist), "-1");
  } else {
    snprintf(bufDist, sizeof(bufDist), "%.2f", distance);
  }
  pCharTemp->setValue((uint8_t*)bufTemp, strlen(bufTemp));
  pCharTemp->notify();
  pCharPress->setValue((uint8_t*)bufPress, strlen(bufPress));
  pCharPress->notify();
  pCharSon->setValue((uint8_t*)bufSon, strlen(bufSon));
  pCharSon->notify();
  pCharDist->setValue((uint8_t*)bufDist, strlen(bufDist));
  pCharDist->notify();

  delay(500);
}
