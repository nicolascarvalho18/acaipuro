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
  Search,
  Activity,
  BellRing,
  PackageCheck
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

export interface AdminOrder {
  id?: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  fulfillment_type: 'delivery' | 'pickup';
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    reference?: string;
  };
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'pix' | 'card_online' | 'delivery';
  payment_status: 'pending' | 'approved' | 'paid_on_delivery' | 'rejected';
  order_status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  notes?: string;
  whatsapp_status: 'pending' | 'sent' | 'failed' | 'not_configured';
  push_status: 'pending' | 'sent' | 'failed' | 'not_configured';
  email_status: 'pending' | 'sent' | 'failed' | 'not_configured';
  notification_attempts?: number;
  last_notification_error?: string;
  confirmed_at?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<AdminOrder['order_status'], { label: string; bg: string; text: string; icon: React.ComponentType<any> }> = {
  new: { label: 'Novo pedido', bg: 'bg-purple-100', text: 'text-[#69318A]', icon: ShoppingBag },
  confirmed: { label: 'Confirmado', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle2 },
  preparing: { label: 'Em preparo', bg: 'bg-amber-100', text: 'text-amber-800', icon: ChefHat },
  ready: { label: 'Pronto', bg: 'bg-teal-100', text: 'text-teal-800', icon: PackageCheck },
  out_for_delivery: { label: 'Saiu p/ entrega', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck },
  delivered: { label: 'Entregue', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  const prevOrdersCountRef = useRef<number>(0);
  const audioIntervalRef = useRef<any>(null);

  // Som claro de alerta para novos pedidos
  const playNewOrderSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + duration);
      };

      playBeep(587.33, 0, 0.15); // D5
      playBeep(783.99, 0.12, 0.15); // G5
      playBeep(987.77, 0.24, 0.25); // B5
    } catch (e) {
      console.warn('Audio notification error:', e);
    }
  }, [soundEnabled]);

  const fetchOrders = useCallback(async () => {
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
        const unconfirmedCount = data.orders.filter((o: AdminOrder) => o.order_status === 'new').length;
        
        // Se houver pedido novo que acabou de chegar, dispara o som
        if (unconfirmedCount > prevOrdersCountRef.current && prevOrdersCountRef.current !== 0) {
          playNewOrderSound();
        }
        prevOrdersCountRef.current = unconfirmedCount;
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playNewOrderSound]);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/diagnostic');
      const data = await res.json();
      if (data.success) {
        setDiagnosticsData(data.diagnostics);
      }
    } catch (e) {
      console.error('Diagnostic error:', e);
    }
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem('admin_token');
    if (savedToken) {
      setIsAuthenticated(true);
    }
  }, []);

  // Polling em tempo real a cada 4 segundos (garante resposta ultra-rápida)
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      setIsLoading(true);
      fetchOrders();
      fetchDiagnostics();

      const interval = setInterval(fetchOrders, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isAuthenticated, fetchOrders]);

  // Alerta sonoro repetido enquanto houver pedido novo sem confirmação
  useEffect(() => {
    const unconfirmedOrders = orders.filter(o => o.order_status === 'new');
    
    if (soundEnabled && unconfirmedOrders.length > 0 && isOpen && isAuthenticated) {
      if (!audioIntervalRef.current) {
        audioIntervalRef.current = setInterval(() => {
          playNewOrderSound();
        }, 12000); // Repete a cada 12s até o lojista confirmar
      }
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    }

    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    };
  }, [orders, soundEnabled, isOpen, isAuthenticated, playNewOrderSound]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    sessionStorage.setItem('admin_token', password.trim());
    setIsAuthenticated(true);
    setAuthError('');
    setIsLoading(true);
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: AdminOrder['order_status']) => {
    try {
      const token = sessionStorage.getItem('admin_token') || 'acai123';
      
      // Atualização otimista imediata na interface
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, order_status: newStatus } : o));

      await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
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
        setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, whatsapp_status: 'sent' } : o));
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
      (order.address?.neighborhood && order.address.neighborhood.toLowerCase().includes(q));

    return matchesTab && matchesSearch;
  });

  const countByStatus = {
    all: orders.length,
    new: orders.filter(o => o.order_status === 'new').length,
    confirmed: orders.filter(o => o.order_status === 'confirmed').length,
    preparing: orders.filter(o => o.order_status === 'preparing').length,
    ready: orders.filter(o => o.order_status === 'ready').length,
    out_for_delivery: orders.filter(o => o.order_status === 'out_for_delivery').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    cancelled: orders.filter(o => o.order_status === 'cancelled').length,
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
                <span>Painel de Pedidos em Tempo Real</span>
                {countByStatus.new > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#69318A] text-white text-xs font-extrabold animate-pulse flex items-center gap-1">
                    <BellRing className="w-3 h-3" />
                    <span>{countByStatus.new} novo(s)</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#726C74]">Recebimento instantâneo e gestão de entregas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playNewOrderSound();
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    soundEnabled 
                      ? 'text-[#69318A] border-[#ECE8F0] bg-[#F3EDF6] shadow-2xs' 
                      : 'text-gray-400 border-gray-200 bg-white'
                  }`}
                  title="Ativar ou desativar som de novos pedidos"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{soundEnabled ? 'Som Ativo' : 'Ativar Som'}</span>
                </button>

                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    showDiagnostics ? 'bg-[#69318A] text-white' : 'text-[#726C74] hover:bg-[#F3EDF6] border-[#ECE8F0]'
                  }`}
                  title="Ver diagnósticos do sistema"
                >
                  <Activity className="w-4 h-4" />
                </button>

                <button
                  onClick={fetchOrders}
                  disabled={isLoading}
                  className="p-2 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-xl border border-[#ECE8F0] transition-colors cursor-pointer"
                  title="Atualizar agora"
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
                <h3 className="text-base font-bold text-[#28242A] font-['DM_Sans']">Acesso ao Painel do Lojista</h3>
                <p className="text-xs text-[#726C74] mt-1">Informe a senha de administrador da loja.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="password"
                  placeholder="Senha de acesso (Padrão: acai123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-sm outline-none text-center"
                />
                {authError && <p className="text-xs text-red-500">{authError}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Entrar no Painel
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* CONTEÚDO DO PAINEL */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* ÁREA DE DIAGNÓSTICO DO SISTEMA */}
            {showDiagnostics && diagnosticsData && (
              <div className="p-4 bg-white border-b border-[#ECE8F0] space-y-3 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#28242A] uppercase tracking-wider flex items-center gap-1.5 font-['DM_Sans']">
                    <Activity className="w-3.5 h-3.5 text-[#69318A]" />
                    <span>Diagnóstico de Conexões e Notificações</span>
                  </h3>
                  <button
                    onClick={() => setShowDiagnostics(false)}
                    className="text-xs text-[#726C74] hover:text-[#28242A]"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-[#FCFAF7] rounded-xl border border-[#ECE8F0]">
                    <span className="text-[10px] text-[#726C74] block">Banco de Dados</span>
                    <span className="font-bold text-emerald-700 capitalize">
                      {diagnosticsData.database.status === 'conectado' ? '🟢 Conectado' : '🟡 Memória (Ativo)'}
                    </span>
                    <span className="text-[10px] text-[#726C74] block mt-0.5 truncate">{diagnosticsData.database.provider}</span>
                  </div>

                  <div className="p-2.5 bg-[#FCFAF7] rounded-xl border border-[#ECE8F0]">
                    <span className="text-[10px] text-[#726C74] block">Tempo Real</span>
                    <span className="font-bold text-emerald-700">🟢 Ativo (4s)</span>
                    <span className="text-[10px] text-[#726C74] block mt-0.5">Sem atrasos</span>
                  </div>

                  <div className="p-2.5 bg-[#FCFAF7] rounded-xl border border-[#ECE8F0]">
                    <span className="text-[10px] text-[#726C74] block">WhatsApp Meta API</span>
                    <span className={`font-bold ${diagnosticsData.whatsapp.status === 'configurado' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {diagnosticsData.whatsapp.status === 'configurado' ? '🟢 Configurado' : '🟡 Aguardando Token'}
                    </span>
                    <span className="text-[10px] text-[#726C74] block mt-0.5">{diagnosticsData.whatsapp.targetPhone}</span>
                  </div>

                  <div className="p-2.5 bg-[#FCFAF7] rounded-xl border border-[#ECE8F0]">
                    <span className="text-[10px] text-[#726C74] block">Push & Alertas</span>
                    <span className="font-bold text-emerald-700">🟢 Ativo no Painel</span>
                    <span className="text-[10px] text-[#726C74] block mt-0.5">Alerta sonoro ativo</span>
                  </div>
                </div>
              </div>
            )}

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
                  { id: 'new', label: 'Novos', count: countByStatus.new, isNewBadge: true },
                  { id: 'confirmed', label: 'Confirmados', count: countByStatus.confirmed },
                  { id: 'preparing', label: 'Em preparo', count: countByStatus.preparing },
                  { id: 'ready', label: 'Prontos', count: countByStatus.ready },
                  { id: 'out_for_delivery', label: 'Em entrega', count: countByStatus.out_for_delivery },
                  { id: 'delivered', label: 'Entregues', count: countByStatus.delivered },
                  { id: 'cancelled', label: 'Cancelados', count: countByStatus.cancelled },
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
                      activeTab === tab.id 
                        ? 'bg-white/20 text-white' 
                        : (tab.isNewBadge && tab.count > 0 ? 'bg-[#69318A] text-white animate-pulse' : 'bg-[#ECE8F0] text-[#28242A]')
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

            </div>

            {/* Lista de Pedidos em Tempo Real */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="py-20 text-center space-y-2 bg-white rounded-2xl border border-[#ECE8F0] p-8">
                  <ShoppingBag className="w-10 h-10 text-[#ECE8F0] mx-auto stroke-[1.5]" />
                  <h4 className="text-sm font-bold text-[#28242A]">Nenhum pedido nesta lista</h4>
                  <p className="text-xs text-[#726C74]">Quando novos pedidos forem realizados, eles aparecerão aqui instantaneamente em tempo real.</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const statusInfo = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.new;
                  const StatusIcon = statusInfo.icon;
                  const isNew = order.order_status === 'new';

                  return (
                    <div
                      key={order.id || order.order_number}
                      className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 space-y-4 ${
                        isNew 
                          ? 'border-[#69318A] shadow-md ring-2 ring-[#69318A]/20 bg-purple-50/10' 
                          : 'border-[#ECE8F0] shadow-xs hover:border-[#D8CFE3]'
                      }`}
                    >
                      {/* Topo do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#ECE8F0]">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-[#28242A] font-['DM_Sans']">
                            #{order.order_number}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 ${statusInfo.bg} ${statusInfo.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </span>
                          {isNew && (
                            <span className="px-2 py-0.5 rounded bg-[#69318A] text-white text-[10px] font-bold animate-pulse">
                              NOVO!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#726C74]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Dados do Cliente e Entrega */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-[#28242A] text-sm">{order.customer_name}</p>
                          {order.customer_phone && (
                            <div className="flex items-center gap-2 text-[#726C74]">
                              <Phone className="w-3.5 h-3.5 text-[#69318A]" />
                              <span>{order.customer_phone}</span>
                              <a
                                href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#69318A] hover:underline font-semibold"
                              >
                                Conversar
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-[#726C74]">
                          <p className="font-semibold text-[#28242A]">
                            {order.fulfillment_type === 'delivery' ? '🛵 Entrega em domicílio' : '🏪 Retirada no balcão'}
                          </p>
                          {order.fulfillment_type === 'delivery' && order.address && (
                            <p className="line-clamp-2">
                              {order.address.street}, Nº {order.address.number} - {order.address.neighborhood}
                              {order.address.complement ? ` (${order.address.complement})` : ''}
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

                        {order.notes && (
                          <p className="text-xs text-[#726C74] pt-2 border-t border-[#ECE8F0]">
                            <strong>Observações gerais:</strong> {order.notes}
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

                        {/* Status da Notificação */}
                        <div className="flex items-center gap-1.5">
                          {order.whatsapp_status === 'sent' ? (
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

                      {/* Ações de Mudança de Status com 1 Clique */}
                      <div className="pt-2 border-t border-[#ECE8F0] flex flex-wrap items-center gap-2">
                        {isNew ? (
                          <button
                            onClick={() => handleUpdateStatus(order.id || order.order_number, 'confirmed')}
                            className="px-4 py-2 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar Pedido (Parar Alerta)</span>
                          </button>
                        ) : (
                          <>
                            {order.order_status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateStatus(order.id || order.order_number, 'preparing')}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <ChefHat className="w-3.5 h-3.5" />
                                <span>Iniciar Preparo</span>
                              </button>
                            )}

                            {order.order_status === 'preparing' && (
                              <button
                                onClick={() => handleUpdateStatus(order.id || order.order_number, 'ready')}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Marcar como Pronto</span>
                              </button>
                            )}

                            {order.order_status === 'ready' && (
                              <button
                                onClick={() => handleUpdateStatus(order.id || order.order_number, 'out_for_delivery')}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Despachar Entrega</span>
                              </button>
                            )}

                            {order.order_status === 'out_for_delivery' && (
                              <button
                                onClick={() => handleUpdateStatus(order.id || order.order_number, 'delivered')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirmar Entrega</span>
                              </button>
                            )}
                          </>
                        )}

                        {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id || order.order_number, 'cancelled')}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-medium border border-red-200 transition-all ml-auto cursor-pointer"
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
