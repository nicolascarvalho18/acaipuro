import React from 'react';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { ShoppingBag } from 'lucide-react';

export const FloatingCartBar: React.FC = () => {
  const { itemCount, total, setIsCartOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-40 md:hidden">
      <button
        onClick={() => setIsCartOpen(true)}
        className="w-full h-12 bg-[#542381] hover:bg-[#431868] text-white rounded-xl shadow-lg flex items-center justify-between px-5 font-medium text-sm transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <span>Ver sacola</span>
        </div>
        <span className="font-bold">{formatCurrency(total)}</span>
      </button>
    </div>
  );
};
