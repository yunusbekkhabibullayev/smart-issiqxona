#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ESP8266WebServer.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>

// ─────────────────────────────────────────────
// WiFi sozlamalari (DIQQAT: ESP8266 faqat 2.4GHz tarmoqni qo'llab-quvvatlaydi!)
// ─────────────────────────────────────────────
const char* ssid     = "XPON-s3xO";     // 5G emas, 2.4GHz nomi bo'lishi shart!
const char* password = "12345678";

// ─────────────────────────────────────────────
// Telegram Bot sozlamalari
// ─────────────────────────────────────────────
#define BOTtoken "8920150632:AAFHRwRQI8p3J-wsUvMT4lKewCaRIYq2MV0"
#define CHAT_ID  "1245671746"

WiFiClientSecure client;
UniversalTelegramBot bot(BOTtoken, client);

// ─────────────────────────────────────────────
// HTTP Server (port 80) — React dashboard uchun
// ─────────────────────────────────────────────
ESP8266WebServer server(80);

// ─────────────────────────────────────────────
// 10 ta tuproq namligi datchigi (DO pinlari)
// D0=16, D1=5, D2=4, D3=0, D4=2, D5=14, D6=12, D7=13, D8=15, RX=3
// ─────────────────────────────────────────────
const int soilPins[10] = {16, 5, 4, 0, 2, 14, 12, 13, 15, 3};
const int SOIL_COUNT   = 10;

// Vaqtni boshqarish
unsigned long bot_lasttime = 0;
const int BOT_MTMS = 5000; // 5 soniya (web server qotib qolmasligi uchun)
unsigned long report_lasttime = 0;
const unsigned long REPORT_INTERVAL = 1800000; // 30 daqiqa

// ─────────────────────────────────────────────
// React dashboard uchun JSON API
// GET http://<ESP8266_IP>/api/status
// ─────────────────────────────────────────────
void handleApiStatus() {
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");

  StaticJsonDocument<768> doc;
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

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

// CORS preflight
void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(204);
}

// ─────────────────────────────────────────────
// Telegram xabar tayyorlash
// ─────────────────────────────────────────────
String getSystemStatusString() {
  String msg = "🌿 *10 ta MH Sensor Tuproq Holati:*\n\n";

  for (int s = 0; s < SOIL_COUNT; s++) {
    int state = digitalRead(soilPins[s]);
    if (state == HIGH) {
      msg += "• Ko'chat " + String(s + 1) + ": 🏜 *Quruq (Suv kerak)*\n";
    } else {
      msg += "• Ko'chat " + String(s + 1) + ": 💧 *Nam (Joyida)*\n";
    }
  }

  msg += "\n🌐 Dashboard: http://" + WiFi.localIP().toString() + "/api/status";
  return msg;
}

void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "Ruxsatsiz foydalanuvchi!", "");
      continue;
    }

    String text      = bot.messages[i].text;
    String from_name = bot.messages[i].from_name;

    if (text == "/status") {
      bot.sendMessage(chat_id, getSystemStatusString(), "Markdown");
    }

    if (text == "/start") {
      String welcome = "Salom, " + from_name + "!\n";
      welcome += "🚀 Issiqxona tizimi (10 ta datchik) ishga tushdi.\n\n";
      welcome += getSystemStatusString();
      welcome += "\n\n📌 *Buyruqlar:*\n";
      welcome += "/status — Hozirgi datchiklar ko'rsatkichi\n";
      bot.sendMessage(chat_id, welcome, "Markdown");
    }

    if (text == "/ip") {
      bot.sendMessage(chat_id, "🌐 Dashboard: http://" + WiFi.localIP().toString() + "/api/status", "");
    }
  }
}

// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // 10 ta tuproq sensorini INPUT qilish
  for (int i = 0; i < SOIL_COUNT; i++) {
    pinMode(soilPins[i], INPUT);
  }

  WiFi.begin(ssid, password);
  client.setInsecure();

  Serial.print("WiFi ga ulanmoqda");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi ulandi!");
  Serial.print("IP manzil: http://");
  Serial.println(WiFi.localIP());
  Serial.println("API: http://" + WiFi.localIP().toString() + "/api/status");

  // HTTP server endpointlari
  server.on("/api/status",  HTTP_GET,     handleApiStatus);
  server.on("/api/status",  HTTP_OPTIONS, handleOptions);
  server.begin();

  Serial.println("HTTP Server ishga tushdi!");

  // Telegram: ishga tushdi xabari
  String startupMsg = "🚀 Tizim ishga tushdi!\n\n" + getSystemStatusString();
  bot.sendMessage(CHAT_ID, startupMsg, "Markdown");
}

void loop() {
  // HTTP so'rovlarni birinchi navbatda qayta ishlash
  server.handleClient();

  // Har 30 daqiqada Telegram hisobot
  if (millis() - report_lasttime >= REPORT_INTERVAL) {
    report_lasttime = millis();
    bot.sendMessage(CHAT_ID, getSystemStatusString(), "Markdown");
    server.handleClient();
  }

  // Telegram xabarlarini har 20 soniyada bir marta tekshirish
  // (Web server qotib qolmasligi va tez javob berishi uchun)
  if (millis() - bot_lasttime >= 20000) {
    bot_lasttime = millis();
    int n = bot.getUpdates(bot.last_message_received + 1);
    while (n) {
      handleNewMessages(n);
      server.handleClient();
      n = bot.getUpdates(bot.last_message_received + 1);
    }
  }
}
