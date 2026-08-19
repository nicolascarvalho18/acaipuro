import React from 'react';
import { useCart } from '../contexts/CartContext';
import { CheckCircle2 } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toastMessage } = useCart();

  if (!toastMessage) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideLeft max-w-xs sm:max-w-sm pointer-events-none">
      <div className="bg-[#2B0938] text-white px-4 py-3 rounded-2xl shadow-2xl border border-purple-700/80 flex items-center gap-3 backdrop-blur-md">
        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <p className="text-xs sm:text-sm font-semibold leading-snug">
          {toastMessage}
        </p>
      </div>
    </div>
  );
};
