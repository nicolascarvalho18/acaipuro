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
    <div className={`bg-white rounded-2xl overflow-hidden border border-[#F0EBF5] hover:border-[#E4D9ED] transition-all flex flex-col justify-between ${
      !product.isAvailable ? 'opacity-60' : ''
    }`}>
      
      {/* Imagem do Produto */}
      <div>
        <div className="relative h-48 overflow-hidden bg-[#F4EFF8]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Selo discreto se houver */}
          {product.badge && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-0.5 rounded-md bg-[#24152D]/80 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide">
                {product.badge}
              </span>
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-[#24152D] font-['DM_Sans'] line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-[#6B6471] mt-1 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {product.description}
          </p>
        </div>
      </div>

      {/* Preço e Botão */}
      <div className="p-4 sm:p-5 pt-0 mt-auto">
        <div className="pt-3 border-t border-[#F0EBF5] flex items-center justify-between gap-2">
          
          <div>
            {isStartingPrice && (
              <span className="text-[10px] text-[#6B6471] block font-normal">
                A partir de
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-[#24152D] font-['DM_Sans']">
                {formatCurrency(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-[#6B6471] line-through">
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
                  ? 'bg-[#572185] hover:bg-[#431868] text-white'
                  : 'bg-[#F4EFF8] hover:bg-[#EADDF0] text-[#572185]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCustomizable ? 'Montar' : 'Adicionar'}</span>
            </button>
          ) : (
            <span className="text-xs text-[#6B6471] font-medium">Esgotado</span>
          )}

        </div>
      </div>

    </div>
  );
};
