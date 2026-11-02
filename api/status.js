import { readState, writeState, checkDeviceAuth } from "./_db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 1. ESP Qurilmasidan telemetriya qabul qilish (POST)
  if (req.method === "POST") {
    if (!checkDeviceAuth(req)) {
      return res.status(401).json({ ok: false, error: "Unauthorized device" });
    }

    try {
      const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

      let commandsToSend = [];

      const updated = await writeState((current) => {
        commandsToSend = Array.isArray(current.pendingCommands) ? [...current.pendingCommands] : [];

        return {
          ok: true,
          uptime: Number.isFinite(data.uptime) ? Number(data.uptime) : current.uptime,
          ip: data.ip || current.ip || "unknown",
          rssi: data.rssi !== undefined ? data.rssi : current.rssi,
          ssid: data.ssid || current.ssid || "unknown",
          temp: data.temp !== undefined ? Number(data.temp) : current.temp,
          humidity: data.humidity !== undefined ? Number(data.humidity) : current.humidity,
          soil: Array.isArray(data.soil) ? data.soil : current.soil,
          relays: Array.isArray(data.relays) ? data.relays : current.relays,
          pendingCommands: [], // Navbatdagi buyruqlar ESP ga berilgach tozalaymiz
          lastSeen: Date.now(),
        };
      });

      return res.status(200).json({
        ok: true,
        commands: commandsToSend,
        receivedAt: Date.now(),
      });
    } catch (err) {
      return res.status(400).json({ ok: false, error: "Invalid JSON payload" });
    }
  }

  // 2. Frontend ma'lumot so'raganda (GET)
  if (req.method === "GET") {
    const state = await readState();
    const isOnline = Boolean(state.lastSeen) && (Date.now() - state.lastSeen < 30000);

    return res.status(200).json({
      ...state,
      online: isOnline,
      lastSeen: state.lastSeen || null,
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
