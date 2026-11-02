import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const GreenhouseContext = createContext(null);
export function useGreenhouse() { return useContext(GreenhouseContext); }

// ─────────────────────────────────────────────────────────
// Ulanish usuli (avtomatik tanlanadi):
//   1. VITE_ESP8266_NGROK  → masofadan (ngrok orqali)
//   2. VITE_ESP8266_IP     → mahalliy WiFi
//   3. Vercel Cloud API    → Vercel serverless rejimi (Default masofadan)
// ─────────────────────────────────────────────────────────
const NGROK_DOMAIN = import.meta.env.VITE_ESP8266_NGROK || null;
const LOCAL_IP     = import.meta.env.VITE_ESP8266_IP    || null;

// Agar mahalliy IP ham, ngrok ham berilmagan bo'lsa yoki Vercel da bo'lsa -> Vercel Serverless API ishlatiladi
const API_BASE = NGROK_DOMAIN
  ? `https://${NGROK_DOMAIN}`
  : LOCAL_IP
  ? `http://${LOCAL_IP}`
  : ""; // Nisbiy manzil (Vercel Cloud API: /api/status)

const API_STATUS = `${API_BASE}/api/status`;
const API_CONTROL = `${API_BASE}/api/control`;

console.log(
  `%c[Issiqxona] %cRejim: ${NGROK_DOMAIN ? 'NGROK' : LOCAL_IP ? 'LOCAL WiFi' : 'VERCEL CLOUD API'}`,
  'color:#10B981;font-weight:bold',
  'color:#64748B'
);
console.log(`%c[Issiqxona] Status API: ${API_STATUS}`, 'color:#3B82F6');

const DEFAULT_USERS = [
  { username: 'admin', password: 'admin2026!', name: 'Yunusov Sardor', role: 'Super Admin', avatar: 'YS' },
];

