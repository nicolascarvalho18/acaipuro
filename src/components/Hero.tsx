import React from 'react';
import { useCart } from '../contexts/CartContext';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { Clock, Truck } from 'lucide-react';

export const Hero: React.FC = () => {
  const { openProductModal } = useCart();

  const handleScrollToMenu = () => {
    const el = document.getElementById('cardapio');
    if (el) {
      const offset = 70;
      const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  const handleBuildAcai = () => {
    const monteSeuAcai = INITIAL_PRODUCTS.find(p => p.id === 'prod_acai_monte_seu') || INITIAL_PRODUCTS[0];
    openProductModal(monteSeuAcai);
  };

  return (
    <section id="inicio" className="bg-[#FCFAFD] py-12 md:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* COLUNA ESQUERDA */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            {/* Pequeno texto acima do título */}
            <p className="text-xs sm:text-sm font-medium tracking-wide text-[#6B6471] uppercase">
              Açaí artesanal • Entrega na região
            </p>

            {/* Título Principal */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-[#24152D] tracking-tight leading-[1.08] font-['DM_Sans']">
              Seu açaí, do seu jeito.
            </h1>

            {/* Descrição */}
            <p className="text-base sm:text-lg text-[#6B6471] leading-relaxed max-w-lg font-normal">
              Escolha o tamanho, adicione seus acompanhamentos favoritos e peça pelo WhatsApp.
            </p>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={handleScrollToMenu}
                className="h-12 px-7 rounded-xl bg-[#572185] hover:bg-[#431868] text-white text-sm font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                Ver cardápio
              </button>

              <button
                onClick={handleBuildAcai}
                className="h-12 px-7 rounded-xl bg-[#F4EFF8] hover:bg-[#EADDF0] text-[#572185] text-sm font-semibold tracking-wide transition-all flex items-center justify-center cursor-pointer"
              >
                Montar meu açaí
              </button>
            </div>

            {/* Informações Objetivas */}
            <div className="pt-6 border-t border-[#F0EBF5] flex flex-wrap items-center gap-6 text-xs sm:text-sm text-[#6B6471]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#572185]" />
                <span>Entrega em 30–45 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#572185]" />
                <span>Frete grátis acima de R$ 45</span>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-white shadow-xs border border-[#F0EBF5]">
              <img
                src="https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1200&q=85"
                alt="Tigela de açaí artesanal com morangos frescos, banana fatiada e granola crocante"
                className="w-full h-80 sm:h-[420px] lg:h-[460px] object-cover"
                loading="eager"
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
