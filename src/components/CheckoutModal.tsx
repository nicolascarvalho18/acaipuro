import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { STORE_CONFIG } from '../config/storeConfig';
import type { PaymentMethod, DeliveryPaymentMethod, CardType, OrderDetails } from '../types';
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
  CheckCircle2,
  AlertCircle,
  Clock
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

  // 3 opções de pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  
  // Opções para pagamento na entrega
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<DeliveryPaymentMethod>('card_delivery');
  const [cardType, setCardType] = useState<CardType>('credit');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeForAmount, setChangeForAmount] = useState('');
  
  const [generalNotes, setGeneralNotes] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCheckoutOpen && !isSubmitting) {
        setIsCheckoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, setIsCheckoutOpen, isSubmitting]);

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

    if (paymentMethod === 'delivery' && deliveryPaymentMethod === 'cash' && needsChange) {
      const changeNum = parseFloat(changeForAmount.replace(',', '.'));
      if (isNaN(changeNum) || changeNum <= total) {
        errors.changeFor = `O valor para troco deve ser maior que ${formatCurrency(total)}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFinishOrder = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const orderId = generateOrderId();
    const orderNumber = String(Math.floor(1000 + Math.random() * 9000));

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
      deliveryPaymentMethod: paymentMethod === 'delivery' ? deliveryPaymentMethod : undefined,
      cardType: (paymentMethod === 'delivery' && deliveryPaymentMethod === 'card_delivery') ? cardType : undefined,
      changeFor: (paymentMethod === 'delivery' && deliveryPaymentMethod === 'cash' && needsChange) 
        ? parseFloat(changeForAmount.replace(',', '.')) 
        : undefined,
      generalNotes: generalNotes.trim() || undefined,
      items: cart,
      subtotal,
      deliveryFee: deliveryType === 'delivery' ? deliveryFee : 0,
      discount: 0,
      total,
      status: paymentMethod === 'delivery' ? 'delivery' : 'awaiting_payment',
      createdAt: new Date().toISOString()
    };

    // Gera o link direto e imediato do WhatsApp da loja
    const whatsappUrl = getWhatsAppUrl(order, STORE_CONFIG);

    // 1. REGISTRO EM SEGUNDO PLANO (NÃO TRAVA A INTERFACE NEM O CLIENTE)
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        deliveryType,
        address: order.address,
        paymentMethod,
        deliveryPaymentMethod: order.deliveryPaymentMethod,
        cardType: order.cardType,
        changeFor: order.changeFor,
        generalNotes: order.generalNotes,
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          size: item.selectedSize?.ml,
          base: item.selectedBase?.name,
          additionals: item.selectedAdditionals?.map(a => a.additional.name),
          notes: item.notes,
        })),
        subtotal,
        deliveryFee: deliveryType === 'delivery' ? deliveryFee : 0,
        total,
      }),
    }).catch(e => console.warn('Background save:', e));

    // 2. DISPARO INSTANTÂNEO DO PEDIDO
    // Abre o WhatsApp imediatamente para o lojista receber na hora sem demora
    window.open(whatsappUrl, '_blank');

    // Atualiza o estado da tela para confirmação instantânea
    setCompletedOrder({ ...order, orderId: orderNumber });
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
            <h2 className="text-base font-bold text-[#28242A] font-['DM_Sans']">
              {completedOrder ? 'Pedido Enviado' : 'Finalizar Pedido'}
            </h2>
            <p className="text-xs text-[#726C74] mt-0.5">
              {completedOrder ? 'Pedido enviado diretamente para o WhatsApp da loja' : 'Preencha seus dados para entrega rápida'}
            </p>
          </div>

          <button
            onClick={handleCloseAll}
            className="p-1.5 text-[#726C74] hover:text-[#28242A] rounded-lg transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        {/* TELA DE CONFIRMAÇÃO INSTANTÂNEA */}
        {completedOrder ? (
          <div className="p-6 text-center space-y-5 overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
              <CheckCircle2 className="w-8 h-8 stroke-[1.8]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#28242A] font-['DM_Sans']">
                Pedido enviado com sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-[#726C74]">
                A mensagem do pedido foi enviada diretamente para o WhatsApp da loja <strong>(13) 99150-9733</strong>.
              </p>
            </div>

            <div className="bg-[#FCFAF7] p-4 rounded-xl border border-[#ECE8F0] text-xs text-[#726C74] text-left space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
                <span>Número do pedido:</span>
                <span className="font-extrabold text-sm text-[#28242A] font-['DM_Sans']">#{completedOrder.orderId}</span>
              </div>
              <p><strong>Cliente:</strong> {completedOrder.customerName}</p>
              <p><strong>Tipo:</strong> {completedOrder.deliveryType === 'delivery' ? '🛵 Entrega' : '🏪 Retirada na loja'}</p>
              {completedOrder.deliveryType === 'delivery' && completedOrder.address && (
                <p><strong>Endereço:</strong> {completedOrder.address.street}, Nº {completedOrder.address.number} - {completedOrder.address.neighborhood}</p>
              )}
              <div className="flex items-center gap-1.5 pt-1">
                <Clock className="w-3.5 h-3.5 text-[#69318A]" />
                <span><strong>Tempo estimado:</strong> {STORE_CONFIG.delivery.estimatedTime}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#ECE8F0]">
                <span>Total:</span>
                <span className="font-bold text-sm text-[#49245B]">{formatCurrency(completedOrder.total)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={getWhatsAppUrl(completedOrder, STORE_CONFIG)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 bg-[#69318A] hover:bg-[#572185] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4 stroke-[1.8]" />
                <span>Abrir conversa no WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full py-2.5 text-xs text-[#726C74] hover:text-[#28242A] text-center cursor-pointer transition-colors"
              >
                Voltar ao cardápio
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE FINALIZAÇÃO */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* Mensagem de Erro */}
            {errorMessage && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 stroke-[1.8]" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Tipo de Recebimento */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#28242A] uppercase tracking-wider">
                Como deseja receber?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                    deliveryType === 'delivery'
                      ? 'border-[#69318A] bg-[#F3EDF6] text-[#69318A] shadow-2xs'
                      : 'border-[#ECE8F0] bg-white text-[#726C74] hover:text-[#28242A]'
                  }`}
                >
                  <Truck className="w-4 h-4 stroke-[1.8]" />
                  <span>Entrega</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                    deliveryType === 'pickup'
                      ? 'border-[#69318A] bg-[#F3EDF6] text-[#69318A] shadow-2xs'
                      : 'border-[#ECE8F0] bg-white text-[#726C74] hover:text-[#28242A]'
                  }`}
                >
                  <Store className="w-4 h-4 stroke-[1.8]" />
                  <span>Retirada</span>
                </button>
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="space-y-3 pt-3 border-t border-[#ECE8F0]">
              <h3 className="text-xs font-semibold text-[#28242A] uppercase tracking-wider">
                Seus Dados
              </h3>

              <div>
                <label className="block text-xs text-[#726C74] mb-1">
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
                  className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none transition-all ${
                    formErrors.customerName ? 'border-red-400 bg-red-50/20' : 'border-[#ECE8F0] focus:border-[#69318A]'
                  }`}
                />
                {formErrors.customerName && (
                  <p className="text-[11px] text-red-500 mt-1">{formErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-[#726C74] mb-1">
                  Telefone / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="(13) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                  className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none transition-all"
                />
              </div>
            </div>

            {/* Endereço de Entrega */}
            {deliveryType === 'delivery' && (
              <div className="space-y-3 pt-3 border-t border-[#ECE8F0]">
                <h3 className="text-xs font-semibold text-[#28242A] uppercase tracking-wider">
                  Endereço de Entrega
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-[#726C74] mb-1">
                      Rua / Avenida <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none transition-all ${
                        formErrors.street ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#69318A]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#726C74] mb-1">
                      Número <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none transition-all ${
                        formErrors.number ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#69318A]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#726C74] mb-1">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none transition-all ${
                      formErrors.neighborhood ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#69318A]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#726C74] mb-1">
                      Complemento (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Apto 12, Bloco B"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#726C74] mb-1">
                      Ponto de referência (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Próximo à praça"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO DE PAGAMENTO */}
            <div className="space-y-3 pt-3 border-t border-[#ECE8F0]">
              <h3 className="text-xs font-semibold text-[#28242A] uppercase tracking-wider">
                Forma de Pagamento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                
                {/* CARD 1: PIX */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'pix'
                      ? 'border-[#69318A] bg-[#F3EDF6] ring-1 ring-[#69318A]'
                      : 'border-[#ECE8F0] bg-white hover:border-[#D8CFE3]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${paymentMethod === 'pix' ? 'bg-[#69318A] text-white' : 'bg-[#FCFAF7] text-[#69318A]'}`}>
                      <QrCode className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <span className="text-xs font-bold text-[#28242A] font-['DM_Sans']">PIX</span>
                  </div>
                  <p className="text-[11px] text-[#726C74] leading-tight">
                    Pagamento rápido e seguro.
                  </p>
                </button>

                {/* CARD 2: CARTÃO */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card_online')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'card_online'
                      ? 'border-[#69318A] bg-[#F3EDF6] ring-1 ring-[#69318A]'
                      : 'border-[#ECE8F0] bg-white hover:border-[#D8CFE3]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${paymentMethod === 'card_online' ? 'bg-[#69318A] text-white' : 'bg-[#FCFAF7] text-[#69318A]'}`}>
                      <CreditCard className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <span className="text-xs font-bold text-[#28242A] font-['DM_Sans']">CARTÃO</span>
                  </div>
                  <p className="text-[11px] text-[#726C74] leading-tight">
                    Pague pelo cartão de crédito/débito.
                  </p>
                </button>

                {/* CARD 3: NA ENTREGA */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('delivery')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMethod === 'delivery'
                      ? 'border-[#69318A] bg-[#F3EDF6] ring-1 ring-[#69318A]'
                      : 'border-[#ECE8F0] bg-white hover:border-[#D8CFE3]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${paymentMethod === 'delivery' ? 'bg-[#69318A] text-white' : 'bg-[#FCFAF7] text-[#69318A]'}`}>
                      <Banknote className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <span className="text-xs font-bold text-[#28242A] font-['DM_Sans']">NA ENTREGA</span>
                  </div>
                  <p className="text-[11px] text-[#726C74] leading-tight">
                    Pague em dinheiro ou cartão ao receber.
                  </p>
                </button>

              </div>

              {/* Opções extras para pagamento na entrega */}
              {paymentMethod === 'delivery' && (
                <div className="p-3 bg-[#FCFAF7] rounded-xl border border-[#ECE8F0] space-y-3">
                  <p className="text-xs font-medium text-[#28242A]">Escolha como vai pagar na entrega:</p>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-[#28242A] cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryPaymentMethod"
                        checked={deliveryPaymentMethod === 'card_delivery'}
                        onChange={() => setDeliveryPaymentMethod('card_delivery')}
                      />
                      <span>Cartão (levar maquininha)</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-[#28242A] cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryPaymentMethod"
                        checked={deliveryPaymentMethod === 'cash'}
                        onChange={() => setDeliveryPaymentMethod('cash')}
                      />
                      <span>Dinheiro</span>
                    </label>
                  </div>

                  {deliveryPaymentMethod === 'card_delivery' && (
                    <div className="flex gap-4 pt-1 border-t border-[#ECE8F0]">
                      <label className="flex items-center gap-1.5 text-xs text-[#726C74] cursor-pointer">
                        <input
                          type="radio"
                          name="cardType"
                          checked={cardType === 'credit'}
                          onChange={() => setCardType('credit')}
                        />
                        <span>Crédito</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[#726C74] cursor-pointer">
                        <input
                          type="radio"
                          name="cardType"
                          checked={cardType === 'debit'}
                          onChange={() => setCardType('debit')}
                        />
                        <span>Débito</span>
                      </label>
                    </div>
                  )}

                  {deliveryPaymentMethod === 'cash' && (
                    <div className="pt-1 border-t border-[#ECE8F0] space-y-2">
                      <label className="flex items-center gap-2 text-xs text-[#28242A] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={needsChange}
                          onChange={(e) => setNeedsChange(e.target.checked)}
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
              )}
            </div>

            {/* Observações Gerais */}
            <div className="pt-3 border-t border-[#ECE8F0]">
              <label className="block text-xs font-semibold text-[#28242A] uppercase tracking-wider mb-1">
                Observações do Pedido (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Tocar o interfone 102..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none resize-none"
              ></textarea>
            </div>

            {/* Resumo de Valores */}
            <div className="p-3 bg-[#FCFAF7] rounded-xl border border-[#ECE8F0] space-y-1 text-xs text-[#726C74]">
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} itens)</span>
                <span className="font-semibold text-[#28242A]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de entrega</span>
                <span className="font-semibold text-[#28242A]">
                  {deliveryType === 'pickup' ? 'Grátis' : (deliveryFee === 0 ? 'Grátis' : formatCurrency(deliveryFee))}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#28242A] pt-1.5 border-t border-[#ECE8F0] font-['DM_Sans']">
                <span>Total a pagar</span>
                <span className="text-[#49245B]">{formatCurrency(total)}</span>
              </div>
            </div>

          </div>
        )}

        {/* Botão de Envio Instantâneo */}
        {!completedOrder && (
          <div className="p-4 sm:p-5 bg-white border-t border-[#ECE8F0] shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinishOrder}
              className="w-full h-12 px-5 bg-[#69318A] hover:bg-[#572185] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4 stroke-[2]" />
              <span>Enviar pedido agora ({formatCurrency(total)})</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
