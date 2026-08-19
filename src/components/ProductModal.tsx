import React, { useState, useMemo, useEffect } from 'react';
import type { Product, ProductSize, BaseOption, AdditionalItem, SelectedAdditional } from '../types';
import { useCart } from '../contexts/CartContext';
import { ALL_ADDITIONALS, DEFAULT_SIZES, BASE_OPTIONS } from '../data/mockProducts';
import { formatCurrency } from '../utils/formatters';
import { X, Plus, Minus, Check } from 'lucide-react';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();

  const availableSizes = product.sizes && product.sizes.length > 0 ? product.sizes : DEFAULT_SIZES;
  const [selectedSize, setSelectedSize] = useState<ProductSize>(() => {
    return availableSizes.find(s => s.isDefault) || availableSizes[0];
  });

  const availableBases = product.bases && product.bases.length > 0 ? product.bases : BASE_OPTIONS;
  const [selectedBase, setSelectedBase] = useState<BaseOption>(() => {
    return availableBases.find(b => b.isDefault) || availableBases[0];
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

  const unitPrice = useMemo(() => {
    let price = selectedSize ? selectedSize.price : (product.promotionalPrice || product.price);
    if (selectedBase && selectedBase.extraPrice) {
      price += selectedBase.extraPrice;
    }
    price += totalAdditionalsCost;
    return price;
  }, [selectedSize, selectedBase, totalAdditionalsCost, product]);

  const totalPrice = unitPrice * quantity;

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
      selectedSize: product.sizes && product.sizes.length > 0 ? selectedSize : undefined,
      selectedBase: product.category === 'acai' ? selectedBase : undefined,
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
        <div className="p-4 sm:p-5 border-b border-[#ECE8F0] flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-[#26222A] font-['DM_Sans']">
              {product.name}
            </h2>
            <p className="text-xs text-[#716B76] mt-0.5 line-clamp-1">
              {product.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#716B76] hover:text-[#26222A] hover:bg-[#FBFAFC] rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* PASSO 1: Escolha do Tamanho */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#26222A] uppercase tracking-wider">
                  1. Escolha o tamanho
                </h3>
                <span className="text-[11px] text-[#716B76]">Obrigatório</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-[#542381] bg-[#F4EFF8] text-[#542381]'
                          : 'border-[#ECE8F0] hover:border-[#D8CFE3] bg-white text-[#26222A]'
                      }`}
                    >
                      <p className="text-sm font-bold font-['DM_Sans']">{size.ml}</p>
                      <p className="text-xs font-medium text-[#716B76] mt-0.5">{formatCurrency(size.price)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 2: Escolha da Base */}
          {product.category === 'acai' && product.bases && product.bases.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#ECE8F0]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#26222A] uppercase tracking-wider">
                  2. Escolha a base
                </h3>
                <span className="text-[11px] text-[#716B76]">Obrigatório</span>
              </div>

              <div className="space-y-2">
                {availableBases.map((base) => {
                  const isSelected = selectedBase?.id === base.id;
                  return (
                    <div
                      key={base.id}
                      onClick={() => setSelectedBase(base)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#542381] bg-[#F4EFF8]'
                          : 'border-[#ECE8F0] hover:border-[#D8CFE3] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#542381] bg-[#542381]' : 'border-[#716B76]'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-[#26222A]">{base.name}</span>
                      </div>
                      <span className="text-xs text-[#716B76]">
                        {base.extraPrice === 0 ? 'Incluso' : `+${formatCurrency(base.extraPrice)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 3: Adicionais */}
          {product.allowsCustomization && (
            <div className="space-y-3 pt-4 border-t border-[#ECE8F0]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#26222A] uppercase tracking-wider">
                  3. Escolha os adicionais
                </h3>
                {maxFree > 0 && (
                  <span className="text-xs font-medium text-[#542381]">
                    Escolha até {maxFree} adicionais grátis ({freeCount}/{maxFree})
                  </span>
                )}
              </div>

              {/* Categorias compactas */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categoriesList.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-[#542381] text-white'
                        : 'bg-[#FBFAFC] text-[#716B76] hover:bg-[#F4EFF8] border border-[#ECE8F0]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Lista compacta de adicionais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredAdditionals.map((add) => {
                  const qty = selectedAdditionalsMap[add.id] || 0;
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={add.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-[#542381] bg-[#F4EFF8]'
                          : 'border-[#ECE8F0] hover:border-[#D8CFE3] bg-white'
                      }`}
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleToggleAdditional(add)}
                      >
                        <p className="text-xs font-medium text-[#26222A] truncate">{add.name}</p>
                        <p className="text-[11px] text-[#716B76] mt-0.5">
                          {add.isFreeEligible && maxFree > 0 ? 'Grátis elegível' : `+${formatCurrency(add.price)}`}
                        </p>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-[#ECE8F0]">
                          <button
                            type="button"
                            onClick={() => handleDecrementAdditional(add.id)}
                            className="w-5 h-5 rounded text-[#26222A] hover:bg-[#FBFAFC] flex items-center justify-center font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-[#26222A] w-4 text-center">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleIncrementAdditional(add.id)}
                            className="w-5 h-5 rounded text-[#26222A] hover:bg-[#FBFAFC] flex items-center justify-center font-bold text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAdditional(add)}
                          className="w-6 h-6 rounded-lg bg-[#FBFAFC] hover:bg-[#542381] hover:text-white text-[#716B76] flex items-center justify-center transition-colors cursor-pointer"
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

          {/* PASSO 4: Observações */}
          <div className="pt-4 border-t border-[#ECE8F0]">
            <label htmlFor="modal-notes" className="block text-xs font-semibold text-[#26222A] uppercase tracking-wider mb-1.5">
              4. Observações (Opcional)
            </label>
            <textarea
              id="modal-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Leite em pó separado, morango por cima..."
              className="w-full p-2.5 bg-[#FBFAFC] border border-[#ECE8F0] rounded-xl text-xs sm:text-sm text-[#26222A] placeholder-[#716B76] focus:bg-white focus:border-[#542381] outline-none resize-none"
            ></textarea>
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#ECE8F0] flex items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-1.5 bg-[#FBFAFC] p-1 rounded-xl border border-[#ECE8F0]">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 rounded-lg bg-white hover:bg-[#ECE8F0] text-[#26222A] flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-[#26222A] w-5 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 rounded-lg bg-white hover:bg-[#ECE8F0] text-[#26222A] flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-11 px-5 bg-[#542381] hover:bg-[#431868] text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-between cursor-pointer"
          >
            <span>Adicionar ao carrinho</span>
            <span className="font-bold">{formatCurrency(totalPrice)}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
