import React from 'react';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const FloatingCartBar: React.FC = () => {
  const { 
    itemCount, 
    total, 
    setIsCartOpen, 
    isCartOpen, 
    isCheckoutOpen, 
    selectedProductForModal 
  } = useCart();

  // Não renderiza se o carrinho estiver vazio ou se algum modal/drawer estiver aberto
  if (itemCount === 0 || isCartOpen || isCheckoutOpen || selectedProductForModal) {
    return null;
  }

  return (
    <div className="fixed bottom-3 inset-x-3 sm:hidden z-30 animate-bounce-subtle">
      <div className="bg-[#2B0938] text-white p-3 rounded-2xl shadow-2xl border border-purple-800 flex items-center justify-between gap-3">
        
        {/* Contador e Total */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-purple-200" />
            <span className="absolute -top-1.5 -right-1.5 bg-[#EC4899] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {itemCount}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-purple-300 uppercase tracking-wider block font-semibold">Total do Pedido</span>
            <span className="text-sm font-black text-white font-['Outfit']">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Botão de Ver Sacola */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="py-2 px-4 bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span>Ver Sacola</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
};
