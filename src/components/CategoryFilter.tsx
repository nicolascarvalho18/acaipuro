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
      
      {/* Barra de Busca */}
      <div className="relative max-w-lg mx-auto">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#6B6471] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por açaí, fruta, complemento..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-[#E4D9ED] focus:border-[#572185] focus:ring-1 focus:ring-[#572185] text-xs sm:text-sm text-[#24152D] placeholder-[#6B6471] transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 p-1 text-[#6B6471] hover:text-[#24152D] rounded-full"
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
                  ? 'bg-[#572185] text-white shadow-xs'
                  : 'bg-white text-[#6B6471] hover:text-[#24152D] hover:bg-[#F4EFF8] border border-[#F0EBF5]'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-[#F4EFF8] text-[#572185]'
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
