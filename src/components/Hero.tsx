import React from 'react';
import { useCart } from '../contexts/CartContext';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { Clock, Truck } from 'lucide-react';

export const Hero: React.FC = () => {
  const { openProductModal } = useCart();

  const handleScrollToMenu = () => {
    const el = document.getElementById('cardapio');
    if (el) {
      const offset = 80;
      const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  const handleBuildAcai = () => {
    const acaiTradicional = INITIAL_PRODUCTS.find(p => p.id === 'prod_acai_tradicional') || INITIAL_PRODUCTS[0];
    openProductModal(acaiTradicional);
  };

  return (
    <section id="inicio" className="bg-[#FBFAFC] py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Coluna Esquerda: Textos e Ações */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-[#716B76] uppercase">
              Açaí preparado na hora
            </p>

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-[#26222A] tracking-tight leading-[1.08] font-['DM_Sans']">
              Seu açaí, do seu jeito.
            </h1>

            <p className="text-base sm:text-lg text-[#716B76] leading-relaxed max-w-lg font-normal">
              Escolha o tamanho, monte com seus acompanhamentos favoritos e faça seu pedido pelo WhatsApp.
            </p>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={handleScrollToMenu}
                className="h-12 px-7 rounded-xl bg-[#572185] hover:bg-[#431868] text-white text-sm font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                Ver cardápio
              </button>

              <button
                onClick={handleBuildAcai}
                className="h-12 px-7 rounded-xl bg-white hover:bg-[#EEE8F4] text-[#572185] border border-[#ECE8F0] text-sm font-semibold tracking-wide transition-all flex items-center justify-center cursor-pointer"
              >
                Montar meu açaí
              </button>
            </div>

            {/* Informações Objetivas */}
            <div className="pt-6 border-t border-[#ECE8F0] flex flex-wrap items-center gap-6 text-xs sm:text-sm text-[#716B76]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#572185]" />
                <span>Entrega em 30 a 45 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#572185]" />
                <span>Frete grátis a partir de R$ 45</span>
              </div>
            </div>

          </div>

          {/* Coluna Direita: Fotografia Real e Profissional de Açaí */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-white border border-[#ECE8F0] shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1200&q=85"
                alt="Tigela de açaí artesanal roxo com morango fresco, banana fatiada e granola"
                className="w-full h-80 sm:h-[420px] lg:h-[480px] object-cover"
                loading="eager"
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
