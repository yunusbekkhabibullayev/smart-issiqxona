#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ESP8266HTTPClient.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>

// ─────────────────────────────────────────────
// 1. Wi-Fi sozlamalari
// ─────────────────────────────────────────────
const char* ssid     = "AXROR";         
const char* password = "12345678";   

// ─────────────────────────────────────────────
// 2. Vercel Cloud Serverless API manzili
// ─────────────────────────────────────────────
const char* VERCEL_API_URL = "https://smart-issiqxona.vercel.app/api/status";

// ─────────────────────────────────────────────
// 3. Telegram Bot sozlamalari
// ─────────────────────────────────────────────
#define BOTtoken "8920150632:AAFHRwRQI8p3J-wsUvMT4lKewCaRIYq2MV0"
#define CHAT_ID  "1245671746"

WiFiClientSecure tgClient;
UniversalTelegramBot bot(BOTtoken, tgClient);

// ─────────────────────────────────────────────
// 4. 8 ta Tuproq namligi datchigi (DO pinlari)
// D0=16, D1=5, D2=4, D3=0, D4=2, D5=14, D6=12, D7=13
// ─────────────────────────────────────────────
const int soilPins[8] = {16, 5, 4, 0, 2, 14, 12, 13};
const int SOIL_COUNT  = 8;

// ─────────────────────────────────────────────
// 5. Masofadan boshqariladigan Rele (Nasos yoki Shamollatish)
// ESP8266 da RX (GPIO 3) yoki bo'sh qolgan boshqa pinni ulaymiz
// ─────────────────────────────────────────────
const int RELAY_PIN = 3; // GPIO 3 (Platadagi RX pini). Agar boshqa pinga ulasangiz raqamini o'zgartiring
bool relayState = false; // false = o'chiq, true = yoniq
#define RELAY_ON  LOW    // Standart Active-LOW relelar uchun
#define RELAY_OFF HIGH

// Vaqt o'zgaruvchilari
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 5000; // Har 5 soniyada Vercel ga yuborish

unsigned long lastBotTime = 0;
const int BOT_MTMS = 1500; // Telegram tekshirish oralig'i

unsigned long report_lasttime = 0;
const unsigned long REPORT_INTERVAL = 1800000; // 30 daqiqa (Telegram hisoboti)

// ─────────────────────────────────────────────
// Rele holatini o'zgartirish funksiyasi
// ─────────────────────────────────────────────
void applyRelay(bool turnOn) {
  relayState = turnOn;
  digitalWrite(RELAY_PIN, relayState ? RELAY_ON : RELAY_OFF);
  Serial.printf("[RELE] Holat o'zgardi -> %s\n", relayState ? "ON (Yondi)" : "OFF (O'chdi)");
}

// ─────────────────────────────────────────────
// Vercel Cloud API ga ma'lumot uzatish va buyruq olish
// ─────────────────────────────────────────────
void sendTelemetryToVercel() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Wi-Fi] Ulanmagan!");
    return;
  }

  WiFiClientSecure httpsClient;
  httpsClient.setInsecure(); // SSL sertifikat tekshiruvini chetlab o'tish

  HTTPClient http;
  if (!http.begin(httpsClient, VERCEL_API_URL)) {
    Serial.println("[Vercel] HTTP ulanishda xato!");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  // JSON telemetriya tayyorlash
  StaticJsonDocument<1024> doc;
  doc["ok"]     = true;
  doc["uptime"] = millis() / 1000;
  doc["ip"]     = WiFi.localIP().toString();
  doc["rssi"]   = WiFi.RSSI();
  doc["ssid"]   = WiFi.SSID();

  // 8 ta haqiqiy tuproq datchigi
  JsonArray soilArr = doc.createNestedArray("soil");
  for (int s = 0; s < SOIL_COUNT; s++) {
    int state = digitalRead(soilPins[s]);
    JsonObject obj = soilArr.createNestedObject();
    obj["id"]    = s + 1;
    obj["pin"]   = soilPins[s];
    obj["label"] = "Ko'chat " + String(s + 1);
    obj["wet"]   = (state == LOW); // LOW = Nam, HIGH = Quruq
  }

  // 1 ta haqiqiy boshqariladigan Rele
  JsonArray relayArr = doc.createNestedArray("relays");
  JsonObject r1 = relayArr.createNestedObject();
  r1["id"]   = 1;
  r1["pin"]  = RELAY_PIN;
  r1["name"] = "Sug'orish Nasosi";
  r1["on"]   = relayState;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == HTTP_CODE_OK || httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("[Vercel] ✅ Real data jo'natildi. Javob: " + response);

    // Vercel saytidan kelgan masofaviy buyruqni tekshirish
    StaticJsonDocument<512> resDoc;
    DeserializationError error = deserializeJson(resDoc, response);
    if (!error && resDoc.containsKey("commands")) {
      JsonArray commands = resDoc["commands"];
      for (JsonObject cmd : commands) {
        int cmdId = cmd["id"];
        bool turnOn = cmd["on"];
        if (cmdId == 1) {
          applyRelay(turnOn);
          bot.sendMessage(CHAT_ID, turnOn ? "⚡ Saytdan buyruq: Nasos YOQILDI" : "⚡ Saytdan buyruq: Nasos O'CHIRILDI", "");
        }
      }
    }
  } else {
    Serial.printf("[Vercel] ❌ POST xatosi: %d\n", httpCode);
  }

  http.end();
}

