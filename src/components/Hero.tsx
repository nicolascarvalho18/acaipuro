import React from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { useCart } from '../contexts/CartContext';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { 
  Sparkles, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Star, 
  Flame 
} from 'lucide-react';

export const Hero: React.FC = () => {
  const { openProductModal } = useCart();

  const handleBuildAcai = () => {
    // Abre diretamente o modal do produto principal "Monte Seu Açaí"
    const monteSeuAcai = INITIAL_PRODUCTS.find(p => p.id === 'prod_acai_monte_seu') || INITIAL_PRODUCTS[0];
    openProductModal(monteSeuAcai);
  };

  const handleScrollToMenu = () => {
    const el = document.getElementById('cardapio');
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="inicio" className="relative overflow-hidden bg-gradient-to-b from-[#FAF5FF] via-white to-[#FAF5FF] pt-8 pb-16 lg:pt-14 lg:pb-24">
      
      {/* Elementos visuais de fundo sutis */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-purple-200/40 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-pink-200/30 blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Coluna de Texto & Conversão */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Tag / Badge de Qualidade */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/90 text-purple-900 border border-purple-200 text-xs sm:text-sm font-semibold shadow-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
              </span>
              <span className="text-purple-950 font-bold">O Verdadeiro Açaí do Pará</span>
              <span className="text-purple-400">•</span>
              <span className="text-purple-700 font-medium">100% Puro & Cremoso</span>
            </div>

            {/* Título Principal */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#2B0938] tracking-tight leading-[1.1] font-['Outfit']">
              O açaí que você ama, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#7C2D92] via-[#9333EA] to-[#EC4899] bg-clip-text text-transparent">
                do seu jeito.
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Monte sua tigela perfeita com açaí artesanal batido na hora, frutas fresquinhas selecionadas do dia, cremes nobres e mais de 30 acompanhamentos.
            </p>

            {/* Botões de Ação (CTAs) */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={handleBuildAcai}
                className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-[#3D0C5A] via-[#6B21A8] to-[#9333EA] hover:from-[#2B0938] hover:to-[#7C2D92] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
                <span>Montar Meu Açaí</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleScrollToMenu}
                className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-purple-50/80 text-[#3D0C5A] font-bold text-base rounded-2xl border-2 border-purple-200 hover:border-purple-300 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ver Cardápio Completo</span>
              </button>
            </div>

            {/* Informações Complementares e Prova Social Rápida */}
            <div className="pt-4 border-t border-purple-100/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              
              <div className="flex items-center gap-2 bg-white/70 p-2.5 rounded-xl border border-purple-50">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900">{STORE_CONFIG.delivery.estimatedTime}</p>
                  <p className="text-[10px] text-gray-500">Entrega rápida</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/70 p-2.5 rounded-xl border border-purple-50">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900">4.9 / 5.0</p>
                  <p className="text-[10px] text-gray-500">+2.500 pedidos</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/70 p-2.5 rounded-xl border border-purple-50">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900">100% Lacrado</p>
                  <p className="text-[10px] text-gray-500">Bolsa térmica</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/70 p-2.5 rounded-xl border border-purple-50">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900">Sem Xarope</p>
                  <p className="text-[10px] text-gray-500">Opção Zero Fit</p>
                </div>
              </div>

            </div>

          </div>

          {/* Coluna da Imagem / Visual do Produto */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            {/* Container da Imagem com Moldura Orgânica */}
            <div className="relative w-full max-w-md">
              
              {/* Círculo decorativo de brilho */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6B21A8]/20 to-[#EC4899]/20 rounded-3xl transform rotate-3 scale-105 filter blur-xs"></div>
              
              {/* Card da Imagem Principal */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/20 border-4 border-white bg-white">
                <img
                  src="https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1000&q=85"
                  alt="Tigela de açaí artesanal com morangos, bananas, kiwi e granola"
                  className="w-full h-80 sm:h-96 object-cover hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />

                {/* Overlay degradê sutil inferior */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>

                {/* Legenda do Produto em Destaque na foto */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wider">
                        Mais Pedido
                      </span>
                      <h3 className="text-lg font-extrabold mt-1 font-['Outfit']">Açaí Imperial Supreme</h3>
                      <p className="text-xs text-purple-200">Morango fresco, Leite Ninho e Nutella pura</p>
                    </div>
                    <button
                      onClick={handleBuildAcai}
                      className="px-3.5 py-2 bg-white text-purple-950 hover:bg-purple-100 rounded-xl font-black text-xs shadow-md transition-all shrink-0 cursor-pointer"
                    >
                      Pedir Agora
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Badge 1: Promoção de Frete */}
              <div className="absolute -top-4 -left-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-purple-100 flex items-center gap-2.5 animate-pulse-subtle">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg">
                  🎁
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">Frete Grátis</p>
                  <p className="text-[10px] text-gray-600">Acima de R$ {STORE_CONFIG.delivery.freeDeliveryThreshold.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              {/* Floating Badge 2: Ingredientes Frescos */}
              <div className="absolute -bottom-4 -right-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-purple-100 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  🍓
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">Frutas do Dia</p>
                  <p className="text-[10px] text-gray-600">Cortadas na hora</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

    </section>
  );
};
