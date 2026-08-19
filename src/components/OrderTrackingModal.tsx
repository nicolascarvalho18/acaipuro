import React, { useState, useEffect } from 'react';
import { formatCurrency, getWhatsAppUrl } from '../utils/formatters';
import { STORE_CONFIG } from '../config/storeConfig';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Truck, 
  PackageCheck, 
  Send, 
  ShoppingBag, 
  AlertCircle 
} from 'lucide-react';

interface OrderTrackingModalProps {
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  initialOrderData?: any;
}

const STAGES = [
  { id: 'novo', label: 'Pedido recebido', description: 'Seu pedido chegou na loja', icon: ShoppingBag },
  { id: 'confirmado', label: 'Loja confirmou', description: 'A açaiteria aceitou seu pedido', icon: CheckCircle2 },
  { id: 'em_preparo', label: 'Em preparo', description: 'Montando com seus adicionais frescos', icon: ChefHat },
  { id: 'saiu_para_entrega', label: 'Saiu para entrega', description: 'A caminho do seu endereço', icon: Truck },
  { id: 'entregue', label: 'Entregue', description: 'Bom apetite!', icon: PackageCheck },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  orderNumber,
  isOpen,
  onClose,
  initialOrderData,
}) => {
  const [order, setOrder] = useState<any>(initialOrderData);
  const [status, setStatus] = useState<string>(initialOrderData?.status || 'novo');
  const [isPolling, setIsPolling] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/orders?status=all`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const found = data.orders.find((o: any) => o.order_number === orderNumber || o.id === orderNumber);
        if (found) {
          setOrder(found);
          setStatus(found.status);
          if (found.status === 'entregue' || found.status === 'cancelado') {
            setIsPolling(false);
          }
        }
      }
    } catch (e) {
      console.warn('Status poll error:', e);
    }
  };

  useEffect(() => {
    if (isOpen && orderNumber) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, orderNumber]);

  if (!isOpen) return null;

  const currentStageIndex = STAGES.findIndex(s => s.id === status);
  const isCancelled = status === 'cancelado';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#ECE8F0] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Topo do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#ECE8F0] flex items-center justify-between bg-white shrink-0">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#69318A] bg-purple-50 px-2.5 py-0.5 rounded-full">
              Acompanhamento em Tempo Real
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#28242A] font-['DM_Sans'] mt-1">
              Pedido #{orderNumber}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#726C74] hover:text-[#28242A] rounded-xl hover:bg-[#F3EDF6] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Mensagem de Destaque */}
          {isCancelled ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center space-y-1">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
              <h3 className="text-sm font-bold text-red-900">Pedido Cancelado</h3>
              <p className="text-xs text-red-700">Este pedido foi cancelado. Entre em contato com a loja para mais informações.</p>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-[#69318A] flex items-center justify-center mx-auto border border-purple-100 shadow-2xs">
                <ChefHat className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-bold text-[#28242A] font-['DM_Sans']">
                Pedido recebido!
              </h3>
              <p className="text-xs text-[#726C74]">
                Seu pedido foi enviado diretamente para o painel da loja.
              </p>
            </div>
          )}

          {/* Timeline Visual em Tempo Real */}
          {!isCancelled && (
            <div className="bg-[#FCFAF7] p-4 sm:p-5 rounded-2xl border border-[#ECE8F0] space-y-4">
              <p className="text-xs font-bold text-[#28242A] uppercase tracking-wider font-['DM_Sans']">
                Status do Preparo
              </p>

              <div className="relative pl-6 space-y-5">
                {/* Linha vertical */}
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#ECE8F0]" />

                {STAGES.map((stage, index) => {
                  const Icon = stage.icon;
                  const isDone = currentStageIndex >= index;
                  const isCurrent = currentStageIndex === index;

                  return (
                    <div key={stage.id} className="relative flex items-start gap-3">
                      {/* Ponto na linha */}
                      <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isDone 
                          ? 'bg-[#69318A] text-white ring-4 ring-purple-100' 
                          : 'bg-white border-2 border-[#ECE8F0] text-gray-300'
                      }`}>
                        <Icon className="w-3 h-3" />
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${isCurrent ? 'text-[#69318A]' : (isDone ? 'text-[#28242A]' : 'text-gray-400')}`}>
                          {stage.label}
                          {isCurrent && <span className="ml-2 text-[10px] text-[#69318A] font-normal animate-pulse">● Em andamento</span>}
                        </p>
                        <p className="text-[11px] text-[#726C74]">{stage.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalhes do Pedido */}
          {order && (
            <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] space-y-2 text-xs text-[#726C74]">
              <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
                <span>Tempo estimado:</span>
                <span className="font-bold text-[#28242A] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#69318A]" />
                  {STORE_CONFIG.delivery.estimatedTime}
                </span>
              </div>
              <p><strong>Cliente:</strong> {order.customer_name || order.customerName}</p>
              <p><strong>Tipo:</strong> {order.fulfillment_type === 'delivery' || order.deliveryType === 'delivery' ? '🛵 Entrega' : '🏪 Retirada no balcão'}</p>
              {(order.address_street || order.address?.street) && (
                <p>
                  <strong>Endereço:</strong> {order.address_street || order.address?.street}, Nº {order.address_number || order.address?.number} - {order.address_neighborhood || order.address?.neighborhood}
                </p>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[#ECE8F0] font-['DM_Sans']">
                <span>Total:</span>
                <span className="font-extrabold text-sm text-[#49245B]">{formatCurrency(order.total || 0)}</span>
              </div>
            </div>
          )}

          {/* Botão de Contato */}
          <div className="space-y-2 pt-1">
            {order && (
              <a
                href={getWhatsAppUrl(order, STORE_CONFIG)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4 stroke-[1.8]" />
                <span>Falar com a loja pelo WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs text-[#726C74] hover:text-[#28242A] text-center cursor-pointer transition-colors"
            >
              Fechar acompanhamento
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
