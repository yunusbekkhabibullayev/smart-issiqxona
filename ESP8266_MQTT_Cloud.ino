#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>         // MQTT kutubxonasi
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─────────────────────────────────────────────
// WiFi sozlamalari
// ─────────────────────────────────────────────
const char* ssid     = "AXROR";
const char* password = "12345678";

// ─────────────────────────────────────────────
// HiveMQ Cloud sozlamalari
// hivemq.com dan bepul hisob oching!
// ─────────────────────────────────────────────
const char* MQTT_HOST     = "xxxxxxxx.s1.eu.hivemq.cloud"; // ← o'zgartiring
const int   MQTT_PORT     = 8883;                           // TLS port
const char* MQTT_USER     = "your_username";                // ← o'zgartiring
const char* MQTT_PASS     = "your_password";                // ← o'zgartiring
const char* MQTT_CLIENT   = "ESP8266_Issiqxona";

// MQTT topic lar
const char* TOPIC_STATUS  = "issiqxona/status";   // ESP → Cloud → React
const char* TOPIC_PUMP_CMD= "issiqxona/pump/cmd"; // React → Cloud → ESP
const char* TOPIC_PUMP_ST = "issiqxona/pump/state"; // ESP → Cloud → React

// ─────────────────────────────────────────────
// Telegram Bot
// ─────────────────────────────────────────────
#define BOTtoken "8920150632:AAFHRwRQI8p3J-wsUvMT4lKewCaRIYq2MV0"
#define CHAT_ID  "1245671746"

// ─────────────────────────────────────────────
// Sensorlar
// ─────────────────────────────────────────────
#define DHTPIN  4      // D2 (GPIO4)
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int soilPins[6] = {16, 5, 0, 14, 12, 13}; // D0,D1,D3,D5,D6,D7
const int RELAY_PIN   = 15; // D8 (GPIO15)

// ─────────────────────────────────────────────
// Ulanish ob'ektlari
// ─────────────────────────────────────────────
WiFiClientSecure wifiClient;
PubSubClient     mqttClient(wifiClient);

// Telegram uchun alohida client
WiFiClientSecure tgClient;
UniversalTelegramBot bot(BOTtoken, tgClient);

// Vaqt o'zgaruvchilari
unsigned long lastMqttPublish  = 0;
unsigned long lastTelegramCheck = 0;
unsigned long lastAutoReport   = 0;

const unsigned long MQTT_INTERVAL     = 5000;    // Har 5 soniyada MQTT yuborish
const unsigned long TELEGRAM_INTERVAL = 1000;    // Telegram tekshirish
const unsigned long REPORT_INTERVAL   = 1800000; // 30 daqiqa hisobot

// ─────────────────────────────────────────────
// Sensor ma'lumotlarini JSON formatida tayyorlash
// ─────────────────────────────────────────────
String buildJsonPayload() {
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  bool  dhtOk       = !isnan(temperature) && !isnan(humidity);
  bool  pumpOn      = (digitalRead(RELAY_PIN) == LOW);

  StaticJsonDocument<512> doc;
  doc["device"]  = MQTT_CLIENT;
  doc["uptime"]  = millis() / 1000;
  doc["rssi"]    = WiFi.RSSI();

  JsonObject dhtObj = doc.createNestedObject("dht22");
  dhtObj["ok"]          = dhtOk;
  dhtObj["temperature"] = dhtOk ? round(temperature * 10) / 10.0 : 0;
  dhtObj["humidity"]    = dhtOk ? round(humidity * 10) / 10.0 : 0;

  JsonObject pumpObj = doc.createNestedObject("pump");
  pumpObj["on"] = pumpOn;

  JsonArray soilArr = doc.createNestedArray("soil");
  for (int i = 0; i < 6; i++) {
    JsonObject s = soilArr.createNestedObject();
    s["id"]  = i + 1;
    s["wet"] = (digitalRead(soilPins[i]) == LOW); // LOW=Nam, HIGH=Quruq
  }

  String json;
  serializeJson(doc, json);
  return json;
}

// ─────────────────────────────────────────────
// MQTT xabar kelganda (React → ESP8266)
// ─────────────────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.print("MQTT keldi [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);

  // Nasos boshqaruvi
  if (String(topic) == TOPIC_PUMP_CMD) {
    if (msg == "on") {
      digitalWrite(RELAY_PIN, LOW);  // Yoqish
      mqttClient.publish(TOPIC_PUMP_ST, "{\"on\":true}");
      Serial.println("Nasos YOQILDI (MQTT buyrug'i)");
    } else if (msg == "off") {
      digitalWrite(RELAY_PIN, HIGH); // O'chirish
      mqttClient.publish(TOPIC_PUMP_ST, "{\"on\":false}");
      Serial.println("Nasos O'CHIRILDI (MQTT buyrug'i)");
    }
  }
}

