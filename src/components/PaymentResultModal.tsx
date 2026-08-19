import React, { useEffect, useState } from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { formatCurrency } from '../utils/formatters';
import { CheckCircle, Clock, AlertTriangle, Send, RefreshCw, ArrowLeft } from 'lucide-react';

export const PaymentResultModal: React.FC = () => {
  const [status, setStatus] = useState<'approved' | 'pending' | 'failure' | null>(null);
  const [orderId, setOrderId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status') || params.get('collection_status');
    const orderIdParam = params.get('order_id') || params.get('external_reference') || '';
    const paymentIdParam = params.get('payment_id') || params.get('collection_id') || '';

    if (statusParam === 'approved' || statusParam === 'pending' || statusParam === 'failure' || statusParam === 'rejected' || statusParam === 'null') {
      if (statusParam === 'approved') {
        setStatus('approved');
      } else if (statusParam === 'pending' || statusParam === 'in_process') {
        setStatus('pending');
      } else {
        setStatus('failure');
      }
      setOrderId(orderIdParam);
      setPaymentId(paymentIdParam);
      setIsOpen(true);
    }
  }, []);

  if (!isOpen || !status) return null;

  const handleClose = () => {
    setIsOpen(false);
    // Limpar query params da URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleSendWhatsApp = () => {
    let msg = `*AÇAÍ PURO SABOR - ATUALIZAÇÃO DO PEDIDO*\n`;
    if (orderId) msg += `*Pedido:* #${orderId}\n`;
    if (paymentId) msg += `*Identificador Mercado Pago:* ${paymentId}\n`;
    
    if (status === 'approved') {
      msg += `*Status:* Pagamento aprovado online pelo Mercado Pago.\n`;
      msg += `Gostaria de confirmar a preparação e entrega do meu pedido!`;
    } else if (status === 'pending') {
      msg += `*Status:* Pagamento pendente de processamento.\n`;
      msg += `Gostaria de verificar o status do meu pedido.`;
    } else {
      msg += `*Status:* Tive uma dúvida no pagamento online e gostaria de finalizar pelo WhatsApp.`;
    }

    const url = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#ECE8F0] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Topo com Status */}
        <div className="p-6 text-center space-y-4">
          
          {status === 'approved' && (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
                <CheckCircle className="w-8 h-8 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#28242A] font-['DM_Sans']">
                  Pagamento aprovado
                </h2>
                <p className="text-sm text-[#726C74]">
                  Seu pedido foi recebido e já está sendo preparado com todo carinho.
                </p>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100 shadow-2xs">
                <Clock className="w-8 h-8 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#28242A] font-['DM_Sans']">
                  Aguardando confirmação do pagamento
                </h2>
                <p className="text-sm text-[#726C74]">
                  A confirmação pelo Mercado Pago pode levar alguns instantes.
                </p>
              </div>
            </>
          )}

          {status === 'failure' && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100 shadow-2xs">
                <AlertTriangle className="w-8 h-8 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#28242A] font-['DM_Sans']">
                  Não foi possível concluir o pagamento
                </h2>
                <p className="text-sm text-[#726C74]">
                  Ocorreu uma recusa ou interrupção na transação. Você pode tentar novamente ou pagar na entrega.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Informações do Pedido */}
        <div className="px-6 pb-6 space-y-4">
          
          <div className="bg-[#FCFAF7] p-4 rounded-xl border border-[#ECE8F0] text-xs text-[#726C74] space-y-1.5">
            {orderId && <p><strong>Número do pedido:</strong> #{orderId}</p>}
            {paymentId && <p><strong>Transação Mercado Pago:</strong> {paymentId}</p>}
            <p><strong>Tempo estimado de entrega:</strong> {STORE_CONFIG.delivery.estimatedTime}</p>
            <p><strong>Atendimento:</strong> {STORE_CONFIG.openingHours.hoursSummary}</p>
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSendWhatsApp}
              className="w-full h-11 bg-[#69318A] hover:bg-[#572185] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4 stroke-[1.8]" />
              <span>
                {status === 'approved' 
                  ? 'Enviar detalhes pelo WhatsApp' 
                  : status === 'pending'
                  ? 'Acompanhar pelo WhatsApp'
                  : 'Finalizar pelo WhatsApp'}
              </span>
            </button>

            {status === 'failure' && (
              <button
                onClick={handleClose}
                className="w-full h-11 bg-white hover:bg-[#FCFAF7] text-[#69318A] border border-[#ECE8F0] text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Escolher outra forma de pagamento</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="w-full py-2.5 text-xs text-[#726C74] hover:text-[#28242A] text-center cursor-pointer transition-colors"
            >
              Voltar ao início
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
