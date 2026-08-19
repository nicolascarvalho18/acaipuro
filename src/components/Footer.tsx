import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { InstagramIcon } from './Icons';
import { 
  Heart, 
  Send, 
  MapPin, 
  Clock, 
  QrCode, 
  CreditCard, 
  DollarSign, 
  ShieldCheck 
} from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1E0427] text-white pt-16 pb-24 sm:pb-12 border-t border-purple-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-purple-900/60">
          
          {/* Coluna 1: Marca & Descrição */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#9333EA] to-[#EC4899] flex items-center justify-center shadow-md">
                <span className="text-2xl" role="img" aria-label="Açaí">🍧</span>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white font-['Outfit']">
                  {STORE_CONFIG.storeName}
                </span>
                <p className="text-[11px] text-purple-300">O melhor açaí artesanal</p>
              </div>
            </div>

            <p className="text-xs text-purple-200/80 leading-relaxed">
              {STORE_CONFIG.tagline}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <a
                href={`https://instagram.com/${STORE_CONFIG.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-purple-900/60 hover:bg-[#EC4899] text-purple-200 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>

              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-purple-900/60 hover:bg-emerald-600 text-purple-200 hover:text-white flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Links Rápidos */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-['Outfit']">
              Links Rápidos
            </h4>
            <ul className="space-y-2 text-xs text-purple-200/80">
              <li>
                <a href="#inicio" className="hover:text-pink-400 transition-colors">Início</a>
              </li>
              <li>
                <a href="#cardapio" className="hover:text-pink-400 transition-colors">Cardápio Digital</a>
              </li>
              <li>
                <a href="#promocoes" className="hover:text-pink-400 transition-colors">Combos & Promoções</a>
              </li>
              <li>
                <a href="#diferenciais" className="hover:text-pink-400 transition-colors">Diferenciais & Qualidade</a>
              </li>
              <li>
                <a href="#avaliacoes" className="hover:text-pink-400 transition-colors">Depoimentos dos Clientes</a>
              </li>
              <li>
                <a href="#contato" className="hover:text-pink-400 transition-colors">Horários & Localização</a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Horários & Contato */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-['Outfit']">
              Atendimento
            </h4>
            <div className="space-y-2 text-xs text-purple-200/80">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{STORE_CONFIG.openingHours.weekdays}<br />{STORE_CONFIG.openingHours.weekend}</span>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{STORE_CONFIG.address.fullAddress}</span>
              </div>
            </div>
          </div>

          {/* Coluna 4: Formas de Pagamento Aceitas */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-['Outfit']">
              Formas de Pagamento
            </h4>
            <p className="text-xs text-purple-200/80">
              Aceitamos pagamentos rápidos e seguros na entrega ou retirada:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-purple-900/50 text-purple-200 text-[11px] font-bold border border-purple-800 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                Pix
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-900/50 text-purple-200 text-[11px] font-bold border border-purple-800 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                Crédito / Débito
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-900/50 text-purple-200 text-[11px] font-bold border border-purple-800 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-green-400" />
                Dinheiro
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-purple-300/70 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Ambiente seguro para pedidos</span>
            </div>
          </div>

        </div>

        {/* Rodapé Inferior */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-purple-300/60">
          <p>
            © {currentYear} {STORE_CONFIG.storeName}. Todos os direitos reservados.
          </p>
          <p className="flex items-center justify-center gap-1">
            Feito com <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /> para os amantes de açaí.
          </p>
        </div>

      </div>
    </footer>
  );
};
