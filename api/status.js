const DEFAULT_STATE = {
  ok: true,
  uptime: 0,
  ip: "unknown",
  rssi: null,
  ssid: "unknown",
  temp: null,
  humidity: null,
  soil: [],
  relays: [],
  pendingCommands: [],
  lastSeen: 0,
};

globalThis.__SMART_ISSIQXONA_STATE__ ??= { ...DEFAULT_STATE };

export function getLatestState() {
  return globalThis.__SMART_ISSIQXONA_STATE__;
}

export function setLatestState(nextState) {
  globalThis.__SMART_ISSIQXONA_STATE__ = {
    ...DEFAULT_STATE,
    ...(globalThis.__SMART_ISSIQXONA_STATE__ || {}),
    ...nextState,
  };
  return globalThis.__SMART_ISSIQXONA_STATE__;
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const expectedKey = process.env.DEVICE_API_KEY || "";
  const authHeader = String(req.headers.authorization || req.headers["x-device-key"] || "");
  const deviceKey = authHeader.replace(/^Bearer\s+/i, "");

  if (req.method === "POST") {
    if (expectedKey && deviceKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: "Unauthorized device" });
    }

    try {
      const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const state = getLatestState();

      state.ok = data.ok ?? true;
      state.uptime = Number.isFinite(data.uptime) ? Number(data.uptime) : state.uptime;
      state.ip = data.ip ?? state.ip ?? "unknown";
      state.rssi = data.rssi ?? state.rssi ?? null;
      state.ssid = data.ssid ?? state.ssid ?? "unknown";
      state.temp = data.temp ?? state.temp ?? null;
      state.humidity = data.humidity ?? state.humidity ?? null;
      state.soil = Array.isArray(data.soil) ? data.soil : (Array.isArray(state.soil) ? state.soil : []);
      state.relays = Array.isArray(data.relays) ? data.relays : (Array.isArray(state.relays) ? state.relays : []);
      state.lastSeen = Date.now();

      const commandsToSend = Array.isArray(state.pendingCommands) ? [...state.pendingCommands] : [];
      state.pendingCommands = [];

      return res.status(200).json({
        ok: true,
        commands: commandsToSend,
        receivedAt: Date.now(),
      });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid JSON payload",
      });
    }
  }

  if (req.method === "GET") {
    const state = getLatestState();
    const isOnline = Boolean(state.lastSeen) && Date.now() - state.lastSeen < 30000;

    return res.status(200).json({
      ...state,
      online: isOnline,
      lastSeen: state.lastSeen || null,
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
