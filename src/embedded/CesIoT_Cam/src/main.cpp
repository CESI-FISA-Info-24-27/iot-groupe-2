#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>
#include <esp_timer.h>

// ===========================
// CONFIGURATION WiFi
// ===========================
const char* WIFI_SSID = "Iphone13NRV";
const char* WIFI_PASSWORD = "cesiot-0102";

// ===========================
// CONFIGURATION IP STATIQUE
// ===========================
IPAddress local_IP(172, 20, 10, 13);
IPAddress gateway(172, 20, 10, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress primaryDNS(8, 8, 8, 8);
IPAddress secondaryDNS(8, 8, 4, 4);

// ===========================
// ESP32-CAM AI-THINKER
// ===========================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_GPIO_NUM     4

// ===========================
// PIR + SPEAKER
// ===========================
#define PIR_PIN 13
#define SPEAKER_PIN 15

// ===========================
// SERVEUR WEB
// ===========================
WebServer server(80);

// ===========================
// STATISTIQUES
// ===========================
unsigned long frame_count = 0;
float current_fps = 0;

// ===========================
// DÉCLARATIONS
// ===========================
void handleRoot();
void handleStream();
void handleSnapshot();
void handleStatus();
void handleNotFound();
bool initCamera();
void siren();

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println("\n=== ESP32-CAM MJPEG + PIR + Speaker ===");

  // PIR
  pinMode(PIR_PIN, INPUT);

  // Speaker (PWM)
  ledcAttach(SPEAKER_PIN, 2000, 8);

  // ===== INITIALISATION CAMERA (CONFIG GROUPE 1) =====
  Serial.println("Initialisation de la caméra...");
  if (!initCamera()) {
    Serial.println("ERREUR: caméra non initialisée !");
    while (true) delay(1000);
  }
  Serial.println("Caméra OK");

  // ===== WIFI =====
  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS, secondaryDNS)) {
    Serial.println("Échec config IP statique");
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connexion WiFi");
  int timeout = 20;
  while (WiFi.status() != WL_CONNECTED && timeout > 0) {
    delay(500);
    Serial.print(".");
    timeout--;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nERREUR WiFi");
    while (true) delay(1000);
  }
  Serial.println("\nWiFi connecté !");
  Serial.println(WiFi.localIP());

  // ===== SERVEUR WEB =====
  server.on("/", HTTP_GET, handleRoot);
  server.on("/stream", HTTP_GET, handleStream);
  server.on("/snapshot", HTTP_GET, handleSnapshot);
  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("Serveur HTTP démarré");
}

void loop() {
  server.handleClient();

  if (digitalRead(PIR_PIN)) {
    Serial.println("MOUVEMENT !");
    for (int i = 0; i < 3; i++) siren();
    delay(5000); // anti-spam
  }
}

// ===========================
// INITIALISATION CAMERA (GROUPE 1)
// ===========================
bool initCamera() {
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
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 24000000;  // Config groupe 1
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;     // 640x480
  config.jpeg_quality = 10;              // Meilleure qualité
  config.fb_count = 2;                   // Double buffering
  config.grab_mode = CAMERA_GRAB_LATEST;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Erreur caméra");
    return false;
  }

  sensor_t * s = esp_camera_sensor_get();
  if (!s) return false;

  // Paramètres optimisés (groupe 1)
  s->set_brightness(s, 0);
  s->set_contrast(s, 0);
  s->set_saturation(s, 0);
  s->set_special_effect(s, 0);
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_wb_mode(s, 0);
  s->set_exposure_ctrl(s, 1);
  s->set_aec2(s, 1);
  s->set_ae_level(s, 0);
  s->set_aec_value(s, 150);
  s->set_gain_ctrl(s, 1);
  s->set_agc_gain(s, 0);
  s->set_gainceiling(s, (gainceiling_t)2);
  s->set_bpc(s, 1);
  s->set_wpc(s, 1);
  s->set_raw_gma(s, 1);
  s->set_lenc(s, 0);
  s->set_hmirror(s, 0);
  s->set_vflip(s, 0);
  s->set_dcw(s, 1);
  s->set_colorbar(s, 0);
  s->set_framesize(s, FRAMESIZE_VGA);

  return true;
}

// ===========================
// SIRENE
// ===========================
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

// ===========================
// HANDLERS HTTP
// ===========================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<title>ESP32-CAM MJPEG + PIR</title></head><body>";
  html += "<h1>ESP32-CAM MJPEG + PIR + Speaker</h1>";
  html += "<p><a href='/stream'>Flux MJPEG</a></p>";
  html += "<p><a href='/snapshot'>Capture snapshot</a></p>";
  html += "<p><a href='/status'>Statut JSON</a></p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleStream() {
  WiFiClient client = server.client();
  Serial.println("Début du streaming MJPEG");

  String response = "HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(response);

  while (client.connected()) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) { delay(10); continue; }

    client.printf("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    client.write(fb->buf, fb->len);
    client.printf("\r\n");

    esp_camera_fb_return(fb);
    frame_count++;
  }

  Serial.println("Fin du streaming MJPEG");
}

void handleSnapshot() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) { server.send(500, "text/plain", "Camera capture failed"); return; }
  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void handleStatus() {
  String json = "{";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"fps\":" + String(current_fps, 1);
  json += "}";
  server.send(200, "application/json", json);
}

void handleNotFound() {
  server.send(404, "text/plain", "404 - Not Found");
  Serial.println("404: " + server.uri());
}