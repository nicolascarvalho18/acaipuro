import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { STORE_CONFIG } from '../config/storeConfig';
import type { PaymentMethod, CardType, OrderDetails } from '../types';
import { 
  formatCurrency, 
  generateOrderId, 
  getWhatsAppUrl, 
  formatPhoneNumber 
} from '../utils/formatters';
import { 
  X, 
  Truck, 
  Store, 
  QrCode, 
  CreditCard, 
  Banknote, 
  Send, 
  CheckCircle,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const { 
    cart, 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    deliveryType, 
    setDeliveryType,
    subtotal, 
    deliveryFee, 
    total, 
    clearCart 
  } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [reference, setReference] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardType, setCardType] = useState<CardType>('credit');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeForAmount, setChangeForAmount] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCheckoutOpen) {
        setIsCheckoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, setIsCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!customerName.trim()) {
      errors.customerName = 'Por favor, informe seu nome';
    }

    if (deliveryType === 'delivery') {
      if (!street.trim()) errors.street = 'Informe a rua / avenida';
      if (!number.trim()) errors.number = 'Informe o número';
      if (!neighborhood.trim()) errors.neighborhood = 'Informe o bairro';
    }

    if (paymentMethod === 'cash' && needsChange) {
      const changeNum = parseFloat(changeForAmount.replace(',', '.'));
      if (isNaN(changeNum) || changeNum <= total) {
        errors.changeFor = `O valor para troco deve ser maior que ${formatCurrency(total)}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFinishOrder = () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    const orderId = generateOrderId();
    const order: OrderDetails = {
      orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      deliveryType,
      address: deliveryType === 'delivery' ? {
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        complement: complement.trim() || undefined,
        reference: reference.trim() || undefined,
      } : undefined,
      paymentMethod,
      cardType: paymentMethod === 'card_delivery' ? cardType : undefined,
      changeFor: paymentMethod === 'cash' && needsChange ? parseFloat(changeForAmount.replace(',', '.')) : undefined,
      generalNotes: generalNotes.trim() || undefined,
      items: cart,
      subtotal,
      deliveryFee,
      discount: 0,
      total,
      createdAt: new Date().toISOString()
    };

    setCompletedOrder(order);

    const whatsappUrl = getWhatsAppUrl(order, STORE_CONFIG);
    window.open(whatsappUrl, '_blank');

    clearCart();
    setIsSubmitting(false);
  };

  const handleCloseAll = () => {
    setIsCheckoutOpen(false);
    setCompletedOrder(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#ECE8F0] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Topo do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#ECE8F0] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#26222A] font-['DM_Sans']">
              {completedOrder ? 'Pedido Enviado' : 'Finalizar Pedido'}
            </h2>
            <p className="text-xs text-[#716B76] mt-0.5">
              {completedOrder ? 'Acompanhe pelo WhatsApp' : 'Preencha seus dados para entrega'}
            </p>
          </div>

          <button
            onClick={handleCloseAll}
            className="p-1.5 text-[#716B76] hover:text-[#26222A] rounded-lg transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TELA DE SUCESSO */}
        {completedOrder ? (
          <div className="p-6 text-center space-y-5 overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-[#F4EFF8] text-[#542381] flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#26222A] font-['DM_Sans']">
                Pedido gerado com sucesso
              </h3>
              <p className="text-xs text-[#716B76]">
                Identificador do pedido: <strong>{completedOrder.orderId}</strong>
              </p>
            </div>

            <div className="bg-[#FBFAFC] p-4 rounded-xl border border-[#ECE8F0] text-xs text-[#716B76] text-left space-y-1">
              <p><strong>Cliente:</strong> {completedOrder.customerName}</p>
              <p><strong>Tipo:</strong> {completedOrder.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}</p>
              <p><strong>Total:</strong> {formatCurrency(completedOrder.total)}</p>
              <p className="pt-1 text-[11px] text-[#542381]">
                A mensagem do pedido foi aberta no seu WhatsApp para confirmação da loja.
              </p>
            </div>

            <div className="space-y-2">
              <a
                href={getWhatsAppUrl(completedOrder, STORE_CONFIG)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 bg-[#542381] hover:bg-[#431868] text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Abrir WhatsApp da Loja</span>
              </a>

              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full py-2.5 text-xs text-[#716B76] hover:text-[#26222A] text-center"
              >
                Voltar ao cardápio
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE FINALIZAÇÃO */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* Tipo de Recebimento */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#26222A] uppercase tracking-wider">
                Como deseja receber?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                    deliveryType === 'delivery'
                      ? 'border-[#542381] bg-[#F4EFF8] text-[#542381]'
                      : 'border-[#ECE8F0] bg-white text-[#716B76] hover:text-[#26222A]'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Entrega</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                    deliveryType === 'pickup'
                      ? 'border-[#542381] bg-[#F4EFF8] text-[#542381]'
                      : 'border-[#ECE8F0] bg-white text-[#716B76] hover:text-[#26222A]'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>Retirada</span>
                </button>
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="space-y-3 pt-3 border-t border-[#ECE8F0]">
              <h3 className="text-xs font-semibold text-[#26222A] uppercase tracking-wider">
                Seus Dados
              </h3>

              <div>
                <label className="block text-xs text-[#716B76] mb-1">
                  Seu nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (formErrors.customerName) {
                      setFormErrors(prev => ({ ...prev, customerName: '' }));
                    }
                  }}
                  className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#26222A] outline-none ${
                    formErrors.customerName ? 'border-red-400 bg-red-50/20' : 'border-[#ECE8F0] focus:border-[#542381]'
                  }`}
                />
                {formErrors.customerName && (
                  <p className="text-[11px] text-red-500 mt-1">{formErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-[#716B76] mb-1">
                  Telefone / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="(13) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                  className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#542381] rounded-xl text-xs sm:text-sm text-[#26222A] outline-none"
                />
              </div>
            </div>

            {/* Endereço de Entrega */}
            {deliveryType === 'delivery' && (
              <div className="space-y-3 pt-3 border-t border-[#ECE8F0]">
                <h3 className="text-xs font-semibold text-[#26222A] uppercase tracking-wider">
                  Endereço de Entrega
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-[#716B76] mb-1">
                      Rua / Avenida <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#26222A] outline-none ${
                        formErrors.street ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#542381]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#716B76] mb-1">
                      Número <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#26222A] outline-none ${
                        formErrors.number ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#542381]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#716B76] mb-1">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#26222A] outline-none ${
                      formErrors.neighborhood ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#542381]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#716B76] mb-1">
                      Complemento (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Apto 12, Bloco B"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#542381] rounded-xl text-xs sm:text-sm text-[#26222A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#716B76] mb-1">
                      Ponto de referência (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Próximo à praça"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#542381] rounded-xl text-xs sm:text-sm text-[#26222A] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div className="space-y-3 pt-3 border-t border-[#ECE8F0]">
              <h3 className="text-xs font-semibold text-[#26222A] uppercase tracking-wider">
                Forma de Pagamento
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'border-[#542381] bg-[#F4EFF8] text-[#542381]'
                      : 'border-[#ECE8F0] bg-white text-[#716B76]'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card_delivery')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                    paymentMethod === 'card_delivery'
                      ? 'border-[#542381] bg-[#F4EFF8] text-[#542381]'
                      : 'border-[#ECE8F0] bg-white text-[#716B76]'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'border-[#542381] bg-[#F4EFF8] text-[#542381]'
                      : 'border-[#ECE8F0] bg-white text-[#716B76]'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Dinheiro</span>
                </button>
              </div>

              {/* Detalhes do Pagamento */}
              {paymentMethod === 'pix' && (
                <div className="p-3 bg-[#FBFAFC] rounded-xl border border-[#ECE8F0] text-xs text-[#716B76]">
                  <p>O pagamento será combinado após o envio do pedido.</p>
                </div>
              )}

              {paymentMethod === 'card_delivery' && (
                <div className="p-3 bg-[#FBFAFC] rounded-xl border border-[#ECE8F0] space-y-2">
                  <p className="text-xs text-[#716B76]">A maquininha será levada até você na entrega:</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-[#26222A] cursor-pointer">
                      <input
                        type="radio"
                        name="cardType"
                        checked={cardType === 'credit'}
                        onChange={() => setCardType('credit')}
                      />
                      <span>Crédito</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[#26222A] cursor-pointer">
                      <input
                        type="radio"
                        name="cardType"
                        checked={cardType === 'debit'}
                        onChange={() => setCardType('debit')}
                      />
                      <span>Débito</span>
                    </label>
                  </div>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="p-3 bg-[#FBFAFC] rounded-xl border border-[#ECE8F0] space-y-2">
                  <label className="flex items-center gap-2 text-xs text-[#26222A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needsChange}
                      onChange={(e) => setNeedsChange(e.target.checked)}
                      className="rounded"
                    />
                    <span>Precisa de troco?</span>
                  </label>

                  {needsChange && (
                    <div>
                      <input
                        type="text"
                        placeholder={`Ex: 50,00 (Total: ${formatCurrency(total)})`}
                        value={changeForAmount}
                        onChange={(e) => setChangeForAmount(e.target.value)}
                        className="w-full p-2 bg-white border border-[#ECE8F0] rounded-lg text-xs outline-none"
                      />
                      {formErrors.changeFor && (
                        <p className="text-[11px] text-red-500 mt-1">{formErrors.changeFor}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Observações Gerais */}
            <div className="pt-3 border-t border-[#ECE8F0]">
              <label className="block text-xs font-semibold text-[#26222A] uppercase tracking-wider mb-1">
                Observações do Pedido (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Tocar o interfone 102..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#542381] rounded-xl text-xs sm:text-sm text-[#26222A] outline-none resize-none"
              ></textarea>
            </div>

            {/* Resumo de Valores */}
            <div className="p-3 bg-[#FBFAFC] rounded-xl border border-[#ECE8F0] space-y-1 text-xs text-[#716B76]">
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} itens)</span>
                <span className="font-semibold text-[#26222A]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de entrega</span>
                <span className="font-semibold text-[#26222A]">
                  {deliveryType === 'pickup' ? 'Grátis' : (deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee))}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#26222A] pt-1.5 border-t border-[#ECE8F0] font-['DM_Sans']">
                <span>Total a pagar</span>
                <span className="text-[#542381]">{formatCurrency(total)}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#716B76] text-center">
              Ao clicar abaixo, seu pedido será enviado para o WhatsApp da loja para confirmação.
            </p>

          </div>
        )}

        {/* Botão de Finalização */}
        {!completedOrder && (
          <div className="p-4 sm:p-5 bg-white border-t border-[#ECE8F0] shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinishOrder}
              className="w-full h-11 px-5 bg-[#542381] hover:bg-[#431868] disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Enviar pedido pelo WhatsApp</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
