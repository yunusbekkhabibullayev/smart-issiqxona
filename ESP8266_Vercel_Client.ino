#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ESP8266HTTPClient.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>

// ─────────────────────────────────────────────
// 1. Wi-Fi sozlamalari (ESP8266 faqat 2.4GHz)
// ─────────────────────────────────────────────
const char* ssid     = "XPON-s3xO";     // WiFi nomi
const char* password = "12345678";      // WiFi paroli

// ─────────────────────────────────────────────
// 2. Vercel Cloud Serverless API manzili
const char* VERCEL_API_URL = "https://smart-issiqxona.vercel.app/api/status";
const char* DEVICE_API_KEY = "smart_greenhouse_secret_2026"; // Vercel Settings -> Environment Variables dagi bilan bir xil bo'lishi kerak

// ─────────────────────────────────────────────
// 3. Telegram Bot sozlamalari
// ─────────────────────────────────────────────
#define BOTtoken "8920150632:AAFHRwRQI8p3J-wsUvMT4lKewCaRIYq2MV0"
#define CHAT_ID  "1245671746"

WiFiClientSecure tgClient;
UniversalTelegramBot bot(BOTtoken, tgClient);

// ─────────────────────────────────────────────
// 4. 10 ta tuproq datchigi pinlari
// D0=16, D1=5, D2=4, D3=0, D4=2, D5=14, D6=12, D7=13, D8=15, RX=3
// ─────────────────────────────────────────────
const int soilPins[10] = {16, 5, 4, 0, 2, 14, 12, 13, 15, 3};
const int SOIL_COUNT   = 10;

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 5000; // Har 5 soniyada Vercel ga jo'natish

unsigned long lastBotTime = 0;
const unsigned long BOT_INTERVAL = 15000;      // Har 15 soniyada Telegramni tekshirish

// ─────────────────────────────────────────────
// Vercel Cloud ga ma'lumot jo'natish (HTTPS POST)
// ─────────────────────────────────────────────
void sendTelemetryToVercel() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Wi-Fi] Ulanmagan, qayta ulanmoqda...");
    WiFi.reconnect();
    return;
  }

  WiFiClientSecure httpsClient;
  httpsClient.setInsecure(); // SSL sertifikat tekshiruvini chetlab o'tish

  HTTPClient http;
  if (!http.begin(httpsClient, VERCEL_API_URL)) {
    Serial.println("[Vercel] Ulanishda xatolik!");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  if (strlen(DEVICE_API_KEY) > 0) {
    http.addHeader("X-Device-Key", DEVICE_API_KEY);
  }

  // JSON ma'lumot tayyorlash
  StaticJsonDocument<1024> doc;
  doc["ok"]     = true;
  doc["uptime"] = millis() / 1000;
  doc["ip"]     = WiFi.localIP().toString();
  doc["rssi"]   = WiFi.RSSI();
  doc["ssid"]   = WiFi.SSID();

  // 10 ta tuproq sensori
  JsonArray soilArr = doc.createNestedArray("soil");
  for (int i = 0; i < SOIL_COUNT; i++) {
    JsonObject s = soilArr.createNestedObject();
    s["id"]    = i + 1;
    s["wet"]   = (digitalRead(soilPins[i]) == LOW); // LOW=Nam, HIGH=Quruq
    s["pin"]   = soilPins[i];
    s["label"] = "Ko'chat " + String(i + 1);
  }

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == HTTP_CODE_OK || httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("[Vercel] ✅ Ma'lumot uzatildi: " + response);
  } else {
    Serial.printf("[Vercel] ❌ POST xatosi: %d\n", httpCode);
  }

  http.end();
}

// ─────────────────────────────────────────────
// Telegram buyruqlarini qayta ishlash
// ─────────────────────────────────────────────
void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "Ruxsat etilmagan foydalanuvchi!", "");
      continue;
    }

    String text = bot.messages[i].text;
    Serial.println("[Telegram] Xabar: " + text);

    if (text == "/start") {
      String msg = "Salom! Smart Issiqxona (Vercel Cloud versiyasi).\n";
      msg += "Vercel Sayt: " + String(VERCEL_API_URL) + "\n\n";
      msg += "Buyruqlar:\n";
      msg += "/status - Sensorlar holati\n";
      bot.sendMessage(chat_id, msg, "Markdown");
    }
    else if (text == "/status" || text == "status") {
      int wetCount = 0;
      String msg = "🌱 *10 ta Ko'chat Holati:*\n";
      for (int j = 0; j < SOIL_COUNT; j++) {
        bool isWet = (digitalRead(soilPins[j]) == LOW);
        if (isWet) wetCount++;
        msg += "Ko'chat " + String(j + 1) + ": " + (isWet ? "💧 Nam" : "🏜 Quruq") + "\n";
      }
      msg += "\nUmumiy: " + String(wetCount) + "/10 namlikda.";
      bot.sendMessage(chat_id, msg, "Markdown");
    }
  }
}

// ─────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== Smart Issiqxona ESP8266 Vercel Client ===");

  // 10 ta sensor pinini kirish qilib sozlash
  for (int i = 0; i < SOIL_COUNT; i++) {
    pinMode(soilPins[i], INPUT);
  }

  // Wi-Fi ga ulanish
  Serial.printf("Wi-Fi ga ulanmoqda: %s\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[Wi-Fi] Ulondi!");
  Serial.printf("[Wi-Fi] IP: %s\n", WiFi.localIP().toString().c_str());

  tgClient.setInsecure();
  bot.sendMessage(CHAT_ID, "🚀 Smart Issiqxona ESP8266 Vercel Cloud tizimiga ulandi!\nSayt: https://smart-issiqxona.vercel.app", "");

  // Dastlabki ma'lumotni darhol yuborish
  sendTelemetryToVercel();
}

// ─────────────────────────────────────────────
// Loop
// ─────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Har 5 soniyada Vercel Cloud ga ma'lumot jo'natish
  if (now - lastTelemetryTime > TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;
    sendTelemetryToVercel();
  }

  // 2. Har 15 soniyada Telegram botni tekshirish
  if (now - lastBotTime > BOT_INTERVAL) {
    lastBotTime = now;
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    while (numNewMessages) {
      handleNewMessages(numNewMessages);
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    }
  }
}
