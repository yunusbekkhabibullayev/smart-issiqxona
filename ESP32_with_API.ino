#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─────────────────────────────────────────────
// WiFi sozlamalari
// ─────────────────────────────────────────────
const char* ssid     = "AXROR";         // WiFi nomi
const char* password = "12345678";      // WiFi paroli

// ─────────────────────────────────────────────
// Telegram Bot sozlamalari
// ─────────────────────────────────────────────
#define BOTtoken "8920150632:AAFHRwRQI8p3J-wsUvMT4lKewCaRIYq2MV0"
#define CHAT_ID  "1245671746"

WiFiClientSecure client;
UniversalTelegramBot bot(BOTtoken, client);

// ─────────────────────────────────────────────
// HTTP Web Server (port 80) — React Dashboard uchun
// ─────────────────────────────────────────────
WebServer server(80);

// ─────────────────────────────────────────────
// DHT22 sozlamalari (GPIO 13)
// ─────────────────────────────────────────────
#define DHTPIN 13     
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ─────────────────────────────────────────────
// 4 ta Rele / LED pinlari (D18, D19, D22, D23)
// 1 = Isitish Plitasi (D18)
// 2 = Shamollatish 1  (D19)
// 3 = Shamollatish 2  (D22)
// 4 = Sug'orish Nasosi (D23)
// ─────────────────────────────────────────────
const int ledPins[] = {18, 19, 22, 23};
const int numLeds   = 4;
const char* relayNames[] = {
  "Isitish Plitasi",
  "Shamollatish 1",
  "Shamollatish 2",
  "Sug'orish Nasosi"
};

// Rele mantiqi (Active-LOW: LOW = YONADI, HIGH = O'CHADI)
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// Telegram tekshirish oralig'i (Web server qotmasligi uchun)
int botRequestDelay = 5000; // 5 soniya
unsigned long lastTimeBotRan = 0;

// ─────────────────────────────────────────────
// 1. CORS Headers (Brauzer bloklamasligi uchun)
// ─────────────────────────────────────────────
void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleOptions() {
  setCorsHeaders();
  server.send(204);
}

// ─────────────────────────────────────────────
// 2. GET /api/status — React Dashboard ma'lumot olishi
// ─────────────────────────────────────────────
void handleApiStatus() {
  setCorsHeaders();

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  StaticJsonDocument<768> doc;
  doc["ok"]     = true;
  doc["uptime"] = millis() / 1000;
  doc["ip"]     = WiFi.localIP().toString();
  doc["rssi"]   = WiFi.RSSI();
  doc["ssid"]   = WiFi.SSID();

  // DHT22 ko'rsatkichlari
  doc["temp"]     = isnan(t) ? 24.5 : round(t * 10.0) / 10.0;
  doc["humidity"] = isnan(h) ? 60.0 : round(h * 10.0) / 10.0;

  // 4 ta Rele holati
  JsonArray relays = doc.createNestedArray("relays");
  for (int i = 0; i < numLeds; i++) {
    JsonObject r = relays.createNestedObject();
    r["id"]   = i + 1;
    r["pin"]  = ledPins[i];
    r["name"] = relayNames[i];
    r["on"]   = (digitalRead(ledPins[i]) == RELAY_ON);
  }

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

// ─────────────────────────────────────────────
// 3. GET /api/relay?id=1&state=on|off — Dastur orqali boshqarish
// Misol: GET /api/relay?id=1&state=on  -> Isitish plitasini yoqadi
// ─────────────────────────────────────────────
void handleApiRelay() {
  setCorsHeaders();

  if (!server.hasArg("id") || !server.hasArg("state")) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"id va state parametrlari kerak\"}");
    return;
  }

  int relayId  = server.arg("id").toInt();
  String state = server.arg("state");
  state.toLowerCase();

  if (relayId >= 1 && relayId <= numLeds) {
    int idx = relayId - 1;
    bool turnOn = (state == "on" || state == "1" || state == "true");

    digitalWrite(ledPins[idx], turnOn ? RELAY_ON : RELAY_OFF);

    Serial.printf("[WEB] Rele %d (%s) -> %s\n", relayId, relayNames[idx], turnOn ? "YONDI" : "O'CHDI");

    String res = "{\"ok\":true,\"id\":" + String(relayId) + ",\"name\":\"" + relayNames[idx] + "\",\"on\":" + (turnOn ? "true" : "false") + "}";
    server.send(200, "application/json", res);
  } else {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Noto'g'ri relay ID (1-4)\"}");
  }
}

