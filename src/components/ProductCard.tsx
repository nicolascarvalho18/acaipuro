import React from 'react';
import type { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { openProductModal, addToCart } = useCart();

  const isCustomizable = product.allowsCustomization;
  const hasDiscount = product.promotionalPrice && product.promotionalPrice < product.price;
  const displayPrice = product.promotionalPrice || product.price;
  const isStartingPrice = product.sizes && product.sizes.length > 1;

  const handleAction = () => {
    if (!product.isAvailable) return;
    
    if (isCustomizable || (product.sizes && product.sizes.length > 0)) {
      openProductModal(product);
    } else {
      addToCart({
        product,
        selectedAdditionals: [],
        quantity: 1,
        unitPrice: displayPrice,
      });
    }
  };

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-[#ECE8F0] shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 flex flex-col justify-between ${
      !product.isAvailable ? 'opacity-60' : ''
    }`}>
      
      {/* Imagem com proporção uniforme */}
      <div>
        <div className="relative aspect-[4/3] overflow-hidden bg-[#F3EDF6]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {product.badge && (
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-0.5 rounded-md bg-[#28242A]/85 backdrop-blur-xs text-white text-[11px] font-medium tracking-wide shadow-2xs">
                {product.badge}
              </span>
            </div>
          )}
        </div>

        {/* Textos com boa hierarquia */}
        <div className="p-5">
          <h3 className="text-base font-bold text-[#28242A] font-['DM_Sans'] line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-[#726C74] mt-1.5 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {product.description}
          </p>
        </div>
      </div>

      {/* Preço e Botão */}
      <div className="p-5 pt-0 mt-auto">
        <div className="pt-3.5 border-t border-[#ECE8F0] flex items-center justify-between gap-2">
          
          <div>
            {isStartingPrice && (
              <span className="text-[10px] text-[#726C74] block font-medium">
                A partir de
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#49245B] font-['DM_Sans']">
                {formatCurrency(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-[#726C74] line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>

          {product.isAvailable ? (
            <button
              onClick={handleAction}
              className={`h-9 px-4 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isCustomizable
                  ? 'bg-[#69318A] hover:bg-[#572185] text-white'
                  : 'bg-white hover:bg-[#F3EDF6] text-[#69318A] border border-[#ECE8F0]'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>{isCustomizable ? 'Montar' : 'Adicionar'}</span>
            </button>
          ) : (
            <span className="text-xs text-[#726C74] font-medium">Esgotado</span>
          )}

        </div>
      </div>

    </div>
  );
};
