import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { InstagramIcon } from './Icons';
import { Clock, MapPin, Send } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#2D173B] text-white/80 pt-12 pb-16 sm:pb-12 border-t border-[#412454]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-white/10">
          
          {/* Marca */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#542381] flex items-center justify-center text-white text-xs">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a9 9 0 0 1 9 9v1a9 9 0 0 1-9 9 9 9 0 0 1-9-9v-1a9 9 0 0 1 9-9z"></path>
                </svg>
              </div>
              <span className="font-bold text-base text-white font-['DM_Sans']">
                {STORE_CONFIG.storeName}
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed max-w-xs">
              {STORE_CONFIG.tagline}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://instagram.com/${STORE_CONFIG.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Atendimento */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Atendimento
            </h4>
            <div className="text-xs text-white/60 space-y-1">
              <p className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span>{STORE_CONFIG.openingHours.hoursSummary}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span>WhatsApp: {STORE_CONFIG.whatsappFormatted}</span>
              </p>
            </div>
          </div>

          {/* Navegação */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Navegação
            </h4>
            <ul className="text-xs text-white/60 space-y-1.5">
              <li><a href="#inicio" className="hover:text-white transition-colors">Início</a></li>
              <li><a href="#cardapio" className="hover:text-white transition-colors">Cardápio</a></li>
              <li><a href="#promocoes" className="hover:text-white transition-colors">Combos</a></li>
              <li><a href="#sobre" className="hover:text-white transition-colors">Sobre</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <p>© {currentYear} {STORE_CONFIG.storeName}. Todos os direitos reservados.</p>
          <p>Pedidos e entregas via WhatsApp: {STORE_CONFIG.whatsappFormatted}</p>
        </div>

      </div>
    </footer>
  );
};
