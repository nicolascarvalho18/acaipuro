import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  ChefHat, 
  XCircle, 
  Send, 
  Phone, 
  Search, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Printer, 
  Sliders, 
  Store, 
  LogOut, 
  PackageCheck, 
  BellRing, 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  Layers 
} from 'lucide-react';
import { INITIAL_PRODUCTS, ALL_ADDITIONALS } from '../../data/mockProducts';
import type { Product } from '../../types';

interface OrderAddon {
  addon_name: string;
  addon_price: number;
  quantity: number;
}

interface OrderItem {
  id?: string;
  product_name: string;
  size?: string;
  base?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  addons?: OrderAddon[];
}

export interface FullOrder {
  id?: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  fulfillment_type: 'delivery' | 'pickup';
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_complement?: string;
  address_reference?: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'pix' | 'card_online' | 'delivery';
  payment_status: 'pending' | 'paid' | 'paid_on_delivery' | 'rejected';
  status: 'novo' | 'confirmado' | 'em_preparo' | 'saiu_para_entrega' | 'entregue' | 'cancelado';
  notes?: string;
  whatsapp_status?: string;
  created_at: string;
  confirmed_at?: string;
  items?: OrderItem[];
}

const STATUS_MAP: Record<FullOrder['status'], { label: string; bg: string; text: string; icon: React.ComponentType<any> }> = {
  novo: { label: 'Novo Pedido', bg: 'bg-purple-100', text: 'text-[#69318A]', icon: ShoppingBag },
  confirmado: { label: 'Confirmado', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle2 },
  em_preparo: { label: 'Em Preparo', bg: 'bg-amber-100', text: 'text-amber-800', icon: ChefHat },
  saiu_para_entrega: { label: 'Em Entrega', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck },
  entregue: { label: 'Entregue', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: PackageCheck },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'cardapio' | 'configuracoes'>('pedidos');
  const [orders, setOrders] = useState<FullOrder[]>([]);
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
  const [productsList, setProductsList] = useState<Product[]>(INITIAL_PRODUCTS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  // Carregar Pedidos
  const fetchOrders = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_auth_token') || 'valid';
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const newCount = data.orders.filter((o: FullOrder) => o.status === 'novo').length;
        
        // Dispara som se chegou pedido novo
        if (newCount > prevUnconfirmedCountRef.current && prevUnconfirmedCountRef.current !== 0) {
          playAlertSound();
        }
        prevUnconfirmedCountRef.current = newCount;
        setOrders(data.orders);

        // Atualizar título da aba do navegador
        if (newCount > 0) {
          document.title = `(${newCount}) 🔔 Novo Pedido! - Açaí Puro Sabor`;
        } else {
          document.title = `Painel do Lojista - Açaí Puro Sabor`;
        }
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playAlertSound]);

  // Carregar Configurações
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setIsOpenStore(data.settings.is_open);
        setDeliveryFee(data.settings.delivery_fee);
        setFreeThreshold(data.settings.free_delivery_threshold);
        setEstimatedTime(data.settings.estimated_delivery_time);
      }
    } catch (e) {
      console.warn('Settings load error:', e);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchOrders();
    fetchSettings();

    // Polling em tempo real a cada 3 segundos
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Alerta sonoro repetido enquanto houver pedido novo sem confirmação
  useEffect(() => {
    const unconfirmed = orders.filter(o => o.status === 'novo');
    if (soundEnabled && unconfirmed.length > 0) {
      if (!audioIntervalRef.current) {
        audioIntervalRef.current = setInterval(playAlertSound, 12000);
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

  // Atualizar Status do Pedido
  const handleUpdateStatus = async (orderId: string, newStatus: FullOrder['status']) => {
    try {
      // Atualização otimista imediata
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

  // Salvar Configurações da Loja
  const handleSaveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_open: isOpenStore,
          delivery_fee: deliveryFee,
          free_delivery_threshold: freeThreshold,
          estimated_delivery_time: estimatedTime,
        }),
      });
      alert('Configurações salvas com sucesso!');
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  };

  // Imprimir Pedido (Formato Cupom Térmico 80mm)
  const handlePrintOrder = (order: FullOrder) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map(item => `
      <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #ccc;">
        <strong>${item.quantity}x ${item.product_name} ${item.size ? `(${item.size})` : ''}</strong>
        ${item.base ? `<div style="font-size: 11px;">Base: ${item.base}</div>` : ''}
        ${item.addons && item.addons.length > 0 ? `<div style="font-size: 11px;">Adicionais: ${item.addons.map(a => a.addon_name).join(', ')}</div>` : ''}
        ${item.notes ? `<div style="font-size: 11px; font-style: italic;">Obs: ${item.notes}</div>` : ''}
        <div style="text-align: right; font-weight: bold;">${formatCurrency(item.total_price || item.unit_price)}</div>
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
          ${order.address_street ? `<div><strong>ENDEREÇO:</strong> ${order.address_street}, ${order.address_number || ''} - ${order.address_neighborhood || ''} ${order.address_complement || ''}</div>` : ''}
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

  // Métricas do Dia
  const todayOrders = orders;
  const countNew = todayOrders.filter(o => o.status === 'novo').length;
  const countPreparing = todayOrders.filter(o => o.status === 'em_preparo').length;
  const countDelivering = todayOrders.filter(o => o.status === 'saiu_para_entrega').length;
  const countDone = todayOrders.filter(o => o.status === 'entregue').length;
  const totalRevenue = todayOrders.filter(o => o.status !== 'cancelado').reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Filtragem de Pedidos
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      order.order_number.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      (order.customer_phone && order.customer_phone.includes(q)) ||
      (order.address_neighborhood && order.address_neighborhood.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F6FA] flex flex-col md:flex-row text-[#28242A] font-sans">
      
      {/* SIDEBAR LATERAL */}
      <aside className="w-full md:w-64 bg-[#30143D] text-white flex flex-col justify-between shrink-0 p-5 shadow-xl">
        <div className="space-y-6">
          {/* Logo / Título */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#803FA0] text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Açaí Puro Sabor</h1>
              <p className="text-[11px] text-[#FBF7F1]/70">Painel do Lojista</p>
            </div>
          </div>

          {/* Navegação */}
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

        {/* Status da Loja & Logout */}
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
            <p className="text-xs text-[#726C74]">Sincronização instantânea com dispositivos dos clientes</p>
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
              title="Ativar ou desativar som de novos pedidos"
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
            
            {/* RESUMO DO DIA (INDICADORES) */}
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
                  { id: 'novo', label: 'Novos', count: countNew, isAlert: true },
                  { id: 'confirmado', label: 'Confirmados', count: orders.filter(o => o.status === 'confirmado').length },
                  { id: 'em_preparo', label: 'Em Preparo', count: countPreparing },
                  { id: 'saiu_para_entrega', label: 'Em Entrega', count: countDelivering },
                  { id: 'entregue', label: 'Entregues', count: countDone },
                  { id: 'cancelado', label: 'Cancelados', count: orders.filter(o => o.status === 'cancelado').length },
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

            {/* LISTA DE PEDIDOS */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-[#ECE8F0] text-center space-y-2">
                  <ShoppingBag className="w-12 h-12 text-[#ECE8F0] mx-auto" />
                  <h3 className="text-base font-bold text-[#28242A]">Nenhum pedido encontrado</h3>
                  <p className="text-xs text-[#726C74]">Quando novos pedidos forem realizados, eles aparecerão aqui instantaneamente em tempo real.</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.novo;
                  const StatusIcon = statusInfo.icon;
                  const isNew = order.status === 'novo';

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
                              <a
                                href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#69318A] hover:underline font-bold"
                              >
                                Conversar no WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-[#726C74]">
                          <p className="font-bold text-[#28242A]">
                            {order.fulfillment_type === 'delivery' ? '🛵 Entrega em domicílio' : '🏪 Retirada no balcão'}
                          </p>
                          {order.fulfillment_type === 'delivery' && (order.address_street || order.address_neighborhood) && (
                            <p className="line-clamp-2">
                              {order.address_street}, Nº {order.address_number || 'S/N'} - {order.address_neighborhood}
                              {order.address_complement ? ` (${order.address_complement})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      <div className="bg-[#FCFAF7] p-4 rounded-2xl border border-[#ECE8F0] space-y-3">
                        <p className="text-[11px] font-bold text-[#726C74] uppercase tracking-wider">Itens e Adicionais</p>
                        <div className="space-y-2.5 divide-y divide-[#ECE8F0]/80">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className={`pt-2 text-xs ${idx === 0 ? 'pt-0' : ''}`}>
                              <div className="flex justify-between font-bold text-[#28242A]">
                                <span>{item.quantity}x {item.product_name} {item.size ? `(${item.size})` : ''}</span>
                                <span>{formatCurrency(item.total_price || item.unit_price)}</span>
                              </div>
                              {item.base && item.base !== 'Açaí tradicional' && (
                                <p className="text-[11px] text-[#726C74]">Base: {item.base}</p>
                              )}
                              {item.addons && item.addons.length > 0 && (
                                <p className="text-[11px] text-[#69318A] font-medium">
                                  Adicionais: {item.addons.map(a => a.addon_name).join(', ')}
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

                      {/* Resumo Financeiro */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#726C74]">Total do Pedido:</span>
                          <span className="text-lg font-black text-[#49245B] font-['DM_Sans']">
                            {formatCurrency(order.total)}
                          </span>
                          <span className="text-[11px] text-[#726C74] bg-[#F3EDF6] px-2 py-0.5 rounded-lg">
                            {order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'card_online' ? 'Cartão Online' : 'Na Entrega'}
                          </span>
                        </div>

                        {/* Botões de Ação de Status com 1 Clique */}
                        <div className="flex flex-wrap items-center gap-2">
                          {isNew && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'confirmado')}
                              className="px-4 py-2 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirmar Pedido</span>
                            </button>
                          )}

                          {order.status === 'confirmado' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'em_preparo')}
                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ChefHat className="w-4 h-4" />
                              <span>Iniciar Preparo</span>
                            </button>
                          )}

                          {order.status === 'em_preparo' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'saiu_para_entrega')}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck className="w-4 h-4" />
                              <span>Saiu para Entrega</span>
                            </button>
                          )}

                          {order.status === 'saiu_para_entrega' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'entregue')}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <PackageCheck className="w-4 h-4" />
                              <span>Marcar como Entregue</span>
                            </button>
                          )}

                          {order.status !== 'entregue' && order.status !== 'cancelado' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id || order.order_number, 'cancelado')}
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
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Produtos do Cardápio</h3>
                <p className="text-xs text-[#726C74]">Gerencie preços, adicionais e disponibilidade</p>
              </div>
              <button
                onClick={() => alert('Para adicionar novos itens diretamente pelo painel, selecione o produto na lista para editar ou use a sincronização do banco.')}
                className="px-4 py-2 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Produto</span>
              </button>
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

                  <div className="pt-2 border-t border-[#ECE8F0] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Disponível</span>
                    <button
                      onClick={() => alert(`Editando ${product.name}. Preço atual: ${formatCurrency(product.price)}`)}
                      className="text-[#69318A] hover:underline font-bold text-[11px]"
                    >
                      Editar
                    </button>
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
                Disponibilidade e Entrega
              </h3>

              {/* Loja Aberta/Fechada */}
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

              {/* Taxa de Entrega */}
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

              {/* Frete Grátis */}
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

              {/* Tempo Estimado */}
              <div>
                <label className="block text-xs font-bold text-[#726C74] mb-1">Tempo Estimado de Entrega</label>
                <input
                  type="text"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#ECE8F0] rounded-xl text-xs sm:text-sm outline-none"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-3 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

      </main>

    </div>
  );
};
