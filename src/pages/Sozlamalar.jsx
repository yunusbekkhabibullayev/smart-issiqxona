import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import {
  BellAlertIcon, SunIcon, MoonIcon, ClockIcon,
  ArrowRightOnRectangleIcon, CheckCircleIcon, XMarkIcon,
  ChevronRightIcon, InformationCircleIcon, WifiIcon,
  CpuChipIcon, DevicePhoneMobileIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import IOSToggle from '../components/IOSToggle';

/* ─── iOS-style grouped list row ─── */
function IosRow({ icon, iconBg, label, desc, children, last = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`ios-settings-row ${last ? 'last' : ''} ${onClick ? 'clickable' : ''}`}
    >
      <div className="ios-row-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="ios-row-content">
        <div className="ios-row-text">
          <span className="ios-row-label">{label}</span>
          {desc && <span className="ios-row-desc">{desc}</span>}
        </div>
        <div className="ios-row-right">
          {children}
          {onClick && <ChevronRightIcon className="ios-chevron" />}
        </div>
      </div>
    </div>
  );
}

/* ─── iOS grouped section ─── */
function IosSection({ title, children, footer }) {
  return (
    <div className="ios-section">
      {title && <p className="ios-section-title">{title}</p>}
      <div className="ios-section-card">
        {children}
      </div>
      {footer && <p className="ios-section-footer">{footer}</p>}
    </div>
  );
}

/* ─── Stepper input ─── */
function IosStepper({ value, onChange, min, max, step = 1, unit }) {
  return (
    <div className="ios-stepper">
      <button
        className="ios-stepper-btn"
        onClick={() => onChange(Math.max(min, value - step))}
      >−</button>
      <span className="ios-stepper-value">{value}{unit}</span>
      <button
        className="ios-stepper-btn ios-stepper-plus"
        onClick={() => onChange(Math.min(max, value + step))}
      >+</button>
    </div>
  );
}

