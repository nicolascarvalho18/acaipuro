import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency } from '../utils/formatters';
import { 
  X, 
  RefreshCw, 
  Lock, 
  Volume2, 
  VolumeX, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  ChefHat, 
  XCircle, 
  Send, 
  Phone, 
  AlertTriangle,
  Search
} from 'lucide-react';

interface OrderItem {
  name: string;
  size?: string;
  base?: string;
  additionals?: string[];
  notes?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface AdminOrder {
  id?: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  delivery_type: 'delivery' | 'pickup';
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_complement?: string;
  address_reference?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'pix' | 'card_online' | 'delivery';
  delivery_payment_method?: 'cash' | 'card_delivery';
  card_type?: 'credit' | 'debit';
  change_for?: number;
  payment_status: 'pending' | 'approved' | 'paid_on_delivery' | 'rejected';
  order_status: 'novo' | 'confirmado' | 'em_preparo' | 'saiu_para_entrega' | 'entregue' | 'cancelado';
  general_notes?: string;
  whatsapp_notification_status: 'sent' | 'failed' | 'pending' | 'not_configured';
  created_at: string;
}

const STATUS_CONFIG: Record<AdminOrder['order_status'], { label: string; bg: string; text: string; icon: React.ComponentType<any> }> = {
  novo: { label: 'Novo pedido', bg: 'bg-purple-100', text: 'text-[#69318A]', icon: ShoppingBag },
  confirmado: { label: 'Confirmado', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle2 },
  em_preparo: { label: 'Em preparo', bg: 'bg-amber-100', text: 'text-amber-800', icon: ChefHat },
  saiu_para_entrega: { label: 'Saiu p/ entrega', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck },
  entregue: { label: 'Entregue', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

export const AdminPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const prevOrdersCountRef = useRef<number>(0);

  // Som suave de notificação de novo pedido
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio notification error:', e);
    }
  }, [soundEnabled]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token') || 'acai123';
      const res = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_token');
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        // Se houver novos pedidos adicionados, toca o alerta sonoro
        const newOrdersCount = data.orders.filter((o: AdminOrder) => o.order_status === 'novo').length;
        if (newOrdersCount > prevOrdersCountRef.current && prevOrdersCountRef.current !== 0) {
          playNotificationSound();
        }
        prevOrdersCountRef.current = newOrdersCount;
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playNotificationSound]);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('admin_token');
    if (savedToken) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15000); // Polling a cada 15 segundos
      return () => clearInterval(interval);
    }
  }, [isOpen, isAuthenticated, fetchOrders]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    // Salva token e testa consulta
    sessionStorage.setItem('admin_token', password.trim());
    setIsAuthenticated(true);
    setAuthError('');
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: AdminOrder['order_status']) => {
    try {
      const token = sessionStorage.getItem('admin_token') || 'acai123';
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, order_status: newStatus } : o));
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const handleResendNotification = async (orderId: string) => {
    try {
      const token = sessionStorage.getItem('admin_token') || 'acai123';
      const res = await fetch('/api/orders/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, whatsapp_notification_status: 'sent' } : o));
      }
    } catch (e) {
      console.error('Error resending notification:', e);
    }
  };

  if (!isOpen) return null;

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'all' || order.order_status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      order.order_number.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      (order.customer_phone && order.customer_phone.includes(q)) ||
      (order.address_neighborhood && order.address_neighborhood.toLowerCase().includes(q));

    return matchesTab && matchesSearch;
  });

  const countByStatus = {
    all: orders.length,
    novo: orders.filter(o => o.order_status === 'novo').length,
    confirmado: orders.filter(o => o.order_status === 'confirmado').length,
    em_preparo: orders.filter(o => o.order_status === 'em_preparo').length,
    saiu_para_entrega: orders.filter(o => o.order_status === 'saiu_para_entrega').length,
    entregue: orders.filter(o => o.order_status === 'entregue').length,
    cancelado: orders.filter(o => o.order_status === 'cancelado').length,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-[#FCFAF7] h-full shadow-2xl flex flex-col border-l border-[#ECE8F0]">
        
        {/* Topo do Painel */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#ECE8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3EDF6] text-[#69318A] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#28242A] font-['DM_Sans'] flex items-center gap-2">
                <span>Painel de Pedidos</span>
                {countByStatus.novo > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#69318A] text-white text-[11px] font-bold animate-pulse">
                    {countByStatus.novo} novo(s)
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#726C74]">Acompanhamento e gestão em tempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${soundEnabled ? 'text-[#69318A] border-[#ECE8F0] bg-[#F3EDF6]' : 'text-gray-400 border-gray-200'}`}
                  title={soundEnabled ? 'Som ativado' : 'Som desativado'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  onClick={fetchOrders}
                  disabled={isLoading}
                  className="p-2 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-xl border border-[#ECE8F0] transition-colors cursor-pointer"
                  title="Atualizar pedidos"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-[#726C74] hover:text-[#28242A] hover:bg-[#F3EDF6] rounded-xl transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* TELA DE AUTENTICAÇÃO */}
        {!isAuthenticated ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white p-6 rounded-2xl border border-[#ECE8F0] shadow-sm text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#F3EDF6] text-[#69318A] flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#28242A] font-['DM_Sans']">Acesso Administrativo</h3>
                <p className="text-xs text-[#726C74] mt-1">Informe a senha de administrador da loja.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="password"
                  placeholder="Senha de acesso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-sm outline-none text-center"
                />
                {authError && <p className="text-xs text-red-500">{authError}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Entrar no Painel
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* CONTEÚDO DO PAINEL */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Filtros e Busca */}
            <div className="p-4 bg-white border-b border-[#ECE8F0] space-y-3 shrink-0">
              
              {/* Barra de Busca */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#726C74] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, pedido #, telefone ou bairro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none"
                />
              </div>

              {/* Abas de Status */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'Todos', count: countByStatus.all },
                  { id: 'novo', label: 'Novos', count: countByStatus.novo },
                  { id: 'confirmado', label: 'Confirmados', count: countByStatus.confirmado },
                  { id: 'em_preparo', label: 'Em preparo', count: countByStatus.em_preparo },
                  { id: 'saiu_para_entrega', label: 'Em entrega', count: countByStatus.saiu_para_entrega },
                  { id: 'entregue', label: 'Entregues', count: countByStatus.entregue },
                  { id: 'cancelado', label: 'Cancelados', count: countByStatus.cancelado },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#69318A] text-white shadow-2xs'
                        : 'bg-[#FCFAF7] text-[#726C74] hover:bg-[#F3EDF6] border border-[#ECE8F0]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#ECE8F0] text-[#28242A]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

            </div>

            {/* Lista de Pedidos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="py-20 text-center space-y-2 bg-white rounded-2xl border border-[#ECE8F0] p-8">
                  <ShoppingBag className="w-10 h-10 text-[#ECE8F0] mx-auto stroke-[1.5]" />
                  <h4 className="text-sm font-bold text-[#28242A]">Nenhum pedido encontrado</h4>
                  <p className="text-xs text-[#726C74]">Quando novos pedidos forem confirmados, aparecerão aqui automaticamente.</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const statusInfo = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.novo;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={order.id || order.order_number}
                      className="bg-white rounded-2xl border border-[#ECE8F0] shadow-xs p-4 sm:p-5 space-y-4 hover:border-[#D8CFE3] transition-all"
                    >
                      {/* Topo do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#ECE8F0]">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-[#28242A] font-['DM_Sans']">
                            #{order.order_number}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 ${statusInfo.bg} ${statusInfo.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#726C74]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Dados do Cliente e Entrega */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#28242A]">{order.customer_name}</p>
                          {order.customer_phone && (
                            <div className="flex items-center gap-2 text-[#726C74]">
                              <Phone className="w-3.5 h-3.5 text-[#69318A]" />
                              <span>{order.customer_phone}</span>
                              <a
                                href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#69318A] hover:underline font-medium"
                              >
                                Conversar
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-[#726C74]">
                          <p className="font-medium text-[#28242A]">
                            {order.delivery_type === 'delivery' ? '🛵 Entrega' : '🏪 Retirada na loja'}
                          </p>
                          {order.delivery_type === 'delivery' && (
                            <p className="line-clamp-2">
                              {order.address_street}, Nº {order.address_number} - {order.address_neighborhood}
                              {order.address_complement ? ` (${order.address_complement})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      <div className="bg-[#FCFAF7] p-3.5 rounded-xl border border-[#ECE8F0] space-y-2">
                        <p className="text-[11px] font-bold text-[#726C74] uppercase tracking-wider">Itens do Pedido</p>
                        <div className="space-y-2 divide-y divide-[#ECE8F0]/60">
                          {order.items.map((item, idx) => (
                            <div key={idx} className={`pt-1.5 text-xs ${idx === 0 ? 'pt-0' : ''}`}>
                              <div className="flex justify-between font-semibold text-[#28242A]">
                                <span>{item.quantity}x {item.name} {item.size ? `(${item.size})` : ''}</span>
                                <span>{formatCurrency(item.totalPrice || item.unitPrice)}</span>
                              </div>
                              {item.base && item.base !== 'Açaí tradicional' && (
                                <p className="text-[11px] text-[#726C74]">Base: {item.base}</p>
                              )}
                              {item.additionals && item.additionals.length > 0 && (
                                <p className="text-[11px] text-[#726C74]">Adicionais: {item.additionals.join(', ')}</p>
                              )}
                              {item.notes && (
                                <p className="text-[11px] text-[#726C74] italic">Obs: {item.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {order.general_notes && (
                          <p className="text-xs text-[#726C74] pt-2 border-t border-[#ECE8F0]">
                            <strong>Observações gerais:</strong> {order.general_notes}
                          </p>
                        )}
                      </div>

                      {/* Resumo Financeiro & Status da Notificação */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div>
                          <span className="text-[#726C74]">Total: </span>
                          <span className="text-base font-extrabold text-[#49245B] font-['DM_Sans']">
                            {formatCurrency(order.total)}
                          </span>
                          <span className="text-[11px] text-[#726C74] ml-2">
                            ({order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'card_online' ? 'Cartão online' : 'Na entrega'})
                          </span>
                        </div>

                        {/* Status da Notificação WhatsApp */}
                        <div className="flex items-center gap-1.5">
                          {order.whatsapp_notification_status === 'sent' ? (
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              WhatsApp enviado
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResendNotification(order.id || order.order_number)}
                              className="text-[11px] text-[#69318A] hover:bg-[#F3EDF6] px-2 py-0.5 rounded border border-[#ECE8F0] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Tentar enviar notificação pelo WhatsApp novamente"
                            >
                              <Send className="w-3 h-3" />
                              Reenviar WhatsApp
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Ações de Mudança de Status */}
                      <div className="pt-2 border-t border-[#ECE8F0] flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-[#726C74] mr-1">Alterar status:</span>
                        
                        {order.order_status === 'novo' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id || order.order_number, 'confirmado')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            Confirmar Pedido
                          </button>
                        )}

                        {(order.order_status === 'novo' || order.order_status === 'confirmado') && (
                          <button
                            onClick={() => handleUpdateStatus(order.id || order.order_number, 'em_preparo')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            Iniciar Preparo
                          </button>
                        )}

                        {order.order_status === 'em_preparo' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id || order.order_number, 'saiu_para_entrega')}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            Despachar Entrega
                          </button>
                        )}

                        {order.order_status === 'saiu_para_entrega' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id || order.order_number, 'entregue')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            Marcar Entregue
                          </button>
                        )}

                        {order.order_status !== 'entregue' && order.order_status !== 'cancelado' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id || order.order_number, 'cancelado')}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium border border-red-200 transition-all ml-auto cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
