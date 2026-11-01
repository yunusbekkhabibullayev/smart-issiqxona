#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─────────────────────────────────────────────
// 1. Wi-Fi sozlamalari (Internetga chiqishi kerak)
// ─────────────────────────────────────────────
const char* ssid     = "AXROR";         // WiFi nomi
const char* password = "12345678";      // WiFi paroli

// ─────────────────────────────────────────────
// 2. Vercel Cloud Serverless API manzili
// Saytingizni Vercel ga deploy qilgach olgan havolani yozasiz:
// Masalan: "https://issiqxona.vercel.app/api/status"
// ─────────────────────────────────────────────
const char* VERCEL_API_URL = "https://YOUR-APP-NAME.vercel.app/api/status";

// ─────────────────────────────────────────────
// 3. Telegram Bot sozlamalari
// ─────────────────────────────────────────────
#define BOTtoken "8920150632:AAFHRwRQI8p3J-wsUvMT4lKewCaRIYq2MV0"
#define CHAT_ID  "1245671746"

WiFiClientSecure tgClient;
UniversalTelegramBot bot(BOTtoken, tgClient);

// ─────────────────────────────────────────────
// 4. Datchiklar va Rele pinlari
// ─────────────────────────────────────────────
#define DHTPIN 13     
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// 4 ta Rele pinlari (D18, D19, D22, D23)
const int ledPins[] = {18, 19, 22, 23};
const int numLeds   = 4;
const char* relayNames[] = {
  "Isitish Plitasi",
  "Shamollatish 1",
  "Shamollatish 2",
  "Sug'orish Nasosi"
};

// Rele mantiqi: Active-LOW (LOW = Yonadi, HIGH = O'chadi)
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// Vaqt hisoblagichlari
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 5000; // Har 5 soniyada Vercel ga jo'natish

unsigned long lastBotTime = 0;
const unsigned long BOT_INTERVAL = 15000;      // Har 15 soniyada Telegramni tekshirish

// ─────────────────────────────────────────────
// Releni boshqarish yordamchi funksiyasi
// ─────────────────────────────────────────────
void applyRelayState(int relayId, bool turnOn) {
  if (relayId >= 1 && relayId <= numLeds) {
    int idx = relayId - 1;
    digitalWrite(ledPins[idx], turnOn ? RELAY_ON : RELAY_OFF);
    Serial.printf("[RELAY] #%d (%s) -> %s\n", relayId, relayNames[idx], turnOn ? "YONDI" : "O'CHDI");
  }
}

// ─────────────────────────────────────────────
// Vercel Serverless API bilan sinxronizatsiya (Telemetriya + Buyruqlar)
// ─────────────────────────────────────────────
void syncWithVercel() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Ulanmagan!");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // SSL sertifikat tekshiruvini o'tkazib yuborish (Vercel HTTPS uchun)

  HTTPClient https;
  if (!https.begin(client, VERCEL_API_URL)) {
    Serial.println("[HTTPS] Bog'lanib bo'lmadi");
    return;
  }

  https.addHeader("Content-Type", "application/json");

  // Datchik ma'lumotlarini o'qish
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // JSON paket tayyorlash
  StaticJsonDocument<1024> doc;
  doc["ok"]       = true;
  doc["uptime"]   = millis() / 1000;
  doc["ip"]       = WiFi.localIP().toString();
  doc["rssi"]     = WiFi.RSSI();
  doc["ssid"]     = WiFi.SSID();
  doc["temp"]     = isnan(t) ? 24.5 : round(t * 10.0) / 10.0;
  doc["humidity"] = isnan(h) ? 55.0 : round(h * 10.0) / 10.0;

  // Hozirgi rele holatlari
  JsonArray relays = doc.createNestedArray("relays");
  for (int i = 0; i < numLeds; i++) {
    JsonObject r = relays.createNestedObject();
    r["id"]   = i + 1;
    r["pin"]  = ledPins[i];
    r["name"] = relayNames[i];
    r["on"]   = (digitalRead(ledPins[i]) == RELAY_ON);
  }

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = https.POST(requestBody);

  if (httpCode == HTTP_CODE_OK || httpCode == 200) {
    String response = https.getString();
    
    // Vercel dan kelgan javobni o'qish (Saytdan berilgan buyruqlar bormi?)
    StaticJsonDocument<512> resDoc;
    DeserializationError error = deserializeJson(resDoc, response);

    if (!error && resDoc.containsKey("commands")) {
      JsonArray commands = resDoc["commands"];
      for (JsonObject cmd : commands) {
        int rId   = cmd["id"];
        bool turn = cmd["on"];
        Serial.printf("[VERCEL BUYRUQ] Rele %d -> %s\n", rId, turn ? "ON" : "OFF");
        applyRelayState(rId, turn);
      }
    }
  } else {
    Serial.printf("[HTTPS] Xato kodi: %d\n", httpCode);
  }

  https.end();
}

