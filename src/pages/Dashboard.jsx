import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BeakerIcon,
  WrenchScrewdriverIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BoltIcon,
  SignalIcon,
  ArrowTrendingUpIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { useGreenhouse } from '../context/GreenhouseContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const CHART_LEGEND = [
  { color: '#F97316', label: 'Harorat (°C)' },
  { color: '#3B82F6', label: 'Namlik (%)' },
  { color: '#10B981', label: 'Tuproq (%)' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-ios p-3 text-xs">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function DeviceStatusRow({ device }) {
  const isOn = device.isOn;
  const isWindow = device.icon === 'window';
  const emojiMap = { fire: '🔥', fan: '💨', window: '🪟', water: '💧' };
  return (
    <div className="py-2.5 flex items-center justify-between border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="text-sm">{emojiMap[device.icon]}</span>
        <div>
          <p className="text-xs font-semibold text-slate-800">{device.name}</p>
          <p className="text-[10px] text-slate-500">{device.zone}</p>
        </div>
      </div>
      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
        isOn
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
          : 'bg-slate-100 text-slate-500 border border-slate-200/50'
      }`}>
        {isWindow ? (isOn ? 'OCHIQ' : 'YOPIQ') : (isOn ? 'ON' : 'OFF')}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { stats, sensors, soilSensors, devices, alerts, chartData, currentUser, esp32Modules, lastSync, espConnected } = useGreenhouse();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState('6H');

  const wetCount = soilSensors?.filter(s => s.wet || s.status === 'normal').length || 0;
  const dryCount = (soilSensors?.length || 10) - wetCount;
  const espMod   = esp32Modules?.[0] || {};

  const recentAlerts = alerts?.filter(a => !a.resolved).slice(0, 3) || [];
  const tempSensors  = sensors?.filter(s => s.type === 'temperature') || [];
  const humidSensors = sensors?.filter(s => s.type === 'humidity') || [];
  const chartSlice   = chartPeriod === '6H' ? chartData.slice(18) : chartPeriod === '12H' ? chartData.slice(12) : chartData;

  const formatSync = () => {
    if (!lastSync) return '';
    return lastSync.toLocaleTimeString('uz-UZ');
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">

      {/* Hero Widget */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-ios-hover">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none translate-y-1/3" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${espConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs text-slate-300 font-medium">
                {espConnected ? 'ESP8266 Real Vaqtda Bog\'langan' : 'Aloqa kutilmoqda'} · {formatSync()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
              Xush kelibsiz, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
                {currentUser?.name?.split(' ')[0]}!
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Issiqxona monitoringi: <strong className="text-emerald-400">10 ta ko'chat datchigi</strong> faol — {' '}
              <strong className="text-emerald-300">{wetCount} ta 💧 Nam</strong>,{' '}
              <strong className="text-rose-300">{dryCount} ta 🏜 Quruq</strong>.
              {dryCount > 0 && (
                <span className="text-rose-300 font-semibold"> ⚠️ {dryCount} ta ko'chatga suv quyilishi kerak!</span>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/sensorlar')}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-medium text-xs hover:bg-slate-100 transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <BeakerIcon className="w-4 h-4 text-blue-600" /> Barcha Sensorlar
            </button>
            <button
              onClick={() => navigate('/boshqaruv')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-medium text-xs transition-all border border-white/15 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <WrenchScrewdriverIcon className="w-4 h-4 text-white" /> Boshqaruv
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards — Haqiqiy ESP8266 ko'rsatkichlari */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'ESP8266 Qurilmasi',
            value: espConnected ? 'Online' : 'Aloqada',
            sub: `IP: ${espMod.ip || '192.168.1.154'} · ${espMod.rssi || -72} dBm`,
            icon: SignalIcon,
            iconBg: espConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-100/60' : 'bg-blue-50 text-blue-600 border-blue-100/60',
            valueColor: espConnected ? 'text-emerald-600' : 'text-blue-600',
            path: '/sensorlar',
          },
          {
            label: 'Nam Ko\'chatlar',
            value: `${wetCount} / 10`,
            sub: '💧 Yetarli namlikda',
            icon: () => <span className="text-base">💧</span>,
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100/60',
            valueColor: 'text-emerald-600',
            path: '/sensorlar',
          },
          {
            label: 'Quruq Ko\'chatlar',
            value: `${dryCount} ta`,
            sub: dryCount > 0 ? '⚠️ Suv quyilsin' : 'Barchasi joyida',
            icon: () => <span className="text-base">🏜️</span>,
            iconBg: dryCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-100/60' : 'bg-slate-50 text-slate-500 border-slate-100/60',
            valueColor: dryCount > 0 ? 'text-rose-600' : 'text-slate-900',
            path: '/sensorlar',
          },
          {
            label: 'O\'rtacha Tuproq Namligi',
            value: `${stats?.avgSoilMoisture || Math.round((wetCount / 10) * 100)}%`,
            sub: '10 ta datchik bo\'yicha',
            icon: () => <span className="text-base">🌱</span>,
            iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100/60',
            valueColor: 'text-indigo-600',
            path: '/sensorlar',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={() => navigate(card.path)}
              className="ios-card p-5 cursor-pointer group relative overflow-hidden ios-card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{card.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors ${card.iconBg}`}>
                  <Icon className="w-4.5 h-4.5 stroke-[2]" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-bold tracking-tight ${card.valueColor || 'text-slate-900'}`}>{card.value}</h3>
                <p className="text-[11px] text-slate-500 font-normal mt-1">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🌿 10 TA KO'CHAT NAMLIGI — JONLI ESP8266 SENSORLARI */}
      <div className="ios-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-slate-900 text-base">🌿 10 ta Ko'chat Tuproq Namligi (ESP8266 Jonli Ma'lumot)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Qurilmadan kelayotgan 10 ta MH sensorining har bir ko'chat bo'yicha jonli holati
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              💧 {wetCount} ta Nam
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              🏜 {dryCount} ta Quruq
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {soilSensors?.map((sensor, idx) => {
            const isWet = sensor.wet || sensor.status === 'normal';
            return (
              <div
                key={sensor.id || idx}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isWet
                    ? 'bg-gradient-to-b from-emerald-50/60 to-white border-emerald-200 shadow-sm'
                    : 'bg-gradient-to-b from-rose-50/60 to-white border-rose-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    🌱 Ko'chat {idx + 1}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    P:{sensor.pin !== undefined ? sensor.pin : '—'}
                  </span>
                </div>

                <div className="my-2 flex items-center justify-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                      isWet
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-rose-500 text-white shadow-xs animate-pulse'
                    }`}
                  >
                    {isWet ? '💧 Nam' : '🏜 Quruq'}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                    <span>Holat:</span>
                    <strong className={isWet ? 'text-emerald-600' : 'text-rose-600'}>
                      {isWet ? '85% (Yetarli)' : '18% (Suv kerak)'}
                    </strong>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isWet ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: isWet ? '85%' : '18%' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="lg:col-span-2 ios-card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base tracking-tight">Sensor Ko'rsatkichlari Dinamikasi</h3>
              <p className="text-xs font-normal text-slate-500 mt-0.5">Harorat, namlik va tuproq namligi</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
              {['6H', '12H', '24H'].map(p => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    chartPeriod === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSlice} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {[
                    { id: 'gradTemp', color: '#F97316' },
                    { id: 'gradHumid', color: '#3B82F6' },
                    { id: 'gradSoil', color: '#10B981' },
                  ].map(g => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={g.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fontWeight: 500, fill: '#64748B' }} axisLine={false} tickLine={false} interval={Math.ceil(chartSlice.length / 5)} />
                <YAxis tick={{ fontSize: 11, fontWeight: 500, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="harorat" name="Harorat (°C)" stroke="#F97316" strokeWidth={2} fill="url(#gradTemp)" dot={false} />
                <Area type="monotone" dataKey="namlik" name="Namlik (%)" stroke="#3B82F6" strokeWidth={2} fill="url(#gradHumid)" dot={false} />
                <Area type="monotone" dataKey="tuproq" name="Tuproq (%)" stroke="#10B981" strokeWidth={2} fill="url(#gradSoil)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-around border-t border-slate-100 pt-4 mt-2 text-xs font-medium text-slate-600">
            {CHART_LEGEND.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Devices Status */}
        <div className="ios-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Qurilmalar Holati</h3>
              <button onClick={() => navigate('/boshqaruv')} className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                Barchasi <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
            <div>
              {devices.map(d => <DeviceStatusRow key={d.id} device={d} />)}
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-blue-50/60 border border-blue-100/60 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-600 tracking-wider">ESP32 Modullari</p>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">
                {stats?.onlineEsp32}/{stats?.totalEsp32} ta online
              </p>
            </div>
            <SignalIcon className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Sensor Summary + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sensor cards */}
        <div className="lg:col-span-2 ios-card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60">
                <BeakerIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Muhit Sensorlari</h3>
                <p className="text-[11px] font-normal text-slate-500">A, B, C zona ko'rsatkichlari</p>
              </div>
            </div>
            <button onClick={() => navigate('/sensorlar')} className="px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1">
              Barchasi <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 mb-2">🌡️ Harorat</p>
              <div className="divide-y divide-slate-100">
                {tempSensors.map(s => {
                  const cfg = s.status === 'normal' ? 'text-emerald-600' : s.status === 'warn' ? 'text-amber-600' : 'text-rose-600';
                  return (
                    <div key={s.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'normal' ? 'bg-emerald-500' : s.status === 'warn' ? 'bg-amber-500 animate-blink' : 'bg-rose-500 animate-blink'}`} />
                        <span className="text-xs text-slate-700 font-medium">{s.name}</span>
                      </div>
                      <span className={`font-bold text-sm ${cfg}`}>
                        {espConnected || s.value > 0 ? `${s.value}°C` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-2">💧 Namlik</p>
              <div className="divide-y divide-slate-100">
                {humidSensors.map(s => {
                  const cfg = s.status === 'normal' ? 'text-emerald-600' : s.status === 'warn' ? 'text-amber-600' : 'text-rose-600';
                  return (
                    <div key={s.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'normal' ? 'bg-emerald-500' : s.status === 'warn' ? 'bg-amber-500 animate-blink' : 'bg-rose-500 animate-blink'}`} />
                        <span className="text-xs text-slate-700 font-medium">{s.name}</span>
                      </div>
                      <span className={`font-bold text-sm ${cfg}`}>
                        {espConnected || s.value > 0 ? `${s.value}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="ios-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Ogohlantirishlar</h3>
              {recentAlerts.length > 0 && (
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60">
                  {recentAlerts.length} ta
                </span>
              )}
            </div>

            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <CheckCircleIcon className="w-9 h-9 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">Hammasi normal</p>
                <p className="text-xs text-slate-400 mt-0.5">Ogohlantirish yo'q</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentAlerts.map(a => (
                  <div key={a.id} className={`p-3 rounded-xl border ${
                    a.type === 'danger' ? 'bg-rose-50 border-rose-200/60' : 'bg-amber-50 border-amber-200/60'
                  }`}>
                    <p className="text-xs font-medium text-slate-800 leading-snug">{a.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{a.device} · {a.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/boshqaruv')}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-slate-200/60"
          >
            <WrenchScrewdriverIcon className="w-4 h-4" /> Qurilmalarni Boshqarish
          </button>
        </div>
      </div>
    </div>
  );
}
