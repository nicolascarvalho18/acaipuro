import React from 'react';
import type { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { ArrowRight, Tag } from 'lucide-react';

interface PromotionsProps {
  products: Product[];
}

export const Promotions: React.FC<PromotionsProps> = ({ products }) => {
  const { openProductModal, addToCart } = useCart();
  
  const promoProducts = products.filter(p => p.isPromotion || p.category === 'combos').slice(0, 3);

  if (promoProducts.length === 0) return null;

  return (
    <section id="promocoes" className="py-16 bg-[#FCFAFD]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs sm:text-sm font-medium text-[#6B6471] uppercase tracking-wide mb-1">
              Combos & Especiais
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#24152D] font-['DM_Sans'] tracking-tight">
              Ofertas da semana
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6471]">
            Combinações perfeitas com preços especiais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promoProducts.map((product) => {
            const hasDiscount = product.promotionalPrice && product.promotionalPrice < product.price;
            const currentPrice = product.promotionalPrice || product.price;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#F0EBF5] shadow-xs flex flex-col justify-between hover:border-[#E4D9ED] transition-all"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-[#F4EFF8]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {hasDiscount && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#572185] text-white text-[11px] font-semibold tracking-wide flex items-center gap-1 shadow-xs">
                          <Tag className="w-3 h-3" />
                          Oferta Especial
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="text-base font-bold text-[#24152D] font-['DM_Sans']">
                      {product.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6B6471] mt-1.5 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#24152D] font-['DM_Sans']">
                        {formatCurrency(currentPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-[#6B6471] line-through">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

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
                    className="w-full h-11 px-4 bg-[#572185] hover:bg-[#431868] text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{product.allowsCustomization ? 'Personalizar' : 'Adicionar ao pedido'}</span>
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
