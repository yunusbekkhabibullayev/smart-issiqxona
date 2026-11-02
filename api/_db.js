// Serverless State Persistence (Upstash Redis REST + in-memory fallback)
export const DEFAULT_STATE = {
  ok: true,
  uptime: 0,
  ip: "unknown",
  rssi: null,
  ssid: "unknown",
  temp: null,
  humidity: null,
  soil: [],
  relays: [
    { id: 1, pin: 18, name: "Isitish Plitasi", on: false },
    { id: 2, pin: 19, name: "Shamollatish 1", on: false },
    { id: 3, pin: 22, name: "Shamollatish 2", on: false },
    { id: 4, pin: 23, name: "Sug'orish Nasosi", on: false },
  ],
  pendingCommands: [],
  lastSeen: 0,
};

globalThis.__SMART_ISSIQXONA_STATE__ ??= { ...DEFAULT_STATE };

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const STATE_KEY = "smart_greenhouse_state";

export async function readState() {
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(`${REDIS_URL}/get/${STATE_KEY}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.result) {
          const parsed = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
          return { ...DEFAULT_STATE, ...parsed };
        }
      }
    } catch (err) {
      console.warn("[Storage] Redis o'qishda xatolik:", err.message);
    }
  }
  return { ...DEFAULT_STATE, ...(globalThis.__SMART_ISSIQXONA_STATE__ || {}) };
}

export async function writeState(updater) {
  const current = await readState();
  const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
  const merged = { ...DEFAULT_STATE, ...next };

  globalThis.__SMART_ISSIQXONA_STATE__ = merged;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await fetch(`${REDIS_URL}/set/${STATE_KEY}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(merged),
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      console.warn("[Storage] Redis yozishda xatolik:", err.message);
    }
  }

  return merged;
}

export function checkDeviceAuth(req) {
  const expectedKey = process.env.DEVICE_API_KEY || "";
  if (!expectedKey) return true; // Agar kalit belgilanmagan bo'lsa ochiq

  const authHeader = String(req.headers.authorization || req.headers["x-device-key"] || "");
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === expectedKey;
}
