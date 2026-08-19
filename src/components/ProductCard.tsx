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
    <div className={`bg-white rounded-2xl overflow-hidden border border-[#ECE8F0] shadow-xs flex flex-col justify-between ${
      !product.isAvailable ? 'opacity-60' : ''
    }`}>
      
      {/* Imagem */}
      <div>
        <div className="relative h-48 overflow-hidden bg-[#FBFAFC]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {product.badge && (
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-0.5 rounded-md bg-[#26222A]/85 backdrop-blur-xs text-white text-[11px] font-medium tracking-wide">
                {product.badge}
              </span>
            </div>
          )}
        </div>

        {/* Textos */}
        <div className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-[#26222A] font-['DM_Sans'] line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-[#716B76] mt-1 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {product.description}
          </p>
        </div>
      </div>

      {/* Preço e Botão */}
      <div className="p-4 sm:p-5 pt-0 mt-auto">
        <div className="pt-3 border-t border-[#ECE8F0] flex items-center justify-between gap-2">
          
          <div>
            {isStartingPrice && (
              <span className="text-[10px] text-[#716B76] block font-normal">
                A partir de
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-[#26222A] font-['DM_Sans']">
                {formatCurrency(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-[#716B76] line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>

          {product.isAvailable ? (
            <button
              onClick={handleAction}
              className={`h-9 px-3.5 rounded-xl font-medium text-xs transition-all flex items-center gap-1 cursor-pointer ${
                isCustomizable
                  ? 'bg-[#542381] hover:bg-[#431868] text-white'
                  : 'bg-white hover:bg-[#FBFAFC] text-[#542381] border border-[#ECE8F0]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCustomizable ? 'Montar' : 'Adicionar'}</span>
            </button>
          ) : (
            <span className="text-xs text-[#716B76] font-medium">Esgotado</span>
          )}

        </div>
      </div>

    </div>
  );
};
