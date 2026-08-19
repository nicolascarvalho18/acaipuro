import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="bg-[#49245B] text-white/90 text-xs py-2 px-4 text-center tracking-wide font-normal">
      <span>{STORE_CONFIG.announcementBanner?.text || "Entrega em 30 a 45 minutos • Atendimento todos os dias das 13h às 23h"}</span>
    </div>
  );
};
