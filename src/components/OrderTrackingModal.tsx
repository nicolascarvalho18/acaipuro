import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency, getWhatsAppUrl } from '../utils/formatters';
import { STORE_CONFIG } from '../config/storeConfig';
import { supabase } from '../services/supabaseClient';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Truck, 
  PackageCheck, 
  Send, 
  ShoppingBag, 
  AlertCircle,
  Copy,
  Check,
  Bell,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
  Store,
  Share2
} from 'lucide-react';

interface OrderTrackingModalProps {
  orderNumber: string;
  token?: string;
  isOpen: boolean;
  onClose: () => void;
  initialOrderData?: any;
}

const DELIVERY_STAGES = [
  { id: 'new', label: 'Pedido recebido', description: 'Recebemos seu pedido. Em instantes vamos confirmar.', icon: ShoppingBag },
  { id: 'confirmed', label: 'Confirmado', description: 'Confirmado e entrou na fila de produção.', icon: CheckCircle2 },
  { id: 'preparing', label: 'Em preparo', description: 'Montando seu açaí artesanal com ingredientes frescos.', icon: ChefHat },
  { id: 'delivering', label: 'Saiu para entrega', description: 'A caminho do endereço informado.', icon: Truck },
  { id: 'done', label: 'Pedido entregue', description: 'Entregue com sucesso. Bom apetite!', icon: PackageCheck },
];