// ─────────────────────────────────────────────
// 4. Telegram Bot xabarlari
// ─────────────────────────────────────────────
void sendStatusWithKeyboard(String chat_id) {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  String msg = "🌡 *Harorat:* " + (isnan(t) ? "Xato" : String(t, 1) + " °C") + "\n";
  msg += "💧 *Namlik:* " + (isnan(h) ? "Xato" : String(h, 1) + " %") + "\n\n";
  msg += "📌 *Relelar holati:*\n";
  for (int r = 0; r < numLeds; r++) {
    int state = digitalRead(ledPins[r]);
    msg += "• " + String(relayNames[r]) + " (D" + String(ledPins[r]) + "): " + (state == RELAY_ON ? "🟢 *YONIQ*" : "🔴 *O'CHIQ*") + "\n";
  }
  msg += "\n🌐 Dashboard: http://" + WiFi.localIP().toString();

  // Inline tugmalar
  String jsonKeyboards = "[";
  jsonKeyboards += "[{ \"text\" : \"🟢 Isitish Yoqish\", \"callback_data\" : \"led1_on\" }, { \"text\" : \"🔴 Isitish O'chirish\", \"callback_data\" : \"led1_off\" }],";
  jsonKeyboards += "[{ \"text\" : \"🟢 Shamollatish 1 Yoq\", \"callback_data\" : \"led2_on\" }, { \"text\" : \"🔴 Shamollatish 1 O'ch\", \"callback_data\" : \"led2_off\" }],";
  jsonKeyboards += "[{ \"text\" : \"🟢 Shamollatish 2 Yoq\", \"callback_data\" : \"led3_on\" }, { \"text\" : \"🔴 Shamollatish 2 O'ch\", \"callback_data\" : \"led3_off\" }],";
  jsonKeyboards += "[{ \"text\" : \"🟢 Nasosni Yoqish\", \"callback_data\" : \"led4_on\" }, { \"text\" : \"🔴 Nasosni O'chirish\", \"callback_data\" : \"led4_off\" }],";
  jsonKeyboards += "[{ \"text\" : \"🔄 Yangilash / Status\", \"callback_data\" : \"status\" }]";
  jsonKeyboards += "]";

  bot.sendMessageWithInlineKeyboard(chat_id, msg, "Markdown", jsonKeyboards);
}

void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id   = String(bot.messages[i].chat_id);
    String text      = bot.messages[i].text;
    String from_name = bot.messages[i].from_name;

    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "Sizda ruxsat yo'q!", "");
      continue;
    }

    if (text == "/start") {
      String welcome = "Salom, " + from_name + "!\n🌿 Issiqxona boshqaruv botiga xush kelibsiz.\n";
      bot.sendMessage(chat_id, welcome, "");
      sendStatusWithKeyboard(chat_id);
    }
    else if (text == "/status" || text == "status") {
      sendStatusWithKeyboard(chat_id);
    }
    else if (text == "/led1_on" || text == "led1_on") {
      digitalWrite(ledPins[0], RELAY_ON);
      bot.sendMessage(chat_id, "🟢 Isitish Plitasi (D18) yoqildi!", "");
    }
    else if (text == "/led1_off" || text == "led1_off") {
      digitalWrite(ledPins[0], RELAY_OFF);
      bot.sendMessage(chat_id, "🔴 Isitish Plitasi (D18) o'chirildi", "");
    }
    else if (text == "/led2_on" || text == "led2_on") {
      digitalWrite(ledPins[1], RELAY_ON);
      bot.sendMessage(chat_id, "🟢 Shamollatish 1 (D19) yoqildi!", "");
    }
    else if (text == "/led2_off" || text == "led2_off") {
      digitalWrite(ledPins[1], RELAY_OFF);
      bot.sendMessage(chat_id, "🔴 Shamollatish 1 (D19) o'chirildi", "");
    }
    else if (text == "/led3_on" || text == "led3_on") {
      digitalWrite(ledPins[2], RELAY_ON);
      bot.sendMessage(chat_id, "🟢 Shamollatish 2 (D22) yoqildi!", "");
    }
    else if (text == "/led3_off" || text == "led3_off") {
      digitalWrite(ledPins[2], RELAY_OFF);
      bot.sendMessage(chat_id, "🔴 Shamollatish 2 (D22) o'chirildi", "");
    }
    else if (text == "/led4_on" || text == "led4_on") {
      digitalWrite(ledPins[3], RELAY_ON);
      bot.sendMessage(chat_id, "🟢 Sug'orish Nasosi (D23) yoqildi!", "");
    }
    else if (text == "/led4_off" || text == "led4_off") {
      digitalWrite(ledPins[3], RELAY_OFF);
      bot.sendMessage(chat_id, "🔴 Sug'orish Nasosi (D23) o'chirildi", "");
    }
  }
}

// ─────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Boshlang'ich holat: Relelarni O'CHIQ qilish (HIGH)
  for (int i = 0; i < numLeds; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], RELAY_OFF);
  }

  dht.begin();

  WiFi.begin(ssid, password);
  client.setInsecure();

  Serial.print("WiFi ga ulanmoqda");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi ulandi!");
  Serial.print("ESP32 IP manzili: http://");
  Serial.println(WiFi.localIP());

  // Web Server marshrutlari (Routes)
  server.on("/api/status", HTTP_GET,     handleApiStatus);
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/relay",  HTTP_GET,     handleApiRelay);
  server.on("/api/relay",  HTTP_OPTIONS, handleOptions);
  server.begin();

  Serial.println("Web Server ishga tushdi (Port 80)!");
  Serial.println("Dashboard uchun API: http://" + WiFi.localIP().toString() + "/api/status");
}

// ─────────────────────────────────────────────
// Loop
// ─────────────────────────────────────────────
void loop() {
  // 1. Web server mijozlarini tezkor qabul qilish (kechikishsiz)
  server.handleClient();

  // 2. Telegram xabarlarini tekshirish (har 5 soniyada)
  if (millis() - lastTimeBotRan > botRequestDelay) {
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    while (numNewMessages) {
      handleNewMessages(numNewMessages);
      server.handleClient(); // Xabarlar paytida ham Web serverni eshitish
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    }
    lastTimeBotRan = millis();
  }
}
