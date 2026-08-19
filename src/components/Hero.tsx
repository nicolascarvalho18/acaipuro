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
    <section id="inicio" className="bg-[#FCFAF7] py-10 sm:py-14 md:py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Coluna Esquerda: Conteúdo */}
          <div className="lg:col-span-5 space-y-5 text-left">
            
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-[#726C74] uppercase">
              Açaí preparado na hora
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-[50px] xl:text-[54px] font-bold text-[#28242A] tracking-tight leading-[1.12] font-['DM_Sans']">
              Seu açaí, do seu jeito.
            </h1>

            <p className="text-base sm:text-lg text-[#726C74] leading-[1.6] max-w-[460px] font-normal">
              Escolha o tamanho, monte com seus acompanhamentos favoritos e faça seu pedido pelo WhatsApp.
            </p>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <button
                onClick={handleScrollToMenu}
                className="h-12 px-7 rounded-[12px] bg-[#69318A] hover:bg-[#572185] text-white text-sm font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                Ver cardápio
              </button>

              <button
                onClick={handleBuildAcai}
                className="h-12 px-7 rounded-[12px] bg-white hover:bg-[#F3EDF6] text-[#69318A] border border-[#ECE8F0] text-sm font-semibold tracking-wide transition-all flex items-center justify-center cursor-pointer"
              >
                Montar meu açaí
              </button>
            </div>

            {/* Informações Objetivas */}
            <div className="pt-5 border-t border-[#ECE8F0] flex flex-wrap items-center gap-6 text-xs sm:text-sm text-[#726C74]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#69318A] stroke-[1.8]" />
                <span>Entrega em 30 a 45 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#69318A] stroke-[1.8]" />
                <span>Frete grátis a partir de R$ 45</span>
              </div>
            </div>

          </div>

          {/* Coluna Direita: Fotografia de Açaí */}
          <div className="lg:col-span-7">
            <div className="relative rounded-[18px] overflow-hidden bg-white border border-[#ECE8F0] shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1200&q=85"
                alt="Tigela de açaí artesanal com morangos frescos, banana fatiada e granola crocante"
                className="w-full h-72 sm:h-[390px] lg:h-[450px] object-cover"
                loading="eager"
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
