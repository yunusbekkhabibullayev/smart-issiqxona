import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Line,
} from 'recharts';

/* ─── Metric definitions ───────────────────── */
const METRICS = [
  {
    id: 'harorat',
    label: 'Harorat',
    emoji: '🌡️',
    unit: '°C',
    color: '#F97316',
    gradId: 'gTemp',
    gradColor: '#FED7AA',
    optimal: { min: 20, max: 28 },
    bg: '#FFF7ED',
    border: '#FED7AA',
    textColor: '#EA580C',
    desc: 'Issiqxona havosi harorati',
  },
  {
    id: 'namlik',
    label: 'Namlik',
    emoji: '💧',
    unit: '%',
    color: '#3B82F6',
    gradId: 'gHumid',
    gradColor: '#BFDBFE',
    optimal: { min: 55, max: 75 },
    bg: '#EFF6FF',
    border: '#BFDBFE',
    textColor: '#2563EB',
    desc: 'Havo namligi darajasi',
  },
  {
    id: 'tuproq',
    label: 'Tuproq',
    emoji: '🌱',
    unit: '%',
    color: '#10B981',
    gradId: 'gSoil',
    gradColor: '#A7F3D0',
    optimal: { min: 50, max: 80 },
    bg: '#ECFDF5',
    border: '#A7F3D0',
    textColor: '#059669',
    desc: "Tuproq namligi ko'rsatkichi",
  },
];

const RANGES = [
  { id: '6H',  label: '6s',  slice: 18 },
  { id: '12H', label: '12s', slice: 12 },
  { id: '24H', label: '24s', slice: 0  },
];

