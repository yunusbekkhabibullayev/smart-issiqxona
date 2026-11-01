// Vercel Serverless API: /api/status
// ESP32 ma'lumotlarini qabul qilish va Frontendga uzatish

let latestState = {
  ok: true,
  uptime: 0,
  ip: "online",
  rssi: -65,
  ssid: "WiFi",
  temp: 24.5,
  humidity: 55.0,
  soil: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    wet: true,
    percent: 80,
    pin: i + 1,
    label: `Ko'chat ${i + 1}`,
  })),
  relays: [
    { id: 1, pin: 18, name: "Isitish Plitasi", on: false },
    { id: 2, pin: 19, name: "Shamollatish 1", on: false },
    { id: 3, pin: 22, name: "Shamollatish 2", on: false },
    { id: 4, pin: 23, name: "Sug'orish Nasosi", on: false },
  ],
  pendingCommands: [], // ESP ga yetkazilishi kerak bo'lgan buyruqlar
  lastSeen: Date.now(),
};

export default function handler(req, res) {
  // CORS sozlamalari
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 1. ESP32 DAN MA'LUMOT KELGANDA (POST)
  if (req.method === "POST") {
    try {
      const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      
      latestState = {
        ...latestState,
        ...data,
        lastSeen: Date.now(),
      };

      // ESP ga javob: Navbatda turgan buyruqlarni yuboramiz va navbatni tozalaymiz
      const commandsToSend = [...(latestState.pendingCommands || [])];
      latestState.pendingCommands = [];

      return res.status(200).json({
        ok: true,
        commands: commandsToSend,
      });
    } catch (err) {
      return res.status(400).json({ ok: false, error: "Invalid JSON" });
    }
  }

  // 2. FRONTEND MA'LUMOT SO'RAGANDA (GET)
  const isOnline = Date.now() - latestState.lastSeen < 30000; // 30 soniya ichida javob bo'lsa online
  return res.status(200).json({
    ...latestState,
    online: isOnline,
  });
}
