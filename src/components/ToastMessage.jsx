import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const ICONS = {
  success: CheckCircleIcon,
  warn: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  error: XCircleIcon,
};

const COLORS = {
  success: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
  warn: 'text-amber-600 bg-amber-50 border-amber-200/60',
  info: 'text-blue-600 bg-blue-50 border-blue-200/60',
  error: 'text-rose-600 bg-rose-50 border-rose-200/60',
};

export default function ToastMessage({ message, type = 'success' }) {
  const [visible, setVisible] = useState(false);
  const Icon = ICONS[type] || CheckCircleIcon;
  const color = COLORS[type] || COLORS.success;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => setVisible(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className={`
        fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[999]
        flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg
        transition-all duration-300 whitespace-nowrap
        ${color}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ maxWidth: '90vw' }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
}