const PICKUP_STAGES = [
  { id: 'new', label: 'Pedido recebido', description: 'Recebemos seu pedido. Em instantes vamos confirmar.', icon: ShoppingBag },
  { id: 'confirmed', label: 'Confirmado', description: 'Confirmado e entrou na fila de produção.', icon: CheckCircle2 },
  { id: 'preparing', label: 'Em preparo', description: 'Montando seu açaí artesanal.', icon: ChefHat },
  { id: 'ready_for_pickup', label: 'Pronto para retirada', description: 'Seu açaí está pronto! Pode retirar no balcão.', icon: Store },
  { id: 'done', label: 'Pedido retirado', description: 'Retirado com sucesso. Obrigado pela preferência!', icon: PackageCheck },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  orderNumber,
  token,
  isOpen,
  onClose,
  initialOrderData,
}) => {
  const [order, setOrder] = useState<any>(initialOrderData);
  const [status, setStatus] = useState<string>(initialOrderData?.status || 'new');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [browserNotifAllowed, setBrowserNotifAllowed] = useState(false);
  const prevStatusRef = useRef<string>(status);

  // Som de notificação em Web Audio
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {}
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setBrowserNotifAllowed(true);
      }
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setBrowserNotifAllowed(true);
    }
  }, []);

  const fetchTracking = async () => {
    if (!orderNumber) return;
    try {
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
      const res = await fetch(`/api/orders/tracking?orderNumber=${encodeURIComponent(orderNumber)}${tokenParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          const newStatus = data.order.status;
          
          // Se o status mudou, tocar som e emitir notificação
          if (prevStatusRef.current && prevStatusRef.current !== newStatus) {
            playNotificationSound();
            if ('Notification' in window && Notification.permission === 'granted') {
              const currentStage = (data.order.fulfillment_type === 'pickup' ? PICKUP_STAGES : DELIVERY_STAGES).find(s => s.id === newStatus);
              new Notification('Açaí Puro Sabor', {
                body: currentStage?.description || `Seu pedido #${orderNumber} mudou para ${newStatus}`,
                icon: '/favicon.svg',
              });
            }
          }

          prevStatusRef.current = newStatus;
          setOrder(data.order);
          setStatus(newStatus);
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
        }
      }
    } catch (e) {
      console.warn('Tracking fetch error:', e);
    }
  };

  useEffect(() => {
    if (isOpen && orderNumber) {
      fetchTracking();
      const interval = setInterval(fetchTracking, 2500);

      // Supabase Realtime se configurado
      let channel: any = null;
      if (supabase) {
        channel = supabase
          .channel(`order_tracking_${orderNumber}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_number=eq.${orderNumber}` },
            (payload: any) => {
              if (payload.new) {
                setOrder(payload.new);
                setStatus(payload.new.status);
                playNotificationSound();
              }
            }
          )
          .subscribe();
      }

      return () => {
        clearInterval(interval);
        if (channel && supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [isOpen, orderNumber, token]);

  if (!isOpen) return null;

  const isPickup = order?.fulfillment_type === 'pickup' || order?.deliveryType === 'pickup';
  const stages = isPickup ? PICKUP_STAGES : DELIVERY_STAGES;
  const currentStageIndex = stages.findIndex(s => s.id === status);
  const isCancelled = status === 'cancelled';
  const isDone = status === 'done';

  const trackingLink = typeof window !== 'undefined'
    ? `${window.location.origin}/pedido/${orderNumber}${order?.access_token || token ? `?token=${order?.access_token || token}` : ''}`
    : '';

  const handleCopyLink = () => {
    if (navigator.clipboard && trackingLink) {
      navigator.clipboard.writeText(trackingLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#ECE8F0] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Topo do Modal */}
        <div className="p-4 sm:p-5 border-b border-[#ECE8F0] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#69318A] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                Acompanhamento em Tempo Real
              </span>
              {!browserNotifAllowed && (
                <button
                  onClick={requestNotificationPermission}
                  className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Bell className="w-3 h-3" />
                  <span>Ativar avisos</span>
                </button>
              )}
            </div>
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
          
          {/* Alerta de Status */}
          {isCancelled ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-red-900">Pedido Cancelado</h3>
                <p className="text-xs text-red-700 mt-0.5">
                  {order?.cancellation_reason ? `Motivo: ${order.cancellation_reason}` : 'Este pedido foi cancelado pela loja.'}
                </p>
              </div>
            </div>
          ) : isDone ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <PackageCheck className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-emerald-900 font-['DM_Sans']">
                {isPickup ? 'Pedido Retirado!' : 'Pedido Entregue!'}
              </h3>
              <p className="text-xs text-emerald-700">
                {isPickup ? 'Obrigado pela preferência, volte sempre!' : 'Bom apetite! Obrigado por escolher a Açaí Puro Sabor.'}
              </p>
            </div>
          ) : (
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-[#69318A] flex items-center justify-center mx-auto border border-purple-100 shadow-2xs">
                {status === 'delivering' ? (
                  <Truck className="w-6 h-6 stroke-[1.8] animate-bounce" />
                ) : status === 'ready_for_pickup' ? (
                  <Store className="w-6 h-6 stroke-[1.8] animate-pulse" />
                ) : status === 'preparing' ? (
                  <ChefHat className="w-6 h-6 stroke-[1.8] animate-spin" />
                ) : (
                  <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#28242A] font-['DM_Sans']">
                {stages[currentStageIndex]?.label || 'Pedido em processamento'}
              </h3>
              <p className="text-xs text-[#726C74] max-w-sm mx-auto">
                {stages[currentStageIndex]?.description || 'Aguarde a atualização da açaiteria.'}
              </p>
            </div>
          )}

          {/* Timeline Visual em Tempo Real (iFood Style) */}
          {!isCancelled && (
            <div className="bg-[#FCFAF7] p-4 sm:p-5 rounded-2xl border border-[#ECE8F0] space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#28242A] uppercase tracking-wider font-['DM_Sans']">
                  Linha do Tempo
                </p>
                <span className="text-[11px] text-[#69318A] font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Previsão: {order?.estimated_time || '30 a 45 min'}</span>
                </span>
              </div>

              <div className="relative pl-6 space-y-5">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#ECE8F0]" />

                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  const isCompleted = currentStageIndex >= index;
                  const isCurrent = currentStageIndex === index;

                  return (
                    <div key={stage.id} className="relative flex items-start gap-3">
                      <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-[#69318A] text-white ring-4 ring-purple-100' 
                          : 'bg-white border-2 border-[#ECE8F0] text-gray-300'
                      }`}>
                        <Icon className="w-3 h-3 stroke-[2]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold ${isCurrent ? 'text-[#69318A]' : (isCompleted ? 'text-[#28242A]' : 'text-gray-400')}`}>
                            {stage.label}
                            {isCurrent && !isDone && (
                              <span className="ml-2 text-[10px] text-[#69318A] font-normal animate-pulse">
                                ● Em andamento
                              </span>
                            )}
                          </p>
                        </div>
                        <p className="text-[11px] text-[#726C74] mt-0.5">{stage.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notificações Recebidas */}
          {notifications.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#28242A]">
                <Bell className="w-3.5 h-3.5 text-[#69318A]" />
                <span>Mensagens do Pedido</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {notifications.map((n, idx) => (
                  <div key={idx} className="p-2 bg-[#FCFAF7] rounded-xl text-[11px] border border-[#ECE8F0] flex justify-between gap-2">
                    <span className="text-[#28242A]">{n.message}</span>
                    <span className="text-[9px] text-[#726C74] shrink-0">
                      {new Date(n.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detalhes do Pedido */}
          {order && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#ECE8F0] space-y-3 text-xs text-[#726C74]">
              <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
                <span className="font-bold text-[#28242A]">Resumo do Pedido</span>
                <span className="text-[11px] text-[#69318A] font-bold">
                  {order.fulfillment_type === 'pickup' ? '🏪 Retirada no Balcão' : '🛵 Entrega em Domicílio'}
                </span>
              </div>

              <div className="space-y-2">
                <p><strong>Cliente:</strong> {order.customer_name || order.customerName}</p>
                
                {order.fulfillment_type === 'delivery' && order.street && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#69318A] shrink-0 mt-0.5" />
                    <span>
                      {order.street}, Nº {order.number} - {order.neighborhood}
                      {order.complement ? ` (${order.complement})` : ''}
                    </span>
                  </div>
                )}

                {/* Lista de Itens */}
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="pt-2 border-t border-[#ECE8F0] space-y-1.5">
                    <p className="font-bold text-[#28242A]">Itens:</p>
                    {order.items.map((it: any, idx: number) => (
                      <div key={idx} className="bg-[#FCFAF7] p-2 rounded-lg border border-[#ECE8F0] text-[11px]">
                        <div className="flex justify-between font-bold text-[#28242A]">
                          <span>{it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}</span>
                          <span>{formatCurrency(it.totalPrice || it.unitPrice * it.quantity)}</span>
                        </div>
                        {it.base && <p className="text-[#726C74]">Base: {it.base}</p>}
                        {Array.isArray(it.additionals) && it.additionals.length > 0 && (
                          <p className="text-[#726C74]">Adicionais: {it.additionals.join(', ')}</p>
                        )}
                        {it.notes && <p className="text-amber-800 italic">Obs: {it.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Valores */}
                <div className="pt-2 border-t border-[#ECE8F0] space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(order.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de entrega:</span>
                    <span>{order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : 'Grátis'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-[#28242A] pt-1 border-t border-[#ECE8F0] font-['DM_Sans']">
                    <span>Total a pagar:</span>
                    <span className="text-[#49245B] text-base">{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <span>Pagamento:</span>
                  <span className="font-bold uppercase text-[#28242A]">
                    {order.payment_method === 'pix' ? 'Pix' : (order.payment_method === 'delivery' ? 'Na entrega' : 'Cartão Online')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Link Seguro de Acompanhamento */}
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#69318A] flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                <span>Link do Pedido</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[10px] font-bold text-[#69318A] hover:text-[#572185] flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-purple-200"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-[#726C74]">
              Você pode fechar o navegador e consultar o status a qualquer momento usando este link.
            </p>
          </div>

          {/* Botão de Contato WhatsApp */}
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
              Voltar ao cardápio
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
