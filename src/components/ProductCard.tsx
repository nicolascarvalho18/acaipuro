import React from 'react';
import type { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { Sparkles, Plus, Ban } from 'lucide-react';

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
    <div className={`bg-white rounded-3xl overflow-hidden border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${
      !product.isAvailable ? 'opacity-70 grayscale-[0.5]' : ''
    }`}>
      
      {/* Topo: Imagem com Badges e Hover Zoom */}
      <div>
        <div className="relative h-48 sm:h-52 overflow-hidden bg-purple-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Badges do Produto */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.badge && (
              <span className="px-2.5 py-1 rounded-full bg-[#3D0C5A] text-white text-[11px] font-black shadow-md uppercase tracking-wider">
                {product.badge}
              </span>
            )}
            {hasDiscount && (
              <span className="px-2.5 py-1 rounded-full bg-[#EC4899] text-white text-[11px] font-black shadow-md uppercase tracking-wider">
                Promoção 🔥
              </span>
            )}
            {!product.isAvailable && (
              <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-black shadow-md uppercase tracking-wider flex items-center gap-1">
                <Ban className="w-3 h-3" />
                Esgotado
              </span>
            )}
          </div>

          {/* Badge de Adicionais Grátis se aplicável */}
          {product.maxFreeAdditionals && product.maxFreeAdditionals > 0 && product.isAvailable && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md border border-purple-100 text-[10px] font-bold text-purple-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{product.maxFreeAdditionals} adicionais grátis</span>
            </div>
          )}
        </div>

        {/* Conteúdo: Título e Descrição */}
        <div className="p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-purple-900 transition-colors font-['Outfit'] line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {product.description}
          </p>
        </div>
      </div>

      {/* Rodapé: Preço e Botão de Ação */}
      <div className="p-4 sm:p-5 pt-0 mt-auto">
        <div className="pt-3 border-t border-purple-50 flex items-center justify-between gap-2">
          
          {/* Preço */}
          <div>
            {isStartingPrice && (
              <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                A partir de
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-[#2B0938] font-['Outfit']">
                {formatCurrency(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs font-semibold text-gray-400 line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>

          {/* Botão */}
          {product.isAvailable ? (
            <button
              onClick={handleAction}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-[0.97] ${
                isCustomizable
                  ? 'bg-[#3D0C5A] hover:bg-[#2B0938] text-white hover:shadow-md'
                  : 'bg-purple-100 hover:bg-[#3D0C5A] text-purple-900 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isCustomizable ? 'Montar' : 'Adicionar'}</span>
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 py-2 rounded-2xl font-bold text-xs bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              Indisponível
            </button>
          )}

        </div>
      </div>

    </div>
  );
};
