import React, { useState, useMemo, useEffect } from 'react';
import type { Product, ProductSize, BaseOption, AdditionalItem, SelectedAdditional } from '../types';
import { useCart } from '../contexts/CartContext';
import { ALL_ADDITIONALS, DEFAULT_SIZES, BASE_OPTIONS } from '../data/mockProducts';
import { formatCurrency } from '../utils/formatters';
import { 
  X, 
  Plus, 
  Minus, 
  Check, 
  Sparkles, 
  ShoppingBag, 
  Info 
} from 'lucide-react';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();

  // Tamanhos disponíveis
  const availableSizes = product.sizes && product.sizes.length > 0 ? product.sizes : DEFAULT_SIZES;
  const [selectedSize, setSelectedSize] = useState<ProductSize>(() => {
    return availableSizes.find(s => s.isDefault) || availableSizes[0];
  });

  // Bases disponíveis
  const availableBases = product.bases && product.bases.length > 0 ? product.bases : BASE_OPTIONS;
  const [selectedBase, setSelectedBase] = useState<BaseOption>(() => {
    return availableBases.find(b => b.isDefault) || availableBases[0];
  });

  // Quantidade de adicionais selecionados: Map de ID do adicional para quantidade
  const [selectedAdditionalsMap, setSelectedAdditionalsMap] = useState<Record<string, number>>({});
  
  // Observações do item
  const [notes, setNotes] = useState('');
  
  // Quantidade do item no carrinho
  const [quantity, setQuantity] = useState(1);

  // Categoria ativa na aba de adicionais
  const [activeAddCategory, setActiveAddCategory] = useState<string>('todos');

  // Limite de adicionais gratuitos
  const maxFree = product.maxFreeAdditionals || 0;

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Bloquear scroll do body quando o modal estiver aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Manipular adição / remoção de adicionais
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

  // Cálculo inteligente de adicionais gratuitos vs extras pagos
  const { selectedAdditionalsList, totalAdditionalsCost, freeCount } = useMemo(() => {
    const list: SelectedAdditional[] = [];
    let freeRemaining = maxFree;
    let extraCost = 0;

    // Primeiro, processamos os adicionais elegíveis para gratuidade
    const allSelectedItems: { item: AdditionalItem; qty: number }[] = [];
    Object.entries(selectedAdditionalsMap).forEach(([id, qty]) => {
      const addObj = ALL_ADDITIONALS.find(a => a.id === id);
      if (addObj && qty > 0) {
        allSelectedItems.push({ item: addObj, qty });
      }
    });

    // Ordena para que os elegíveis a grátis venham primeiro
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

    // Agrupa a lista final por ID de adicional
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

  // Preço unitário do item customizado
  const unitPrice = useMemo(() => {
    let price = selectedSize ? selectedSize.price : (product.promotionalPrice || product.price);
    if (selectedBase && selectedBase.extraPrice) {
      price += selectedBase.extraPrice;
    }
    price += totalAdditionalsCost;
    return price;
  }, [selectedSize, selectedBase, totalAdditionalsCost, product]);

  const totalPrice = unitPrice * quantity;

  // Filtragem de adicionais por categoria na interface
  const categoriesList: { id: string; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'frutas', label: '🍓 Frutas' },
    { id: 'crocantes', label: '🥣 Crocantes' },
    { id: 'chocolates', label: '🍫 Chocolates' },
    { id: 'cremes', label: '🍮 Cremes' },
    { id: 'coberturas', label: '🍯 Caldas' },
    { id: 'especiais', label: '⚡ Suplementos' },
  ];

  const filteredAdditionals = useMemo(() => {
    if (activeAddCategory === 'todos') return ALL_ADDITIONALS;
    return ALL_ADDITIONALS.filter(a => a.category === activeAddCategory);
  }, [activeAddCategory]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      
      {/* Container Principal do Modal */}
      <div 
        className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-purple-100 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Botão Fechar Flutuante */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-purple-950 shadow-md flex items-center justify-center transition-all cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Topo: Imagem & Cabeçalho do Produto */}
        <div className="relative h-44 sm:h-52 bg-purple-900 shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          
          <div className="absolute bottom-3 left-4 right-12 text-white">
            {product.badge && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#EC4899] text-white text-[10px] font-black uppercase tracking-wider mb-1.5 inline-block">
                {product.badge}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-black font-['Outfit'] leading-tight">
              {product.name}
            </h2>
            <p className="text-xs text-purple-200 line-clamp-1 mt-0.5">
              {product.description}
            </p>
          </div>
        </div>

        {/* Corpo Scrollável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* PASSO 1: Escolha do Tamanho */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#3D0C5A] text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Escolha o Tamanho</h3>
                </div>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">Obrigatório</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-[#9333EA] bg-purple-50/80 shadow-sm'
                          : 'border-gray-200 hover:border-purple-200 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#9333EA] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <p className="text-xs font-bold text-gray-700">{size.name}</p>
                      <p className="text-base font-black text-[#2B0938] font-['Outfit'] my-0.5">{size.ml}</p>
                      <p className="text-xs font-extrabold text-[#9333EA]">{formatCurrency(size.price)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 2: Escolha da Base (Apenas para Açaí) */}
          {product.category === 'acai' && product.bases && product.bases.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#3D0C5A] text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Escolha a Base</h3>
                </div>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">Obrigatório</span>
              </div>

              <div className="space-y-2">
                {availableBases.map((base) => {
                  const isSelected = selectedBase?.id === base.id;
                  return (
                    <div
                      key={base.id}
                      onClick={() => setSelectedBase(base)}
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#9333EA] bg-purple-50/70 shadow-sm'
                          : 'border-gray-200 hover:border-purple-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-[#9333EA] bg-[#9333EA]' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-gray-900">{base.name}</p>
                          {base.description && (
                            <p className="text-[11px] text-gray-500 leading-tight">{base.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#9333EA] whitespace-nowrap ml-2">
                        {base.extraPrice === 0 ? 'Incluso' : `+${formatCurrency(base.extraPrice)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 3: Adicionais & Acompanhamentos */}
          {product.allowsCustomization && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#3D0C5A] text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Adicionais & Acompanhamentos</h3>
                </div>
                
                {/* Contador de Adicionais Grátis */}
                {maxFree > 0 && (
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    freeCount >= maxFree
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Grátis: {freeCount} de {maxFree} selecionados</span>
                  </div>
                )}
              </div>

              {maxFree > 0 && (
                <p className="text-xs text-gray-500 mb-3 bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    Você tem direito a <strong>{maxFree} adicionais grátis</strong> marcados com o selo verde. Adicionais extras ou especiais serão cobrados à parte automaticamente.
                  </span>
                </p>
              )}

              {/* Categorias dos Adicionais */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar mb-3">
                {categoriesList.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveAddCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeAddCategory === cat.id
                        ? 'bg-[#3D0C5A] text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Lista de Adicionais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredAdditionals.map((add) => {
                  const qty = selectedAdditionalsMap[add.id] || 0;
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={add.id}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-purple-300 bg-purple-50/70 shadow-xs'
                          : 'border-gray-200 hover:border-purple-200 bg-white'
                      }`}
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleToggleAdditional(add)}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-gray-800 truncate">{add.name}</p>
                          {add.popular && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                              Top
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {add.isFreeEligible && maxFree > 0 ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Grátis elegível
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-purple-700">
                              +{formatCurrency(add.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controle de Quantidade */}
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 bg-white px-1.5 py-1 rounded-xl border border-purple-200 shadow-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDecrementAdditional(add.id)}
                            className="w-6 h-6 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-gray-900 w-4 text-center">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleIncrementAdditional(add.id)}
                            className="w-6 h-6 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAdditional(add)}
                          className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-[#3D0C5A] hover:text-white text-gray-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASSO 4: Observações do Item */}
          <div>
            <label htmlFor="modal-notes" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Alguma observação para este item? (Opcional)
            </label>
            <textarea
              id="modal-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Leite em pó separado, pouco melado, enviar colher extra..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all resize-none"
            ></textarea>
          </div>

        </div>

        {/* Rodapé Fixo com Preço Total e Botão de Adicionar */}
        <div className="p-4 sm:p-5 bg-white border-t border-purple-100 shadow-lg shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Seletor de Quantidade do Item */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-2xl border border-purple-200">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-xl bg-white hover:bg-purple-200 text-purple-950 font-bold flex items-center justify-center shadow-xs cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-gray-900 w-6 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-purple-200 text-purple-950 font-bold flex items-center justify-center shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="sm:hidden text-right">
              <span className="text-[10px] text-gray-500 block uppercase">Subtotal</span>
              <span className="text-lg font-black text-[#2B0938] font-['Outfit']">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Botão de Adicionar ao Carrinho */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex-1 sm:max-w-md py-3.5 px-6 bg-gradient-to-r from-[#3D0C5A] via-[#6B21A8] to-[#9333EA] hover:from-[#2B0938] hover:to-[#7C2D92] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md shadow-purple-950/20 hover:shadow-lg transition-all flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              <span>Adicionar à Sacola</span>
            </div>
            <span className="text-base font-black font-['Outfit'] bg-white/20 px-2.5 py-1 rounded-xl">
              {formatCurrency(totalPrice)}
            </span>
          </button>

        </div>

      </div>

    </div>
  );
};