/* ─── Logout Modal ─── */
function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="ios-modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="ios-modal animate-scaleUp" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-icon">
          <ArrowRightOnRectangleIcon style={{ width: 26, height: 26 }} />
        </div>
        <h3 className="ios-modal-title">Tizimdan chiqish</h3>
        <p className="ios-modal-desc">Haqiqatan ham tizimdan chiqmoqchimisiz?</p>
        <div className="ios-modal-actions">
          <button onClick={onClose} className="ios-modal-btn cancel">
            <XMarkIcon style={{ width: 16, height: 16 }} />
            Bekor qilish
          </button>
          <button onClick={onConfirm} className="ios-modal-btn danger">
            <ArrowRightOnRectangleIcon style={{ width: 16, height: 16 }} />
            Ha, chiqish
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Sozlamalar() {
  const { currentUser, logout, showToast } = useGreenhouse();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoMode, setAutoMode] = useState(true);
  const [nightMode, setNightMode] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5);
  const [tempMax, setTempMax] = useState(28);
  const [tempMin, setTempMin] = useState(20);
  const [humidMax, setHumidMax] = useState(75);
  const [humidMin, setHumidMin] = useState(55);
  const [soilMin, setSoilMin] = useState(40);

  const confirmLogout = () => { setShowLogout(false); logout(); navigate('/login'); };

  return (
    <>
      <style>{`
        .sozlamalar-page {
          max-width: 640px;
          margin: 0 auto;
          padding: 8px 0 40px;
          animation: fadeIn 0.22s cubic-bezier(0.16,1,0.3,1) both;
        }

        /* profile */
        .ios-profile-card {
          margin: 0 0 28px;
          background: linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 60%, #1a1a2e 100%);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,0.18);
        }
        .ios-profile-card::before {
          content: '';
          position: absolute;
          top: -60px; right: -40px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .ios-profile-card::after {
          content: '';
          position: absolute;
          bottom: -40px; left: 20px;
          width: 140px; height: 140px;
          background: radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .ios-avatar {
          width: 64px; height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a5b4fc 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; font-weight: 700; color: #fff;
          letter-spacing: -0.5px;
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
          flex-shrink: 0;
          position: relative; z-index: 1;
        }
        .ios-profile-info { flex: 1; position: relative; z-index: 1; }
        .ios-profile-name {
          font-size: 17px; font-weight: 600;
          color: #fff; letter-spacing: -0.3px;
        }
        .ios-profile-role {
          font-size: 13px; color: rgba(167,139,250,0.9);
          margin-top: 2px; font-weight: 500;
        }
        .ios-profile-status {
          display: flex; align-items: center; gap: 6px;
          margin-top: 8px;
        }
        .ios-status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #34C759;
          animation: pulse2 2s ease-in-out infinite;
          box-shadow: 0 0 6px rgba(52,199,89,0.6);
        }
        .ios-status-text {
          font-size: 11px; color: rgba(255,255,255,0.45);
          font-weight: 500;
        }
        .ios-profile-chevron {
          width: 20px; height: 20px;
          color: rgba(255,255,255,0.25);
          position: relative; z-index: 1;
          flex-shrink: 0;
        }

        /* section */
        .ios-section { margin-bottom: 28px; }
        .ios-section-title {
          font-size: 12px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: #8E8E93;
          padding: 0 6px 8px;
          margin: 0;
        }
        .ios-section-card {
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .ios-section-footer {
          font-size: 12px; color: #8E8E93;
          padding: 8px 6px 0;
          line-height: 1.5;
          margin: 0;
        }

        /* row */
        .ios-settings-row {
          display: flex; align-items: center;
          padding: 0 14px 0 12px;
          min-height: 54px;
          background: #fff;
          position: relative;
        }
        .ios-settings-row:not(.last)::after {
          content: '';
          position: absolute;
          bottom: 0; left: 54px; right: 0;
          height: 0.5px;
          background: rgba(0,0,0,0.09);
        }
        .ios-settings-row.clickable { cursor: pointer; }
        .ios-settings-row.clickable:active { background: #F2F2F7; }

        .ios-row-icon {
          width: 32px; height: 32px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-right: 14px;
        }
        .ios-row-icon svg { width: 17px; height: 17px; color: #fff; stroke-width: 2; }

        .ios-row-content {
          display: flex; align-items: center;
          flex: 1; gap: 8px;
          min-width: 0;
        }
        .ios-row-text { flex: 1; min-width: 0; }
        .ios-row-label {
          display: block;
          font-size: 15px; font-weight: 400;
          color: #1C1C1E;
          letter-spacing: -0.2px;
        }
        .ios-row-desc {
          display: block;
          font-size: 12px; color: #8E8E93;
          margin-top: 1px;
        }
        .ios-row-right {
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .ios-chevron {
          width: 15px; height: 15px;
          color: #C7C7CC; stroke-width: 2.5;
        }
        .ios-info-value {
          font-size: 14px; color: #8E8E93;
          font-variant-numeric: tabular-nums;
        }

        /* stepper */
        .ios-stepper {
          display: flex; align-items: center;
          background: #F2F2F7;
          border-radius: 10px;
          overflow: hidden;
        }
        .ios-stepper-btn {
          width: 34px; height: 32px;
          background: transparent;
          border: none;
          font-size: 19px; font-weight: 300;
          color: #007AFF;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .ios-stepper-btn:active { background: rgba(0,122,255,0.08); }
        .ios-stepper-value {
          font-size: 14px; font-weight: 600;
          color: #1C1C1E;
          min-width: 52px; text-align: center;
          border-left: 0.5px solid rgba(0,0,0,0.12);
          border-right: 0.5px solid rgba(0,0,0,0.12);
          padding: 0 6px;
          height: 32px;
          display: flex; align-items: center; justify-content: center;
        }

        /* threshold */
        .ios-threshold-row {
          padding: 14px 14px 14px 12px;
          border-bottom: 0.5px solid rgba(0,0,0,0.09);
        }
        .ios-threshold-row:last-child { border-bottom: none; }
        .ios-threshold-header {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 14px;
        }
        .ios-threshold-emoji { font-size: 16px; }
        .ios-threshold-title {
          font-size: 14px; font-weight: 600;
          color: #1C1C1E;
        }
        .ios-threshold-body {
          display: flex; align-items: center;
          gap: 12px;
        }
        .ios-threshold-field { flex: 1; }
        .ios-threshold-label {
          font-size: 11px; color: #8E8E93;
          margin-bottom: 8px;
          display: block; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .ios-threshold-sep {
          color: #C7C7CC; font-size: 18px; font-weight: 300;
          padding-top: 16px;
        }
        .ios-threshold-note {
          font-size: 12px; color: #8E8E93;
          line-height: 1.5; flex: 1; padding-top: 14px;
        }

        /* buttons */
        .ios-btn-save {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: none;
          background: #007AFF;
          color: #fff;
          font-size: 16px; font-weight: 600;
          letter-spacing: -0.2px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.1s;
          box-shadow: 0 4px 20px rgba(0,122,255,0.28);
        }
        .ios-btn-save:hover { opacity: 0.9; }
        .ios-btn-save:active { transform: scale(0.98); opacity: 0.85; }

        .ios-btn-logout {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.05);
          background: #fff;
          color: #FF3B30;
          font-size: 16px; font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04);
        }
        .ios-btn-logout:hover { background: #FFF5F5; }
        .ios-btn-logout:active { transform: scale(0.98); background: #FFE5E3; }

        /* modal */
        .ios-modal-overlay {
          position: fixed; inset: 0; z-index: 300;
          display: flex; align-items: flex-end;
          padding: 0 12px 32px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .ios-modal {
          width: 100%; max-width: 420px;
          margin: 0 auto;
          background: #F2F2F7;
          border-radius: 14px;
          overflow: hidden;
          text-align: center;
        }
        .ios-modal-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: #FFE5E3;
          color: #FF3B30;
          display: flex; align-items: center; justify-content: center;
          margin: 24px auto 12px;
        }
        .ios-modal-title {
          font-size: 16px; font-weight: 600;
          color: #1C1C1E; margin: 0 0 6px;
        }
        .ios-modal-desc {
          font-size: 13px; color: #8E8E93;
          margin: 0 24px 20px; line-height: 1.5;
        }
        .ios-modal-actions {
          display: flex; flex-direction: column;
          border-top: 0.5px solid rgba(0,0,0,0.12);
        }
        .ios-modal-btn {
          padding: 16px;
          border: none; background: transparent;
          font-size: 16px; cursor: pointer;
          transition: background 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .ios-modal-btn.cancel {
          color: #007AFF; font-weight: 400;
          border-bottom: 0.5px solid rgba(0,0,0,0.12);
        }
        .ios-modal-btn.cancel:active { background: rgba(0,122,255,0.06); }
        .ios-modal-btn.danger { color: #FF3B30; font-weight: 600; }
        .ios-modal-btn.danger:active { background: rgba(255,59,48,0.06); }
      `}</style>

      <div className="sozlamalar-page">

        {/* Profile Card */}
        <div className="ios-profile-card">
          <div className="ios-avatar">
            {currentUser?.avatar || currentUser?.name?.[0] || 'A'}
          </div>
          <div className="ios-profile-info">
            <p className="ios-profile-name">{currentUser?.name}</p>
            <p className="ios-profile-role">{currentUser?.role}</p>
            <div className="ios-profile-status">
              <span className="ios-status-dot" />
              <span className="ios-status-text">Smart Issiqxona v1.0.0 · Online</span>
            </div>
          </div>
          <ChevronRightIcon className="ios-profile-chevron" />
        </div>

        {/* Tizim Sozlamalari */}
        <IosSection title="Tizim Sozlamalari">
          <IosRow
            icon={<BellAlertIcon />}
            iconBg="#FF3B30"
            label="Bildirishnomalar"
            desc="Push xabarlari va ogohlantirishlar"
          >
            <IOSToggle isOn={notifications} onChange={() => setNotifications(v => !v)} size="md" />
          </IosRow>
          <IosRow
            icon={<SunIcon />}
            iconBg="#FF9500"
            label="Avtomatik Rejim"
            desc="Sensorga asosan boshqarish"
          >
            <IOSToggle isOn={autoMode} onChange={() => setAutoMode(v => !v)} size="md" />
          </IosRow>
          <IosRow
            icon={<MoonIcon />}
            iconBg="#5856D6"
            label="Tungi Rejim"
            desc="20:00 – 07:00"
          >
            <IOSToggle isOn={nightMode} onChange={() => setNightMode(v => !v)} size="md" />
          </IosRow>
          <IosRow
            icon={<ClockIcon />}
            iconBg="#007AFF"
            label="Sinxronizatsiya"
            last
          >
            <IosStepper
              value={syncInterval}
              onChange={setSyncInterval}
              min={1} max={60} unit=" sek"
            />
          </IosRow>
        </IosSection>

        {/* Optimal Chegara */}
        <IosSection
          title="Optimal Chegara (Trigger)"
          footer="Sensor ko'rsatkichlari bu chegaradan chiqsa qurilmalar avtomatik boshqariladi."
        >
          <div className="ios-threshold-row">
            <div className="ios-threshold-header">
              <span className="ios-threshold-emoji">🌡️</span>
              <span className="ios-threshold-title">Harorat Chegarasi</span>
            </div>
            <div className="ios-threshold-body">
              <div className="ios-threshold-field">
                <span className="ios-threshold-label">Minimal</span>
                <IosStepper value={tempMin} onChange={setTempMin} min={10} max={35} unit="°C" />
              </div>
              <span className="ios-threshold-sep">—</span>
              <div className="ios-threshold-field">
                <span className="ios-threshold-label">Maksimal</span>
                <IosStepper value={tempMax} onChange={setTempMax} min={10} max={40} unit="°C" />
              </div>
            </div>
          </div>

          <div className="ios-threshold-row">
            <div className="ios-threshold-header">
              <span className="ios-threshold-emoji">💧</span>
              <span className="ios-threshold-title">Namlik Chegarasi</span>
            </div>
            <div className="ios-threshold-body">
              <div className="ios-threshold-field">
                <span className="ios-threshold-label">Minimal</span>
                <IosStepper value={humidMin} onChange={setHumidMin} min={20} max={80} unit="%" />
              </div>
              <span className="ios-threshold-sep">—</span>
              <div className="ios-threshold-field">
                <span className="ios-threshold-label">Maksimal</span>
                <IosStepper value={humidMax} onChange={setHumidMax} min={30} max={95} unit="%" />
              </div>
            </div>
          </div>

          <div className="ios-threshold-row">
            <div className="ios-threshold-header">
              <span className="ios-threshold-emoji">🌱</span>
              <span className="ios-threshold-title">Tuproq Namligi (Sug'orish)</span>
            </div>
            <div className="ios-threshold-body">
              <div className="ios-threshold-field">
                <span className="ios-threshold-label">Chegara</span>
                <IosStepper value={soilMin} onChange={setSoilMin} min={20} max={70} step={5} unit="%" />
              </div>
              <p className="ios-threshold-note">
                Bu qiymatdan past tushsa nasos avtomatik yoqiladi
              </p>
            </div>
          </div>
        </IosSection>

        {/* Tizim Haqida */}
        <IosSection title="Tizim Haqida">
          <IosRow icon={<InformationCircleIcon />} iconBg="#8E8E93" label="Versiya">
            <span className="ios-info-value">v1.0.0</span>
          </IosRow>
          <IosRow icon={<CpuChipIcon />} iconBg="#30D158" label="ESP32 Firmware">
            <span className="ios-info-value">v2.4.1</span>
          </IosRow>
          <IosRow icon={<DevicePhoneMobileIcon />} iconBg="#007AFF" label="Qurilmalar soni">
            <span className="ios-info-value">7 ta</span>
          </IosRow>
          <IosRow icon={<Cog6ToothIcon />} iconBg="#FF9500" label="Sensorlar soni">
            <span className="ios-info-value">16 ta</span>
          </IosRow>
          <IosRow icon={<WifiIcon />} iconBg="#5856D6" label="Wi-Fi tarmoq" last>
            <span className="ios-info-value">192.168.1.0/24</span>
          </IosRow>
        </IosSection>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
          <button
            className="ios-btn-save"
            onClick={() => showToast('Sozlamalar saqlandi ✓', 'success')}
          >
            <CheckCircleIcon style={{ width: 20, height: 20 }} />
            Sozlamalarni Saqlash
          </button>
          <button
            className="ios-btn-logout"
            onClick={() => setShowLogout(true)}
          >
            Tizimdan Chiqish
          </button>
        </div>

      </div>

      <LogoutModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}
