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
  Store 
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

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-2xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-xl flex flex-col border-l border-[#ECE8F0]">
          
          {/* Topo do Drawer */}
          <div className="p-4 sm:p-5 border-b border-[#ECE8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#542381]" />
              <h2 className="text-base font-bold text-[#26222A] font-['DM_Sans']">Sua sacola</h2>
              <span className="text-xs text-[#716B76]">({itemCount})</span>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-[#716B76] hover:text-[#26222A] transition-colors"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-[#716B76] hover:text-[#26222A] rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tipo de Recebimento */}
          <div className="p-3 bg-[#FBFAFC] border-b border-[#ECE8F0]">
            <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-[#ECE8F0]">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deliveryType === 'delivery'
                    ? 'bg-[#542381] text-white shadow-2xs'
                    : 'text-[#716B76] hover:text-[#26222A]'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Entrega</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deliveryType === 'pickup'
                    ? 'bg-[#542381] text-white shadow-2xs'
                    : 'text-[#716B76] hover:text-[#26222A]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Retirada</span>
              </button>
            </div>
          </div>

          {/* Aviso de Frete Grátis */}
          {deliveryType === 'delivery' && (
            <div className="px-4 py-2 bg-[#FBFAFC] border-b border-[#ECE8F0] text-xs text-[#716B76]">
              {isFreeDelivery ? (
                <span className="text-[#542381] font-medium">Você ganhou frete grátis.</span>
              ) : (
                <span>Faltam {formatCurrency(remainingForFreeDelivery)} para você ganhar frete grátis.</span>
              )}
            </div>
          )}

          {/* Lista de Itens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <ShoppingBag className="w-10 h-10 text-[#ECE8F0]" />
                <p className="text-sm font-medium text-[#26222A]">Sua sacola está vazia</p>
                <p className="text-xs text-[#716B76]">Escolha seus produtos no cardápio para começar.</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 px-4 py-2 bg-[#542381] text-white text-xs font-medium rounded-xl hover:bg-[#431868] transition-all"
                >
                  Ver cardápio
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-white p-3.5 rounded-xl border border-[#ECE8F0] space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#26222A] font-['DM_Sans']">
                        {item.product.name}
                      </h4>
                      {item.selectedSize && (
                        <p className="text-xs text-[#716B76]">Tamanho: {item.selectedSize.ml}</p>
                      )}
                      {item.selectedBase && item.selectedBase.id !== 'base_tradicional' && (
                        <p className="text-xs text-[#716B76]">Base: {item.selectedBase.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-[#716B76] hover:text-red-600 p-1 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.selectedAdditionals && item.selectedAdditionals.length > 0 && (
                    <p className="text-xs text-[#716B76]">
                      Adicionais: {item.selectedAdditionals.map(a => a.additional.name).join(', ')}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs text-[#716B76] italic">
                      Obs: {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#ECE8F0]">
                    <div className="flex items-center gap-1 bg-[#FBFAFC] px-1.5 py-0.5 rounded-lg border border-[#ECE8F0]">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-5 h-5 rounded text-[#26222A] hover:bg-white flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-[#26222A] w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-5 h-5 rounded text-[#26222A] hover:bg-white flex items-center justify-center font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-sm font-bold text-[#26222A] font-['DM_Sans']">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé da Sacola */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-[#ECE8F0] space-y-3 shrink-0">
              
              <div className="space-y-1.5 text-xs text-[#716B76]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#26222A]">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Taxa de entrega</span>
                  <span className="font-semibold text-[#26222A]">
                    {deliveryType === 'pickup' 
                      ? 'Grátis (Retirada)' 
                      : (deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee))}
                  </span>
                </div>

                <div className="flex justify-between text-base font-bold text-[#26222A] pt-2 border-t border-[#ECE8F0] font-['DM_Sans']">
                  <span>Total</span>
                  <span className="text-[#542381]">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full h-11 px-4 bg-[#542381] hover:bg-[#431868] text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continuar para entrega</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2 text-xs font-medium text-[#716B76] hover:text-[#26222A] text-center"
                >
                  Adicionar mais itens
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
