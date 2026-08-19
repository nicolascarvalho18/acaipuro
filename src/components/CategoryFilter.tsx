import React from 'react';
import type { ProductCategory } from '../types';
import { CATEGORIES } from '../data/mockProducts';
import { Search, X } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryCounts: Record<ProductCategory, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  categoryCounts,
}) => {
  return (
    <div className="space-y-4 mb-8">
      
      {/* Campo de Busca */}
      <div className="relative max-w-md mx-auto">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#716B76] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar produto"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-[#ECE8F0] focus:border-[#542381] focus:ring-1 focus:ring-[#542381] text-xs sm:text-sm text-[#26222A] placeholder-[#716B76] transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 p-1 text-[#716B76] hover:text-[#26222A] rounded-full"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Abas de Categorias */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar sm:justify-center px-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-[#542381] text-white shadow-2xs'
                  : 'bg-white text-[#716B76] hover:text-[#26222A] hover:bg-[#FBFAFC] border border-[#ECE8F0]'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-[#FBFAFC] text-[#542381]'
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
