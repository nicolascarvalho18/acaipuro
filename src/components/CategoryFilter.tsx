import React from 'react';
import type { ProductCategory } from '../types';
import { CATEGORIES } from '../data/mockProducts';
import { 
  Search, 
  X, 
  Sparkles, 
  Flame, 
  Gift, 
  Crown, 
  Coffee, 
  Cake, 
  IceCream 
} from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryCounts: Record<ProductCategory, number>;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Sparkles': return Sparkles;
    case 'Flame': return Flame;
    case 'Gift': return Gift;
    case 'Crown': return Crown;
    case 'Coffee': return Coffee;
    case 'Cake': return Cake;
    case 'IceCream': return IceCream;
    default: return Sparkles;
  }
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  categoryCounts,
}) => {
  return (
    <div className="space-y-4 mb-8">
      
      {/* Barra de Busca Interativa */}
      <div className="relative max-w-xl mx-auto">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por açaí, morango, Nutella, brownie, suco..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white rounded-2xl border-2 border-purple-100 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 text-sm font-medium text-gray-800 placeholder-gray-400 shadow-sm transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Abas de Categorias com Rolagem Horizontal Suave */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar sm:justify-center scroll-smooth px-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;
          const Icon = getCategoryIcon(cat.iconName);

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-gradient-to-r from-[#3D0C5A] to-[#6B21A8] text-white border-transparent shadow-md shadow-purple-900/20 scale-[1.02]'
                  : 'bg-white text-gray-700 hover:text-purple-900 hover:bg-purple-50/70 border-purple-100 hover:border-purple-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-purple-600'}`} />
              <span>{cat.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isSelected 
                  ? 'bg-white/20 text-white' 
                  : 'bg-purple-100 text-purple-900'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