// ─────────────────────────────────────────────
// Telegram xabarlarini qayta ishlash
// ─────────────────────────────────────────────
void handleTelegramMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    String text    = bot.messages[i].text;

    if (chat_id != CHAT_ID) continue;

    if (text == "/start" || text == "/status") {
      float h = dht.readHumidity();
      float t = dht.readTemperature();
      String msg = "🌿 *Issiqxona Masofaviy Boshqaruv:*\n\n";
      msg += "🌡 Harorat: " + String(t, 1) + " °C\n";
      msg += "💧 Namlik: " + String(h, 1) + " %\n\n";
      for (int r = 0; r < numLeds; r++) {
        msg += "• " + String(relayNames[r]) + ": " + (digitalRead(ledPins[r]) == RELAY_ON ? "🟢 Yoniq" : "🔴 O'chiq") + "\n";
      }
      bot.sendMessage(chat_id, msg, "Markdown");
    }
    else if (text == "/led1_on")  { applyRelayState(1, true);  bot.sendMessage(chat_id, "🟢 Isitish yoqildi!", ""); }
    else if (text == "/led1_off") { applyRelayState(1, false); bot.sendMessage(chat_id, "🔴 Isitish o'chirildi", ""); }
    else if (text == "/led2_on")  { applyRelayState(2, true);  bot.sendMessage(chat_id, "🟢 Shamollatish 1 yoqildi!", ""); }
    else if (text == "/led2_off") { applyRelayState(2, false); bot.sendMessage(chat_id, "🔴 Shamollatish 1 o'chirildi", ""); }
    else if (text == "/led3_on")  { applyRelayState(3, true);  bot.sendMessage(chat_id, "🟢 Shamollatish 2 yoqildi!", ""); }
    else if (text == "/led3_off") { applyRelayState(3, false); bot.sendMessage(chat_id, "🔴 Shamollatish 2 o'chirildi", ""); }
    else if (text == "/led4_on")  { applyRelayState(4, true);  bot.sendMessage(chat_id, "🟢 Nasos yoqildi!", ""); }
    else if (text == "/led4_off") { applyRelayState(4, false); bot.sendMessage(chat_id, "🔴 Nasos o'chirildi", ""); }
  }
}

// ─────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < numLeds; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], RELAY_OFF);
  }

  dht.begin();

  WiFi.begin(ssid, password);
  tgClient.setInsecure();

  Serial.print("WiFi ga ulanmoqda");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi ulandi!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// ─────────────────────────────────────────────
// Loop
// ─────────────────────────────────────────────
void loop() {
  // 1. Har 5 soniyada Vercel Serverless API bilan sinxronizatsiya
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    syncWithVercel();
  }

  // 2. Telegram xabarlarini tekshirish
  if (millis() - lastBotTime >= BOT_INTERVAL) {
    lastBotTime = millis();
    int num = bot.getUpdates(bot.last_message_received + 1);
    while (num) {
      handleTelegramMessages(num);
      num = bot.getUpdates(bot.last_message_received + 1);
    }
  }
}
