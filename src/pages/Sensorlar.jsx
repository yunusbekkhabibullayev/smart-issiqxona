import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { CpuChipIcon, WifiIcon } from '@heroicons/react/24/outline';

/* ── Status config ─────────────────────────── */
const ST = {
  normal: { dot: 'bg-emerald-500',             badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', bar: 'bg-emerald-500', label: 'Normal',        ring: '' },
  warn:   { dot: 'bg-amber-400 animate-blink',  badge: 'bg-amber-50 text-amber-700 border-amber-200/60',     bar: 'bg-amber-400',   label: 'Ogohlantirish', ring: 'ring-1 ring-amber-300/50' },
  danger: { dot: 'bg-rose-500 animate-blink',   badge: 'bg-rose-50 text-rose-700 border-rose-200/60',        bar: 'bg-rose-500',    label: 'Xavfli',        ring: 'ring-1 ring-rose-300/50' },
};

/* ── Horizontal progress bar with optimal zone ─ */
function SensorBar({ value, min, max, optMin, optMax, barCls }) {
  const span = max - min;
  const pct  = Math.min(100, Math.max(2, ((value - min) / span) * 100));
  const oL   = ((optMin - min) / span) * 100;
  const oW   = ((optMax - optMin) / span) * 100;
  return (
    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mt-2.5">
      <div className="absolute h-full bg-blue-100/80 rounded-full" style={{ left: `${oL}%`, width: `${oW}%` }} />
      <div className={`absolute h-full rounded-full transition-all duration-700 ${barCls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Circular SVG ring for soil ─────────────── */
function Ring({ pct, status }) {
  const R = 30, C = 2 * Math.PI * R;
  const color = status === 'danger' ? '#F43F5E' : status === 'warn' ? '#F59E0B' : '#10B981';
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0">
      <circle cx="38" cy="38" r={R} fill="none" stroke="#F1F5F9" strokeWidth="7" />
      <circle
        cx="38" cy="38" r={R}
        fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C - (pct / 100) * C}
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="38" y="43" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0F172A">{pct}%</text>
    </svg>
  );
}

/* ── Big Sensor Card ─────────────────────────── */
function SensorCard({ sensor }) {
  const st = ST[sensor.status] || ST.normal;
  const isTemp = sensor.type === 'temperature';

  return (
    <div className={`ios-card ios-card-hover overflow-hidden ${st.ring}`}>
      {/* top bar */}
      <div className={`h-[3px] ${st.bar} rounded-t-[1.125rem]`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              isTemp ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'
            }`}>
              {isTemp ? '🌡️' : '💧'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">{sensor.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{sensor.zone}</span>
                <span className="text-[9px] text-slate-400 font-mono">{sensor.esp32}</span>
              </div>
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.badge}`}>
            {st.label}
          </span>
        </div>

        {/* Big value */}
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[2rem] font-bold tracking-tight text-slate-900 leading-none">{sensor.value}</span>
            <span className="text-base font-semibold text-slate-400 mb-0.5">{sensor.unit}</span>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400 font-medium">Optimal</p>
            <p className="text-xs font-bold text-blue-600">{sensor.optimal.min}–{sensor.optimal.max}{sensor.unit}</p>
          </div>
        </div>

        {/* Bar */}
        <SensorBar
          value={sensor.value} min={sensor.min} max={sensor.max}
          optMin={sensor.optimal.min} optMax={sensor.optimal.max}
          barCls={sensor.value >= sensor.optimal.min && sensor.value <= sensor.optimal.max ? 'bg-blue-500' : st.bar}
        />
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px] text-slate-400">{sensor.min}{sensor.unit}</span>
          <span className="text-[8px] text-slate-400">{sensor.max}{sensor.unit}</span>
        </div>

        {/* Time */}
        <p className="text-[9px] text-slate-400 font-mono mt-2">
          {new Date(sensor.lastUpdate).toLocaleTimeString('uz-UZ')}
        </p>
      </div>
    </div>
  );
}

/* ── Soil Card ───────────────────────────────── */
function SoilCard({ sensor }) {
  const st = ST[sensor.status] || ST.normal;
  return (
    <div className={`ios-card ios-card-hover p-4 ${st.ring}`}>
      <div className="flex items-center gap-3">
        <Ring pct={sensor.value} status={sensor.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-slate-900 truncate">{sensor.zone}</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-1 ${st.badge}`}>
              {st.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 truncate mb-2">{sensor.plant}</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${st.bar}`} style={{ width: `${sensor.value}%` }} />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] text-slate-400">0%</span>
            <span className="text-[8px] text-slate-400">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ESP32 Card ──────────────────────────────── */
function Esp32Card({ module }) {
  const bars = module.rssi > -60 ? 4 : module.rssi > -70 ? 3 : module.rssi > -80 ? 2 : 1;
  const sigColor = bars >= 3 ? '#10B981' : bars === 2 ? '#F59E0B' : '#F43F5E';
  const sigLabel = bars >= 3 ? 'Kuchli' : bars === 2 ? "O'rtacha" : 'Zaif';
  const isOnline = module.status === 'online';

  return (
    <div className="ios-card ios-card-hover p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <CpuChipIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{module.name}</p>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">{module.ip}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
          isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-100 text-slate-500 border-slate-200/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-blink' : 'bg-slate-400'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Signal bars */}
      <div className="flex items-end gap-1 mb-1 h-8">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${i * 25}%`,
              background: i <= bars ? sigColor : '#E2E8F0',
            }}
          />
        ))}
        <div className="ml-2.5 mb-0.5">
          <p className="text-xs font-bold" style={{ color: sigColor }}>{sigLabel}</p>
          <p className="text-[9px] text-slate-400 font-mono">{module.rssi} dBm</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {[
          { k: '⏱ Uptime',    v: module.uptime },
          { k: '💾 Firmware',  v: module.firmware },
          { k: '📡 Sensorlar', v: `${module.sensors.length} ta` },
          { k: '🔧 Qurilmalar',v: `${module.devices.length} ta` },
        ].map((item, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
            <p className="text-[9px] text-slate-400 font-semibold mb-0.5">{item.k}</p>
            <p className="text-xs font-bold text-slate-800">{item.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Status Summary ──────────────────────────── */
function Summary({ sensors, soilSensors }) {
  const all = [...sensors, ...soilSensors];
  const n = all.filter(s => s.status === 'normal').length;
  const w = all.filter(s => s.status === 'warn').length;
  const d = all.filter(s => s.status === 'danger').length;

  const overall = d > 0 ? 'danger' : w > 0 ? 'warn' : 'normal';
  const cfg = {
    normal: { bg: 'bg-emerald-50 border-emerald-200/60', icon: '✅', title: 'Barcha sensorlar yaxshi', desc: `${all.length} sensordan hech birida muammo yo'q` },
    warn:   { bg: 'bg-amber-50 border-amber-200/60',     icon: '⚠️', title: `${w} ta sensor optimal chegaradan tashqarida`, desc: "Ehtiyot choralar ko'rish tavsiya etiladi" },
    danger: { bg: 'bg-rose-50 border-rose-200/60',       icon: '🚨', title: `${d} ta sensordan xavfli signal!`, desc: "Darhol choralar ko'rilishi kerak" },
  }[overall];

  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p className="text-sm font-bold text-slate-900">{cfg.title}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{cfg.desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Normal',        count: n, bg: 'bg-white/80 border-emerald-200/40', tc: 'text-emerald-700' },
          { label: 'Ogohlantirish', count: w, bg: 'bg-white/80 border-amber-200/40',   tc: 'text-amber-700'   },
          { label: 'Xavfli',        count: d, bg: 'bg-white/80 border-rose-200/40',    tc: 'text-rose-700'    },
        ].map((item, i) => (
          <div key={i} className={`rounded-xl border p-2.5 text-center ${item.bg}`}>
            <p className={`text-xl font-bold ${item.tc}`}>{item.count}</p>
            <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Zone group (temp + humid together) ─────── */
function ZoneBlock({ zone, sensors }) {
  const temp  = sensors.find(s => s.type === 'temperature');
  const humid = sensors.find(s => s.type === 'humidity');
  const hasD  = sensors.some(s => s.status === 'danger');
  const hasW  = sensors.some(s => s.status === 'warn');
  const dotCls = hasD ? 'bg-rose-500 animate-blink' : hasW ? 'bg-amber-400 animate-blink' : 'bg-emerald-500';

  return (
    <div>
      {/* Zone row header */}
      <div className="flex items-center justify-between px-0.5 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotCls}`} />
          <span className="text-sm font-bold text-slate-800">{zone}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {temp  && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">{temp.value}°C</span>}
          {humid && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{humid.value}%</span>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sensors.map(s => <SensorCard key={s.id} sensor={s} />)}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'zona',   label: "Zona bo'yicha", emoji: '🏠' },
  { id: 'tuproq', label: 'Tuproq',        emoji: '🌱' },
  { id: 'esp32',  label: 'ESP32',          emoji: '📡' },
];

/* ═══ MAIN ════════════════════════════════════ */
export default function Sensorlar() {
  const { sensors, soilSensors, esp32Modules, lastSync } = useGreenhouse();
  const [tab, setTab] = useState('zona');

  const zones = ['A-Zona', 'B-Zona', 'C-Zona'];
  const formatTime = () => lastSync
    ? lastSync.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Page header ── */}
      <div className="ios-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Sensor Monitoring</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {sensors.length} muhit · {soilSensors.length} tuproq · {esp32Modules.length} ESP32
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-blink inline-block" />
            {formatTime()}
          </div>
        </div>
      </div>

      {/* ── Status summary — TOP ── */}
      <Summary sensors={sensors} soilSensors={soilSensors} />

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{t.emoji}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Zona bo'yicha ── */}
      {tab === 'zona' && (
        <div className="space-y-6 animate-slideUp">
          {/* Zone quick overview */}
          <div className="grid grid-cols-3 gap-3">
            {zones.map(zone => {
              const zs = sensors.filter(s => s.zone === zone);
              const t  = zs.find(s => s.type === 'temperature');
              const h  = zs.find(s => s.type === 'humidity');
              const d  = zs.some(s => s.status === 'danger');
              const w  = zs.some(s => s.status === 'warn');
              const st = d ? ST.danger : w ? ST.warn : ST.normal;
              return (
                <div key={zone} className={`ios-card p-3.5 text-center ${st.ring}`}>
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className="text-xs font-bold text-slate-800">{zone}</span>
                  </div>
                  <p className="text-xl font-bold text-orange-600">{t?.value}°C</p>
                  <p className="text-sm font-bold text-blue-600">{h?.value}%</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border mt-1.5 inline-block ${st.badge}`}>{st.label}</span>
                </div>
              );
            })}
          </div>

          {/* Zone sensor cards */}
          {zones.map(zone => {
            const zs = sensors.filter(s => s.zone === zone);
            return zs.length ? <ZoneBlock key={zone} zone={zone} sensors={zs} /> : null;
          })}
        </div>
      )}

      {/* ── Tuproq ── */}
      {tab === 'tuproq' && (
        <div className="space-y-4 animate-slideUp">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Yetarli ≥50%', count: soilSensors.filter(s=>s.value>=50).length, tc:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200/50' },
              { label: '35–50%',         count: soilSensors.filter(s=>s.value>=35&&s.value<50).length, tc:'text-amber-700', bg:'bg-amber-50 border-amber-200/50' },
              { label: 'Quruq <35%',   count: soilSensors.filter(s=>s.value<35).length, tc:'text-rose-700', bg:'bg-rose-50 border-rose-200/50' },
            ].map((item,i)=>(
              <div key={i} className={`ios-card p-3 text-center border ${item.bg}`}>
                <p className={`text-2xl font-bold ${item.tc}`}>{item.count}</p>
                <p className="text-[9px] font-semibold text-slate-500 mt-0.5 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {soilSensors.map(s => <SoilCard key={s.id} sensor={s} />)}
          </div>
        </div>
      )}

      {/* ── ESP32 ── */}
      {tab === 'esp32' && (
        <div className="space-y-4 animate-slideUp">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {esp32Modules.map(m => <Esp32Card key={m.id} module={m} />)}
          </div>
          <div className="ios-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <WifiIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Tarmoq Ma'lumotlari</p>
                <p className="text-xs text-slate-500">Barcha ESP32 modullari</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: 'Tarmoq',    v: '192.168.1.0/24' },
                { k: 'Gateway',   v: '192.168.1.1' },
                { k: 'Online',    v: `${esp32Modules.filter(e=>e.status==='online').length}/${esp32Modules.length}` },
                { k: 'Protokol',  v: 'MQTT / HTTP' },
              ].map((item,i)=>(
                <div key={i} className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                  <p className="text-[9px] text-slate-400 font-semibold">{item.k}</p>
                  <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{item.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
