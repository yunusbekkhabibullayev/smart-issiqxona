import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import IOSToggle from '../components/IOSToggle';
import {
  BoltIcon, PlayIcon, StopIcon,
  FireIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';

/* ── Device type config ─────────────────────── */
const TYPE_CFG = {
  fire:   { emoji: '🔥', label: 'Isitish',    color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  fan:    { emoji: '💨', label: 'Shamollatish', color: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' },
  window: { emoji: '🪟', label: 'Deraza',       color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  water:  { emoji: '💧', label: "Sug'orish",    color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
};

/* ── Single Device Card ─────────────────────── */
function DeviceCard({ device, onToggle, onModeToggle }) {
  const cfg = TYPE_CFG[device.icon] || TYPE_CFG.fan;
  const isOn = device.isOn;

  return (
    <div className={`ios-card ios-card-hover overflow-hidden`}>
      {/* Colored top accent bar */}
      <div
        className="h-1 w-full rounded-t-[1.125rem]"
        style={{ background: isOn ? cfg.color : '#E2E8F0' }}
      />

      <div className="p-5">
        {/* Row 1: icon + name + toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Icon bubble */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-all duration-300"
              style={{
                background:   isOn ? cfg.bg     : '#F8FAFC',
                border:       `1.5px solid ${isOn ? cfg.border : '#E2E8F0'}`,
              }}
            >
              {cfg.emoji}
            </div>

            {/* Name + zone */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{device.name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{device.zone}</span>
                <span className="text-[10px] text-slate-400 font-mono">{device.esp32}</span>
              </div>
            </div>
          </div>

          {/* iOS Toggle */}
          <IOSToggle isOn={isOn} onChange={() => onToggle(device.id)} />
        </div>

        {/* Row 2: status pill + watt */}
        <div className="flex items-center justify-between mt-4">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: isOn ? cfg.bg : '#F1F5F9',
              color:      isOn ? cfg.color : '#94A3B8',
              border:     `1px solid ${isOn ? cfg.border : '#E2E8F0'}`,
            }}
          >
            {device.icon === 'window'
              ? (isOn ? '🟢 OCHIQ' : '⚫ YOPIQ')
              : (isOn ? '🟢 Yoqiq' : "⚫ O'chirilgan")}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">{device.power}W</span>
        </div>

        {/* Row 3: mode + channel */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => onModeToggle(device.id)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all"
            style={{
              background: device.mode === 'auto' ? '#EFF6FF' : '#F8FAFC',
              color:      device.mode === 'auto' ? '#2563EB' : '#64748B',
              border:     `1px solid ${device.mode === 'auto' ? '#BFDBFE' : '#E2E8F0'}`,
            }}
          >
            {device.mode === 'auto' ? '⚡ Avto rejim' : "✋ Qo'lda"}
          </button>
          <span className="text-[10px] font-mono text-slate-400">Ch{device.relayChannel}</span>
        </div>

        {/* Schedule hint */}
        {device.nextSchedule && isOn && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-600 font-medium">
            <ArrowPathIcon className="w-3 h-3" />
            Keyingi: {device.nextSchedule}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Group header ──────────────────────────── */
function GroupHeader({ label, icon, devices }) {
  const onCount = devices.filter(d => d.isOn).length;
  return (
    <div className="flex items-center justify-between mb-3 px-0.5">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[10px] font-semibold text-slate-400">
        {onCount}/{devices.length} faol
      </span>
    </div>
  );
}

/* ── Automation Rule Card ─────────────────── */
function RuleCard({ rule, onToggle }) {
  return (
    <div className="ios-card ios-card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + active dot */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${rule.isActive ? 'bg-emerald-500 animate-blink' : 'bg-slate-300'}`} />
            <p className="text-sm font-semibold text-slate-900 leading-tight">{rule.name}</p>
          </div>

          {/* Condition → Action */}
          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-bold uppercase text-slate-400 mt-0.5 shrink-0 pt-0.5">IF</span>
              <span className="text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70 leading-snug">
                {rule.condition}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-bold uppercase text-blue-500 mt-0.5 shrink-0 pt-0.5">DO</span>
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 leading-snug">
                {rule.action}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
            <span>🔢 {rule.triggeredCount} marta ishga tushdi</span>
            <span className="text-slate-200">|</span>
            <span>⏱ {rule.lastTriggered}</span>
          </div>
        </div>

        {/* Toggle */}
        <IOSToggle isOn={rule.isActive} onChange={() => onToggle(rule.id)} size="sm" />
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══════════════════════════════ */
export default function Boshqaruv() {
  const { devices, toggleDevice, toggleDeviceMode, automationRules, toggleRule, showToast } = useGreenhouse();
  const [activeTab, setActiveTab] = useState('qurilmalar');

  const allOn  = devices.every(d => d.isOn);
  const anyOn  = devices.some(d => d.isOn);

  const handleAll = (turnOn) => {
    devices.forEach(d => { if (d.isOn !== turnOn) toggleDevice(d.id); });
    showToast(
      turnOn ? 'Barcha qurilmalar yoqildi ✓' : "Barcha qurilmalar o'chirildi",
      turnOn ? 'success' : 'info'
    );
  };

  const GROUPS = [
    { key: 'fire',   label: 'Isitish (GPIO 18)',      icon: '🔥', types: ['fire'] },
    { key: 'fan',    label: 'Shamollatish (GPIO 19, 22)', icon: '💨', types: ['fan'] },
    { key: 'water',  label: "Sug'orish Nasosi (GPIO 23)", icon: '💧', types: ['water'] },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Header ── */}
      <div className="ios-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Qurilmalar Boshqaruvi</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {devices.length} ta qurilma · {devices.filter(d => d.isOn).length} ta yoqiq
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl">
              {devices.filter(d => d.isOn).length} ON
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl">
              {devices.filter(d => !d.isOn).length} OFF
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 w-fit">
        {[{ id: 'qurilmalar', label: 'Qurilmalar' }, { id: 'avtomatik', label: 'Avtomatik Qoidalar' }].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── QURILMALAR ── */}
      {activeTab === 'qurilmalar' && (
        <div className="space-y-6 animate-slideUp">

          {/* All on/off bar */}
          <div className="ios-card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Umumiy Boshqaruv</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {devices.filter(d => d.isOn).length}/{devices.length} ta qurilma faol
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleAll(false)}
                disabled={!anyOn}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200/70 bg-rose-50 hover:bg-rose-100
                  text-rose-600 text-xs font-semibold active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                <StopIcon className="w-3.5 h-3.5" /> O'chir
              </button>
              <button
                onClick={() => handleAll(true)}
                disabled={allOn}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800
                  text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <PlayIcon className="w-3.5 h-3.5" /> Yoq
              </button>
            </div>
          </div>

          {/* Groups */}
          {devices.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 my-4">
              <span className="text-3xl">🔌</span>
              <h4 className="mt-2 text-sm font-bold text-slate-800">Relelar ulanmagan (Offline)</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                ESP qurilmasi hali ulanmagan. Qurilma ulanib, o'zining rele konfiguratsiyasini yuborishi bilan bu yerda boshqaruv tugmalari paydo bo'ladi.
              </p>
            </div>
          ) : (
            GROUPS.map(group => {
              const gDevices = devices.filter(d => group.types.includes(d.icon));
              if (!gDevices.length) return null;
              return (
                <div key={group.key}>
                  <GroupHeader label={group.label} icon={group.icon} devices={gDevices} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gDevices.map(d => (
                      <DeviceCard
                        key={d.id}
                        device={d}
                        onToggle={toggleDevice}
                        onModeToggle={toggleDeviceMode}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── AVTOMATIK ── */}
      {activeTab === 'avtomatik' && (
        <div className="space-y-3 animate-slideUp">
          {/* Info banner */}
          <div className="ios-card p-4 bg-blue-50/60 border-blue-100/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <BoltIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Avtomatik Qoidalar</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sensor qiymatlariga asosan qurilmalar avtomatik boshqariladi
                </p>
              </div>
            </div>
          </div>

          {automationRules.map(rule => (
            <RuleCard key={rule.id} rule={rule} onToggle={toggleRule} />
          ))}
        </div>
      )}
    </div>
  );
}
