import { writeState } from "./_db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const relayId = parseInt(req.query.id || req.body?.id);
  const stateStr = (req.query.state || req.body?.state || "").toLowerCase();
  const turnOn = stateStr === "on" || stateStr === "1" || stateStr === "true";

  if (!relayId || (stateStr !== "on" && stateStr !== "off")) {
    return res.status(400).json({ ok: false, error: "id (1-4) va state (on/off) talab qilinadi" });
  }

  try {
    await writeState((current) => {
      const pending = Array.isArray(current.pendingCommands) ? [...current.pendingCommands] : [];
      const existingIdx = pending.findIndex((p) => p.id === relayId);
      if (existingIdx >= 0) {
        pending[existingIdx].on = turnOn;
      } else {
        pending.push({ id: relayId, on: turnOn });
      }

      const updatedRelays = (current.relays || []).map((r) =>
        r.id === relayId ? { ...r, on: turnOn } : r
      );

      return {
        ...current,
        relays: updatedRelays,
        pendingCommands: pending,
      };
    });

    return res.status(200).json({
      ok: true,
      message: `Rele ${relayId} -> ${turnOn ? "ON" : "OFF"} navbatga qo'shildi`,
      id: relayId,
      on: turnOn,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