// ─────────────────────────────────────────────
// MQTT ga ulanish
// ─────────────────────────────────────────────
void connectMQTT() {
  wifiClient.setInsecure(); // Sertifikat tekshirishsiz (oddiy yo'l)

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setBufferSize(512);

  Serial.print("MQTT ga ulanmoqda...");
  while (!mqttClient.connected()) {
    if (mqttClient.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS)) {
      Serial.println(" Ulandi!");
      // React dan buyruqlarni qabul qilish uchun obuna bo'lamiz
      mqttClient.subscribe(TOPIC_PUMP_CMD);
      Serial.println("Obuna: " + String(TOPIC_PUMP_CMD));
    } else {
      Serial.print("Xato: ");
      Serial.println(mqttClient.state());
      delay(3000);
    }
  }
}

// ─────────────────────────────────────────────
// Telegram uchun
// ─────────────────────────────────────────────
String getTelegramStatus() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  bool  pumpOn = (digitalRead(RELAY_PIN) == LOW);

  String msg = "🌿 *Isixona holati (ESP8266):*\n\n";
  msg += pumpOn ? "⚙️ Nasos: 🟢 *Yoqiq*\n\n" : "⚙️ Nasos: 🔴 *O'chiq*\n\n";

  if (isnan(h) || isnan(t)) {
    msg += "⚠️ DHT22 ishlamayapti!\n\n";
  } else {
    msg += "🌡 Harorat: " + String(t, 1) + " °C\n";
    msg += "💧 Namlik: "  + String(h, 1) + " %\n\n";
  }

  msg += "🌱 *Tuproq:*\n";
  for (int i = 0; i < 6; i++) {
    bool wet = (digitalRead(soilPins[i]) == LOW);
    msg += "• Ko'chat " + String(i+1) + ": " + (wet ? "💧 Nam" : "🏜 Quruq") + "\n";
  }

  msg += "\n📡 MQTT: " + String(mqttClient.connected() ? "🟢 Ulangan" : "🔴 Uzilgan");
  return msg;
}

void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    if (chat_id != CHAT_ID) { bot.sendMessage(chat_id, "Ruxsatsiz!", ""); continue; }

    String text = bot.messages[i].text;
    if (text == "/status")     bot.sendMessage(chat_id, getTelegramStatus(), "Markdown");
    if (text == "/suv_yoq")  { digitalWrite(RELAY_PIN, LOW);  bot.sendMessage(chat_id, "💧 Nasos yoqildi!", ""); }
    if (text == "/suv_ochir"){ digitalWrite(RELAY_PIN, HIGH); bot.sendMessage(chat_id, "🛑 Nasos o'chirildi!", ""); }
    if (text == "/start") {
      String w = "Salom, " + bot.messages[i].from_name + "!\n🚀 Issiqxona tizimi\n\n";
      w += getTelegramStatus();
      w += "\n\n📌 *Buyruqlar:*\n/status /suv_yoq /suv_ochir";
      bot.sendMessage(chat_id, w, "Markdown");
    }
  }
}

// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // O'chiq

  for (int i = 0; i < 6; i++) pinMode(soilPins[i], INPUT);

  dht.begin();

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("WiFi ga ulanmoqda");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi ulandi! IP: " + WiFi.localIP().toString());

  tgClient.setInsecure();

  // MQTT
  connectMQTT();

  // Ishga tushdi xabari
  bot.sendMessage(CHAT_ID, getTelegramStatus(), "Markdown");
}

void loop() {
  // MQTT ulanishni tekshirish
  if (!mqttClient.connected()) {
    Serial.println("MQTT uzildi, qayta ulanmoqda...");
    connectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();

  // Har 5 soniyada sensor ma'lumotlarini MQTT ga yuborish
  if (now - lastMqttPublish >= MQTT_INTERVAL) {
    lastMqttPublish = now;
    String json = buildJsonPayload();
    mqttClient.publish(TOPIC_STATUS, json.c_str());
    Serial.println("MQTT yuborildi: " + json.substring(0, 60) + "...");
  }

  // Har 30 daqiqada Telegram hisobot
  if (now - lastAutoReport >= REPORT_INTERVAL) {
    lastAutoReport = now;
    bot.sendMessage(CHAT_ID, getTelegramStatus(), "Markdown");
  }

  // Telegram xabarlarini tekshirish
  if (now - lastTelegramCheck >= TELEGRAM_INTERVAL) {
    lastTelegramCheck = now;
    int n = bot.getUpdates(bot.last_message_received + 1);
    while (n) { handleNewMessages(n); n = bot.getUpdates(bot.last_message_received + 1); }
  }
}
