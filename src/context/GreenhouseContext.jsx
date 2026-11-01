import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  INITIAL_SENSORS,
  INITIAL_SOIL_SENSORS,
  INITIAL_DEVICES,
  PLANTS,
  ESP32_MODULES,
  CHART_DATA,
  ALERTS,
  AUTOMATION_RULES,
} from '../data/mockData';

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
  const [sensors, setSensors]                 = useState(INITIAL_SENSORS);
  const [soilSensors, setSoilSensors]         = useState(INITIAL_SOIL_SENSORS);
  const [devices, setDevices]                 = useState(INITIAL_DEVICES);
  const [plants]                              = useState(PLANTS);
  const [esp32Modules, setEsp32Modules]       = useState(ESP32_MODULES);
  const [chartData, setChartData]             = useState(CHART_DATA);
  const [alerts, setAlerts]                   = useState(ALERTS);
  const [automationRules, setAutomationRules] = useState(AUTOMATION_RULES);
  const [toast, setToast]                     = useState(null);
  const [isSystemOnline, setIsSystemOnline]   = useState(true);
  const [lastSync, setLastSync]               = useState(new Date());
  const [espConnected, setEspConnected]       = useState(false);

  // ── Toast ──────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── ESP8266 dan kelgan JSON ni qayta ishlash ───────────
  const processEspData = useCallback((data) => {
    setEspConnected(true);
    setLastSync(new Date());

    // 10 ta tuproq sensori (raqamli: wet=true → Nam, wet=false → Quruq)
    if (Array.isArray(data.soil)) {
      setSoilSensors(prev => prev.map((s, idx) => {
        const esp = data.soil[idx];
        if (!esp) return s;
        const isWet  = Boolean(esp.wet);
        const value  = isWet ? 85 : 18;
        const status = isWet ? 'normal' : 'danger';
        return {
          ...s,
          name: esp.label || s.name,
          wet: isWet,
          value,
          status,
          pin: esp.pin,
          digital: isWet ? 'LOW (Nam)' : 'HIGH (Quruq)',
        };
      }));

      // Grafik uchun yangi nuqta (tuproq namligi foizi, harorat, namlik)
      setChartData(prev => {
        const now      = new Date();
        const time     = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const wetCount = data.soil.filter(s => s.wet).length;
        const tuproq   = Math.round((wetCount / data.soil.length) * 100);
        const harorat  = data.temp !== undefined ? Number(data.temp) : (prev[prev.length - 1]?.harorat || 0);
        const namlik   = data.humidity !== undefined ? Number(data.humidity) : (prev[prev.length - 1]?.namlik || 0);
        return [...prev.slice(-47), { time, harorat, namlik, tuproq }];
      });
    }

    // DHT22 datchiklari (harorat va havoning namligi)
    if (data.temp !== undefined && data.humidity !== undefined) {
      setSensors(prev => prev.map(s => {
        if (s.type === 'temperature') {
          const val = Number(data.temp);
          const status = val > s.optimal.max + 3 ? 'danger' : val > s.optimal.max ? 'warn' : val < s.optimal.min - 3 ? 'danger' : val < s.optimal.min ? 'warn' : 'normal';
          return { ...s, value: val, status, lastUpdate: new Date().toISOString() };
        }
        if (s.type === 'humidity') {
          const val = Number(data.humidity);
          const status = val > s.optimal.max + 5 ? 'danger' : val > s.optimal.max ? 'warn' : val < s.optimal.min - 5 ? 'danger' : val < s.optimal.min ? 'warn' : 'normal';
          return { ...s, value: val, status, lastUpdate: new Date().toISOString() };
        }
        return s;
      }));
    }

    // 4 ta rele holati (Isitish, Shamollatish 1/2, Nasos)
    if (Array.isArray(data.relays)) {
      setDevices(prev => prev.map(d => {
        let relId = null;
        if (d.id === 'heater') relId = 1;
        else if (d.id === 'fan1') relId = 2;
        else if (d.id === 'fan2') relId = 3;
        else if (d.id === 'pump') relId = 4;

        if (relId) {
          const r = data.relays.find(x => x.id === relId);
          if (r && typeof r.on === 'boolean') {
            return { ...d, isOn: r.on };
          }
        }
        return d;
      }));
    }

    // ESP modul ma'lumotlari (IP, signal kuchi, uptime)
    setEsp32Modules(prev => prev.map((m, i) =>
      i === 0 ? {
        ...m,
        name:   'ESP32 / ESP8266 Issiqxona',
        ip:     data.ip     || m.ip,
        rssi:   data.rssi   || m.rssi,
        ssid:   data.ssid   || 'WiFi',
        uptime: data.uptime ? formatUptime(data.uptime) : m.uptime,
        status: 'online',
      } : m
    ));
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

      console.log('%c[ESP] ✅ Jonli ma\'lumot keldi:', 'color:#10B981;font-weight:bold', data);
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

  const stats = {
    avgTemperature:  parseFloat((tempSensors.reduce((a,b)=>a+b.value,0) / (tempSensors.length||1)).toFixed(1)),
    avgHumidity:     parseFloat((humidSensors.reduce((a,b)=>a+b.value,0) / (humidSensors.length||1)).toFixed(0)),
    avgSoilMoisture: parseFloat((soilSensors.reduce((a,b)=>a+b.value,0) / (soilSensors.length||1)).toFixed(0)),
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
