import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { isStoreOpen } from '../utils/formatters';
import { InstagramIcon } from './Icons';
import { 
  MapPin, 
  Clock, 
  ExternalLink, 
  Send, 
  Truck, 
  CheckCircle2 
} from 'lucide-react';

export const ContactSection: React.FC = () => {
  const storeStatus = isStoreOpen(STORE_CONFIG);

  return (
    <section id="contato" className="py-16 bg-white border-t border-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            Onde Estamos & Horários
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2B0938] tracking-tight font-['Outfit']">
            Venha nos Visitar ou Peça em Casa
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Estamos prontos para atender você com o açaí mais geladinho e cremoso da cidade.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Informações da Loja */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Card de Endereço & Horário */}
            <div className="bg-[#FAF5FF] p-6 sm:p-7 rounded-3xl border border-purple-100 space-y-6">
              
              {/* Endereço */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 font-['Outfit']">Nosso Endereço</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    {STORE_CONFIG.address.fullAddress}
                  </p>
                  <p className="text-xs text-purple-700 font-semibold mt-1">
                    CEP: {STORE_CONFIG.address.zipCode}
                  </p>
                  <a
                    href={STORE_CONFIG.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9333EA] hover:text-[#7C2D92] mt-2 group"
                  >
                    <span>Ver rota no Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>

              <div className="h-px bg-purple-100" />

              {/* Horário de Funcionamento */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 font-['Outfit']">Horário de Atendimento</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      storeStatus.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {storeStatus.isOpen ? 'Aberto Agora' : 'Fechado Agora'}
                    </span>
                  </div>
                  <ul className="text-xs sm:text-sm text-gray-600 mt-2 space-y-1">
                    <li>• {STORE_CONFIG.openingHours.weekdays}</li>
                    <li>• {STORE_CONFIG.openingHours.weekend}</li>
                  </ul>
                </div>
              </div>

              <div className="h-px bg-purple-100" />

              {/* Contatos Rápidos */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a
                  href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de mais informações sobre a loja.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp: {STORE_CONFIG.whatsappFormatted}</span>
                </a>

                <a
                  href={`https://instagram.com/${STORE_CONFIG.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  <InstagramIcon className="w-4 h-4 text-pink-600" />
                  <span>{STORE_CONFIG.instagram}</span>
                </a>
              </div>

            </div>

          </div>

          {/* Áreas de Entrega e Raio de Atendimento */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-purple-100 shadow-sm space-y-5">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 font-['Outfit']">Bairros Atendidos no Delivery</h3>
                <p className="text-xs text-gray-500">Tempo médio: {STORE_CONFIG.delivery.estimatedTime}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Entregamos com bolsa térmica lacrada nos seguintes bairros e proximidades:
            </p>

            <div className="flex flex-wrap gap-2">
              {STORE_CONFIG.delivery.coveredNeighborhoods.map((neighborhood, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 text-xs font-semibold border border-purple-100"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{neighborhood}</span>
                </span>
              ))}
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 text-xs text-amber-900">
              <p className="font-bold mb-0.5">Mora em outro bairro?</p>
              <p className="text-[11px] text-amber-800">
                Chame a gente no WhatsApp para consultar a taxa especial de entrega para sua localização!
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
