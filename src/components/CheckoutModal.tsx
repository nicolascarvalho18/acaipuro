import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { STORE_CONFIG } from '../config/storeConfig';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { 
  formatCurrency, 
  formatPhoneNumber 
} from '../utils/formatters';
import { 
  X, 
  CheckCircle2, 
  Truck, 
  Store, 
  Clock, 
  AlertCircle, 
  Loader2, 
  CreditCard, 
  QrCode, 
  Banknote
} from 'lucide-react';
import type { FulfillmentType, PaymentMethod, DeliveryPaymentMethod, CardType } from '../types';

export const CheckoutModal: React.FC = () => {
  const { 
    cart, 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    subtotal, 
    deliveryFee, 
    total, 
    clearCart 
  } = useCart();

  // Dados do Formulário
  const [deliveryType, setDeliveryType] = useState<FulfillmentType>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Endereço de Entrega
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');

  // Forma de Pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<DeliveryPaymentMethod>('card_delivery');
  const [cardType, setCardType] = useState<CardType>('credit');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeForAmount, setChangeForAmount] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // Estados de Interface e Validação
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  if (!isCheckoutOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!customerName.trim()) {
      errors.customerName = 'Por favor, informe seu nome completo.';
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      errors.customerPhone = 'Informe um telefone com DDD válido.';
    }

    if (deliveryType === 'delivery') {
      if (!street.trim()) errors.street = 'Informe o nome da rua/avenida.';
      if (!number.trim()) errors.number = 'Informe o número.';
      if (!neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
    }

    if (paymentMethod === 'delivery' && deliveryPaymentMethod === 'cash' && needsChange) {
      const changeVal = parseFloat(changeForAmount.replace(',', '.'));
      if (isNaN(changeVal) || changeVal <= total) {
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

    const orderNumber = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderPayload = {
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      fulfillmentType: deliveryType,
      street: deliveryType === 'delivery' ? street.trim() : undefined,
      number: deliveryType === 'delivery' ? number.trim() : undefined,
      neighborhood: deliveryType === 'delivery' ? neighborhood.trim() : undefined,
      complement: deliveryType === 'delivery' ? complement.trim() : undefined,
      paymentMethod,
      notes: generalNotes.trim() || undefined,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        size: item.selectedSize?.ml,
        base: item.selectedBase?.name,
        additionals: item.selectedAdditionals?.map(a => a.additional.name) || [],
        notes: item.notes,
      })),
      subtotal,
      deliveryFee: deliveryType === 'delivery' ? deliveryFee : 0,
      total,
    };

    let orderSavedSuccessfully = false;
    let finalOrderNumber = orderNumber;

    // 1. Tentar salvar via API do backend
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn('API returned non-JSON response:', rawText);
      }

      if (res.ok && data && data.success) {
        orderSavedSuccessfully = true;
        finalOrderNumber = data.orderNumber || orderNumber;
      }
    } catch (apiErr) {
      console.warn('API /orders error:', apiErr);
    }

    // 2. Se a API falhou e Supabase estiver configurado no frontend, salvar direto no Supabase
    if (!orderSavedSuccessfully && isSupabaseConfigured() && supabase) {
      try {
        const { data: supaData, error: supaErr } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            customer_name: orderPayload.customerName,
            customer_phone: orderPayload.customerPhone,
            fulfillment_type: orderPayload.fulfillmentType,
            street: orderPayload.street,
            number: orderPayload.number,
            neighborhood: orderPayload.neighborhood,
            complement: orderPayload.complement,
            items: orderPayload.items,
            subtotal: orderPayload.subtotal,
            delivery_fee: orderPayload.deliveryFee,
            total: orderPayload.total,
            payment_method: orderPayload.paymentMethod,
            status: 'new',
            notes: orderPayload.notes,
          })
          .select()
          .single();

        if (!supaErr && supaData) {
          orderSavedSuccessfully = true;
          finalOrderNumber = supaData.order_number || orderNumber;
        }
      } catch (supaEx) {
        console.warn('Direct Supabase insert error:', supaEx);
      }
    }

    // 3. Resultado do processamento
    if (orderSavedSuccessfully) {
      setCompletedOrder({ ...orderPayload, orderId: finalOrderNumber });
      clearCart();
    } else {
      setErrorMessage('Não foi possível enviar seu pedido no momento. Verifique sua conexão e tente novamente.');
    }

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
              {completedOrder ? 'Pedido Enviado!' : 'Finalizar Pedido'}
            </h2>
            <p className="text-xs text-[#726C74] mt-0.5">
              {completedOrder ? 'Recebido pela açaiteria' : 'Preencha seus dados para entrega rápida'}
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

        {/* TELA DE CONFIRMAÇÃO REAL DO CLIENTE */}
        {completedOrder ? (
          <div className="p-6 text-center space-y-5 overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
              <CheckCircle2 className="w-8 h-8 stroke-[1.8]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#28242A] font-['DM_Sans']">
                Pedido enviado para a loja!
              </h3>
              <p className="text-xs sm:text-sm text-[#726C74]">
                Número do pedido: <strong className="text-[#28242A]">#{completedOrder.orderId}</strong>
              </p>
            </div>

            <div className="bg-[#FCFAF7] p-4 rounded-xl border border-[#ECE8F0] text-xs text-[#726C74] text-left space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
                <span>Cliente:</span>
                <span className="font-bold text-[#28242A]">{completedOrder.customerName}</span>
              </div>

              <div>
                <p className="font-bold text-[#28242A] mb-1">Produtos:</p>
                <div className="space-y-1">
                  {completedOrder.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[#726C74]">
                      <span>{it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}</span>
                      <span className="font-semibold text-[#28242A]">{formatCurrency(it.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#ECE8F0]">
                <span>Modalidade:</span>
                <span className="font-bold text-[#28242A]">
                  {completedOrder.fulfillmentType === 'delivery' ? '🛵 Entrega em domicílio' : '🏪 Retirada no balcão'}
                </span>
              </div>

              {completedOrder.fulfillmentType === 'delivery' && completedOrder.street && (
                <p>
                  <strong>Endereço:</strong> {completedOrder.street}, Nº {completedOrder.number} - {completedOrder.neighborhood}
                  {completedOrder.complement ? ` (${completedOrder.complement})` : ''}
                </p>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <Clock className="w-3.5 h-3.5 text-[#69318A]" />
                <span><strong>Tempo estimado:</strong> {STORE_CONFIG.delivery.estimatedTime}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#ECE8F0] font-['DM_Sans']">
                <span>Total:</span>
                <span className="font-extrabold text-sm text-[#49245B]">{formatCurrency(completedOrder.total)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseAll}
                className="w-full h-11 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Voltar ao Cardápio
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE FINALIZAÇÃO */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* Mensagem de Erro */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 stroke-[1.8]" />
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
                  Telefone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="(13) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(formatPhoneNumber(e.target.value));
                    if (formErrors.customerPhone) {
                      setFormErrors(prev => ({ ...prev, customerPhone: '' }));
                    }
                  }}
                  className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none transition-all ${
                    formErrors.customerPhone ? 'border-red-400 bg-red-50/20' : 'border-[#ECE8F0] focus:border-[#69318A]'
                  }`}
                />
                {formErrors.customerPhone && (
                  <p className="text-[11px] text-red-500 mt-1">{formErrors.customerPhone}</p>
                )}
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
                      placeholder="Ex: Av. Ana Costa"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none ${
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
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none ${
                        formErrors.number ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#69318A]'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#726C74] mb-1">
                      Bairro <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Gonzaga"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm text-[#28242A] outline-none ${
                        formErrors.neighborhood ? 'border-red-400' : 'border-[#ECE8F0] focus:border-[#69318A]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#726C74] mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      placeholder="Apt 42 / Bloco B"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="w-full p-2.5 bg-white border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div className="space-y-3 pt-3 border-t border-[#ECE8F0]">
              <h3 className="text-xs font-semibold text-[#28242A] uppercase tracking-wider">
                Forma de Pagamento
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'border-[#69318A] bg-[#F3EDF6] text-[#69318A] shadow-2xs'
                      : 'border-[#ECE8F0] bg-white text-[#726C74] hover:text-[#28242A]'
                  }`}
                >
                  <QrCode className="w-5 h-5 stroke-[1.8]" />
                  <span className="text-xs font-bold">Pix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card_online')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                    paymentMethod === 'card_online'
                      ? 'border-[#69318A] bg-[#F3EDF6] text-[#69318A] shadow-2xs'
                      : 'border-[#ECE8F0] bg-white text-[#726C74] hover:text-[#28242A]'
                  }`}
                >
                  <CreditCard className="w-5 h-5 stroke-[1.8]" />
                  <span className="text-xs font-bold">Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('delivery')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                    paymentMethod === 'delivery'
                      ? 'border-[#69318A] bg-[#F3EDF6] text-[#69318A] shadow-2xs'
                      : 'border-[#ECE8F0] bg-white text-[#726C74] hover:text-[#28242A]'
                  }`}
                >
                  <Banknote className="w-5 h-5 stroke-[1.8]" />
                  <span className="text-xs font-bold">Na Entrega</span>
                </button>
              </div>
            </div>

            {/* Observações */}
            <div className="pt-3 border-t border-[#ECE8F0]">
              <label className="block text-xs font-semibold text-[#28242A] uppercase tracking-wider mb-1">
                Observações do Pedido (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Pouco leite condensado, interfone 42..."
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

        {/* Botão de Finalização */}
        {!completedOrder && (
          <div className="p-4 sm:p-5 bg-white border-t border-[#ECE8F0] shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinishOrder}
              className="w-full h-12 px-5 bg-[#69318A] hover:bg-[#572185] active:scale-[0.99] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando pedido para a loja...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                  <span>Confirmar pedido ({formatCurrency(total)})</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
