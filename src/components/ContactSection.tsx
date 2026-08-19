import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { InstagramIcon } from './Icons';
import { MapPin, Clock, Send, ExternalLink } from 'lucide-react';

export const ContactSection: React.FC = () => {
  return (
    <section id="contato" className="py-16 bg-white border-t border-[#F0EBF5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#6B6471] uppercase tracking-wide mb-1">
            Localização & Atendimento
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#24152D] font-['DM_Sans'] tracking-tight">
            Venha nos visitar ou peça em casa
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Informações */}
          <div className="bg-[#FCFAFD] p-6 sm:p-7 rounded-2xl border border-[#F0EBF5] space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#F4EFF8] text-[#572185] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#24152D] font-['DM_Sans']">Endereço</h3>
                <p className="text-xs sm:text-sm text-[#6B6471] mt-0.5">
                  {STORE_CONFIG.address.fullAddress}
                </p>
                <a
                  href={STORE_CONFIG.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#572185] hover:underline mt-1.5"
                >
                  <span>Abrir no Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="h-px bg-[#F0EBF5]" />

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#F4EFF8] text-[#572185] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#24152D] font-['DM_Sans']">Horário</h3>
                <p className="text-xs sm:text-sm text-[#6B6471] mt-0.5">
                  {STORE_CONFIG.openingHours.weekdays}
                </p>
                <p className="text-xs sm:text-sm text-[#6B6471]">
                  {STORE_CONFIG.openingHours.weekend}
                </p>
              </div>
            </div>

            <div className="h-px bg-[#F0EBF5]" />

            <div className="flex gap-3 pt-1">
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de mais informações.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-11 px-4 bg-[#572185] hover:bg-[#431868] text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp ({STORE_CONFIG.whatsappFormatted})</span>
              </a>

              <a
                href={`https://instagram.com/${STORE_CONFIG.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 bg-white hover:bg-[#F4EFF8] text-[#24152D] font-medium text-xs rounded-xl border border-[#F0EBF5] flex items-center justify-center gap-2 transition-all"
              >
                <InstagramIcon className="w-4 h-4 text-[#572185]" />
                <span>{STORE_CONFIG.instagram}</span>
              </a>
            </div>
          </div>

          {/* Bairros */}
          <div className="bg-[#FCFAFD] p-6 sm:p-7 rounded-2xl border border-[#F0EBF5] space-y-4">
            <h3 className="text-sm font-bold text-[#24152D] font-['DM_Sans']">
              Bairros atendidos no Delivery
            </h3>
            <p className="text-xs text-[#6B6471] leading-relaxed">
              Entregamos com rapidez e embalagem térmica lacrada nas seguintes regiões:
            </p>

            <div className="flex flex-wrap gap-2">
              {STORE_CONFIG.delivery.coveredNeighborhoods.map((neighborhood, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 rounded-lg bg-white text-[#24152D] text-xs font-medium border border-[#F0EBF5]"
                >
                  {neighborhood}
                </span>
              ))}
            </div>

            <p className="text-xs text-[#6B6471] pt-2">
              Tempo médio de entrega: <strong>{STORE_CONFIG.delivery.estimatedTime}</strong>
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
