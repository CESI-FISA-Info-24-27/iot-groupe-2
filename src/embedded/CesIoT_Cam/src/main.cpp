#include "esp_camera.h"
#include <WiFi.h>

// ===========================
// CAMERA MODEL
// ===========================
#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

// ===== CONFIGURATION WIFI =====
const char* WIFI_SSID = "Iphone13NRV";
const char* WIFI_PASSWORD = "cesiot-0102";

// ===== CONFIGURATION RESEAU =====
#define CAMERA_IP "172.20.10.13"
#define CAMERA_GATEWAY "172.20.10.1"
#define CAMERA_SUBNET "255.255.255.0"

// ===========================
// PIR + SPEAKER
// ===========================
#define PIR_PIN 13
#define SPEAKER_PIN 15
#define PWM_CHANNEL 0

void startCameraServer();
void setupLedFlash();

// Sirene
void siren() {
  for (int f = 1000; f < 2500; f += 120) {
    ledcWriteTone(SPEAKER_PIN, f);
    delay(15);
  }
  for (int f = 2500; f > 1000; f -= 120) {
    ledcWriteTone(SPEAKER_PIN, f);
    delay(15);
  }
  ledcWriteTone(SPEAKER_PIN, 0);
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(false);

  pinMode(PIR_PIN, INPUT);

  // Nouveau PWM (ESP32 core recent)
  ledcAttach(PWM_CHANNEL, 2000, 8);
  ledcAttachPin(SPEAKER_PIN, PWM_CHANNEL);

  // ================= CAMERA CONFIG =================
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_QVGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (psramFound()) {
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed");
    return;
  }

  // ================= WIFI =================
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  IPAddress ip, gateway, subnet;
  ip.fromString(CAMERA_IP);
  gateway.fromString(CAMERA_GATEWAY);
  subnet.fromString(CAMERA_SUBNET);
  WiFi.config(ip, gateway, subnet);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connecte !");
  Serial.println(WiFi.localIP());

  startCameraServer();
}

void loop() {
  if (digitalRead(PIR_PIN)) {
    Serial.println("MOUVEMENT !");
    for (int i = 0; i < 3; i++) {
      siren();
    }
    delay(5000);
  }
}
