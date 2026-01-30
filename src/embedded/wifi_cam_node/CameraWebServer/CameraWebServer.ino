#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>

// ===========================
// CAMERA MODEL
// ===========================
#define CAMERA_MODEL_AI_THINKER
#include "../camera_pins.h"

// ===========================
// WIFI
// ===========================
const char* ssid = "iPhone de coutinho (2)";
const char* password = "87654321";

// ===========================
// WEB SERVER
// ===========================
WebServer server(80);

// ===========================
// STATS
// ===========================
volatile unsigned long frame_count = 0;
unsigned long last_fps_update = 0;
float current_fps = 0;

// ===== Forward declarations
bool initCamera();
void handleRoot();
void handleStream();
void handleSnapshot();
void handleStatus();
void handleNotFound();

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  Serial.println("📷 Init camera...");
  if (!initCamera()) {
    Serial.println("❌ Camera init failed");
    while (true) delay(1000);
  }
  Serial.println("✅ Camera OK");

  Serial.println("📡 Connecting WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(ssid, password);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
    if (millis() - t0 > 20000) { // timeout 20s
      Serial.println("\n❌ WiFi connect timeout");
      while (true) delay(1000);
    }
  }

  Serial.println("\n✅ WiFi connected");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
  Serial.print("MAC: "); Serial.println(WiFi.macAddress());
  Serial.print("RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");

  // Routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/stream", HTTP_GET, handleStream);
  server.on("/snapshot", HTTP_GET, handleSnapshot);
  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("🌐 HTTP server started");
  Serial.println("Endpoints:");
  Serial.printf("  http://%s/\n", WiFi.localIP().toString().c_str());
  Serial.printf("  http://%s/stream\n", WiFi.localIP().toString().c_str());
  Serial.printf("  http://%s/snapshot\n", WiFi.localIP().toString().c_str());
  Serial.printf("  http://%s/status\n", WiFi.localIP().toString().c_str());
}

void loop() {
  server.handleClient();

  // Update FPS each second
  if (millis() - last_fps_update > 1000) {
    unsigned long elapsed = millis() - last_fps_update;
    current_fps = (frame_count * 1000.0f) / (float)elapsed;
    frame_count = 0;
    last_fps_update = millis();
  }
}

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;

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
  config.pin_href  = HREF_GPIO_NUM;

  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn  = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  // Perf proche de l'autre groupe
  config.xclk_freq_hz = 24000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Si PSRAM: qualité + fluidité
  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;        // 640x480
    config.jpeg_quality = 10;                 // meilleur
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("esp_camera_init failed: 0x%x\n", err);
    return false;
  }

  // Réglages capteur (inspirés de l'autre groupe, safe)
  sensor_t *s = esp_camera_sensor_get();
  if (!s) return false;

  s->set_whitebal(s, 1);
  s->set_exposure_ctrl(s, 1);
  s->set_gain_ctrl(s, 1);
  s->set_lenc(s, 0);      // lens correction off = plus rapide
  s->set_dcw(s, 1);

  return true;
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8' />";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1' />";
  html += "<title>ESP32-CAM EcoGuard</title></head><body style='font-family:Arial'>";
  html += "<h2>EcoGuard 360 - ESP32-CAM</h2>";
  html += "<ul>";
  html += "<li><a href='/stream'>/stream</a> (MJPEG)</li>";
  html += "<li><a href='/snapshot'>/snapshot</a> (JPEG)</li>";
  html += "<li><a href='/status'>/status</a> (JSON)</li>";
  html += "</ul>";
  html += "<p>FPS (approx): <span id='fps'>-</span></p>";
  html += "<script>setInterval(()=>fetch('/status').then(r=>r.json()).then(d=>{document.getElementById('fps').textContent=d.fps;}),1000);</script>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleStream() {
  WiFiClient client = server.client();

  // MJPEG headers
  String hdr = "HTTP/1.1 200 OK\r\n";
  hdr += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(hdr);

  while (client.connected()) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) continue;

    client.printf("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    client.write(fb->buf, fb->len);
    client.print("\r\n");

    esp_camera_fb_return(fb);

    frame_count++;
    // pas de delay => FPS max (limité par réseau/cam)
  }
}

void handleSnapshot() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }

  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void handleStatus() {
  String json = "{";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"mac\":\"" + WiFi.macAddress() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"fps\":" + String(current_fps, 1) + ",";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap());
  json += "}";

  server.send(200, "application/json", json);
}

void handleNotFound() {
  server.send(404, "text/plain", "404 Not Found");
}
