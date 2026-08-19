import React, { useState, useMemo, useEffect } from 'react';
import type { Product, ProductSize, BaseOption, AdditionalItem, SelectedAdditional } from '../types';
import { useCart } from '../contexts/CartContext';
import { ALL_ADDITIONALS } from '../data/mockProducts';
import { formatCurrency } from '../utils/formatters';
import { X, Plus, Minus, Check } from 'lucide-react';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();

  const hasSizes = !!(product.sizes && product.sizes.length > 0);
  const hasBases = product.category === 'acai' && !!(product.bases && product.bases.length > 0);

  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(() => {
    if (!hasSizes || !product.sizes) return undefined;
    return product.sizes.find(s => s.isDefault) || product.sizes[0];
  });

  const [selectedBase, setSelectedBase] = useState<BaseOption | undefined>(() => {
    if (!hasBases || !product.bases) return undefined;
    return product.bases.find(b => b.isDefault) || product.bases[0];
  });

  const [selectedAdditionalsMap, setSelectedAdditionalsMap] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>('frutas');

  const maxFree = product.maxFreeAdditionals || 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleToggleAdditional = (additional: AdditionalItem) => {
    setSelectedAdditionalsMap(prev => {
      const currentQty = prev[additional.id] || 0;
      if (currentQty > 0) {
        const next = { ...prev };
        delete next[additional.id];
        return next;
      } else {
        return { ...prev, [additional.id]: 1 };
      }
    });
  };

  const handleIncrementAdditional = (additionalId: string) => {
    setSelectedAdditionalsMap(prev => ({
      ...prev,
      [additionalId]: (prev[additionalId] || 0) + 1
    }));
  };

  const handleDecrementAdditional = (additionalId: string) => {
    setSelectedAdditionalsMap(prev => {
      const current = prev[additionalId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[additionalId];
        return next;
      }
      return {
        ...prev,
        [additionalId]: current - 1
      };
    });
  };

  const { selectedAdditionalsList, totalAdditionalsCost, freeCount } = useMemo(() => {
    const list: SelectedAdditional[] = [];
    let freeRemaining = maxFree;
    let extraCost = 0;

    const allSelectedItems: { item: AdditionalItem; qty: number }[] = [];
    Object.entries(selectedAdditionalsMap).forEach(([id, qty]) => {
      const addObj = ALL_ADDITIONALS.find(a => a.id === id);
      if (addObj && qty > 0) {
        allSelectedItems.push({ item: addObj, qty });
      }
    });

    allSelectedItems.sort((a, b) => {
      if (a.item.isFreeEligible && !b.item.isFreeEligible) return -1;
      if (!a.item.isFreeEligible && b.item.isFreeEligible) return 1;
      return 0;
    });

    let usedFree = 0;

    allSelectedItems.forEach(({ item, qty }) => {
      for (let i = 0; i < qty; i++) {
        if (item.isFreeEligible && freeRemaining > 0) {
          freeRemaining--;
          usedFree++;
          list.push({
            additional: item,
            quantity: 1,
            isFree: true,
            unitPrice: 0,
          });
        } else {
          extraCost += item.price;
          list.push({
            additional: item,
            quantity: 1,
            isFree: false,
            unitPrice: item.price,
          });
        }
      }
    });

    const groupedList: SelectedAdditional[] = [];
    const groupedMap = new Map<string, { additional: AdditionalItem; qty: number; freeQty: number; paidQty: number; unitPrice: number }>();

    list.forEach(entry => {
      const id = entry.additional.id;
      if (!groupedMap.has(id)) {
        groupedMap.set(id, {
          additional: entry.additional,
          qty: 0,
          freeQty: 0,
          paidQty: 0,
          unitPrice: entry.additional.price
        });
      }
      const g = groupedMap.get(id)!;
      g.qty += 1;
      if (entry.isFree) g.freeQty += 1;
      else g.paidQty += 1;
    });

    groupedMap.forEach((val) => {
      if (val.freeQty > 0) {
        groupedList.push({
          additional: val.additional,
          quantity: val.freeQty,
          isFree: true,
          unitPrice: 0
        });
      }
      if (val.paidQty > 0) {
        groupedList.push({
          additional: val.additional,
          quantity: val.paidQty,
          isFree: false,
          unitPrice: val.unitPrice
        });
      }
    });

    return {
      selectedAdditionalsList: groupedList,
      totalAdditionalsCost: extraCost,
      freeCount: usedFree,
    };
  }, [selectedAdditionalsMap, maxFree]);

  // CÁLCULO PRECISO DO PREÇO UNITÁRIO
  const unitPrice = useMemo(() => {
    let base = (hasSizes && selectedSize) 
      ? selectedSize.price 
      : (product.promotionalPrice || product.price);

    if (hasBases && selectedBase && selectedBase.extraPrice) {
      base += selectedBase.extraPrice;
    }

    base += totalAdditionalsCost;
    return Number(base.toFixed(2));
  }, [hasSizes, selectedSize, hasBases, selectedBase, totalAdditionalsCost, product]);

  const totalPrice = Number((unitPrice * quantity).toFixed(2));

  const categoriesList: { id: string; label: string }[] = [
    { id: 'frutas', label: 'Frutas' },
    { id: 'cremes', label: 'Cremes' },
    { id: 'chocolates', label: 'Chocolates' },
    { id: 'crocantes', label: 'Crocantes' },
  ];

  const filteredAdditionals = useMemo(() => {
    return ALL_ADDITIONALS.filter(a => a.category === activeCategory);
  }, [activeCategory]);

  const handleAddToCart = () => {
    addToCart({
      product,
      selectedSize: hasSizes ? selectedSize : undefined,
      selectedBase: hasBases ? selectedBase : undefined,
      selectedAdditionals: selectedAdditionalsList,
      notes: notes.trim() || undefined,
      quantity,
      unitPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white w-full max-w-xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-[#ECE8F0]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#ECE8F0] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-12 h-12 rounded-xl object-cover border border-[#ECE8F0]"
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#28242A] font-['DM_Sans']">
                {product.name}
              </h2>
              <p className="text-xs text-[#726C74]">
                {product.description}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#726C74] hover:text-[#28242A] rounded-lg transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* 1. Escolha do Tamanho (Apenas se o produto tiver tamanhos) */}
          {hasSizes && product.sizes && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#28242A] uppercase tracking-wider">
                  1. Escolha o Tamanho
                </label>
                <span className="text-[11px] text-[#69318A] font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                  Obrigatório
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {product.sizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#69318A] bg-[#F3EDF6] ring-1 ring-[#69318A]'
                          : 'border-[#ECE8F0] hover:border-[#D8CFE3] bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs sm:text-sm text-[#28242A]">
                          {size.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#69318A]" />}
                      </div>
                      <span className="text-xs font-semibold text-[#69318A] block mt-1">
                        {formatCurrency(size.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Escolha da Base (Apenas para açaí) */}
          {hasBases && product.bases && (
            <div className="space-y-3 pt-4 border-t border-[#ECE8F0]">
              <label className="text-xs font-semibold text-[#28242A] uppercase tracking-wider block">
                2. Escolha a Base
              </label>

              <div className="space-y-2">
                {product.bases.map((base) => {
                  const isSelected = selectedBase?.id === base.id;
                  return (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => setSelectedBase(base)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#69318A] bg-[#F3EDF6] ring-1 ring-[#69318A]'
                          : 'border-[#ECE8F0] hover:border-[#D8CFE3] bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-[#28242A]">
                          {base.name}
                        </span>
                        {base.description && (
                          <p className="text-[11px] text-[#726C74] mt-0.5">{base.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {base.extraPrice > 0 ? (
                          <span className="text-xs font-semibold text-[#69318A]">
                            +{formatCurrency(base.extraPrice)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#726C74]">Incluso</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Adicionais e Acompanhamentos (Se o produto permitir) */}
          {product.allowsCustomization && (
            <div className="space-y-3 pt-4 border-t border-[#ECE8F0]">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-semibold text-[#28242A] uppercase tracking-wider">
                  {hasSizes ? '3. Adicionais' : 'Personalização'}
                </label>
                {maxFree > 0 && (
                  <span className="text-[11px] text-[#726C74] bg-[#FCFAF7] px-2 py-0.5 rounded-full border border-[#ECE8F0]">
                    Até <strong className="text-[#69318A]">{maxFree} grátis</strong> ({freeCount}/{maxFree} usados)
                  </span>
                )}
              </div>

              {/* Categorias de Adicionais */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {categoriesList.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-[#69318A] text-white'
                        : 'bg-[#FCFAF7] text-[#726C74] hover:bg-[#F3EDF6]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid de Adicionais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {filteredAdditionals.map(add => {
                  const qty = selectedAdditionalsMap[add.id] || 0;
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={add.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'border-[#69318A] bg-[#F3EDF6]/60' 
                          : 'border-[#ECE8F0] bg-white'
                      }`}
                    >
                      <div 
                        className="cursor-pointer flex-1"
                        onClick={() => handleToggleAdditional(add)}
                      >
                        <span className="text-xs font-bold text-[#28242A] block">{add.name}</span>
                        <span className="text-[11px] text-[#726C74]">
                          {add.isFreeEligible && maxFree > 0 ? 'Grátis no limite' : `+${formatCurrency(add.price)}`}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1.5 bg-white px-1.5 py-1 rounded-lg border border-[#ECE8F0]">
                          <button
                            type="button"
                            onClick={() => handleDecrementAdditional(add.id)}
                            className="p-1 hover:bg-[#F3EDF6] text-[#726C74] rounded cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleIncrementAdditional(add.id)}
                            className="p-1 hover:bg-[#F3EDF6] text-[#726C74] rounded cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAdditional(add)}
                          className="p-1.5 rounded-lg border border-[#ECE8F0] hover:border-[#69318A] text-[#726C74] hover:text-[#69318A] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2 pt-4 border-t border-[#ECE8F0]">
            <label className="text-xs font-semibold text-[#28242A] uppercase tracking-wider block">
              Observações do Item
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Sem granola, pouco leite condensado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none resize-none"
            />
          </div>

        </div>

        {/* Rodapé Fixo com Preço Total e Botão */}
        <div className="p-4 sm:p-5 border-t border-[#ECE8F0] bg-white flex items-center justify-between gap-4 shrink-0">
          
          {/* Quantidade */}
          <div className="flex items-center gap-2 border border-[#ECE8F0] p-1.5 rounded-xl bg-[#FCFAF7]">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="p-1.5 rounded-lg text-[#726C74] hover:bg-white disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-bold text-sm text-[#28242A]">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="p-1.5 rounded-lg text-[#726C74] hover:bg-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Adicionar */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-12 bg-[#69318A] hover:bg-[#572185] active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-between px-5 cursor-pointer shadow-md"
          >
            <span>Adicionar à sacola</span>
            <span className="font-extrabold">{formatCurrency(totalPrice)}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
