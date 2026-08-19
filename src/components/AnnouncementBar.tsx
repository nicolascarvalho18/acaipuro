import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { isStoreOpen } from '../utils/formatters';
import { Sparkles, Clock, MapPin, Truck } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const storeStatus = isStoreOpen(STORE_CONFIG);
  const banner = STORE_CONFIG.announcementBanner;

  return (
    <div className="bg-gradient-to-r from-[#2B0938] via-[#4A0E69] to-[#2B0938] text-white text-xs sm:text-sm py-2 px-3 border-b border-purple-900/40 relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4 text-center sm:text-left">
        
        {/* Status da Loja & Horário */}
        <div className="flex items-center gap-2 font-medium">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
            storeStatus.isOpen 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {storeStatus.message}
          </span>
          <span className="hidden md:inline text-purple-200/70">•</span>
          <span className="hidden md:inline-flex items-center gap-1 text-purple-200">
            <Clock className="w-3.5 h-3.5 text-purple-300" />
            {STORE_CONFIG.openingHours.hoursSummary}
          </span>
        </div>

        {/* Promoção / Banner Destaque */}
        {banner?.enabled && (
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px] sm:text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{banner.text}</span>
          </div>
        )}

        {/* Localização rápida */}
        <div className="hidden lg:flex items-center gap-3 text-purple-200 text-xs">
          <span className="inline-flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-purple-300" />
            Entrega em {STORE_CONFIG.delivery.estimatedTime}
          </span>
          <span className="text-purple-400">•</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-purple-300" />
            {STORE_CONFIG.address.neighborhood}, {STORE_CONFIG.address.city}
          </span>
        </div>

      </div>
    </div>
  );
};
