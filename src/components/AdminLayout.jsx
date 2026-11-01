import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  PresentationChartLineIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellAlertIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

import { useGreenhouse } from '../context/GreenhouseContext';
import Dashboard from '../pages/Dashboard';
import Sensorlar from '../pages/Sensorlar';
import Boshqaruv from '../pages/Boshqaruv';
import Grafiklar from '../pages/Grafiklar';
import Sozlamalar from '../pages/Sozlamalar';
import Login from '../pages/Login';
import ToastMessage from './ToastMessage';

const NAV_GROUPS = [
  {
    label: 'Asosiy',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { id: 'sensorlar', label: 'Sensorlar', icon: BeakerIcon, path: '/sensorlar' },
      { id: 'grafiklar', label: 'Grafiklar', icon: PresentationChartLineIcon, path: '/grafiklar' },
    ],
  },
  {
    label: 'Boshqaruv',
    items: [
      { id: 'boshqaruv', label: 'Qurilmalar', icon: WrenchScrewdriverIcon, path: '/boshqaruv' },
    ],
  },
  {
    label: 'Tizim',
    items: [
      { id: 'sozlamalar', label: 'Sozlamalar', icon: Cog6ToothIcon, path: '/sozlamalar' },
    ],
  },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  sensorlar: 'Sensorlar',
  grafiklar: 'Grafiklar',
  boshqaruv: 'Boshqaruv',
  sozlamalar: 'Sozlamalar',
};

/* ─── Logout Confirm Modal (Apple iOS style — same as university-admin) ─── */
function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[340px] rounded-3xl p-6 shadow-2xl border border-slate-200/80 flex flex-col items-center text-center animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 mb-3 shadow-xs">
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 leading-snug mb-1.5">
          Tizimdan chiqish
        </h3>
        <p className="text-xs text-slate-500 font-normal leading-relaxed mb-5 px-1">
          Haqiqatan ham tizimdan chiqmoqchimisiz?
        </p>
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Bekor qilish</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 shrink-0" />
            <span>Ha, chiqish</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, toast, stats, alerts } = useGreenhouse();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [clock, setClock] = useState('');
  const mainRef = useRef(null);

  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setClock(`${h}:${m}`);
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setSidebarOpen(false);
  }, [location.pathname]);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  if (!currentUser && !isLoginPage) return <Navigate to="/login" replace />;
  if (isLoginPage) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
        {toast && <ToastMessage key={toast.id} message={toast.message} type={toast.type} />}
      </>
    );
  }

  const currentPage = location.pathname.replace('/', '') || 'dashboard';
  const pageTitle = PAGE_TITLES[currentPage] || 'Smart Issiqxona';
  const currentNavItem = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === currentPage);
  const CurrentIcon = currentNavItem?.icon || HomeIcon;
  const unresolved = alerts?.filter(a => !a.resolved && (a.type === 'danger' || a.type === 'warn')).length || 0;

  const handleNav = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans antialiased overflow-hidden select-none">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ====== SIDEBAR — exact university-admin style ====== */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-white/90 backdrop-blur-xl border-r border-slate-200/60 shadow-ios
        transform transition-transform duration-300 md:translate-x-0 md:static shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Brand */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-blue-500/20 shrink-0">
              🌿
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-xs text-slate-900 truncate leading-tight tracking-tight">Issiqxona</h2>
              <span className="text-[10px] text-blue-600 font-medium uppercase tracking-wider block mt-0.5">Boshqaruv Tizimi</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto no-scrollbar">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="space-y-1">
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                {group.label}
              </span>
              {group.items.map(item => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium tracking-normal transition-all duration-200 cursor-pointer
                      ${active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.id === 'boshqaruv' && unresolved > 0 && (
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {unresolved}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 pl-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse block" />
            <span className="text-[10px] font-medium text-slate-500">v1.0.0 Online</span>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title="Tizimdan chiqish"
            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ====== MAIN ====== */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top Header — exact university-admin */}
        <header className="h-14 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60 shadow-xs shrink-0">
                <CurrentIcon className="w-4 h-4 stroke-[2]" />
              </div>
              <h1 className="font-semibold text-slate-900 text-sm tracking-tight truncate">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sensor quick values */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                🌡️ <span className="font-semibold">{stats?.avgTemperature}°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                💧 <span className="font-semibold">{stats?.avgHumidity}%</span>
              </div>
              {unresolved > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200/60">
                  <BellAlertIcon className="w-3.5 h-3.5" />
                  <span className="font-semibold">{unresolved}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-medium text-xs shadow-xs cursor-pointer">
                {currentUser?.avatar || currentUser?.name?.[0] || 'A'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser?.name || 'Admin'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
                  {currentUser?.role || 'Super Admin'}
                </span>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Tizimdan chiqish"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer ml-1"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto pb-20 md:pb-8">
            <Routes>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="sensorlar" element={<Sensorlar />} />
              <Route path="boshqaruv" element={<Boshqaruv />} />
              <Route path="grafiklar" element={<Grafiklar />} />
              <Route path="sozlamalar" element={<Sozlamalar />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>

        {/* Mobile Bottom Nav — iOS style, same as university-admin */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 px-2 py-1.5 flex items-center justify-around shadow-lg">
          {[
            { id: 'dashboard', icon: HomeIcon, label: 'Dashboard' },
            { id: 'sensorlar', icon: BeakerIcon, label: 'Sensorlar' },
            { id: 'boshqaruv', icon: WrenchScrewdriverIcon, label: 'Boshqaruv' },
            { id: 'grafiklar', icon: PresentationChartLineIcon, label: 'Grafik' },
            { id: 'sozlamalar', icon: Cog6ToothIcon, label: 'Sozlama' },
          ].map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(`/${item.id}`)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                  active ? 'text-blue-600 font-semibold scale-105' : 'text-slate-500 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.id === 'boshqaruv' && unresolved > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {unresolved}
                    </span>
                  )}
                </div>
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />

      {/* Toast */}
      {toast && <ToastMessage key={toast.id} message={toast.message} type={toast.type} />}
    </div>
  );
}
