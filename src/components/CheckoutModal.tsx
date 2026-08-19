import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { STORE_CONFIG } from '../config/storeConfig';
import type { 
  OrderDetails, 
  PaymentMethod, 
  CardType, 
  CustomerAddress 
} from '../types';
import { 
  formatCurrency, 
  generateOrderId, 
  formatPhoneNumber, 
  getWhatsAppUrl, 
  buildWhatsAppMessage 
} from '../utils/formatters';
import { 
  X, 
  Check, 
  Truck, 
  Store, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  MapPin, 
  User 
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
    clearCart,
    showToast 
  } = useCart();

  // Dados do formulário
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [reference, setReference] = useState('');
  
  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardType, setCardType] = useState<CardType>('credit');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState<string>('');
  
  // Observações gerais
  const [generalNotes, setGeneralNotes] = useState('');

  // Estado de validação e envio
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedOrderText, setCopiedOrderText] = useState(false);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCheckoutOpen && !completedOrder) {
        setIsCheckoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, setIsCheckoutOpen, completedOrder]);

  if (!isCheckoutOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerPhone(formatted);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Por favor, informe seu nome completo.';
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      newErrors.customerPhone = 'Informe um telefone de contato válido com DDD.';
    }

    if (deliveryType === 'delivery') {
      if (!street.trim()) newErrors.street = 'Informe a rua / avenida.';
      if (!number.trim()) newErrors.number = 'Informe o número.';
      if (!neighborhood.trim()) newErrors.neighborhood = 'Informe o bairro.';
    }

    if (paymentMethod === 'cash' && needsChange) {
      const changeVal = parseFloat(changeFor.replace(',', '.'));
      if (isNaN(changeVal) || changeVal <= total) {
        newErrors.changeFor = `O valor para troco deve ser maior que o total (${formatCurrency(total)}).`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('⚠️ Por favor, preencha os campos obrigatórios.');
      return;
    }

    // Gerar o ID único do pedido somente no momento da finalização
    const orderId = generateOrderId();

    const address: CustomerAddress | undefined = deliveryType === 'delivery' ? {
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      complement: complement.trim() || undefined,
      reference: reference.trim() || undefined,
    } : undefined;

    const changeForNum = paymentMethod === 'cash' && needsChange 
      ? parseFloat(changeFor.replace(',', '.')) 
      : undefined;

    const orderData: OrderDetails = {
      orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryType,
      address,
      paymentMethod,
      cardType: paymentMethod === 'card_delivery' ? cardType : undefined,
      changeFor: changeForNum,
      generalNotes: generalNotes.trim() || undefined,
      items: cart,
      subtotal,
      deliveryFee,
      discount: 0,
      total,
      createdAt: new Date().toISOString(),
    };

    setCompletedOrder(orderData);

    // Gerar URL do WhatsApp e abrir
    const whatsappUrl = getWhatsAppUrl(orderData, STORE_CONFIG);
    window.open(whatsappUrl, '_blank');

    // Celebração com confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#22c55e'],
      });
    } catch {
      // ignore
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(STORE_CONFIG.pix.key);
    setCopiedPix(true);
    showToast('Chave Pix copiada com sucesso!');
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyOrderSummary = () => {
    if (!completedOrder) return;
    const msg = buildWhatsAppMessage(completedOrder, STORE_CONFIG);
    navigator.clipboard.writeText(msg);
    setCopiedOrderText(true);
    showToast('Resumo do pedido copiado!');
    setTimeout(() => setCopiedOrderText(false), 3000);
  };

  const handleFinishAndReset = () => {
    clearCart();
    setCompletedOrder(null);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-purple-100 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* TELA DE SUCESSO / PEDIDO ENVIADO */}
        {completedOrder ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-center">
            
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-black uppercase tracking-wider">
                Pedido Gerado com Sucesso!
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2B0938] font-['Outfit'] mt-2">
                Quase lá, {completedOrder.customerName}! 🍧
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mt-1">
                Seu pedido foi formatado e direcionado para o WhatsApp da nossa loja.
              </p>
            </div>

            {/* Card com o Número do Pedido */}
            <div className="bg-[#FAF5FF] p-4 rounded-2xl border-2 border-purple-200 text-left max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Identificador do Pedido:</span>
                <span className="text-xs font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                  {completedOrder.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
                </span>
              </div>
              <p className="text-base sm:text-lg font-black font-mono text-[#3D0C5A] mt-1">
                {completedOrder.orderId}
              </p>
              <p className="text-[11px] text-gray-500 mt-2 border-t border-purple-100 pt-2">
                Total: <strong className="text-purple-900">{formatCurrency(completedOrder.total)}</strong> • Pagamento: <strong className="capitalize">{completedOrder.paymentMethod === 'pix' ? 'Pix' : completedOrder.paymentMethod === 'cash' ? 'Dinheiro' : 'Cartão'}</strong>
              </p>
            </div>

            {/* Aviso Informativo do Fluxo WhatsApp */}
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 space-y-1 max-w-md mx-auto">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Importante: Envie a mensagem no WhatsApp</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Por favor, certifique-se de clicar em <strong>"Enviar"</strong> no WhatsApp para que a nossa equipe receba seu pedido e inicie o preparo imediatamente.
              </p>
            </div>

            {/* Botões de Ação na Tela de Sucesso */}
            <div className="space-y-3 max-w-md mx-auto pt-2">
              <a
                href={getWhatsAppUrl(completedOrder, STORE_CONFIG)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Abrir WhatsApp Novamente</span>
              </a>

              <button
                type="button"
                onClick={handleCopyOrderSummary}
                className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs rounded-2xl border border-purple-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedOrderText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-purple-600" />}
                <span>{copiedOrderText ? 'Resumo Copiado!' : 'Copiar Texto do Pedido'}</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAndReset}
                className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Fazer um Novo Pedido / Voltar ao Início
              </button>
            </div>

          </div>
        ) : (
          /* FORMULÁRIO DE CHECKOUT */
          <>
            {/* Topo do Modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B0938] via-[#3D0C5A] to-[#4A0E69] text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Outfit']">Finalizar Pedido</h2>
                  <p className="text-xs text-purple-200">Preencha seus dados para envio pelo WhatsApp</p>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Fechar checkout"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Scroll */}
            <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* SEÇÃO 1: Dados do Cliente */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#2B0938] uppercase tracking-wider">
                  <User className="w-4 h-4 text-purple-700" />
                  <span>1. Seus Dados</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Ana Clara Silva"
                      className={`w-full p-3 bg-gray-50 border rounded-2xl text-xs sm:text-sm text-gray-800 outline-none transition-all ${
                        errors.customerName 
                          ? 'border-red-400 focus:border-red-500 bg-red-50/30' 
                          : 'border-gray-200 focus:border-purple-600 focus:bg-white'
                      }`}
                    />
                    {errors.customerName && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className={`w-full p-3 bg-gray-50 border rounded-2xl text-xs sm:text-sm text-gray-800 outline-none transition-all ${
                        errors.customerPhone 
                          ? 'border-red-400 focus:border-red-500 bg-red-50/30' 
                          : 'border-gray-200 focus:border-purple-600 focus:bg-white'
                      }`}
                    />
                    {errors.customerPhone && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: Forma de Recebimento */}
              <div className="space-y-3 pt-2 border-t border-purple-50">
                <div className="flex items-center gap-2 text-xs font-black text-[#2B0938] uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-purple-700" />
                  <span>2. Forma de Recebimento</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                      deliveryType === 'delivery'
                        ? 'border-[#9333EA] bg-purple-50/80 shadow-xs'
                        : 'border-gray-200 hover:border-purple-200 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      deliveryType === 'delivery' ? 'bg-[#9333EA] text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">Entrega Delivery</p>
                      <p className="text-[11px] text-purple-700 font-semibold">
                        {deliveryFee === 0 ? 'Frete Grátis' : formatCurrency(deliveryFee)}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                      deliveryType === 'pickup'
                        ? 'border-[#9333EA] bg-purple-50/80 shadow-xs'
                        : 'border-gray-200 hover:border-purple-200 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      deliveryType === 'pickup' ? 'bg-[#9333EA] text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">Retirada na Loja</p>
                      <p className="text-[11px] text-emerald-700 font-semibold">Sem taxa • ~20 min</p>
                    </div>
                  </button>
                </div>

                {/* Campos de Endereço se for Entrega */}
                {deliveryType === 'delivery' ? (
                  <div className="space-y-3 bg-purple-50/40 p-4 rounded-2xl border border-purple-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Rua / Avenida *
                        </label>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Ex: Rua das Flores"
                          className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm outline-none ${
                            errors.street ? 'border-red-400' : 'border-gray-200 focus:border-purple-600'
                          }`}
                        />
                        {errors.street && <p className="text-[10px] text-red-500 mt-0.5">{errors.street}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Número *
                        </label>
                        <input
                          type="text"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="Ex: 123"
                          className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm outline-none ${
                            errors.number ? 'border-red-400' : 'border-gray-200 focus:border-purple-600'
                          }`}
                        />
                        {errors.number && <p className="text-[10px] text-red-500 mt-0.5">{errors.number}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Bairro *
                        </label>
                        <input
                          type="text"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          placeholder="Ex: Centro / Jardim Paulista"
                          className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm outline-none ${
                            errors.neighborhood ? 'border-red-400' : 'border-gray-200 focus:border-purple-600'
                          }`}
                        />
                        {errors.neighborhood && <p className="text-[10px] text-red-500 mt-0.5">{errors.neighborhood}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Complemento (Opcional)
                        </label>
                        <input
                          type="text"
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          placeholder="Ex: Apto 42, Bloco B"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-purple-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Ponto de Referência (Opcional)
                      </label>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Ex: Próximo à padaria central"
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                    <p className="font-bold mb-1">📍 Endereço para retirada no balcão:</p>
                    <p>{STORE_CONFIG.address.fullAddress}</p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Tempo estimado para preparo: <strong>15 a 25 minutos</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* SEÇÃO 3: Forma de Pagamento */}
              <div className="space-y-3 pt-2 border-t border-purple-50">
                <div className="flex items-center gap-2 text-xs font-black text-[#2B0938] uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-purple-700" />
                  <span>3. Forma de Pagamento</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'border-[#9333EA] bg-purple-50/80 shadow-xs'
                        : 'border-gray-200 hover:border-purple-200 bg-white'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mx-auto mb-1 text-purple-700" />
                    <span className="text-xs font-bold text-gray-900 block">Pix</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Chave da Loja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card_delivery')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      paymentMethod === 'card_delivery'
                        ? 'border-[#9333EA] bg-purple-50/80 shadow-xs'
                        : 'border-gray-200 hover:border-purple-200 bg-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1 text-purple-700" />
                    <span className="text-xs font-bold text-gray-900 block">Cartão</span>
                    <span className="text-[10px] text-gray-500">Na entrega</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'border-[#9333EA] bg-purple-50/80 shadow-xs'
                        : 'border-gray-200 hover:border-purple-200 bg-white'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-purple-700" />
                    <span className="text-xs font-bold text-gray-900 block">Dinheiro</span>
                    <span className="text-[10px] text-gray-500">Com ou sem troco</span>
                  </button>
                </div>

                {/* Detalhes do Pix */}
                {paymentMethod === 'pix' && (
                  <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950">Chave Pix ({STORE_CONFIG.pix.keyType}):</span>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-900 rounded-lg border border-purple-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPix ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPix ? 'Copiado!' : 'Copiar Chave'}</span>
                      </button>
                    </div>
                    <p className="font-mono bg-white p-2 rounded-xl text-gray-800 select-all border border-purple-100 font-semibold">
                      {STORE_CONFIG.pix.key}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Favorecido: <strong>{STORE_CONFIG.pix.receiverName}</strong>
                    </p>
                  </div>
                )}

                {/* Detalhes do Cartão */}
                {paymentMethod === 'card_delivery' && (
                  <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 text-xs">
                    <p className="font-bold text-gray-800 mb-2">Selecione o tipo de cartão:</p>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                        <input
                          type="radio"
                          name="cardType"
                          checked={cardType === 'credit'}
                          onChange={() => setCardType('credit')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span>Crédito</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                        <input
                          type="radio"
                          name="cardType"
                          checked={cardType === 'debit'}
                          onChange={() => setCardType('debit')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span>Débito</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Detalhes do Dinheiro */}
                {paymentMethod === 'cash' && (
                  <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 space-y-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={needsChange}
                        onChange={(e) => setNeedsChange(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>Preciso de troco</span>
                    </label>

                    {needsChange && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Troco para quanto em dinheiro?
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value)}
                          placeholder={`Ex: ${(Math.ceil(total / 10) * 10 + 10).toFixed(2)}`}
                          className="w-full sm:w-48 p-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm outline-none focus:border-purple-600"
                        />
                        {errors.changeFor && (
                          <p className="text-[11px] text-red-500 mt-1">{errors.changeFor}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: Observações Gerais */}
              <div className="pt-2 border-t border-purple-50">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Observações Gerais do Pedido (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ex: Deixar na portaria com o porteiro Carlos, não tocar a campainha..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:border-purple-500 outline-none resize-none"
                ></textarea>
              </div>

            </form>

            {/* Rodapé Fixo do Checkout */}
            <div className="p-4 sm:p-5 bg-white border-t border-purple-100 shadow-xl space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Total com frete ({deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}):</span>
                <span className="text-xl font-black text-[#2B0938] font-['Outfit']">{formatCurrency(total)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Pedido pelo WhatsApp</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
