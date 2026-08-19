import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { Flame, Clock, ArrowRight, Tag, Gift } from 'lucide-react';

interface PromotionsProps {
  products: Product[];
}

export const Promotions: React.FC<PromotionsProps> = ({ products }) => {
  const { openProductModal, addToCart } = useCart();
  
  // Filtra produtos que são promoção ou combos
  const promoProducts = products.filter(p => p.isPromotion || p.category === 'combos').slice(0, 3);

  // Contador regressivo simulado para criar senso de urgência autêntico
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 5, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (promoProducts.length === 0) return null;

  return (
    <section id="promocoes" className="py-14 bg-gradient-to-b from-[#FAF5FF] to-white relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho de Promoções */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-black uppercase tracking-wider mb-2">
              <Flame className="w-3.5 h-3.5 text-pink-600 fill-pink-500 animate-bounce" />
              Ofertas Especiais da Semana
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2B0938] tracking-tight font-['Outfit']">
              Combos com Desconto Exclusivo
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Peça mais e pague menos! Promoções perfeitas para dividir com quem você ama.
            </p>
          </div>

          {/* Cronômetro de Ofertas */}
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-purple-100 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Termina em:</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-black text-sm text-[#3D0C5A]">
              <span className="bg-purple-100 px-2 py-0.5 rounded-md">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span>:</span>
              <span className="bg-purple-100 px-2 py-0.5 rounded-md">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span>:</span>
              <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-md">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>

        {/* Grid de Cards de Promoção */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promoProducts.map((product) => {
            const hasDiscount = product.promotionalPrice && product.promotionalPrice < product.price;
            const discountAmount = hasDiscount ? product.price - product.promotionalPrice! : 0;
            const currentPrice = product.promotionalPrice || product.price;

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl overflow-hidden border-2 border-purple-100 hover:border-purple-300 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Foto do Combo com Selos */}
                  <div className="relative h-48 sm:h-52 overflow-hidden bg-purple-50">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    
                    {/* Selo de Destaque */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {product.badge && (
                        <span className="px-2.5 py-1 rounded-full bg-[#EC4899] text-white text-[11px] font-black shadow-md uppercase tracking-wider">
                          {product.badge}
                        </span>
                      )}
                      {hasDiscount && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black shadow-md flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Economize {formatCurrency(discountAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações do Produto */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-900 transition-colors font-['Outfit']">
                      {product.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Preço e Desconto */}
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[#2B0938] font-['Outfit']">
                        {formatCurrency(currentPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm font-semibold text-gray-400 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botão de Compra */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => {
                      if (product.allowsCustomization) {
                        openProductModal(product);
                      } else {
                        addToCart({
                          product,
                          selectedAdditionals: [],
                          quantity: 1,
                          unitPrice: currentPrice,
                        });
                      }
                    }}
                    className="w-full py-3 px-4 bg-[#3D0C5A] hover:bg-[#2B0938] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-amber-300" />
                    <span>{product.allowsCustomization ? 'Personalizar Combo' : 'Aproveitar Oferta'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
