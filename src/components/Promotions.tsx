import React from 'react';
import type { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';

interface PromotionsProps {
  products: Product[];
}

export const Promotions: React.FC<PromotionsProps> = ({ products }) => {
  const { openProductModal, addToCart } = useCart();
  
  const promoProducts = products.filter(p => p.category === 'combos' || p.isPromotion).slice(0, 3);

  if (promoProducts.length === 0) return null;

  return (
    <section id="promocoes" className="py-14 sm:py-16 bg-[#FCFAF7]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#28242A] font-['DM_Sans'] tracking-tight">
            Combos da semana
          </h2>
          <p className="text-sm text-[#726C74] mt-1.5">
            Opções especiais para compartilhar ou aproveitar sozinho.
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 ${promoProducts.length >= 3 ? 'lg:grid-cols-3' : 'max-w-3xl mx-auto'} gap-6`}>
          {promoProducts.map((product) => {
            const hasDiscount = product.promotionalPrice && product.promotionalPrice < product.price;
            const currentPrice = product.promotionalPrice || product.price;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#ECE8F0] shadow-xs flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#F3EDF6]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {product.badge && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#69318A] text-white text-[11px] font-semibold tracking-wide shadow-2xs">
                          {product.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-6">
                    <h3 className="text-base font-bold text-[#28242A] font-['DM_Sans']">
                      {product.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#726C74] mt-1.5 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#49245B] font-['DM_Sans']">
                        {formatCurrency(currentPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-[#726C74] line-through">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 pt-0">
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
                    className="w-full h-11 px-4 bg-[#69318A] hover:bg-[#572185] text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    Escolher
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