// ─────────────────────────────────────────────
// Telegram xabarlarini qayta ishlash
// ─────────────────────────────────────────────
String getSystemStatusString() {
  String statusMsg = "🌿 *8 ta Sensor Tuproq Holati:*\n\n";
  for (int s = 0; s < SOIL_COUNT; s++) {
    int state = digitalRead(soilPins[s]);
    if (state == HIGH) {
      statusMsg += "• Ko'chat " + String(s + 1) + ": 🏜 *Quruq (Suv kerak)*\n";
    } else {
      statusMsg += "• Ko'chat " + String(s + 1) + ": 💧 *Nam (Joyida)*\n";
    }
  }
  statusMsg += "\n⚡ *Nasos holati:* " + String(relayState ? "ON (Yoniq)" : "OFF (O'chiq)") + "\n";
  statusMsg += "🌐 *Vercel sayt:* " + String(VERCEL_API_URL) + "\n";
  return statusMsg;
}

void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "Ruxsatsiz foydalanuvchi!", "");
      continue;
    }
    
    String text = bot.messages[i].text;
    String from_name = bot.messages[i].from_name;

    if (text == "/status") {
      bot.sendMessage(chat_id, getSystemStatusString(), "Markdown");
    }
    else if (text == "/nasos_on") {
      applyRelay(true);
      bot.sendMessage(chat_id, "💧 Nasos yoqildi!", "");
      sendTelemetryToVercel(); // Vercel saytiga ham zudlik bilan bildirish
    }
    else if (text == "/nasos_off") {
      applyRelay(false);
      bot.sendMessage(chat_id, "🛑 Nasos o'chirildi!", "");
      sendTelemetryToVercel();
    }
    else if (text == "/start") {
      String welcome = "Salom, " + from_name + "!\n";
      welcome += "🚀 Smart Issiqxona (8 ta datchik + Vercel Cloud) ishga tushdi.\n\n";
      welcome += getSystemStatusString();
      welcome += "\n📌 *Buyruqlar:*\n";
      welcome += "/status - Datchiklar ko'rsatkichi\n";
      welcome += "/nasos_on - Nasosni yoqish\n";
      welcome += "/nasos_off - Nasosni o'chirish\n";
      bot.sendMessage(chat_id, welcome, "Markdown");
    }
  }
}

// ─────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Smart Issiqxona 8-Sensor + Vercel Cloud ===");

  // 8 ta datchik pinlarini sozlash
  for (int s = 0; s < SOIL_COUNT; s++) {
    pinMode(soilPins[s], INPUT);
  }

  // Rele pinini sozlash
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  // WiFi ga ulanish
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  tgClient.setInsecure();

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[Wi-Fi] Ulondi!");
  Serial.printf("[Wi-Fi] IP: %s\n", WiFi.localIP().toString().c_str());

  bot.sendMessage(CHAT_ID, "🚀 Tizim ishga tushdi! Vercel API ga ulanmoqda...\n\n" + getSystemStatusString(), "Markdown");

  // Dastlabki ma'lumotni darhol Vercel ga yuborish
  sendTelemetryToVercel();
}

// ─────────────────────────────────────────────
// Loop
// ─────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Har 5 soniyada Vercel Cloud ga real ma'lumot yuborish va saytdan buyruq kutish
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;
    sendTelemetryToVercel();
  }

  // 2. Telegram orqali boshqaruv
  if (now - lastBotTime >= BOT_MTMS) {
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    while (numNewMessages) {
      handleNewMessages(numNewMessages);
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    }
    lastBotTime = now;
  }

  // 3. Telegram avto hisobot (30 daqiqada bir)
  if (now - report_lasttime >= REPORT_INTERVAL) {
    report_lasttime = now;
    bot.sendMessage(CHAT_ID, getSystemStatusString(), "Markdown");
  }
}