export function GreenhouseProvider({ children }) {
  // Foydalanuvchilar va sessiyani localStorage da saqlash
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_greenhouse_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedSession = localStorage.getItem('smart_greenhouse_session');
      return savedSession ? JSON.parse(savedSession) : null;
    } catch {
      return null;
    }
  });
  const [sensors, setSensors]                 = useState([]);
  const [soilSensors, setSoilSensors]         = useState([]);
  const [devices, setDevices]                 = useState([]);
  const [plants, setPlants]                   = useState([]);
  const [esp32Modules, setEsp32Modules]       = useState([]);
  const [chartData, setChartData]             = useState([]);
  const [alerts, setAlerts]                   = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [toast, setToast]                     = useState(null);
  const [isSystemOnline, setIsSystemOnline]   = useState(true);
  const [lastSync, setLastSync]               = useState(null);
  const [espConnected, setEspConnected]       = useState(false);

  // ── Toast ──────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── ESP dan kelgan JSON ni qayta ishlash ───────────────
  const processEspData = useCallback((data) => {
    const isOnline = data.online !== undefined ? Boolean(data.online) : (Boolean(data.lastSeen) && Date.now() - data.lastSeen < 30000);
    setEspConnected(isOnline);
    setLastSync(data.lastSeen ? new Date(data.lastSeen) : null);

    if (!isOnline) {
      setSensors([]);
      setSoilSensors([]);
      setDevices([]);
      setEsp32Modules([]);
      return;
    }

    // 1. Datchiklar (Harorat va Havo namligi) - faqat kelgan bo'lsa
    const realSensors = [];
    if (data.temp !== null && data.temp !== undefined) {
      const val = Number(data.temp);
      realSensors.push({
        id: 'temp',
        name: 'Harorat',
        type: 'temperature',
        value: val,
        unit: '°C',
        min: 0,
        max: 50,
        optimal: { min: 20, max: 28 },
        status: val > 32 || val < 15 ? 'danger' : val > 28 || val < 20 ? 'warn' : 'normal',
        lastUpdate: new Date().toISOString(),
      });
    }
    if (data.humidity !== null && data.humidity !== undefined) {
      const val = Number(data.humidity);
      realSensors.push({
        id: 'humidity',
        name: 'Havo Namligi',
        type: 'humidity',
        value: val,
        unit: '%',
        min: 0,
        max: 100,
        optimal: { min: 55, max: 75 },
        status: val > 80 || val < 40 ? 'danger' : val > 75 || val < 55 ? 'warn' : 'normal',
        lastUpdate: new Date().toISOString(),
      });
    }
    setSensors(realSensors);

    // 2. Tuproq datchiklari - faqat kelgan bo'lsa
    if (Array.isArray(data.soil) && data.soil.length > 0) {
      setSoilSensors(data.soil.map((s, idx) => ({
        id: s.id ?? idx + 1,
        name: s.label || `Ko'chat ${s.id ?? idx + 1}`,
        wet: Boolean(s.wet),
        value: s.percent !== undefined ? s.percent : (s.wet ? 85 : 18),
        status: s.wet ? 'normal' : 'danger',
        pin: s.pin,
      })));

      // Grafik uchun real nuqta
      setChartData(prev => {
        const now      = new Date();
        const time     = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const wetCount = data.soil.filter(s => s.wet).length;
        const tuproq   = Math.round((wetCount / data.soil.length) * 100);
        const harorat  = (data.temp !== null && data.temp !== undefined) ? Number(data.temp) : (prev[prev.length - 1]?.harorat || 0);
        const namlik   = (data.humidity !== null && data.humidity !== undefined) ? Number(data.humidity) : (prev[prev.length - 1]?.namlik || 0);
        return [...prev.slice(-47), { time, harorat, namlik, tuproq }];
      });
    } else {
      setSoilSensors([]);
    }

    // 3. Relelar - faqat qurilmadan kelgan bo'lsa
    if (Array.isArray(data.relays) && data.relays.length > 0) {
      setDevices(data.relays.map((r, idx) => ({
        id: `relay_${r.id ?? idx + 1}`,
        relayId: r.id ?? idx + 1,
        name: r.name || `Rele ${r.id ?? idx + 1}`,
        pin: r.pin !== undefined ? `Pin ${r.pin}` : `R${r.id ?? idx + 1}`,
        isOn: Boolean(r.on),
        icon: (r.id === 1 || r.name?.toLowerCase().includes('isitish')) ? 'fire'
            : (r.id === 4 || r.name?.toLowerCase().includes('nasos') || r.name?.toLowerCase().includes('suv')) ? 'water'
            : 'fan',
        zone: 'Issiqxona',
      })));
    } else {
      setDevices([]);
    }

    // 4. Modul ma'lumotlari
    setEsp32Modules([{
      id: 'esp1',
      name: data.ssid ? `ESP (${data.ssid})` : 'ESP Issiqxona',
      ip: data.ip || 'online',
      rssi: data.rssi || 0,
      ssid: data.ssid || 'Wi-Fi',
      uptime: data.uptime ? formatUptime(data.uptime) : '0 sek',
      status: 'online',
    }]);
  }, []);

  // ── ESP8266 ga so'rov yuborish ─────────────────────────
  const fetchFromEsp = useCallback(async () => {
    if (!API_STATUS) return;

    try {
      const fetchOptions = { signal: AbortSignal.timeout(8000) };
      if (NGROK_DOMAIN) {
        fetchOptions.headers = { 'ngrok-skip-browser-warning': 'true' };
      }

      const res = await fetch(API_STATUS, fetchOptions);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Faqatgina haqiqiy ma'lumot kelgandagina (online bo'lganda) konsolga chiqarish
      if (data.online) {
        console.log('%c[ESP] ✅ Jonli ma\'lumot keldi:', 'color:#10B981;font-weight:bold', data);
      }
      processEspData(data);

    } catch (err) {
      if (espConnected) {
        showToast('Qurilma bilan aloqa uzildi (Offline) ⚠️', 'warn');
      }
      setEspConnected(false);
      setEsp32Modules(prev => prev.map((m, i) =>
        i === 0 ? { ...m, status: 'offline' } : m
      ));
    }
  }, [processEspData, espConnected, showToast]);

  // ── Polling: har 5 soniyada yangilanish ─────────────────
  useEffect(() => {
    if (!API_STATUS) return;

    fetchFromEsp(); // Darhol birinchi so'rov
    const interval = setInterval(fetchFromEsp, 5000);
    return () => clearInterval(interval);
  }, [fetchFromEsp]);

  // ── Login/Logout va Parol boshqaruvi ──────────────────
  const login = useCallback((username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      const sessionUser = { username: user.username, name: user.name, role: user.role, avatar: user.avatar };
      setCurrentUser(sessionUser);
      localStorage.setItem('smart_greenhouse_session', JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    }
    return { success: false, error: "Login yoki parol noto'g'ri!" };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('smart_greenhouse_session');
  }, []);

  const changePassword = useCallback((oldPassword, newPassword) => {
    if (!currentUser) return { success: false, error: "Tizimga kirmagansiz!" };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi shart!" };
    }

    const currentAcc = users.find(u => u.username === currentUser.username);
    if (!currentAcc || currentAcc.password !== oldPassword) {
      return { success: false, error: "Hozirgi parolingiz noto'g'ri!" };
    }

    const updatedUsers = users.map(u => 
      u.username === currentUser.username ? { ...u, password: newPassword } : u
    );

    setUsers(updatedUsers);
    localStorage.setItem('smart_greenhouse_users', JSON.stringify(updatedUsers));
    return { success: true };
  }, [currentUser, users]);

  // ── Qurilma toggle (Dastur orqali yoqish/o'chirish) ──────
  const toggleDevice = useCallback((deviceId) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      const newState = !d.isOn;

      // Qurilma ID sini ESP32 rele raqamiga moslashtirish (1..4)
      const relayMap = { heater: 1, fan1: 2, fan2: 3, pump: 4 };
      const relayId  = relayMap[deviceId];

      if (relayId) {
        // Vercel Serverless rejimi yoki Mahalliy ESP rejimi
        const url = API_BASE 
          ? `${API_BASE}/api/relay?id=${relayId}&state=${newState ? 'on' : 'off'}`
          : `${API_CONTROL}?id=${relayId}&state=${newState ? 'on' : 'off'}`;

        console.log(`%c[Boshqaruv] ⚡ Buyruq yuborilmoqda: ${url}`, 'color:#6366F1');

        fetch(url, { signal: AbortSignal.timeout(6000) })
          .then(res => res.json())
          .then(resData => {
            console.log(`%c[Boshqaruv] ✅ Rele ${relayId} (${deviceId}) -> ${newState ? 'ON' : 'OFF'} bajarildi`, 'color:#10B981;font-weight:bold', resData);
          })
          .catch(err => {
            console.warn(`%c[Boshqaruv] ❌ Boshqaruv xatosi: ${err.message}`, 'color:#F43F5E');
          });
      }

      showToast(`${d.name} ${newState ? 'yoqildi ✓' : "o'chirildi"}`, newState ? 'success' : 'info');
      return { ...d, isOn: newState, state: d.icon === 'window' ? (newState ? 'open' : 'closed') : d.state };
    }));
  }, [showToast]);

  const toggleDeviceMode = useCallback((deviceId) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      const newMode = d.mode === 'auto' ? 'manual' : 'auto';
      showToast(`${d.name} ${newMode === 'auto' ? 'Avtomatik' : "Qo'lda"} rejimga o'tdi`, 'info');
      return { ...d, mode: newMode };
    }));
  }, [showToast]);

  const resolveAlert = useCallback((alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    showToast('Ogohlantirish hal qilindi ✓', 'success');
  }, [showToast]);

  const toggleRule = useCallback((ruleId) => {
    setAutomationRules(prev => prev.map(r => {
      if (r.id !== ruleId) return r;
      const active = !r.isActive;
      showToast(`${r.name}: ${active ? 'Faollashtirildi' : "To'xtatildi"}`, active ? 'success' : 'info');
      return { ...r, isActive: active };
    }));
  }, [showToast]);

  // ── Statistika ─────────────────────────────────────────
  const tempSensors  = sensors.filter(s => s.type === 'temperature');
  const humidSensors = sensors.filter(s => s.type === 'humidity');

  const hasRealTemp = espConnected && tempSensors.some(s => s.lastUpdate && s.value > 0);
  const hasRealHumid = espConnected && humidSensors.some(s => s.lastUpdate && s.value > 0);
  const hasRealSoil = espConnected && soilSensors.some(s => s.status !== 'offline');

  const stats = {
    avgTemperature:  hasRealTemp ? parseFloat((tempSensors.reduce((a,b)=>a+b.value,0) / (tempSensors.length||1)).toFixed(1)) : null,
    avgHumidity:     hasRealHumid ? parseFloat((humidSensors.reduce((a,b)=>a+b.value,0) / (humidSensors.length||1)).toFixed(0)) : null,
    avgSoilMoisture: hasRealSoil ? Math.round((soilSensors.filter(s => s.wet).length / (soilSensors.length||1)) * 100) : null,
    activeDevices:   devices.filter(d => d.isOn).length,
    totalDevices:    devices.length,
    criticalAlerts:  alerts.filter(a => !a.resolved && (a.type==='danger'||a.type==='warn')).length,
    onlineEsp32:     esp32Modules.filter(e => e.status==='online').length,
    totalEsp32:      esp32Modules.length,
    plantsOk:        plants.filter(p => p.health==='yaxshi').length,
    plantsWarn:      plants.filter(p => p.health==='ogohlantirish').length,
    plantsDanger:    plants.filter(p => p.health==='xavfli').length,
    espConnected,
    // Qaysi rejimda ishlayotgani
    connectionMode: NGROK_DOMAIN ? 'ngrok' : LOCAL_IP ? 'local' : 'mock',
  };

  return (
    <GreenhouseContext.Provider value={{
      currentUser, login, logout, changePassword,
      sensors, soilSensors,
      devices, toggleDevice, toggleDeviceMode,
      plants, esp32Modules,
      chartData, alerts, resolveAlert,
      automationRules, toggleRule,
      toast, showToast,
      stats, isSystemOnline, setIsSystemOnline,
      lastSync, espConnected,
    }}>
      {children}
    </GreenhouseContext.Provider>
  );
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} kun ${h} soat`;
  if (h > 0) return `${h} soat ${m} daqiqa`;
  return `${m} daqiqa`;
}