/* ─── Custom Tooltip ─────────────────────── */
function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(226,232,240,0.9)',
      borderRadius: 14,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
      minWidth: 120,
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
            <span style={{ fontSize: 11, color: '#64748B' }}>{p.name}</span>
          </div>
          <strong style={{ fontSize: 13, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{unit}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* ─── Metric Selector Card ───────────────── */
function MetricCard({ metric, isActive, latest, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: isActive ? metric.bg : '#FFFFFF',
        border: `1.5px solid ${isActive ? metric.border : 'rgba(226,232,240,0.9)'}`,
        borderRadius: 18,
        padding: '14px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: isActive
          ? `0 4px 20px ${metric.color}20, 0 1px 4px rgba(15,23,42,0.05)`
          : '0 1px 4px rgba(15,23,42,0.04)',
        transform: isActive ? 'translateY(-1px)' : 'none',
        outline: 'none',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 8 }}>{metric.emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
        {metric.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: isActive ? metric.color : '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {latest ?? '—'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 1 }}>{metric.unit}</span>
      </div>
      {isActive && (
        <div style={{
          marginTop: 6, fontSize: 9, fontWeight: 700,
          color: metric.textColor, background: 'white',
          border: `1px solid ${metric.border}`,
          borderRadius: 6, padding: '2px 6px', display: 'inline-block',
        }}>
          Faol
        </div>
      )}
    </button>
  );
}

/* ─── Stat mini-card ─────────────────────── */
function StatCard({ label, value, unit, emoji, bg, tc, border }) {
  return (
    <div style={{
      flex: 1,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: '12px 14px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: tc, letterSpacing: '-0.03em' }}>{value}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>{unit}</span>
      </div>
    </div>
  );
}

/* ─── Zone Bar Chart  ─────────────────────── */
function ZoneBarChart({ sensors, type }) {
  const cfg = METRICS.find(m => m.id === type);
  const data = ['A-Zona', 'B-Zona', 'C-Zona'].map(zone => {
    const s = sensors.find(s => s.zone === zone && s.type === (type === 'harorat' ? 'temperature' : 'humidity'));
    return { zone, value: s?.value ?? 0, status: s?.status };
  });
  const barColor = (status) =>
    status === 'danger' ? '#F43F5E' : status === 'warn' ? '#F59E0B' : cfg.color;

  return (
    <div className="ios-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
          {cfg.emoji} {cfg.label} — Zonalar taqqoslash
        </p>
        <p style={{ fontSize: 11, color: '#94A3B8' }}>A, B, C zona joriy qiymatlari</p>
      </div>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="zone"
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<ChartTooltip unit={cfg.unit} />} />
            <ReferenceLine y={cfg.optimal.max} stroke={cfg.color} strokeDasharray="4 3" strokeOpacity={0.4} strokeWidth={1.5} />
            <ReferenceLine y={cfg.optimal.min} stroke={cfg.color} strokeDasharray="4 3" strokeOpacity={0.4} strokeWidth={1.5} />
            <Bar
              dataKey="value"
              name={cfg.label}
              radius={[8, 8, 0, 0]}
              fill={cfg.color}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        <div style={{ width: 20, height: 2, background: cfg.color, borderRadius: 2, opacity: 0.4 }} />
        <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>
          Optimal: {cfg.optimal.min}–{cfg.optimal.max}{cfg.unit}
        </span>
      </div>
    </div>
  );
}

/* ─── Multi-line comparison chart ─────────── */
function MultiChart({ data }) {
  return (
    <div className="ios-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
          📊 Umumiy Ko'rsatkichlar
        </p>
        <p style={{ fontSize: 11, color: '#94A3B8' }}>Harorat, namlik va tuproq bir vaqtda</p>
      </div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 500 }} axisLine={false} tickLine={false} interval={Math.ceil(data.length / 5)} />
            <YAxis tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip unit="" />} />
            <Line type="monotone" dataKey="harorat" name="Harorat (°C)" stroke="#F97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="namlik"  name="Namlik (%)"  stroke="#3B82F6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tuproq"  name="Tuproq (%)"  stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { color: '#F97316', label: 'Harorat' },
          { color: '#3B82F6', label: 'Namlik' },
          { color: '#10B981', label: 'Tuproq' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 3, background: item.color, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══════════════════════════════ */
export default function Grafiklar() {
  const { chartData, sensors, soilSensors, lastSync } = useGreenhouse();
  const [activeMetric, setActiveMetric] = useState('harorat');
  const [timeRange, setTimeRange]       = useState('24H');

  const range  = RANGES.find(r => r.id === timeRange);
  const sliced = chartData.slice(range.slice);
  const metric = METRICS.find(m => m.id === activeMetric);

  const vals   = sliced.map(d => d[activeMetric]);
  const avgVal = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const minVal = Math.min(...vals).toFixed(1);
  const maxVal = Math.max(...vals).toFixed(1);
  const latest = chartData[chartData.length - 1]?.[activeMetric]?.toFixed(1);
  const latestByMetric = (id) => chartData[chartData.length - 1]?.[id]?.toFixed(1);

  const isInOptimal = parseFloat(latest) >= metric.optimal.min && parseFloat(latest) <= metric.optimal.max;

  const formatTime = () => lastSync
    ? lastSync.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div className="space-y-5 animate-fadeIn" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div className="ios-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Grafik Tahlil
            </h2>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, margin: '3px 0 0' }}>
              Sensor ko'rsatkichlari dinamikasi
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: 12, padding: '6px 12px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#3B82F6',
              display: 'inline-block', animation: 'pulse2 1.6s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>{formatTime()}</span>
          </div>
        </div>
      </div>

      {/* ── Metric selector cards ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        {METRICS.map(m => (
          <MetricCard
            key={m.id}
            metric={m}
            isActive={activeMetric === m.id}
            latest={latestByMetric(m.id)}
            onClick={() => setActiveMetric(m.id)}
          />
        ))}
      </div>

      {/* ── Main area chart ── */}
      <div className="ios-card" style={{ padding: 20 }}>
        {/* Chart header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{metric.emoji}</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {metric.label} Dinamikasi
              </p>
              <span style={{
                fontSize: 9, fontWeight: 700,
                background: isInOptimal ? '#ECFDF5' : '#FEF3C7',
                color: isInOptimal ? '#059669' : '#D97706',
                border: `1px solid ${isInOptimal ? '#A7F3D0' : '#FDE68A'}`,
                borderRadius: 6, padding: '2px 7px',
              }}>
                {isInOptimal ? 'Optimal' : 'Diqqat!'}
              </span>
            </div>
            <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>
              {metric.desc} · Optimal: {metric.optimal.min}–{metric.optimal.max}{metric.unit}
            </p>
          </div>

          {/* Time range pills */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: '#F8FAFC', border: '1px solid rgba(226,232,240,0.9)',
            borderRadius: 12, padding: 4,
          }}>
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 9,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: timeRange === r.id ? '#FFFFFF' : 'transparent',
                  color:      timeRange === r.id ? '#0F172A' : '#94A3B8',
                  boxShadow:  timeRange === r.id ? '0 1px 4px rgba(15,23,42,0.1)' : 'none',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Big value display */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
          <span style={{
            fontSize: 42, fontWeight: 800, letterSpacing: '-0.04em',
            color: metric.color, lineHeight: 1,
          }}>{latest}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#CBD5E1' }}>{metric.unit}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#94A3B8',
            background: '#F8FAFC', border: '1px solid #E2E8F0',
            borderRadius: 8, padding: '3px 8px', marginLeft: 4,
          }}>
            Joriy qiymat
          </span>
        </div>

        {/* Stat mini-cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <StatCard
            label="O'rtacha"
            value={avgVal}
            unit={metric.unit}
            emoji="📊"
            bg="#F8FAFC"
            tc="#475569"
            border="rgba(226,232,240,0.9)"
          />
          <StatCard
            label="Minimum"
            value={minVal}
            unit={metric.unit}
            emoji="📉"
            bg={metric.bg}
            tc={metric.textColor}
            border={metric.border}
          />
          <StatCard
            label="Maksimum"
            value={maxVal}
            unit={metric.unit}
            emoji="📈"
            bg="#FFF7ED"
            tc="#EA580C"
            border="#FED7AA"
          />
        </div>

        {/* Area chart */}
        <div style={{ height: 220, marginLeft: -8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sliced} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={metric.gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={metric.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={metric.color} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#CBD5E1', fontWeight: 600 }}
                axisLine={false} tickLine={false}
                interval={Math.ceil(sliced.length / 6)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#CBD5E1', fontWeight: 500 }}
                axisLine={false} tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip unit={metric.unit} />} />
              {/* optimal zone lines */}
              <ReferenceLine
                y={metric.optimal.max}
                stroke={metric.color}
                strokeDasharray="5 4"
                strokeOpacity={0.35}
                strokeWidth={1.5}
                label={{ value: `Maks ${metric.optimal.max}${metric.unit}`, position: 'insideTopRight', fontSize: 9, fill: metric.color, opacity: 0.6 }}
              />
              <ReferenceLine
                y={metric.optimal.min}
                stroke={metric.color}
                strokeDasharray="5 4"
                strokeOpacity={0.35}
                strokeWidth={1.5}
                label={{ value: `Min ${metric.optimal.min}${metric.unit}`, position: 'insideBottomRight', fontSize: 9, fill: metric.color, opacity: 0.6 }}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                name={`${metric.label} (${metric.unit})`}
                stroke={metric.color}
                strokeWidth={2.5}
                fill={`url(#${metric.gradId})`}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: metric.color,
                  stroke: '#fff',
                  strokeWidth: 2,
                  filter: `drop-shadow(0 2px 6px ${metric.color}60)`,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p style={{ textAlign: 'center', fontSize: 9, color: '#CBD5E1', fontWeight: 600, marginTop: 8 }}>
          Kesma chiziqlar — optimal chegara
        </p>
      </div>

      {/* ── Multi-line & Bar charts ── */}
      <MultiChart data={sliced} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ZoneBarChart sensors={sensors} type="harorat" />
        <ZoneBarChart sensors={sensors} type="namlik" />
      </div>

      {/* ── Soil distribution ── */}
      <div className="ios-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
            🌱 Tuproq Namligi Taqsimoti
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8' }}>
            {soilSensors.length} ta zona tuproq namligi
          </p>
        </div>

        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={soilSensors.map(s => ({ name: s.zone.replace('-Zona', ''), value: s.value, status: s.status }))}
              margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="%" />} />
              <ReferenceLine y={50} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1.5}
                label={{ value: 'Min 50%', position: 'insideTopRight', fontSize: 9, fill: '#10B981', opacity: 0.7 }} />
              <Bar dataKey="value" name="Namlik" radius={[6, 6, 0, 0]} fill="#10B981" fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Soil status breakdown */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Yetarli (≥50%)', count: soilSensors.filter(s => s.value >= 50).length, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: "O'rtacha (35-50%)", count: soilSensors.filter(s => s.value >= 35 && s.value < 50).length, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
            { label: 'Quruq (<35%)', count: soilSensors.filter(s => s.value < 35).length, color: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3' },
          ].map((item, i) => (
            <div key={i} style={{
              flex: 1, background: item.bg, border: `1px solid ${item.border}`,
              borderRadius: 12, padding: '10px 12px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: item.color, margin: 0, lineHeight: 1 }}>{item.count}</p>
              <p style={{ fontSize: 9, color: '#64748B', fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
