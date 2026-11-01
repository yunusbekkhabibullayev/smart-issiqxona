import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useGreenhouse } from '../context/GreenhouseContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, showToast } = useGreenhouse();
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer]     = useState(0);
  const [uTouched, setUTouched]     = useState(false);
  const [pTouched, setPTouched]     = useState(false);

  const uOk = username.trim().length >= 3;
  const pOk = password.length >= 4;

  // Blokirovka hisoblagichi
  React.useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setInterval(() => setLockoutTimer(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTimer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) {
      setError(`Xavfsizlik blokirovkasi! Iltimos, ${lockoutTimer} soniya kuting.`);
      return;
    }

    setUTouched(true); setPTouched(true);
    if (!uOk || !pOk) { setError("Login va parolni to'liq kiriting!"); return; }
    
    setLoading(true); setError('');
    setTimeout(() => {
      const result = login(username.trim(), password);
      setLoading(false);

      if (result.success) {
        setFailedAttempts(0);
        showToast('Tizimga muvaffaqiyatli kirdingiz!', 'success');
        navigate('/dashboard');
      } else {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        if (attempts >= 5) {
          setLockoutTimer(30); // 5 marta xatodan so'ng 30s blokirovka
          setError("Xavfsizlik: 5 marta xato kiritildi! Tizim 30 soniyaga bloklandi.");
        } else {
          setError(result.error || "Login yoki parol noto'g'ri!");
        }
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* bg blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[360px] bg-white/88 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_8px_40px_rgba(15,23,42,0.08)] p-8 flex flex-col animate-scaleUp">

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-slate-900 text-center tracking-tight mb-1">Tizimga kirish</h2>
        <p className="text-[11px] text-blue-600 font-medium tracking-widest uppercase text-center mb-7">Smart Issiqxona</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Foydalanuvchi nomi</label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="login-user"
                type="text"
                value={username}
                onBlur={() => setUTouched(true)}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="admin"
                autoComplete="username"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs text-slate-900 bg-slate-50/80 placeholder-slate-400
                  focus:outline-none focus:ring-2 transition-all
                  ${uTouched && !uOk
                    ? 'border-rose-300 focus:ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white'
                  }`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Maxfiy parol</label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="login-pass"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onBlur={() => setPTouched(true)}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-xs text-slate-900 bg-slate-50/80 placeholder-slate-400
                  focus:outline-none focus:ring-2 transition-all
                  ${pTouched && !pOk
                    ? 'border-rose-300 focus:ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              >
                {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200/70 rounded-xl text-xs font-medium text-rose-600 text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading || lockoutTimer > 0}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs
              shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer mt-1"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Kirilmoqda...
              </>
            ) : lockoutTimer > 0 ? (
              `Bloklangan (${lockoutTimer}s)`
            ) : 'Kirish'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-[11px] text-slate-400 font-medium">Smart Issiqxona v1.0.0 · ESP32 IoT</p>
    </div>
  );
}
