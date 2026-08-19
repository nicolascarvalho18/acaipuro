import React, { useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Truck, 
  Store, 
  Sparkles 
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    deliveryType,
    setDeliveryType,
    subtotal,
    deliveryFee,
    total,
    itemCount,
    freeDeliveryThreshold,
    remainingForFreeDelivery,
    isFreeDelivery,
    setIsCheckoutOpen
  } = useCart();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) setIsCartOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const progressPercent = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop escuro */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-purple-100 animate-slideLeft">
          
          {/* Topo do Drawer */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B0938] via-[#3D0C5A] to-[#4A0E69] text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-['Outfit']">Minha Sacola</h2>
                <p className="text-xs text-purple-200">
                  {itemCount === 0 ? 'Nenhum item' : `${itemCount} ${itemCount === 1 ? 'item selecionado' : 'itens selecionados'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  title="Limpar sacola"
                  className="p-2 text-purple-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-xs font-semibold"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Fechar sacola"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Seletor de Tipo de Entrega */}
          <div className="p-3 bg-purple-50/70 border-b border-purple-100">
            <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-2xl border border-purple-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deliveryType === 'delivery'
                    ? 'bg-[#3D0C5A] text-white shadow-xs'
                    : 'text-gray-600 hover:text-purple-900'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Receber em Casa</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deliveryType === 'pickup'
                    ? 'bg-[#3D0C5A] text-white shadow-xs'
                    : 'text-gray-600 hover:text-purple-900'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Retirar na Loja</span>
              </button>
            </div>
          </div>

          {/* Barra de Progresso para Frete Grátis (quando tipo for Delivery) */}
          {deliveryType === 'delivery' && (
            <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-100 text-xs">
              {isFreeDelivery ? (
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Parabéns! Você ganhou <strong>FRETE GRÁTIS</strong> 🎉</span>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-gray-700 mb-1">
                    <span>Faltam <strong>{formatCurrency(remainingForFreeDelivery)}</strong> para Frete Grátis!</span>
                    <span className="font-bold text-purple-700">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full h-2 bg-amber-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de Itens no Carrinho */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center text-4xl shadow-inner">
                  🍧
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-['Outfit']">Sua sacola está vazia</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Que tal escolher um açaí delicioso e montar do seu jeito agora mesmo?
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-[#3D0C5A] text-white text-xs font-bold rounded-2xl hover:bg-[#2B0938] transition-all shadow-sm"
                >
                  Explorar Cardápio
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-white p-3.5 rounded-2xl border border-purple-100 hover:border-purple-200 shadow-xs space-y-2.5 transition-all"
                >
                  {/* Topo do Item */}
                  <div className="flex gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-purple-50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Tamanho e Base */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.selectedSize && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-bold">
                            {item.selectedSize.ml}
                          </span>
                        )}
                        {item.selectedBase && item.selectedBase.id !== 'base_tradicional' && (
                          <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-900 text-[10px] font-medium">
                            {item.selectedBase.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Adicionais Escolhidos */}
                  {item.selectedAdditionals && item.selectedAdditionals.length > 0 && (
                    <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-100 space-y-0.5">
                      <p className="font-bold text-purple-900 text-[10px] uppercase">Adicionais:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {item.selectedAdditionals.map((add, idx) => (
                          <li key={idx} className="truncate">
                            {add.quantity > 1 ? `${add.quantity}x ` : ''}
                            {add.additional.name}
                            {!add.isFree && <span className="text-purple-700 font-bold ml-1">(+{formatCurrency(add.unitPrice * add.quantity)})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Observações */}
                  {item.notes && (
                    <p className="text-[11px] text-gray-500 italic bg-amber-50/60 p-1.5 rounded-lg border border-amber-100">
                      Obs: {item.notes}
                    </p>
                  )}

                  {/* Rodapé do Item: Quantidade e Subtotal */}
                  <div className="flex items-center justify-between pt-2 border-t border-purple-50">
                    <div className="flex items-center gap-1.5 bg-purple-50 px-1.5 py-1 rounded-xl border border-purple-200/60">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-5 h-5 rounded-md bg-white hover:bg-purple-200 text-purple-950 flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black text-gray-900 w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-5 h-5 rounded-md bg-white hover:bg-purple-200 text-purple-950 flex items-center justify-center font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#2B0938] font-['Outfit']">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé Fixo com Valores e Botão Finalizar */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-purple-100 shadow-xl space-y-3 shrink-0">
              
              {/* Detalhamento de Valores */}
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal dos itens</span>
                  <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Taxa de entrega ({deliveryType === 'delivery' ? 'Delivery' : 'Retirada'})</span>
                  <span className="font-bold text-gray-900">
                    {deliveryType === 'pickup' 
                      ? 'Grátis (Retirada)' 
                      : (deliveryFee === 0 ? 'Grátis 🎉' : formatCurrency(deliveryFee))}
                  </span>
                </div>

                <div className="flex justify-between text-base font-black text-[#2B0938] pt-2 border-t border-purple-100 font-['Outfit']">
                  <span>Total do Pedido</span>
                  <span className="text-[#9333EA]">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#3D0C5A] via-[#6B21A8] to-[#9333EA] hover:from-[#2B0938] hover:to-[#7C2D92] text-white font-extrabold text-sm rounded-2xl shadow-md shadow-purple-950/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Avançar para Dados de Entrega</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 text-xs font-bold text-purple-900 hover:bg-purple-50 rounded-xl transition-colors text-center"
                >
                  Continuar comprando
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
