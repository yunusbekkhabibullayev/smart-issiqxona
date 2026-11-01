// Vercel Serverless API: /api/control
// Frontenddan rele yoqish/o'chirish buyruqlarini qabul qilish

import statusHandler from "./status.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Frontenddan buyruq kelishi: ?id=1&state=on Yoki body orqali
  const relayId = parseInt(req.query.id || req.body?.id);
  const stateStr = (req.query.state || req.body?.state || "").toLowerCase();
  const turnOn = stateStr === "on" || stateStr === "1" || stateStr === "true";

  if (!relayId || (stateStr !== "on" && stateStr !== "off")) {
    return res.status(400).json({ ok: false, error: "id va state (on/off) kerak" });
  }

  // Ichki xolatga buyruqni navbatga qo'shish
  // status.js orqali ESP navbatdagi so'rovida buni oladi
  try {
    const fetchUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/api/status`;
    
    // Status ga yangi buyruq qo'shish
    const response = await fetch(fetchUrl);
    const current = await response.json();
    
    const pending = current.pendingCommands || [];
    pending.push({ id: relayId, on: turnOn });

    // Relays holatini ham zudlik bilan optimistik yangilaymiz
    const updatedRelays = (current.relays || []).map(r => 
      r.id === relayId ? { ...r, on: turnOn } : r
    );

    await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relays: updatedRelays,
        pendingCommands: pending,
      }),
    });

    return res.status(200).json({
      ok: true,
      message: `Rele ${relayId} -> ${turnOn ? "ON" : "OFF"} buyrug'i saqlandi`,
      id: relayId,
      on: turnOn,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
