import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../services/supabaseClient';
import { 
  LayoutDashboard,
  ShoppingBag, 
  Layers,
  Sparkles,
  Maximize2,
  PlusCircle,
  Tag,
  Boxes,
  Truck, 
  Users,
  BarChart3,
  Sliders, 
  ShieldCheck,
  History,
  Clock, 
  CheckCircle2, 
  ChefHat, 
  XCircle, 
  Phone, 
  Search, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Printer, 
  LogOut, 
  PackageCheck, 
  Check, 
  X,
  Edit2,
  Trash2,
  Copy,
  AlertTriangle,
  Menu,
  Download,
  Flame,
  Gift,
  Crown,
  Coffee,
  Cake,
  TrendingUp,
  CreditCard,
  QrCode,
  Banknote,
  DollarSign
} from 'lucide-react';
import { INITIAL_PRODUCTS, CATEGORIES, ALL_ADDITIONALS, DEFAULT_SIZES } from '../../data/mockProducts';
import type { Product, CategoryInfo, AdditionalItem, ProductSize } from '../../types';

export interface OrderItem {
  productId?: string;
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
  cancellation_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface DeliveryZone {
  id: string;
  neighborhood: string;
  fee: number;
  minOrder: number;
  estimatedTime: string;
  isActive: boolean;
}

export interface CouponItem {
  id: string;
  code: string;
  discountType: 'fixed' | 'percentage' | 'free_shipping';
  discountValue: number;
  minOrder: number;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
}

type TabType = 
  | 'visao_geral'
  | 'pedidos'
  | 'produtos'
  | 'categorias'
  | 'tamanhos'
  | 'adicionais'
  | 'promocoes'
  | 'estoque'
  | 'entregas'
  | 'clientes'
  | 'relatorios'
  | 'configuracoes'
  | 'usuarios'
  | 'auditoria';

const STATUS_CONFIG: Record<RealOrder['status'], { label: string; bg: string; text: string; icon: React.ComponentType<any> }> = {
  new: { label: 'Novo Pedido', bg: 'bg-purple-100', text: 'text-[#69318A]', icon: ShoppingBag },
  confirmed: { label: 'Confirmado', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle2 },
  preparing: { label: 'Em Preparo', bg: 'bg-amber-100', text: 'text-amber-800', icon: ChefHat },
  delivering: { label: 'Em Entrega', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck },
  done: { label: 'Concluído', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: PackageCheck },
  cancelled: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('visao_geral');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Estados Gerenciáveis
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('acai_admin_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [categories, setCategories] = useState<CategoryInfo[]>(CATEGORIES.filter(c => c.id !== 'all'));
  const [addons, setAddons] = useState<AdditionalItem[]>(ALL_ADDITIONALS);
  const [sizes, setSizes] = useState<ProductSize[]>(DEFAULT_SIZES);
  
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([
    { id: '1', neighborhood: 'Gonzaga', fee: 4.00, minOrder: 20.00, estimatedTime: '25 a 35 min', isActive: true },
    { id: '2', neighborhood: 'Boqueirão', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 40 min', isActive: true },
    { id: '3', neighborhood: 'Embaré', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
    { id: '4', neighborhood: 'Ponta da Praia', fee: 6.00, minOrder: 25.00, estimatedTime: '35 a 50 min', isActive: true },
    { id: '5', neighborhood: 'Aparecida', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
    { id: '6', neighborhood: 'Campo Grande', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
    { id: '7', neighborhood: 'Marapé', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
    { id: '8', neighborhood: 'São Vicente (Centro)', fee: 8.00, minOrder: 35.00, estimatedTime: '40 a 55 min', isActive: true },
  ]);

  const [coupons, setCoupons] = useState<CouponItem[]>([
    { id: '1', code: 'PRIMEIRACOMPRA', discountType: 'fixed', discountValue: 5.00, minOrder: 30.00, isActive: true },
    { id: '2', code: 'VERAO10', discountType: 'percentage', discountValue: 10, minOrder: 40.00, isActive: true },
    { id: '3', code: 'FRETEGRATIS', discountType: 'free_shipping', discountValue: 5.00, minOrder: 35.00, isActive: true },
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: '1', user: 'admin@acaipuro.com.br', action: 'Sistema Iniciado', entity: 'Sistema', details: 'Painel administrativo operacional', timestamp: new Date().toLocaleTimeString('pt-BR') }
  ]);

  // Configurações da Loja
  const [storeName, setStoreName] = useState('Açaí Puro Sabor');
  const [storePhone, setStorePhone] = useState('(13) 99150-9733');
  const [storeWhatsApp, setStoreWhatsApp] = useState('5513991509733');
  const [isOpenStore, setIsOpenStore] = useState(true);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(5.00);
  const [freeThreshold, setFreeThreshold] = useState(45.00);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('30 a 45 minutos');
  const [minOrderValue, setMinOrderValue] = useState(15.00);

  // Modais de Edição
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<RealOrder | null>(null);

  const prevUnconfirmedCountRef = useRef<number>(0);
  const audioIntervalRef = useRef<any>(null);

  const logAudit = (action: string, entity: string, details: string) => {
    const newLog: AuditLog = {
      id: String(Date.now()),
      user: 'admin@acaipuro.com.br',
      action,
      entity,
      details,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  // Salvar produtos no localStorage para refletir no cardápio público
  useEffect(() => {
    try {
      localStorage.setItem('acai_admin_products', JSON.stringify(products));
    } catch {}
  }, [products]);

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
          document.title = `Painel de Gestão - Açaí Puro Sabor`;
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playAlertSound]);

  // Supabase Realtime Subscription + Polling
  useEffect(() => {
    setIsLoading(true);
    fetchOrders();

    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('pedidos-loja')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newOrder = payload.new as RealOrder;
                setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id && o.order_number !== newOrder.order_number)]);
                playAlertSound();
                logAudit('Novo Pedido Recebido', 'Pedidos', `Pedido #${newOrder.order_number} (${formatCurrency(newOrder.total)})`);
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

    const interval = setInterval(fetchOrders, 3000);

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchOrders, playAlertSound]);

  // Alerta sonoro repetido para pedidos pendentes
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

  // Atualizar Status do Pedido
  const handleUpdateStatus = async (orderId: string, newStatus: RealOrder['status'], reason?: string) => {
    try {
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, status: newStatus, cancellation_reason: reason } : o));
      logAudit('Status Alterado', 'Pedidos', `Pedido #${orderId} alterado para ${newStatus}`);

      await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, cancellationReason: reason }),
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

