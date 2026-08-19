import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../services/supabaseClient';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  ChefHat, 
  XCircle, 
  Phone, 
  Search, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Printer, 
  Sliders, 
  LogOut, 
  PackageCheck, 
  Layers, 
  Check, 
  X 
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '../../data/mockProducts';
import type { Product } from '../../types';

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  base?: string;
  additionals?: string[];
  notes?: string;
}

export interface RealOrder {
  id?: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  fulfillment_type: 'delivery' | 'pickup';
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: 'new' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

const STATUS_CONFIG: Record<RealOrder['status'], { label: string; bg: string; text: string; icon: React.ComponentType<any> }> = {
  new: { label: 'Novo Pedido', bg: 'bg-purple-100', text: 'text-[#69318A]', icon: ShoppingBag },
  confirmed: { label: 'Confirmado', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle2 },
  preparing: { label: 'Em Preparo', bg: 'bg-amber-100', text: 'text-amber-800', icon: ChefHat },
  delivering: { label: 'Em Entrega', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck },
  done: { label: 'Concluído', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: PackageCheck },
  cancelled: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'cardapio' | 'configuracoes'>('pedidos');
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Configurações da Loja
  const [isOpenStore, setIsOpenStore] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState(5.00);
  const [freeThreshold, setFreeThreshold] = useState(45.00);
  const [estimatedTime, setEstimatedTime] = useState('30 a 45 minutos');

  // Gestão do Cardápio
  const [productsList] = useState<Product[]>(INITIAL_PRODUCTS);

  const prevUnconfirmedCountRef = useRef<number>(0);
  const audioIntervalRef = useRef<any>(null);

  // Som suave de novo pedido
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (freq: number, start: number, dur: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + dur);
      };
      playBeep(587.33, 0, 0.15); // D5
      playBeep(783.99, 0.12, 0.15); // G5
      playBeep(987.77, 0.24, 0.25); // B5
    } catch (e) {
      console.warn('Sound error:', e);
    }
  }, [soundEnabled]);

  // Carregar Pedidos da API
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const newCount = data.orders.filter((o: RealOrder) => o.status === 'new').length;
        
        if (newCount > prevUnconfirmedCountRef.current && prevUnconfirmedCountRef.current !== 0) {
          playAlertSound();
        }
        prevUnconfirmedCountRef.current = newCount;
        setOrders(data.orders);

        if (newCount > 0) {
          document.title = `(${newCount}) 🔔 Novo Pedido! - Açaí Puro Sabor`;
        } else {
          document.title = `Painel do Lojista - Açaí Puro Sabor`;
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playAlertSound]);

  // Supabase Realtime Subscription + Polling Fallback
  useEffect(() => {
    setIsLoading(true);
    fetchOrders();

    // 1. Supabase Realtime
    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('pedidos-loja')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newOrder = payload.new as RealOrder;
                setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id && o.order_number !== newOrder.order_number)]);
                playAlertSound();
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as RealOrder;
                setOrders(prev => prev.map(o => (o.id === updated.id || o.order_number === updated.order_number) ? updated : o));
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase realtime error:', e);
      }
    }

    // 2. Polling contínuo a cada 3 segundos
    const interval = setInterval(fetchOrders, 3000);

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchOrders, playAlertSound]);

  // Alerta sonoro repetido enquanto houver pedido novo pendente
  useEffect(() => {
    const unconfirmed = orders.filter(o => o.status === 'new');
    if (soundEnabled && unconfirmed.length > 0) {
      if (!audioIntervalRef.current) {
        audioIntervalRef.current = setInterval(playAlertSound, 10000);
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
  }, [orders, soundEnabled, playAlertSound]);

  // Atualizar Status do Pedido no Banco de Dados
  const handleUpdateStatus = async (orderId: string, newStatus: RealOrder['status']) => {
    try {
      // Atualização otimista imediata na interface
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, status: newStatus } : o));

      await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
    } catch (e) {
      console.error('Update status error:', e);
    }
  };

  // Imprimir Cupom Térmico (80mm)
  const handlePrintOrder = (order: RealOrder) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map(item => `
      <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #ccc;">
        <strong>${item.quantity}x ${item.name} ${item.size ? `(${item.size})` : ''}</strong>
        ${item.base ? `<div style="font-size: 11px;">Base: ${item.base}</div>` : ''}
        ${item.additionals && item.additionals.length > 0 ? `<div style="font-size: 11px;">Adicionais: ${item.additionals.join(', ')}</div>` : ''}
        ${item.notes ? `<div style="font-size: 11px; font-style: italic;">Obs: ${item.notes}</div>` : ''}
        <div style="text-align: right; font-weight: bold;">${formatCurrency(item.totalPrice || item.unitPrice)}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${order.order_number}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 10px; color: #000; }
            h2 { text-align: center; margin: 5px 0; font-size: 16px; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <h2>AÇAÍ PURO SABOR</h2>
          <div class="center">Açaí Artesanal & Delivery</div>
          <div class="divider"></div>
          <div class="flex"><span><strong>PEDIDO:</strong> #${order.order_number}</span><span>${new Date(order.created_at).toLocaleTimeString('pt-BR')}</span></div>
          <div><strong>CLIENTE:</strong> ${order.customer_name}</div>
          <div><strong>TELEFONE:</strong> ${order.customer_phone || 'Não informado'}</div>
          <div><strong>TIPO:</strong> ${order.fulfillment_type === 'delivery' ? 'ENTREGA' : 'RETIRADA'}</div>
          ${order.street ? `<div><strong>ENDEREÇO:</strong> ${order.street}, Nº ${order.number || 'S/N'} - ${order.neighborhood || ''} ${order.complement ? `(${order.complement})` : ''}</div>` : ''}
          <div class="divider"></div>
          <div><strong>ITENS DO PEDIDO:</strong></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="flex"><span>Subtotal:</span><span>${formatCurrency(order.subtotal)}</span></div>
          <div class="flex"><span>Taxa Entrega:</span><span>${formatCurrency(order.delivery_fee)}</span></div>
          <div class="flex" style="font-size: 14px; font-weight: bold; margin-top: 4px;"><span>TOTAL:</span><span>${formatCurrency(order.total)}</span></div>
          <div class="flex"><span>Pagamento:</span><span>${order.payment_method}</span></div>
          ${order.notes ? `<div class="divider"></div><div><strong>OBSERVAÇÕES:</strong> ${order.notes}</div>` : ''}
          <div class="divider"></div>
          <div class="center" style="font-size: 10px;">Obrigado pela preferência!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // Métricas em Tempo Real
  const countNew = orders.filter(o => o.status === 'new').length;
  const countPreparing = orders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length;
  const countDelivering = orders.filter(o => o.status === 'delivering').length;
  const countDone = orders.filter(o => o.status === 'done').length;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Filtragem de Pedidos
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      order.order_number.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      (order.customer_phone && order.customer_phone.includes(q)) ||
      (order.neighborhood && order.neighborhood.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F6FA] flex flex-col md:flex-row text-[#28242A] font-sans">
      
      {/* SIDEBAR LATERAL */}
      <aside className="w-full md:w-64 bg-[#30143D] text-white flex flex-col justify-between shrink-0 p-5 shadow-xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#803FA0] text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Açaí Puro Sabor</h1>
              <p className="text-[11px] text-[#FBF7F1]/70">Painel do Lojista</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'pedidos' 
                  ? 'bg-[#803FA0] text-white shadow-sm' 
                  : 'text-[#FBF7F1]/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Pedidos em Tempo Real</span>
              </div>
              {countNew > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                  {countNew}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('cardapio')}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'cardapio' 
                  ? 'bg-[#803FA0] text-white shadow-sm' 
                  : 'text-[#FBF7F1]/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Gestão do Cardápio</span>
            </button>

            <button
              onClick={() => setActiveTab('configuracoes')}
              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'configuracoes' 
                  ? 'bg-[#803FA0] text-white shadow-sm' 
                  : 'text-[#FBF7F1]/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Configurações da Loja</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10 space-y-3">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isOpenStore ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="font-semibold">{isOpenStore ? 'Loja Aberta' : 'Loja Fechada'}</span>
            </div>
            <button
              onClick={() => setIsOpenStore(!isOpenStore)}
              className="text-[11px] text-[#C9A66B] hover:underline cursor-pointer"
            >
              Alterar
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-[#ECE8F0] p-4 sm:px-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#28242A] font-['DM_Sans']">
              {activeTab === 'pedidos' ? 'Gestão de Pedidos em Tempo Real' : activeTab === 'cardapio' ? 'Catálogo & Cardápio Digital' : 'Configurações Operacionais'}
            </h2>
            <p className="text-xs text-[#726C74]">Conectado diretamente ao banco de dados Supabase PostgreSQL</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playAlertSound();
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled 
                  ? 'text-[#69318A] border-purple-200 bg-purple-50 shadow-2xs' 
                  : 'text-gray-400 border-gray-200 bg-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Som Ativo' : 'Ativar Som'}</span>
            </button>

            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-xl border border-[#ECE8F0] transition-colors cursor-pointer"
              title="Atualizar agora"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* CONTEÚDO DA ABA: PEDIDOS EM TEMPO REAL */}
        {activeTab === 'pedidos' && (
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* INDICADORES DO PAINEL */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs">
                <span className="text-[11px] font-bold text-[#726C74] uppercase block">Novos</span>
                <span className="text-2xl font-black text-[#69318A] font-['DM_Sans']">{countNew}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs">
                <span className="text-[11px] font-bold text-[#726C74] uppercase block">Em Preparo</span>
                <span className="text-2xl font-black text-amber-600 font-['DM_Sans']">{countPreparing}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs">
                <span className="text-[11px] font-bold text-[#726C74] uppercase block">Em Entrega</span>
                <span className="text-2xl font-black text-indigo-600 font-['DM_Sans']">{countDelivering}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs">
                <span className="text-[11px] font-bold text-[#726C74] uppercase block">Concluídos</span>
                <span className="text-2xl font-black text-emerald-600 font-['DM_Sans']">{countDone}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs">
                <span className="text-[11px] font-bold text-[#726C74] uppercase block">Total do Dia</span>
                <span className="text-2xl font-black text-[#49245B] font-['DM_Sans']">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>

            {/* FILTROS E BUSCA */}
            <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] space-y-3 shadow-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-[#726C74] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, pedido #, telefone ou bairro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'Todos', count: orders.length },
                  { id: 'new', label: 'Novos', count: countNew, isAlert: true },
                  { id: 'confirmed', label: 'Confirmados', count: orders.filter(o => o.status === 'confirmed').length },
                  { id: 'preparing', label: 'Em Preparo', count: orders.filter(o => o.status === 'preparing').length },
                  { id: 'delivering', label: 'Em Entrega', count: countDelivering },
                  { id: 'done', label: 'Concluídos', count: countDone },
                  { id: 'cancelled', label: 'Cancelados', count: orders.filter(o => o.status === 'cancelled').length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-[#69318A] text-white shadow-xs'
                        : 'bg-[#FCFAF7] text-[#726C74] hover:bg-[#F3EDF6] border border-[#ECE8F0]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                      statusFilter === tab.id 
                        ? 'bg-white/20 text-white' 
                        : (tab.isAlert && tab.count > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-[#ECE8F0] text-[#28242A]')
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* LISTA DE PEDIDOS REAIS */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-[#ECE8F0] text-center space-y-2">
                  <ShoppingBag className="w-12 h-12 text-[#ECE8F0] mx-auto" />
                  <h3 className="text-base font-bold text-[#28242A]">Nenhum pedido encontrado</h3>
                  <p className="text-xs text-[#726C74]">Quando o cliente confirmar um pedido pelo site, ele aparecerá aqui instantaneamente.</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                  const StatusIcon = statusInfo.icon;
                  const isNew = order.status === 'new';

                  return (
                    <div
                      key={order.id || order.order_number}
                      className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                        isNew 
                          ? 'border-[#69318A] shadow-md ring-2 ring-[#69318A]/20 bg-purple-50/10' 
                          : 'border-[#ECE8F0] shadow-xs hover:border-[#D8CFE3]'
                      }`}
                    >
                      {/* Topo do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#ECE8F0]">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg font-black text-[#28242A] font-['DM_Sans']">
                            Pedido #{order.order_number}
                          </span>
                          <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </span>
                          {isNew && (
                            <span className="px-2 py-0.5 rounded-full bg-[#69318A] text-white text-[10px] font-extrabold animate-pulse">
                              NOVO!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#726C74]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <button
                            onClick={() => handlePrintOrder(order)}
                            className="p-1.5 rounded-lg border border-[#ECE8F0] hover:bg-[#F3EDF6] text-[#726C74] hover:text-[#69318A] transition-colors cursor-pointer"
                            title="Imprimir comanda térmica"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Informações do Cliente & Endereço */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-[#28242A]">{order.customer_name}</p>
                          {order.customer_phone && (
                            <div className="flex items-center gap-2 text-[#726C74]">
                              <Phone className="w-3.5 h-3.5 text-[#69318A]" />
                              <span>{order.customer_phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-[#726C74]">
                          <p className="font-bold text-[#28242A]">
                            {order.fulfillment_type === 'delivery' ? '🛵 Entrega em domicílio' : '🏪 Retirada no balcão'}
                          </p>
                          {order.fulfillment_type === 'delivery' && (order.street || order.neighborhood) && (
                            <p className="line-clamp-2">
                              {order.street}, Nº {order.number || 'S/N'} - {order.neighborhood}
                              {order.complement ? ` (${order.complement})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      <div className="bg-[#FCFAF7] p-4 rounded-2xl border border-[#ECE8F0] space-y-3">
                        <p className="text-[11px] font-bold text-[#726C74] uppercase tracking-wider">Produtos e Adicionais</p>
                        <div className="space-y-2 divide-y divide-[#ECE8F0]/80">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className={`pt-2 text-xs ${idx === 0 ? 'pt-0' : ''}`}>
                              <div className="flex justify-between font-bold text-[#28242A]">
                                <span>{item.quantity}x {item.name} {item.size ? `(${item.size})` : ''}</span>
                                <span>{formatCurrency(item.totalPrice || item.unitPrice)}</span>
                              </div>
                              {item.base && (
                                <p className="text-[11px] text-[#726C74]">Base: {item.base}</p>
                              )}
                              {item.additionals && item.additionals.length > 0 && (
                                <p className="text-[11px] text-[#69318A] font-medium">
                                  Adicionais: {item.additionals.join(', ')}
                                </p>
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

                      {/* Resumo Financeiro & Ações */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#726C74]">Total:</span>
                          <span className="text-lg font-black text-[#49245B] font-['DM_Sans']">
                            {formatCurrency(order.total)}
                          </span>
                          <span className="text-[11px] text-[#726C74] bg-[#F3EDF6] px-2 py-0.5 rounded-lg">
                            {order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'card_online' ? 'Cartão Online' : 'Na Entrega'}
                          </span>
                        </div>

                        {/* Ações do Lojista */}
                        <div className="flex flex-wrap items-center gap-2">
                          {isNew && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'confirmed')}
                              className="px-3.5 py-2 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirmar</span>
                            </button>
                          )}

                          {(order.status === 'confirmed' || isNew) && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'preparing')}
                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ChefHat className="w-4 h-4" />
                              <span>Em preparo</span>
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'delivering')}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck className="w-4 h-4" />
                              <span>Saiu para entrega</span>
                            </button>
                          )}

                          {(order.status === 'delivering' || order.status === 'preparing') && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'done')}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <PackageCheck className="w-4 h-4" />
                              <span>Concluir</span>
                            </button>
                          )}

                          {order.status !== 'done' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'cancelled')}
                              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold border border-red-200 transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* CONTEÚDO DA ABA: GESTÃO DO CARDÁPIO */}
        {activeTab === 'cardapio' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Produtos do Cardápio</h3>
              <p className="text-xs text-[#726C74]">Catálogo de produtos ativos na açaiteria</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productsList.map(product => (
                <div key={product.id} className="bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                  <div className="flex gap-3">
                    <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-[#ECE8F0]" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#28242A] truncate">{product.name}</h4>
                      <p className="text-[11px] text-[#726C74] line-clamp-1">{product.description}</p>
                      <span className="text-xs font-bold text-[#69318A] block mt-1">{formatCurrency(product.price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: CONFIGURAÇÕES DA LOJA */}
        {activeTab === 'configuracoes' && (
          <div className="p-4 sm:p-8 max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-5">
              <h3 className="text-base font-bold text-[#28242A] border-b border-[#ECE8F0] pb-3">
                Disponibilidade da Loja
              </h3>

              <div className="flex items-center justify-between p-4 bg-[#FCFAF7] rounded-2xl border border-[#ECE8F0]">
                <div>
                  <span className="text-xs font-bold text-[#28242A] block">Status da Loja</span>
                  <span className="text-[11px] text-[#726C74]">Quando fechada, os clientes são avisados no site.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpenStore(!isOpenStore)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isOpenStore ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {isOpenStore ? 'Aberta (Aceitando Pedidos)' : 'Fechada (Pausada)'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#726C74] mb-1">Taxa de Entrega Padrão (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-[#ECE8F0] rounded-xl text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#726C74] mb-1">Valor Mínimo para Frete Grátis (R$)</label>
                <input
                  type="number"
                  step="1.00"
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-[#ECE8F0] rounded-xl text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#726C74] mb-1">Tempo Estimado de Entrega</label>
                <input
                  type="text"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#ECE8F0] rounded-xl text-xs sm:text-sm outline-none"
                />
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
};
