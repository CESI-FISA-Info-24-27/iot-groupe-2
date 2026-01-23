#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>

// ---------- BMP280 ----------
#define BMP_CS   4
#define BMP_SCK  18
#define BMP_MISO 19
#define BMP_MOSI 23

// ---------- MICRO MAX4466 ----------
#define MIC_PIN 34
#define NB_ECHANTILLONS 100

// ---------- HC-SR04 ----------
#define TRIG_PIN 26
#define ECHO_PIN 27

Adafruit_BMP280 bmp(BMP_CS, BMP_MOSI, BMP_MISO, BMP_SCK);

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
}

float lireDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duree = pulseIn(ECHO_PIN, HIGH, 30000); // timeout 30ms
  if (duree == 0) return -1;

  return duree * 0.0343 / 2.0;
}

void loop() {
  // ---------- BMP280 ----------
  Serial.print("Temp: ");
  Serial.print(bmp.readTemperature());
  Serial.print(" °C | ");

  Serial.print("Press: ");
  Serial.print(bmp.readPressure() / 100.0);
  Serial.print(" hPa | ");

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

  Serial.print("Son: ");
  Serial.print(amplitude);
  Serial.print(" | ");

  // ---------- HC-SR04 ----------
  float distance = lireDistanceCM();

  if (distance < 0) {
    Serial.println("Distance: hors portée");
  } else {
    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.println(" cm");
  }

  delay(500);
}
