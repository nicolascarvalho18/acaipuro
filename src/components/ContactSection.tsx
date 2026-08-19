import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { InstagramIcon } from './Icons';
import { MapPin, Clock, Send } from 'lucide-react';

export const ContactSection: React.FC = () => {
  return (
    <section id="contato" className="py-14 sm:py-18 bg-white border-t border-[#ECE8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#26222A] font-['DM_Sans'] tracking-tight">
            Estamos por perto
          </h2>
          <p className="text-sm text-[#716B76] mt-1.5">
            Peça pelo WhatsApp ou visite nossa loja.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
          
          {/* Informações de Atendimento */}
          <div className="bg-[#FBFAFC] p-6 rounded-2xl border border-[#ECE8F0] space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#ECE8F0] text-[#542381] flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26222A] font-['DM_Sans']">Horário de Atendimento</h3>
                <p className="text-xs sm:text-sm text-[#716B76] mt-0.5">
                  {STORE_CONFIG.openingHours.hoursSummary}
                </p>
                <p className="text-xs text-[#716B76] mt-0.5">
                  {STORE_CONFIG.openingHours.weekdays}
                </p>
              </div>
            </div>

            <div className="h-px bg-[#ECE8F0]" />

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#ECE8F0] text-[#542381] flex items-center justify-center shrink-0 shadow-2xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26222A] font-['DM_Sans']">Região de Atendimento</h3>
                <p className="text-xs sm:text-sm text-[#716B76] mt-0.5">
                  {STORE_CONFIG.address.city} • Atendimento para delivery e retirada
                </p>
              </div>
            </div>

            <div className="h-px bg-[#ECE8F0]" />

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de mais informações.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-11 px-4 bg-[#542381] hover:bg-[#431868] text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp: {STORE_CONFIG.whatsappFormatted}</span>
              </a>

              <a
                href={`https://instagram.com/${STORE_CONFIG.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 bg-white hover:bg-[#FBFAFC] text-[#26222A] font-medium text-xs rounded-xl border border-[#ECE8F0] flex items-center justify-center gap-2 transition-all"
              >
                <InstagramIcon className="w-4 h-4 text-[#542381]" />
                <span>{STORE_CONFIG.instagram}</span>
              </a>
            </div>
          </div>

          {/* Bairros Atendidos */}
          <div className="bg-[#FBFAFC] p-6 rounded-2xl border border-[#ECE8F0] space-y-4">
            <h3 className="text-sm font-bold text-[#26222A] font-['DM_Sans']">
              Bairros atendidos no Delivery
            </h3>
            <p className="text-xs text-[#716B76] leading-relaxed">
              Entregamos com rapidez e embalagem térmica nas seguintes regiões:
            </p>

            <div className="flex flex-wrap gap-2">
              {STORE_CONFIG.delivery.coveredNeighborhoods.map((neighborhood, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 rounded-lg bg-white text-[#26222A] text-xs font-medium border border-[#ECE8F0]"
                >
                  {neighborhood}
                </span>
              ))}
            </div>

            <p className="text-xs text-[#716B76] pt-2">
              Tempo estimado de entrega: <strong>{STORE_CONFIG.delivery.estimatedTime}</strong>
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
