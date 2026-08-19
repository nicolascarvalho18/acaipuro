import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { Clock, AlertCircle } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const { isOpen, pausedUntil, storeSettings } = useStore();

  if (!isOpen) {
    return (
      <div className="bg-red-700 text-white text-xs py-2.5 px-4 text-center font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>
          {pausedUntil 
            ? `Estamos em pausa operacional (${pausedUntil}). Voltamos em instantes!` 
            : `Estamos fechados no momento. ${storeSettings.openingHoursText}`}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#49245B] text-white/90 text-xs py-2 px-4 text-center tracking-wide font-medium flex items-center justify-center gap-2">
      <Clock className="w-3.5 h-3.5 text-[#C9A66B] shrink-0" />
      <span>Entrega em {storeSettings.estimatedDeliveryTime} • {storeSettings.openingHoursText}</span>
    </div>
  );
};