  // Métricas do Dashboard
  const countNew = orders.filter(o => o.status === 'new').length;
  const countPreparing = orders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length;
  const countDelivering = orders.filter(o => o.status === 'delivering').length;
  const countDone = orders.filter(o => o.status === 'done').length;
  const validOrders = orders.filter(o => o.status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const averageTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

  // Produto mais vendido
  const topProduct = useMemo(() => {
    const counts: Record<string, number> = {};
    validOrders.forEach(o => {
      (o.items || []).forEach(it => {
        counts[it.name] = (counts[it.name] || 0) + it.quantity;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? `${sorted[0][0]} (${sorted[0][1]}x)` : 'Açaí tradicional';
  }, [validOrders]);

  // Vendas por Forma de Pagamento
  const paymentBreakdown = useMemo(() => {
    const pix = validOrders.filter(o => o.payment_method === 'pix').reduce((s, o) => s + Number(o.total || 0), 0);
    const card = validOrders.filter(o => o.payment_method === 'card_online').reduce((s, o) => s + Number(o.total || 0), 0);
    const delivery = validOrders.filter(o => o.payment_method === 'delivery').reduce((s, o) => s + Number(o.total || 0), 0);
    return { pix, card, delivery };
  }, [validOrders]);

  // Clientes Únicos
  const customersList = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number; totalSpent: number; lastOrder: string }>();
    orders.forEach(o => {
      const key = o.customer_phone || o.customer_name;
      if (!map.has(key)) {
        map.set(key, {
          name: o.customer_name,
          phone: o.customer_phone || 'Não informado',
          count: 0,
          totalSpent: 0,
          lastOrder: o.created_at,
        });
      }
      const c = map.get(key)!;
      c.count += 1;
      if (o.status !== 'cancelled') c.totalSpent += Number(o.total || 0);
    });
    return Array.from(map.values());
  }, [orders]);

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    const headers = ['Pedido', 'Data', 'Cliente', 'Telefone', 'Tipo', 'Total', 'Pagamento', 'Status'];
    const rows = orders.map(o => [
      o.order_number,
      new Date(o.created_at).toLocaleString('pt-BR'),
      `"${o.customer_name}"`,
      `"${o.customer_phone || ''}"`,
      o.fulfillment_type,
      o.total.toFixed(2),
      o.payment_method,
      o.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_pedidos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAudit('Exportação CSV', 'Relatórios', 'Relatório completo de pedidos exportado');
  };

  // Itens do Menu
  const menuItems = [
    { id: 'visao_geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'pedidos', label: 'Pedidos em Tempo Real', icon: ShoppingBag, badge: countNew },
    { id: 'produtos', label: 'Cardápio / Produtos', icon: Layers },
    { id: 'categorias', label: 'Categorias', icon: Sparkles },
    { id: 'tamanhos', label: 'Tamanhos & Preços', icon: Maximize2 },
    { id: 'adicionais', label: 'Adicionais & Toppings', icon: PlusCircle },
    { id: 'promocoes', label: 'Promoções & Cupons', icon: Tag },
    { id: 'estoque', label: 'Estoque & Operação Rápida', icon: Boxes },
    { id: 'entregas', label: 'Entregas & Bairros', icon: Truck },
    { id: 'clientes', label: 'Base de Clientes', icon: Users },
    { id: 'relatorios', label: 'Relatórios & Vendas', icon: BarChart3 },
    { id: 'configuracoes', label: 'Configurações da Loja', icon: Sliders },
    { id: 'usuarios', label: 'Usuários & Permissões', icon: ShieldCheck },
    { id: 'auditoria', label: 'Histórico de Alterações', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6FA] flex flex-col md:flex-row text-[#28242A] font-sans antialiased">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 bg-[#30143D] text-white flex-col justify-between shrink-0 p-4 shadow-xl z-20">
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-xl bg-[#803FA0] text-white flex items-center justify-center font-bold shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate">{storeName}</h1>
              <p className="text-[11px] text-[#FBF7F1]/70">Sistema de Gestão</p>
            </div>
          </div>

          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    isActive 
                      ? 'bg-[#803FA0] text-white shadow-xs' 
                      : 'text-[#FBF7F1]/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOpenStore ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="font-semibold">{isOpenStore ? 'Loja Aberta' : 'Loja Pausada'}</span>
            </div>
            <button
              onClick={() => {
                const next = !isOpenStore;
                setIsOpenStore(next);
                logAudit('Disponibilidade Alterada', 'Loja', next ? 'Loja Aberta' : 'Loja Fechada');
              }}
              className="text-[11px] text-[#C9A66B] hover:underline cursor-pointer"
            >
              {isOpenStore ? 'Pausar' : 'Abrir'}
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* HEADER MOBILE & DRAWER */}
      <div className="md:hidden bg-[#30143D] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">{storeName}</span>
        </div>

        <div className="flex items-center gap-2">
          {countNew > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-black animate-pulse">
              {countNew} novos
            </span>
          )}
          <button onClick={onLogout} className="p-1.5 rounded-lg bg-white/10 text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 flex">
          <div className="w-4/5 max-w-xs bg-[#30143D] text-white p-4 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-bold text-sm">Menu Administrativo</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-white/70">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 overflow-y-auto max-h-[75vh]">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as TabType);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                        activeTab === item.id ? 'bg-[#803FA0] text-white' : 'text-white/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto min-h-screen">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-[#ECE8F0] p-4 sm:px-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#28242A] font-['DM_Sans']">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-[#726C74]">Cardápio e pedidos sincronizados em tempo real</p>
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
              <span>{soundEnabled ? 'Som Ativo' : 'Sem Som'}</span>
            </button>

            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-xl border border-[#ECE8F0] transition-colors cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 1. VISÃO GERAL / DASHBOARD */}
        {/* ============================================================ */}
        {activeTab === 'visao_geral' && (
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Faturamento do Dia</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-2xl font-black text-[#49245B] font-['DM_Sans'] block">
                  {formatCurrency(totalRevenue)}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">✓ {validOrders.length} pedidos realizados</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Ticket Médio</span>
                  <TrendingUp className="w-4 h-4 text-[#69318A]" />
                </div>
                <span className="text-2xl font-black text-[#28242A] font-['DM_Sans'] block">
                  {formatCurrency(averageTicket)}
                </span>
                <span className="text-[11px] text-[#726C74]">Média por pedido</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Novos / Pendentes</span>
                  <ShoppingBag className="w-4 h-4 text-red-500" />
                </div>
                <span className={`text-2xl font-black font-['DM_Sans'] block ${countNew > 0 ? 'text-red-500 animate-pulse' : 'text-[#28242A]'}`}>
                  {countNew}
                </span>
                <span className="text-[11px] text-[#726C74]">Aguardando confirmação</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Em Produção & Entrega</span>
                  <ChefHat className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-black text-amber-600 font-['DM_Sans'] block">
                  {countPreparing + countDelivering}
                </span>
                <span className="text-[11px] text-[#726C74]">{countPreparing} na cozinha, {countDelivering} na rua</span>
              </div>
            </div>

            {/* Destaques Operacionais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Formas de Pagamento */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Vendas por Pagamento</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0]">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#69318A]" />
                      <span className="font-semibold">Pix</span>
                    </div>
                    <span className="font-bold text-[#28242A]">{formatCurrency(paymentBreakdown.pix)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">Cartão Online</span>
                    </div>
                    <span className="font-bold text-[#28242A]">{formatCurrency(paymentBreakdown.card)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0]">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">Na Entrega</span>
                    </div>
                    <span className="font-bold text-[#28242A]">{formatCurrency(paymentBreakdown.delivery)}</span>
                  </div>
                </div>
              </div>

              {/* Produto Mais Vendido */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Campeão de Vendas</h3>
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-3">
                  <Flame className="w-8 h-8 text-[#69318A]" />
                  <div>
                    <span className="text-sm font-bold text-[#28242A] block">{topProduct}</span>
                    <span className="text-[11px] text-[#726C74]">Item com maior saída hoje</span>
                  </div>
                </div>
              </div>

              {/* Status da Loja & Ações Rápidas */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Ações de Operação</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsOpenStore(false);
                      setPausedUntil('30 minutos');
                      logAudit('Pausa Operacional', 'Loja', 'Pausada por 30 minutos');
                    }}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer text-center"
                  >
                    Pausar 30 min
                  </button>
                  <button
                    onClick={() => {
                      setIsOpenStore(false);
                      setPausedUntil('1 hora');
                      logAudit('Pausa Operacional', 'Loja', 'Pausada por 1 hora');
                    }}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer text-center"
                  >
                    Pausar 1 hora
                  </button>
                  <button
                    onClick={() => {
                      setIsOpenStore(true);
                      setPausedUntil(null);
                      logAudit('Reabertura', 'Loja', 'Loja reaberta para pedidos');
                    }}
                    className="col-span-2 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer text-center"
                  >
                    {isOpenStore ? '✓ Loja Aberta (Aceitando Pedidos)' : 'Reabrir Loja Agora'}
                  </button>
                </div>
              </div>

            </div>

            {/* Últimos Pedidos */}
            <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#28242A]">Últimos Pedidos Recebidos</h3>
                <button
                  onClick={() => setActiveTab('pedidos')}
                  className="text-xs text-[#69318A] font-bold hover:underline cursor-pointer"
                >
                  Ver todos ({orders.length}) →
                </button>
              </div>

              {orders.slice(0, 5).map(o => (
                <div key={o.id || o.order_number} className="p-3 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#28242A]">#{o.order_number} - {o.customer_name}</span>
                    <p className="text-[11px] text-[#726C74]">{o.items.length} itens • {formatCurrency(o.total)} • {new Date(o.created_at).toLocaleTimeString('pt-BR')}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${STATUS_CONFIG[o.status]?.bg} ${STATUS_CONFIG[o.status]?.text}`}>
                    {STATUS_CONFIG[o.status]?.label}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* 2. PEDIDOS EM TEMPO REAL */}
        {/* ============================================================ */}
        {activeTab === 'pedidos' && (
          <div className="p-4 sm:p-8 space-y-6">
            {/* Filtros e Busca */}
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

            {/* Lista de Pedidos */}
            <div className="space-y-4">
              {orders
                .filter(order => (statusFilter === 'all' || order.status === statusFilter) &&
                  (!searchQuery || order.order_number.includes(searchQuery) || order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())))
                .map(order => {
                  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                  const StatusIcon = statusInfo.icon;
                  const isNew = order.status === 'new';

                  return (
                    <div
                      key={order.id || order.order_number}
                      className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                        isNew ? 'border-[#69318A] shadow-md ring-2 ring-[#69318A]/20 bg-purple-50/10' : 'border-[#ECE8F0] shadow-xs'
                      }`}
                    >
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
                            title="Imprimir comanda térmica (80mm)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-sm font-bold text-[#28242A]">{order.customer_name}</p>
                          {order.customer_phone && <p className="text-[#726C74]">📞 {order.customer_phone}</p>}
                        </div>
                        <div className="text-[#726C74]">
                          <p className="font-bold text-[#28242A]">{order.fulfillment_type === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'}</p>
                          {order.street && <p>{order.street}, Nº {order.number || 'S/N'} - {order.neighborhood} {order.complement ? `(${order.complement})` : ''}</p>}
                        </div>
                      </div>

                      <div className="bg-[#FCFAF7] p-4 rounded-2xl border border-[#ECE8F0] space-y-2">
                        <div className="space-y-1.5 divide-y divide-[#ECE8F0]">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className={`pt-1.5 text-xs ${idx === 0 ? 'pt-0' : ''}`}>
                              <div className="flex justify-between font-bold text-[#28242A]">
                                <span>{item.quantity}x {item.name} {item.size ? `(${item.size})` : ''}</span>
                                <span>{formatCurrency(item.totalPrice || item.unitPrice)}</span>
                              </div>
                              {item.base && <p className="text-[11px] text-[#726C74]">Base: {item.base}</p>}
                              {item.additionals && item.additionals.length > 0 && (
                                <p className="text-[11px] text-[#69318A]">Adicionais: {item.additionals.join(', ')}</p>
                              )}
                              {item.notes && <p className="text-[11px] text-[#726C74] italic">Obs: {item.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#726C74]">Total:</span>
                          <span className="text-lg font-black text-[#49245B] font-['DM_Sans']">{formatCurrency(order.total)}</span>
                        </div>

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
                              onClick={() => {
                                const reason = prompt('Motivo do cancelamento:');
                                if (reason) handleUpdateStatus(order.id || order.order_number, 'cancelled', reason);
                              }}
                              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold border border-red-200 transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. CARDÁPIO / PRODUTOS (CRUD COMPLETO) */}
        {/* ============================================================ */}
        {activeTab === 'produtos' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Catálogo de Produtos</h3>
                <p className="text-xs text-[#726C74]">Crie, edite preços, fotos e controle a disponibilidade de cada item</p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct({
                    id: `prod_${Date.now()}`,
                    name: '',
                    description: '',
                    category: 'acai',
                    price: 20.00,
                    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80',
                    isAvailable: true,
                    allowsCustomization: true,
                    maxFreeAdditionals: 3,
                  });
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Novo Produto</span>
              </button>
            </div>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(prod => (
                <div key={prod.id} className="bg-white rounded-2xl border border-[#ECE8F0] p-4 space-y-3 shadow-xs hover:border-[#D8CFE3] transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="relative">
                      <img src={prod.image} alt={prod.name} className="w-full h-36 rounded-xl object-cover border border-[#ECE8F0]" />
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${prod.isAvailable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {prod.isAvailable ? 'Disponível' : 'Esgotado'}
                      </span>
                      {prod.badge && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#69318A] text-white text-[10px] font-bold">
                          {prod.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#726C74] uppercase">{prod.category}</span>
                      <h4 className="text-sm font-bold text-[#28242A]">{prod.name}</h4>
                      <p className="text-xs text-[#726C74] line-clamp-2 mt-0.5">{prod.description}</p>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-[#69318A] font-['DM_Sans']">
                        {formatCurrency(prod.promotionalPrice || prod.price)}
                      </span>
                      {prod.promotionalPrice && (
                        <span className="text-xs text-[#726C74] line-through">{formatCurrency(prod.price)}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#ECE8F0] flex items-center justify-between">
                    <button
                      onClick={() => {
                        const updated = products.map(p => p.id === prod.id ? { ...p, isAvailable: !p.isAvailable } : p);
                        setProducts(updated);
                        logAudit('Disponibilidade Produto', 'Produtos', `${prod.name} agora está ${!prod.isAvailable ? 'Disponível' : 'Esgotado'}`);
                      }}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg cursor-pointer ${prod.isAvailable ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'}`}
                    >
                      {prod.isAvailable ? 'Pausar' : 'Ativar'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setIsProductModalOpen(true);
                        }}
                        className="p-1.5 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-lg cursor-pointer"
                        title="Editar produto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja remover "${prod.name}" do cardápio?`)) {
                            const updated = products.filter(p => p.id !== prod.id);
                            setProducts(updated);
                            logAudit('Produto Removido', 'Produtos', `Produto ${prod.name} excluído`);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. CATEGORIAS */}
        {/* ============================================================ */}
        {activeTab === 'categorias' && (
          <div className="p-4 sm:p-8 max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Categorias do Cardápio</h3>
                <p className="text-xs text-[#726C74]">Organize as seções que os clientes veem no site</p>
              </div>
              <button
                onClick={() => {
                  const name = prompt('Nome da nova categoria:');
                  if (name) {
                    const id = name.toLowerCase().replace(/\s+/g, '_');
                    setCategories([...categories, { id, name, iconName: 'Sparkles', description: '' }]);
                    logAudit('Categoria Criada', 'Categorias', `Categoria ${name} adicionada`);
                  }
                }}
                className="px-3.5 py-2 bg-[#69318A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] divide-y divide-[#ECE8F0]">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F3EDF6] text-[#69318A] flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                    <div>
                      <span className="font-bold text-[#28242A] text-sm block">{cat.name}</span>
                      <span className="text-[#726C74]">{cat.description || 'Sem descrição'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Remover categoria "${cat.name}"?`)) {
                        setCategories(categories.filter(c => c.id !== cat.id));
                        logAudit('Categoria Removida', 'Categorias', `Categoria ${cat.name} excluída`);
                      }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. TAMANHOS & PREÇOS */}
        {/* ============================================================ */}
        {activeTab === 'tamanhos' && (
          <div className="p-4 sm:p-8 max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Tamanhos de Açaí</h3>
                <p className="text-xs text-[#726C74]">Valores base aplicados aos produtos vendidos por tamanho</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] divide-y divide-[#ECE8F0]">
              {sizes.map(size => (
                <div key={size.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#28242A] text-sm block">{size.name}</span>
                    <span className="text-[#726C74]">Volume: {size.ml}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#69318A]">{formatCurrency(size.price)}</span>
                    <button
                      onClick={() => {
                        const newPrice = prompt(`Novo preço para ${size.name}:`, size.price.toString());
                        if (newPrice && !isNaN(Number(newPrice))) {
                          setSizes(sizes.map(s => s.id === size.id ? { ...s, price: Number(newPrice) } : s));
                          logAudit('Preço de Tamanho Alterado', 'Tamanhos', `${size.name} alterado para R$ ${newPrice}`);
                        }
                      }}
                      className="px-2.5 py-1 bg-[#F3EDF6] text-[#69318A] font-bold rounded-lg cursor-pointer"
                    >
                      Alterar Preço
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 6. ADICIONAIS & TOPPINGS */}
        {/* ============================================================ */}
        {activeTab === 'adicionais' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Adicionais e Acompanhamentos</h3>
                <p className="text-xs text-[#726C74]">Controle de preços e disponibilidade de cada complemento</p>
              </div>
              <button
                onClick={() => {
                  const name = prompt('Nome do novo adicional:');
                  const priceStr = prompt('Preço do adicional (R$):', '3.00');
                  if (name && priceStr) {
                    const id = `add_${Date.now()}`;
                    setAddons([...addons, { id, name, category: 'frutas', price: Number(priceStr) || 3.0, isFreeEligible: true }]);
                    logAudit('Adicional Criado', 'Adicionais', `Adicional ${name} adicionado`);
                  }
                }}
                className="px-3.5 py-2 bg-[#69318A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Novo Adicional</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {addons.map(add => (
                <div key={add.id} className="bg-white p-3.5 rounded-2xl border border-[#ECE8F0] shadow-xs flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#28242A] block">{add.name}</span>
                    <span className="text-[11px] text-[#726C74]">{add.category} • {formatCurrency(add.price)}</span>
                    {add.isFreeEligible && (
                      <span className="text-[10px] text-[#69318A] font-semibold block">Elegível como grátis</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const newPrice = prompt(`Novo preço para ${add.name}:`, add.price.toString());
                      if (newPrice && !isNaN(Number(newPrice))) {
                        setAddons(addons.map(a => a.id === add.id ? { ...a, price: Number(newPrice) } : a));
                        logAudit('Preço Adicional', 'Adicionais', `${add.name} alterado para R$ ${newPrice}`);
                      }
                    }}
                    className="p-1.5 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-lg cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. PROMOÇÕES & CUPONS */}
        {/* ============================================================ */}
        {activeTab === 'promocoes' && (
          <div className="p-4 sm:p-8 max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Cupons de Desconto</h3>
                <p className="text-xs text-[#726C74]">Crie códigos promocionais para seus clientes</p>
              </div>
              <button
                onClick={() => {
                  const code = prompt('Código do cupom (Ex: PROMO10):');
                  const val = prompt('Valor do desconto (R$ ou %):', '5');
                  if (code && val) {
                    setCoupons([...coupons, { id: String(Date.now()), code: code.toUpperCase(), discountType: 'fixed', discountValue: Number(val), minOrder: 30.00, isActive: true }]);
                    logAudit('Cupom Criado', 'Promoções', `Cupom ${code.toUpperCase()} criado`);
                  }
                }}
                className="px-3.5 py-2 bg-[#69318A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Novo Cupom</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] divide-y divide-[#ECE8F0]">
              {coupons.map(coupon => (
                <div key={coupon.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-[#69318A] text-sm tracking-wider font-mono block">{coupon.code}</span>
                    <span className="text-[#726C74]">Desconto: {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)} • Mínimo: {formatCurrency(coupon.minOrder)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
                    }}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${coupon.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                  >
                    {coupon.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 8. ESTOQUE & OPERAÇÃO RÁPIDA */}
        {/* ============================================================ */}
        {activeTab === 'estoque' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Operação Rápida de Estoque</h3>
              <p className="text-xs text-[#726C74]">Clique para pausar ou reativar itens instantaneamente durante o atendimento</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => {
                    const updated = products.map(p => p.id === prod.id ? { ...p, isAvailable: !p.isAvailable } : p);
                    setProducts(updated);
                    logAudit('Operação Rápida', 'Estoque', `${prod.name} ${!prod.isAvailable ? 'ativado' : 'pausado'}`);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer ${
                    prod.isAvailable 
                      ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50' 
                      : 'border-red-200 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <span className="font-bold text-xs text-[#28242A] line-clamp-2">{prod.name}</span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md self-start ${
                    prod.isAvailable ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {prod.isAvailable ? '✓ Disponível' : '✗ Esgotado'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 9. ENTREGAS & BAIRROS */}
        {/* ============================================================ */}
        {activeTab === 'entregas' && (
          <div className="p-4 sm:p-8 max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#28242A]">Configuração de Frete Geral</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Taxa Padrão (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={defaultDeliveryFee}
                    onChange={(e) => setDefaultDeliveryFee(Number(e.target.value))}
                    className="w-full p-2 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Frete Grátis a partir de (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    value={freeThreshold}
                    onChange={(e) => setFreeThreshold(Number(e.target.value))}
                    className="w-full p-2 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-3">
              <h3 className="text-base font-bold text-[#28242A]">Bairros Atendidos</h3>
              <div className="divide-y divide-[#ECE8F0]">
                {deliveryZones.map(zone => (
                  <div key={zone.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#28242A] text-sm block">{zone.neighborhood}</span>
                      <span className="text-[#726C74]">Tempo: {zone.estimatedTime} • Mínimo: {formatCurrency(zone.minOrder)}</span>
                    </div>
                    <span className="font-bold text-[#69318A] text-sm">{formatCurrency(zone.fee)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 10. BASE DE CLIENTES */}
        {/* ============================================================ */}
        {activeTab === 'clientes' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Base de Clientes</h3>
              <p className="text-xs text-[#726C74]">Histórico e fidelidade dos clientes que já fizeram pedidos</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FCFAF7] border-b border-[#ECE8F0] text-[#726C74] uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Telefone</th>
                    <th className="p-3.5 text-center">Pedidos</th>
                    <th className="p-3.5 text-right">Total Comprado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE8F0]">
                  {customersList.map((c, idx) => (
                    <tr key={idx} className="hover:bg-[#F3EDF6]/30">
                      <td className="p-3.5 font-bold text-[#28242A]">{c.name}</td>
                      <td className="p-3.5 text-[#726C74]">{c.phone}</td>
                      <td className="p-3.5 text-center font-bold">{c.count}</td>
                      <td className="p-3.5 text-right font-extrabold text-[#69318A]">{formatCurrency(c.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 11. RELATÓRIOS & VENDAS */}
        {/* ============================================================ */}
        {activeTab === 'relatorios' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Relatório de Vendas</h3>
                <p className="text-xs text-[#726C74]">Consolidado operacional e financeiro da loja</p>
              </div>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-[#726C74] uppercase">Resumo Operacional</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span>Total de Pedidos:</span><span className="font-bold">{orders.length}</span></div>
                  <div className="flex justify-between"><span>Pedidos Concluídos:</span><span className="font-bold text-emerald-600">{countDone}</span></div>
                  <div className="flex justify-between"><span>Cancelamentos:</span><span className="font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</span></div>
                  <div className="flex justify-between border-t border-[#ECE8F0] pt-2 text-sm">
                    <span className="font-bold">Receita Bruta:</span>
                    <span className="font-extrabold text-[#49245B]">{formatCurrency(totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 12. CONFIGURAÇÕES DA LOJA */}
        {/* ============================================================ */}
        {activeTab === 'configuracoes' && (
          <div className="p-4 sm:p-8 max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4 text-xs">
              <h3 className="text-base font-bold text-[#28242A] border-b border-[#ECE8F0] pb-3">Informações da Loja</h3>
              
              <div>
                <label className="block text-[#726C74] font-bold mb-1">Nome do Estabelecimento</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Telefone / Fixo</label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">WhatsApp para Atendimento</label>
                  <input
                    type="text"
                    value={storeWhatsApp}
                    onChange={(e) => setStoreWhatsApp(e.target.value)}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#726C74] font-bold mb-1">Tempo Estimado de Entrega</label>
                <input
                  type="text"
                  value={estimatedDeliveryTime}
                  onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                />
              </div>

              <button
                onClick={() => {
                  alert('Configurações salvas com sucesso!');
                  logAudit('Configurações Atualizadas', 'Loja', 'Dados cadastrais da loja atualizados');
                }}
                className="w-full py-3 bg-[#69318A] hover:bg-[#572185] text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 13. USUÁRIOS & PERMISSÕES */}
        {/* ============================================================ */}
        {activeTab === 'usuarios' && (
          <div className="p-4 sm:p-8 max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Perfis de Acesso & Equipe</h3>
              <p className="text-xs text-[#726C74]">Níveis de permissão operacional da loja</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] divide-y divide-[#ECE8F0] text-xs">
              {[
                { name: 'Administrador Principal', email: 'admin@acaipuro.com.br', role: 'Administrador Geral', badge: 'bg-purple-100 text-[#69318A]' },
                { name: 'Gerente Operacional', email: 'gerente@acaipuro.com.br', role: 'Gerente', badge: 'bg-blue-100 text-blue-800' },
                { name: 'Terminal Cozinha', email: 'cozinha@acaipuro.com.br', role: 'Cozinha', badge: 'bg-amber-100 text-amber-800' },
                { name: 'Entregador Chefe', email: 'entregas@acaipuro.com.br', role: 'Entregador', badge: 'bg-indigo-100 text-indigo-800' },
              ].map((user, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#28242A] text-sm block">{user.name}</span>
                    <span className="text-[#726C74]">{user.email}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-xl font-bold ${user.badge}`}>{user.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 14. HISTÓRICO DE AUDITORIA */}
        {/* ============================================================ */}
        {activeTab === 'auditoria' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Histórico de Auditoria</h3>
              <p className="text-xs text-[#726C74]">Registro imutável de todas as ações administrativas realizadas no painel</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] divide-y divide-[#ECE8F0] text-xs">
              {auditLogs.map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#28242A]">{log.action}</span>
                      <span className="px-2 py-0.5 bg-[#F3EDF6] text-[#69318A] rounded-md text-[10px] font-bold">{log.entity}</span>
                    </div>
                    <p className="text-[#726C74]">{log.details}</p>
                  </div>
                  <span className="text-[#726C74] font-mono text-[11px]">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE PRODUTO */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-[#ECE8F0]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-[#ECE8F0]">
              <h3 className="text-base font-bold text-[#28242A]">
                {products.some(p => p.id === editingProduct.id) ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1.5 text-[#726C74] hover:text-[#28242A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#726C74] font-bold mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Ex: Combo Família Premium"
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[#726C74] font-bold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Descrição dos ingredientes e itens inclusos"
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Preço Normal (R$) *</label>
                  <input
                    type="number"
                    step="0.10"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-bold text-[#69318A]"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Preço Promocional (R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={editingProduct.promotionalPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, promotionalPrice: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Opcional"
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#726C74] font-bold mb-1">URL da Imagem</label>
                <input
                  type="text"
                  value={editingProduct.image}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                />
                {editingProduct.image && (
                  <img src={editingProduct.image} alt="Preview" className="w-full h-28 object-cover rounded-xl mt-2 border border-[#ECE8F0]" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Categoria</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-semibold"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Selo / Destaque</label>
                  <input
                    type="text"
                    value={editingProduct.badge || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value || undefined })}
                    placeholder="Ex: Mais pedido, Oferta"
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FCFAF7] rounded-xl border border-[#ECE8F0]">
                <div>
                  <span className="font-bold text-[#28242A] block">Disponibilidade</span>
                  <span className="text-[11px] text-[#726C74]">Item visível e ativo para compra</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct({ ...editingProduct, isAvailable: !editingProduct.isAvailable })}
                  className={`px-3 py-1.5 rounded-lg font-bold ${editingProduct.isAvailable ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                >
                  {editingProduct.isAvailable ? 'Disponível' : 'Esgotado'}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ECE8F0] flex gap-2">
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#28242A] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!editingProduct.name.trim()) return alert('Informe o nome do produto');
                  const exists = products.some(p => p.id === editingProduct.id);
                  if (exists) {
                    setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
                    logAudit('Produto Atualizado', 'Produtos', `Produto ${editingProduct.name} atualizado (R$ ${editingProduct.price})`);
                  } else {
                    setProducts([...products, editingProduct]);
                    logAudit('Produto Criado', 'Produtos', `Produto ${editingProduct.name} cadastrado`);
                  }
                  setIsProductModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Salvar Produto
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
