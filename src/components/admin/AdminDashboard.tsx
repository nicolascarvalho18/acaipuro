import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useStore } from '../../contexts/StoreContext';
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
  DollarSign,
  Store,
  Archive,
  ArchiveRestore,
  MessageSquare,
  Wallet,
  Calendar,
  AlertCircle,
  Navigation
} from 'lucide-react';
import type { Product, CategoryInfo, AdditionalItem, ProductSize } from '../../types';
import { AdminLiveDeliveries } from './AdminLiveDeliveries';
import { createDeliveryOffer } from '../../services/deliveryService';

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
  access_token?: string;
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
  status: 'new' | 'confirmed' | 'preparing' | 'delivering' | 'ready_for_pickup' | 'done' | 'cancelled';
  notes?: string;
  cancellation_reason?: string;
  internal_notes?: string;
  is_archived?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
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
  | 'entregas_mapa'
  | 'caixa'
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
  ready_for_pickup: { label: 'Pronto p/ Retirada', bg: 'bg-teal-100', text: 'text-teal-800', icon: Store },
  done: { label: 'Concluído', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: PackageCheck },
  cancelled: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

// Obter data formatada no fuso de São Paulo (YYYY-MM-DD)
function getSaoPauloDate(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  const day = parts.find(p => p.type === 'day')?.value || '01';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  return `${year}-${month}-${day}`;
}

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { 
    products, 
    categories, 
    addons, 
    sizes, 
    deliveryZones, 
    storeSettings, 
    isOpen, 
    pausedUntil, 
    updateProduct, 
    addProduct, 
    deleteProduct, 
    updateStoreSettings, 
    toggleStoreOpen, 
    toggleProductAvailability,
    updateSizePrice,
    updateAddonPrice,
    refreshCatalog
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('visao_geral');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('hoje'); // 'hoje' | 'ontem' | '7dias' | '30dias' | 'todos'

  // Modal de Cancelamento
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Observações Internas
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [internalNoteText, setInternalNoteText] = useState('');

  // Caixa Diário
  const [cashSession, setCashSession] = useState<any>(null);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashActionType, setCashActionType] = useState<'open' | 'sangria' | 'suprimento' | 'close'>('open');
  const [cashInputValue, setCashInputValue] = useState('');
  const [cashInputDesc, setCashInputDesc] = useState('');

  const [coupons, setCoupons] = useState<CouponItem[]>([
    { id: '1', code: 'PRIMEIRACOMPRA', discountType: 'fixed', discountValue: 5.00, minOrder: 30.00, isActive: true },
    { id: '2', code: 'VERAO10', discountType: 'percentage', discountValue: 10, minOrder: 40.00, isActive: true },
    { id: '3', code: 'FRETEGRATIS', discountType: 'free_shipping', discountValue: 5.00, minOrder: 35.00, isActive: true },
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: '1', user: 'admin@acaipuro.com.br', action: 'Sistema Iniciado', entity: 'Sistema', details: 'Painel administrativo operacional', timestamp: new Date().toLocaleTimeString('pt-BR') }
  ]);

  // Modais de Edição de Produto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const prevUnconfirmedCountRef = useRef<number>(0);
  const recentUpdatesRef = useRef<Map<string, { status: RealOrder['status']; timestamp: number }>>(new Map());

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
      playBeep(587.33, 0, 0.15);
      playBeep(783.99, 0.12, 0.15);
      playBeep(987.77, 0.24, 0.25);
    } catch (e) {
      console.warn('Sound error:', e);
    }
  }, [soundEnabled]);

  // Carregar Pedidos da API
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?includeArchived=true');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const now = Date.now();
        // Mesclar respeitando atualizações recentes locais
        const mergedOrders = data.orders.map((fetched: RealOrder) => {
          const recent = recentUpdatesRef.current.get(fetched.id || '') || recentUpdatesRef.current.get(fetched.order_number);
          if (recent && (now - recent.timestamp) < 8000) {
            return { ...fetched, status: recent.status };
          }
          return fetched;
        });

        const newCount = mergedOrders.filter((o: RealOrder) => o.status === 'new' && !o.is_archived && !o.deleted_at).length;
        
        if (newCount > prevUnconfirmedCountRef.current && prevUnconfirmedCountRef.current !== 0) {
          playAlertSound();
        }
        prevUnconfirmedCountRef.current = newCount;
        setOrders(mergedOrders);

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

  // Carregar Caixa
  const fetchCashRegister = useCallback(async () => {
    try {
      const res = await fetch('/api/cash-register');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCashSession(data.activeSession);
          setCashMovements(data.movements || []);
        }
      }
    } catch {}
  }, []);

  // Supabase Realtime Subscription + Polling
  useEffect(() => {
    setIsLoading(true);
    fetchOrders();
    fetchCashRegister();

    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('pedidos-loja-admin')
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
  }, [fetchOrders, fetchCashRegister, playAlertSound]);

  // Atualizar Status do Pedido com sincronização total
  const handleUpdateStatus = async (orderId: string, newStatus: RealOrder['status'], reason?: string) => {
    try {
      // 1. Gravar no registro recente para evitar rollback de polling
      recentUpdatesRef.current.set(orderId, { status: newStatus, timestamp: Date.now() });

      // 2. Atualizar estado otimista no React
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, status: newStatus, cancellation_reason: reason } : o));
      logAudit('Status Alterado', 'Pedidos', `Pedido #${orderId} alterado para ${newStatus}`);

      // 3. Atualizar diretamente no Supabase pelo frontend se disponível
      if (supabase) {
        try {
          const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
          const updatePayload: any = {
            status: newStatus,
            updated_at: new Date().toISOString(),
          };
          if (newStatus === 'done') updatePayload.completed_at = new Date().toISOString();
          if (newStatus === 'cancelled') updatePayload.cancellation_reason = reason || 'Cancelado pela loja';

          let q = supabase.from('orders').update(updatePayload);
          if (isIdUuid) {
            q = q.eq('id', orderId);
          } else {
            q = q.eq('order_number', orderId);
          }
          await q;
        } catch (supaErr) {
          console.warn('[Direct Supabase update warn]:', supaErr);
        }
      }

      // 4. Chamar endpoint do backend para histórico e notificações
      await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, reason }),
      });
    } catch (e) {
      console.error('Update status error:', e);
    }
  };

  // Arquivar / Desarquivar Pedido
  const handleToggleArchive = async (orderId: string, isArchived: boolean) => {
    try {
      const action = isArchived ? 'unarchive' : 'archive';
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, is_archived: !isArchived } : o));
      logAudit(isArchived ? 'Pedido Desarquivado' : 'Pedido Arquivado', 'Pedidos', `Pedido #${orderId}`);

      await fetch('/api/orders/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      });
    } catch (e) {
      console.error('Archive error:', e);
    }
  };

  // Excluir Logicamente Pedido
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente excluir logicamente este pedido? O registro será mantido na auditoria.')) return;
    try {
      setOrders(prev => prev.filter(o => o.id !== orderId && o.order_number !== orderId));
      logAudit('Exclusão Lógica', 'Pedidos', `Pedido #${orderId} excluído`);

      await fetch('/api/orders/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'delete' }),
      });
    } catch (e) {
      console.error('Delete order error:', e);
    }
  };

  // Salvar Observação Interna
  const handleSaveInternalNotes = async (orderId: string, notes: string) => {
    try {
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, internal_notes: notes } : o));
      setEditingNotesId(null);
      await fetch('/api/orders/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'update_notes', notes }),
      });
    } catch (e) {
      console.error('Save notes error:', e);
    }
  };

  // Ações de Caixa
  const handleCashSubmit = async () => {
    const val = Number(cashInputValue.replace(',', '.'));
    if (isNaN(val) && cashActionType !== 'close') {
      return alert('Informe um valor numérico válido');
    }

    try {
      if (cashActionType === 'open') {
        const res = await fetch('/api/cash-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'open_session', initialCash: val, notes: cashInputDesc }),
        });
        const data = await res.json();
        if (data.success) {
          setCashSession(data.session);
          logAudit('Abertura de Caixa', 'Financeiro', `Caixa aberto com ${formatCurrency(val)}`);
        }
      } else if (cashActionType === 'sangria' || cashActionType === 'suprimento') {
        const res = await fetch('/api/cash-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'add_movement', 
            sessionId: cashSession?.id, 
            amount: val, 
            type: cashActionType, 
            description: cashInputDesc 
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCashMovements(prev => [data.movement, ...prev]);
          logAudit(cashActionType === 'sangria' ? 'Sangria' : 'Suprimento', 'Financeiro', `${cashActionType}: ${formatCurrency(val)}`);
        }
      } else if (cashActionType === 'close') {
        const res = await fetch('/api/cash-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'close_session', 
            sessionId: cashSession?.id, 
            finalCash: val, 
            notes: cashInputDesc 
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCashSession(null);
          setCashMovements([]);
          logAudit('Fechamento de Caixa', 'Financeiro', `Caixa fechado com ${formatCurrency(val)}`);
        }
      }
      setIsCashModalOpen(false);
      setCashInputValue('');
      setCashInputDesc('');
      fetchCashRegister();
    } catch (e) {
      alert('Erro ao processar movimentação de caixa');
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
          <div><strong>MODALIDADE:</strong> ${order.fulfillment_type === 'delivery' ? 'ENTREGA' : 'RETIRADA'}</div>
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
          ${order.internal_notes ? `<div class="divider"></div><div><strong>OBS INTERNA:</strong> ${order.internal_notes}</div>` : ''}
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

  // CÁLCULOS FINANCEIROS EXATOS COM FUSO HORÁRIO AMERICA/SAO_PAULO
  const todaySP = useMemo(() => getSaoPauloDate(), []);
  
  const todayOrders = useMemo(() => {
    return orders.filter(o => !o.deleted_at && getSaoPauloDate(o.created_at) === todaySP);
  }, [orders, todaySP]);

  // Faturamento Realizado Hoje: apenas pedidos 'done' (entregues/retirados)
  const faturamentoRealizadoHoje = useMemo(() => {
    return todayOrders
      .filter(o => o.status === 'done')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [todayOrders]);

  // Valor Previsto Hoje: pedidos em andamento
  const valorPrevistoHoje = useMemo(() => {
    return todayOrders
      .filter(o => ['new', 'confirmed', 'preparing', 'delivering', 'ready_for_pickup'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [todayOrders]);

  const pedidosConcluidosHoje = useMemo(() => {
    return todayOrders.filter(o => o.status === 'done').length;
  }, [todayOrders]);

  const pedidosCanceladosHoje = useMemo(() => {
    return todayOrders.filter(o => o.status === 'cancelled').length;
  }, [todayOrders]);

  const ticketMedioHoje = useMemo(() => {
    return pedidosConcluidosHoje > 0 ? faturamentoRealizadoHoje / pedidosConcluidosHoje : 0;
  }, [faturamentoRealizadoHoje, pedidosConcluidosHoje]);

  // Pagamentos de hoje
  const paymentBreakdownHoje = useMemo(() => {
    const doneToday = todayOrders.filter(o => o.status === 'done');
    const pix = doneToday.filter(o => o.payment_method === 'pix').reduce((s, o) => s + Number(o.total || 0), 0);
    const card = doneToday.filter(o => o.payment_method === 'card_online').reduce((s, o) => s + Number(o.total || 0), 0);
    const delivery = doneToday.filter(o => o.payment_method === 'delivery').reduce((s, o) => s + Number(o.total || 0), 0);
    return { pix, card, delivery };
  }, [todayOrders]);

  // Contadores gerais da visualização ativa
  const activeOperationalOrders = useMemo(() => {
    return orders.filter(o => !o.deleted_at && !o.is_archived);
  }, [orders]);

  const countNew = activeOperationalOrders.filter(o => o.status === 'new').length;
  const countPreparing = activeOperationalOrders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length;
  const countDelivering = activeOperationalOrders.filter(o => o.status === 'delivering' || o.status === 'ready_for_pickup').length;
  const countDone = activeOperationalOrders.filter(o => o.status === 'done').length;

  // Produto mais vendido
  const topProduct = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.filter(o => o.status === 'done').forEach(o => {
      (o.items || []).forEach(it => {
        counts[it.name] = (counts[it.name] || 0) + it.quantity;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? `${sorted[0][0]} (${sorted[0][1]}x)` : 'Açaí tradicional';
  }, [orders]);

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
      if (o.status === 'done') c.totalSpent += Number(o.total || 0);
    });
    return Array.from(map.values());
  }, [orders]);

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    const headers = ['Pedido', 'Data (SP)', 'Cliente', 'Telefone', 'Tipo', 'Subtotal', 'Frete', 'Total', 'Pagamento', 'Status', 'Cancelamento'];
    const rows = orders.map(o => [
      o.order_number,
      new Date(o.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      `"${o.customer_name}"`,
      `"${o.customer_phone || ''}"`,
      o.fulfillment_type,
      o.subtotal.toFixed(2),
      o.delivery_fee.toFixed(2),
      o.total.toFixed(2),
      o.payment_method,
      o.status,
      `"${o.cancellation_reason || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_vendas_${getSaoPauloDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAudit('Exportação CSV', 'Relatórios', 'Relatório completo de pedidos exportado');
  };

  const menuItems = [
    { id: 'visao_geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'pedidos', label: 'Pedidos em Tempo Real', icon: ShoppingBag, badge: countNew },
    { id: 'entregas_mapa', label: 'Entregas no Mapa (GPS)', icon: Navigation },
    { id: 'caixa', label: 'Caixa & Fechamento', icon: Wallet },
    { id: 'produtos', label: 'Cardápio / Produtos', icon: Layers },
    { id: 'categorias', label: 'Categorias', icon: Sparkles },
    { id: 'tamanhos', label: 'Tamanhos & Preços', icon: Maximize2 },
    { id: 'adicionais', label: 'Adicionais & Toppings', icon: PlusCircle },
    { id: 'promocoes', label: 'Promoções & Cupons', icon: Tag },
    { id: 'estoque', label: 'Estoque & Operação', icon: Boxes },
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
              <h1 className="text-sm font-bold tracking-tight truncate">{storeSettings.storeName}</h1>
              <p className="text-[11px] text-[#FBF7F1]/70">Sistema de Gestão & Delivery</p>
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
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="font-semibold">{isOpen ? 'Loja Aberta' : 'Loja Pausada'}</span>
            </div>
            <button
              onClick={() => {
                toggleStoreOpen(!isOpen);
                logAudit('Disponibilidade Alterada', 'Loja', !isOpen ? 'Loja Aberta' : 'Loja Fechada');
              }}
              className="text-[11px] text-[#C9A66B] hover:underline cursor-pointer"
            >
              {isOpen ? 'Pausar' : 'Abrir'}
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

      {/* HEADER MOBILE */}
      <div className="md:hidden bg-[#30143D] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">{storeSettings.storeName}</span>
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#28242A] font-['DM_Sans']">
                {menuItems.find(m => m.id === activeTab)?.label}
              </h2>
              <span className="text-[10px] text-[#69318A] bg-purple-50 px-2 py-0.5 rounded-full font-bold border border-purple-100">
                Fuso: America/Sao_Paulo
              </span>
            </div>
            <p className="text-xs text-[#726C74]">Total do dia zera automaticamente à meia-noite • Histórico permanente no banco</p>
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
              onClick={() => {
                fetchOrders();
                fetchCashRegister();
                refreshCatalog();
              }}
              disabled={isLoading}
              className="p-2 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-xl border border-[#ECE8F0] transition-colors cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* 1. VISÃO GERAL */}
        {activeTab === 'visao_geral' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Faturamento Realizado Hoje */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Faturamento Hoje (Entregue)</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-2xl font-black text-[#49245B] font-['DM_Sans'] block">
                  {formatCurrency(faturamentoRealizadoHoje)}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">✓ {pedidosConcluidosHoje} pedidos concluídos hoje</span>
              </div>

              {/* Valor Previsto / Em Andamento */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Previsto (Em Produção)</span>
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-black text-amber-600 font-['DM_Sans'] block">
                  {formatCurrency(valorPrevistoHoje)}
                </span>
                <span className="text-[11px] text-[#726C74]">Pedidos em preparo/entrega</span>
              </div>

              {/* Novos / Pendentes */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Novos Pedidos</span>
                  <ShoppingBag className="w-4 h-4 text-red-500" />
                </div>
                <span className={`text-2xl font-black font-['DM_Sans'] block ${countNew > 0 ? 'text-red-500 animate-pulse' : 'text-[#28242A]'}`}>
                  {countNew}
                </span>
                <span className="text-[11px] text-[#726C74]">Aguardando confirmação</span>
              </div>

              {/* Ticket Médio */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Ticket Médio Hoje</span>
                  <DollarSign className="w-4 h-4 text-[#69318A]" />
                </div>
                <span className="text-2xl font-black text-[#28242A] font-['DM_Sans'] block">
                  {formatCurrency(ticketMedioHoje)}
                </span>
                <span className="text-[11px] text-[#726C74]">Média por pedido concluído</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Formas de Pagamento Hoje */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Vendas de Hoje por Pagamento</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0]">
                    <div className="flex items-center gap-2"><QrCode className="w-4 h-4 text-[#69318A]" /><span className="font-semibold">Pix</span></div>
                    <span className="font-bold text-[#28242A]">{formatCurrency(paymentBreakdownHoje.pix)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0]">
                    <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" /><span className="font-semibold">Cartão</span></div>
                    <span className="font-bold text-[#28242A]">{formatCurrency(paymentBreakdownHoje.card)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0]">
                    <div className="flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-600" /><span className="font-semibold">Na Entrega</span></div>
                    <span className="font-bold text-[#28242A]">{formatCurrency(paymentBreakdownHoje.delivery)}</span>
                  </div>
                </div>
              </div>

              {/* Campeão de Vendas */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Campeão de Vendas</h3>
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-3">
                  <Flame className="w-8 h-8 text-[#69318A]" />
                  <div>
                    <span className="text-sm font-bold text-[#28242A] block">{topProduct}</span>
                    <span className="text-[11px] text-[#726C74]">Item com maior saída no histórico</span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Ações de Operação</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      toggleStoreOpen(false, '30 minutos');
                      logAudit('Pausa Operacional', 'Loja', 'Pausada por 30 minutos');
                    }}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer text-center"
                  >
                    Pausar 30 min
                  </button>
                  <button
                    onClick={() => {
                      toggleStoreOpen(false, '1 hora');
                      logAudit('Pausa Operacional', 'Loja', 'Pausada por 1 hora');
                    }}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer text-center"
                  >
                    Pausar 1 hora
                  </button>
                  <button
                    onClick={() => {
                      toggleStoreOpen(true);
                      logAudit('Reabertura', 'Loja', 'Loja reaberta para pedidos');
                    }}
                    className="col-span-2 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer text-center"
                  >
                    {isOpen ? '✓ Loja Aberta (Aceitando Pedidos)' : 'Reabrir Loja Agora'}
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

        {/* 2. PEDIDOS EM TEMPO REAL (GESTÃO OPERACIONAL COMPLETA) */}
        {activeTab === 'pedidos' && (
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* Barra de Filtros e Busca */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#ECE8F0] space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#726C74] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, pedido #, telefone ou bairro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-xl text-xs sm:text-sm text-[#28242A] outline-none"
                  />
                </div>

                {/* Filtro de Modalidade */}
                <select
                  value={fulfillmentFilter}
                  onChange={(e) => setFulfillmentFilter(e.target.value)}
                  className="py-2 px-3 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs font-bold text-[#28242A] outline-none cursor-pointer"
                >
                  <option value="all">Todas modalidades</option>
                  <option value="delivery">🛵 Apenas Entrega</option>
                  <option value="pickup">🏪 Apenas Retirada</option>
                </select>
              </div>

              {/* Abas de Status */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'Todos Ativos', count: activeOperationalOrders.length },
                  { id: 'new', label: 'Novos', count: countNew, isAlert: true },
                  { id: 'confirmed', label: 'Confirmados', count: activeOperationalOrders.filter(o => o.status === 'confirmed').length },
                  { id: 'preparing', label: 'Em Preparo', count: activeOperationalOrders.filter(o => o.status === 'preparing').length },
                  { id: 'delivering', label: 'Em Entrega', count: activeOperationalOrders.filter(o => o.status === 'delivering').length },
                  { id: 'ready_for_pickup', label: 'Pronto p/ Retirada', count: activeOperationalOrders.filter(o => o.status === 'ready_for_pickup').length },
                  { id: 'done', label: 'Concluídos', count: countDone },
                  { id: 'cancelled', label: 'Cancelados', count: orders.filter(o => o.status === 'cancelled').length },
                  { id: 'archived', label: 'Arquivados', count: orders.filter(o => o.is_archived).length },
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
                .filter(order => {
                  if (statusFilter === 'archived') return order.is_archived;
                  if (!order.is_archived && statusFilter !== 'archived') {
                    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
                  }
                  if (fulfillmentFilter !== 'all' && order.fulfillment_type !== fulfillmentFilter) return false;
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const matchNum = order.order_number.toLowerCase().includes(q);
                    const matchName = order.customer_name.toLowerCase().includes(q);
                    const matchPhone = (order.customer_phone || '').includes(q);
                    const matchNeigh = (order.neighborhood || '').toLowerCase().includes(q);
                    if (!matchNum && !matchName && !matchPhone && !matchNeigh) return false;
                  }
                  return true;
                })
                .map(order => {
                  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                  const StatusIcon = statusInfo.icon;
                  const isNew = order.status === 'new';
                  const isPickup = order.fulfillment_type === 'pickup';
                  
                  // Pedido Atrasado (>45 min)
                  const isDelayed = !['done', 'cancelled'].includes(order.status) && 
                    (Date.now() - new Date(order.created_at).getTime()) > 45 * 60 * 1000;

                  return (
                    <div
                      key={order.id || order.order_number}
                      className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                        isNew 
                          ? 'border-[#69318A] shadow-md ring-2 ring-[#69318A]/20 bg-purple-50/10' 
                          : isDelayed 
                            ? 'border-amber-400 bg-amber-50/20 shadow-md' 
                            : 'border-[#ECE8F0] shadow-xs'
                      }`}
                    >
                      {/* Cabeçalho do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#ECE8F0]">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-lg font-black text-[#28242A] font-['DM_Sans']">
                            Pedido #{order.order_number}
                          </span>
                          
                          <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                            isPickup ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {isPickup ? '🏪 Retirada' : '🛵 Entrega'}
                          </span>

                          {isNew && (
                            <span className="px-2 py-0.5 rounded-full bg-[#69318A] text-white text-[10px] font-extrabold animate-pulse">
                              NOVO!
                            </span>
                          )}

                          {isDelayed && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Atrasado (&gt;45 min)</span>
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

                          {/* Arquivar */}
                          <button
                            onClick={() => handleToggleArchive(order.id || order.order_number, !!order.is_archived)}
                            className="p-1.5 rounded-lg border border-[#ECE8F0] hover:bg-gray-100 text-[#726C74] transition-colors cursor-pointer"
                            title={order.is_archived ? 'Desarquivar pedido' : 'Arquivar da tela operacional'}
                          >
                            {order.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </button>

                          {/* Excluir Logicamente */}
                          <button
                            onClick={() => handleDeleteOrder(order.id || order.order_number)}
                            className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                            title="Excluir logicamente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Dados do Cliente e Endereço */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-sm font-bold text-[#28242A]">{order.customer_name}</p>
                          {order.customer_phone && <p className="text-[#726C74]">📞 {order.customer_phone}</p>}
                        </div>
                        <div className="text-[#726C74]">
                          {order.street ? (
                            <p>📍 {order.street}, Nº {order.number || 'S/N'} - {order.neighborhood} {order.complement ? `(${order.complement})` : ''}</p>
                          ) : (
                            <p>Retirada no balcão da loja</p>
                          )}
                        </div>
                      </div>

                      {/* Itens do Pedido */}
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
                              {item.notes && <p className="text-[11px] text-amber-800 italic">Obs do cliente: {item.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Observações Internas da Equipe */}
                      <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 text-xs">
                        {editingNotesId === (order.id || order.order_number) ? (
                          <div className="space-y-2">
                            <label className="font-bold text-[#69318A] block">Observações Internas (Cozinha / Equipe):</label>
                            <input
                              type="text"
                              value={internalNoteText}
                              onChange={(e) => setInternalNoteText(e.target.value)}
                              placeholder="Ex: Cliente pediu talher extra, ponto de referência..."
                              className="w-full p-2 bg-white border border-[#ECE8F0] rounded-lg outline-none text-xs"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveInternalNotes(order.id || order.order_number, internalNoteText)}
                                className="px-3 py-1 bg-[#69318A] text-white rounded-lg font-bold text-[11px]"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-[11px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-[#726C74]">
                              <strong className="text-[#28242A]">Nota interna:</strong> {order.internal_notes || 'Nenhuma observação interna'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingNotesId(order.id || order.order_number);
                                setInternalNoteText(order.internal_notes || '');
                              }}
                              className="text-[11px] text-[#69318A] font-bold hover:underline cursor-pointer"
                            >
                              Editar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Motivo do Cancelamento se Houver */}
                      {order.status === 'cancelled' && order.cancellation_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                          <strong>Motivo do cancelamento:</strong> {order.cancellation_reason}
                        </div>
                      )}

                      {/* Rodapé do Card com Ações Respeitando o Fluxo Delivery vs Pickup */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#726C74]">Total:</span>
                          <span className="text-lg font-black text-[#49245B] font-['DM_Sans']">{formatCurrency(order.total)}</span>
                          <span className="text-[11px] text-[#726C74] uppercase">({order.payment_method})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* FLUXO PARA ENTREGA */}
                          {!isPickup && (
                            <>
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
                                  <span>Colocar em preparo</span>
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const data = await createDeliveryOffer(order.order_number, order.id, order.delivery_fee || 5.00);
                                        if (data && data.success) {
                                          alert(`Corrida do pedido #${order.order_number} despachada para os entregadores!`);
                                          setActiveTab('entregas_mapa');
                                        } else {
                                          alert(data?.error || 'Erro ao despachar corrida.');
                                        }
                                      } catch {
                                        alert('Erro ao despachar corrida.');
                                      }
                                    }}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                                    title="Disponibilizar corrida para os entregadores no app"
                                  >
                                    <Navigation className="w-4 h-4" />
                                    <span>Despachar Entregador</span>
                                  </button>

                                  <button
                                    onClick={() => handleUpdateStatus(order.id || order.order_number, 'delivering')}
                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Truck className="w-4 h-4" />
                                    <span>Saiu para entrega</span>
                                  </button>
                                </>
                              )}
                              {order.status === 'delivering' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id || order.order_number, 'done')}
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <PackageCheck className="w-4 h-4" />
                                  <span>Marcar como entregue</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* FLUXO PARA RETIRADA NO BALCÃO */}
                          {isPickup && (
                            <>
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
                                  <span>Colocar em preparo</span>
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id || order.order_number, 'ready_for_pickup')}
                                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Store className="w-4 h-4" />
                                  <span>Pronto para retirada</span>
                                </button>
                              )}
                              {order.status === 'ready_for_pickup' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id || order.order_number, 'done')}
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <PackageCheck className="w-4 h-4" />
                                  <span>Marcar como retirado</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Botão de Cancelar */}
                          {order.status !== 'done' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setCancellingOrderId(order.id || order.order_number);
                                setCancellationReason('');
                              }}
                              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold border border-red-200 transition-all cursor-pointer"
                            >
                              Cancelar pedido
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

        {/* 2.1 ENTREGAS EM TEMPO REAL (MAPA LIVE GPS) */}
        {activeTab === 'entregas_mapa' && <AdminLiveDeliveries />}

        {/* 3. CAIXA & FECHAMENTO DIÁRIO */}
        {activeTab === 'caixa' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Controle de Caixa Diário</h3>
                <p className="text-xs text-[#726C74]">Abertura, sangrias, reforços e fechamento de caixa</p>
              </div>

              <div className="flex items-center gap-2">
                {!cashSession ? (
                  <button
                    onClick={() => {
                      setCashActionType('open');
                      setCashInputValue('50.00');
                      setCashInputDesc('Fundo de troco inicial');
                      setIsCashModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Abrir Caixa</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setCashActionType('suprimento');
                        setCashInputValue('');
                        setCashInputDesc('');
                        setIsCashModalOpen(true);
                      }}
                      className="px-3 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      + Suprimento (Reforço)
                    </button>
                    <button
                      onClick={() => {
                        setCashActionType('sangria');
                        setCashInputValue('');
                        setCashInputDesc('');
                        setIsCashModalOpen(true);
                      }}
                      className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      - Sangria (Retirada)
                    </button>
                    <button
                      onClick={() => {
                        setCashActionType('close');
                        setCashInputValue('');
                        setCashInputDesc('');
                        setIsCashModalOpen(true);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Fechar Caixa
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Status da Sessão de Caixa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-2">
                <span className="text-xs font-bold text-[#726C74] uppercase">Status do Caixa</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${cashSession ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-lg font-bold text-[#28242A]">
                    {cashSession ? 'Caixa Aberto' : 'Caixa Fechado'}
                  </span>
                </div>
                {cashSession && (
                  <p className="text-xs text-[#726C74]">
                    Aberto por {cashSession.opened_by} às {new Date(cashSession.opened_at).toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#726C74] uppercase">Fundo Inicial</span>
                <span className="text-2xl font-black text-[#49245B] font-['DM_Sans'] block">
                  {formatCurrency(cashSession ? cashSession.initial_cash : 0)}
                </span>
                <span className="text-xs text-[#726C74]">Valor inicial na gaveta</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#726C74] uppercase">Total em Dinheiro Hoje</span>
                <span className="text-2xl font-black text-emerald-600 font-['DM_Sans'] block">
                  {formatCurrency(paymentBreakdownHoje.delivery)}
                </span>
                <span className="text-xs text-[#726C74]">Vendas em dinheiro concluídas</span>
              </div>
            </div>

            {/* Movimentações da Sessão */}
            {cashMovements.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-[#726C74] uppercase">Movimentações de Caixa</h4>
                <div className="divide-y divide-[#ECE8F0] text-xs">
                  {cashMovements.map(m => (
                    <div key={m.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <span className={`font-bold ${m.movement_type === 'sangria' ? 'text-red-600' : 'text-blue-600'}`}>
                          {m.movement_type === 'sangria' ? '[-] Sangria' : '[+] Suprimento'}
                        </span>
                        <p className="text-[#726C74] text-[11px]">{m.description} • por {m.performed_by}</p>
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(m.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. CARDÁPIO / PRODUTOS (CRUD COMPLETO) */}
        {activeTab === 'produtos' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Catálogo de Produtos</h3>
                <p className="text-xs text-[#726C74]">Alterações de preços e produtos são sincronizadas imediatamente com todos os clientes</p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct({
                    id: `prod_${Date.now()}`,
                    name: '',
                    description: '',
                    category: 'acai',
                    price: 20.00,
                    image: '/images/products/acai-tradicional.webp',
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(prod => (
                <div key={prod.id} className="bg-white rounded-2xl border border-[#ECE8F0] overflow-hidden shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-[4/3] bg-gray-100">
                      <img 
                        src={prod.image || '/images/products/product-placeholder.webp'} 
                        alt={prod.name} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/products/product-placeholder.webp';
                        }}
                        className="w-full h-full object-cover" 
                      />
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${prod.isAvailable ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {prod.isAvailable ? 'Disponível' : 'Esgotado'}
                      </span>
                    </div>

                    <div className="p-4 space-y-1">
                      <h4 className="font-bold text-sm text-[#28242A]">{prod.name}</h4>
                      <p className="text-xs text-[#726C74] line-clamp-2">{prod.description}</p>
                      <div className="pt-2 flex items-baseline gap-2">
                        <span className="text-base font-bold text-[#69318A]">{formatCurrency(prod.promotionalPrice || prod.price)}</span>
                        {prod.promotionalPrice && <span className="text-xs text-[#726C74] line-through">{formatCurrency(prod.price)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProduct(prod);
                        setIsProductModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-purple-50 hover:bg-purple-100 text-[#69318A] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover ${prod.name}?`)) {
                          deleteProduct(prod.id);
                          logAudit('Produto Removido', 'Produtos', `Produto ${prod.name} removido`);
                        }
                      }}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. CATEGORIAS */}
        {activeTab === 'categorias' && (
          <div className="p-4 sm:p-8 max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Categorias do Cardápio</h3>
              <p className="text-xs text-[#726C74]">Organização dos produtos exibidos na tela do cliente</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] divide-y divide-[#ECE8F0]">
              {categories.map(cat => (
                <div key={cat.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-sm text-[#28242A] block">{cat.name}</span>
                    <span className="text-[#726C74]">{cat.description}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#F3EDF6] text-[#69318A] rounded-lg font-bold text-[11px]">
                    Ativa
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. TAMANHOS & PREÇOS */}
        {activeTab === 'tamanhos' && (
          <div className="p-4 sm:p-8 max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Tamanhos do Açaí</h3>
              <p className="text-xs text-[#726C74]">Ajuste os valores base de cada tamanho comercializado</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] divide-y divide-[#ECE8F0]">
              {sizes.map(size => (
                <div key={size.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-sm text-[#28242A] block">{size.name}</span>
                    <span className="text-[#726C74]">{size.ml}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#69318A] text-sm">{formatCurrency(size.price)}</span>
                    <button
                      onClick={() => {
                        const newPrice = prompt(`Novo preço para ${size.name}:`, String(size.price));
                        if (newPrice && !isNaN(Number(newPrice))) {
                          updateSizePrice(size.id, Number(newPrice));
                          logAudit('Preço de Tamanho Alterado', 'Tamanhos', `${size.name} atualizado para R$ ${newPrice}`);
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#69318A] rounded-lg font-bold cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. ADICIONAIS & TOPPINGS */}
        {activeTab === 'adicionais' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Adicionais & Ingredientes</h3>
              <p className="text-xs text-[#726C74]">Gerencie preços e disponibilidade de cada complemento</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {addons.map(addon => (
                <div key={addon.id} className="p-3.5 bg-white rounded-2xl border border-[#ECE8F0] shadow-xs flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-[#28242A] block">{addon.name}</span>
                    <span className="text-[11px] text-[#726C74] uppercase">{addon.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#69318A]">{formatCurrency(addon.price)}</span>
                    <button
                      onClick={() => {
                        const newPrice = prompt(`Novo preço para ${addon.name}:`, String(addon.price));
                        if (newPrice && !isNaN(Number(newPrice))) {
                          updateAddonPrice(addon.id, Number(newPrice));
                          logAudit('Preço de Adicional Alterado', 'Adicionais', `${addon.name} para R$ ${newPrice}`);
                        }
                      }}
                      className="p-1.5 text-[#726C74] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. PROMOÇÕES & CUPONS */}
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

        {/* 9. ESTOQUE & OPERAÇÃO RÁPIDA */}
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
                    toggleProductAvailability(prod.id, !prod.isAvailable);
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

        {/* 10. ENTREGAS & BAIRROS */}
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
                    value={storeSettings.defaultDeliveryFee}
                    onChange={(e) => updateStoreSettings({ defaultDeliveryFee: Number(e.target.value) })}
                    className="w-full p-2 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Frete Grátis a partir de (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    value={storeSettings.freeDeliveryThreshold}
                    onChange={(e) => updateStoreSettings({ freeDeliveryThreshold: Number(e.target.value) })}
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

        {/* 11. BASE DE CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <h3 className="text-base font-bold text-[#28242A]">Base de Clientes</h3>
              <p className="text-xs text-[#726C74]">Clientes cadastrados automaticamente pelos pedidos realizados no site</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#ECE8F0] overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FCFAF7] border-b border-[#ECE8F0] text-[#726C74] uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Telefone</th>
                    <th className="p-3.5 text-center">Total Pedidos</th>
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

        {/* 12. RELATÓRIOS & VENDAS */}
        {activeTab === 'relatorios' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Relatório de Vendas</h3>
                <p className="text-xs text-[#726C74]">Consolidado operacional e financeiro permanente</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-[#726C74] uppercase">Histórico Total Registrado</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span>Total de Pedidos no Banco:</span><span className="font-bold">{orders.length}</span></div>
                  <div className="flex justify-between"><span>Pedidos Concluídos:</span><span className="font-bold text-emerald-600">{orders.filter(o => o.status === 'done').length}</span></div>
                  <div className="flex justify-between"><span>Pedidos Cancelados:</span><span className="font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</span></div>
                  <div className="flex justify-between border-t border-[#ECE8F0] pt-2 text-sm">
                    <span className="font-bold">Receita Total Realizada:</span>
                    <span className="font-extrabold text-[#49245B]">
                      {formatCurrency(orders.filter(o => o.status === 'done').reduce((s, o) => s + Number(o.total || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-[#726C74] uppercase">Hoje ({todaySP})</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span>Pedidos Realizados Hoje:</span><span className="font-bold">{todayOrders.length}</span></div>
                  <div className="flex justify-between"><span>Entregues/Retirados Hoje:</span><span className="font-bold text-emerald-600">{pedidosConcluidosHoje}</span></div>
                  <div className="flex justify-between"><span>Cancelados Hoje:</span><span className="font-bold text-red-600">{pedidosCanceladosHoje}</span></div>
                  <div className="flex justify-between border-t border-[#ECE8F0] pt-2 text-sm">
                    <span className="font-bold">Faturamento Realizado Hoje:</span>
                    <span className="font-extrabold text-emerald-600">{formatCurrency(faturamentoRealizadoHoje)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 13. CONFIGURAÇÕES DA LOJA */}
        {activeTab === 'configuracoes' && (
          <div className="p-4 sm:p-8 max-w-2xl space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4 text-xs">
              <h3 className="text-base font-bold text-[#28242A] border-b border-[#ECE8F0] pb-3">Informações da Loja</h3>
              
              <div>
                <label className="block text-[#726C74] font-bold mb-1">Nome do Estabelecimento</label>
                <input
                  type="text"
                  value={storeSettings.storeName}
                  onChange={(e) => updateStoreSettings({ storeName: e.target.value })}
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Telefone / Fixo</label>
                  <input
                    type="text"
                    value={storeSettings.phone}
                    onChange={(e) => updateStoreSettings({ phone: e.target.value })}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">WhatsApp para Atendimento</label>
                  <input
                    type="text"
                    value={storeSettings.whatsappNumber}
                    onChange={(e) => updateStoreSettings({ whatsappNumber: e.target.value })}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#726C74] font-bold mb-1">Tempo Estimado de Entrega</label>
                <input
                  type="text"
                  value={storeSettings.estimatedDeliveryTime}
                  onChange={(e) => updateStoreSettings({ estimatedDeliveryTime: e.target.value })}
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                />
              </div>

              <button
                onClick={() => {
                  alert('Configurações salvas e propagadas com sucesso!');
                  logAudit('Configurações Atualizadas', 'Loja', 'Dados cadastrais da loja atualizados');
                }}
                className="w-full py-3 bg-[#69318A] hover:bg-[#572185] text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* 14. USUÁRIOS & PERMISSÕES */}
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

        {/* 15. HISTÓRICO DE AUDITORIA */}
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

      {/* MODAL DE CANCELAMENTO DE PEDIDO */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-[#ECE8F0]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Cancelar Pedido #{cancellingOrderId}</span>
              </h3>
              <button onClick={() => setCancellingOrderId(null)} className="p-1 text-[#726C74]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-[#726C74] font-bold">Motivo do cancelamento (visível para o cliente):</label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ex: Item esgotado, endereço fora do raio de entrega, cliente solicitou..."
                className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancellingOrderId(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#28242A] text-xs font-bold rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (!cancellationReason.trim()) return alert('Informe o motivo do cancelamento');
                  handleUpdateStatus(cancellingOrderId, 'cancelled', cancellationReason.trim());
                  setCancellingOrderId(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CAIXA */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-[#ECE8F0]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
              <h3 className="text-base font-bold text-[#28242A]">
                {cashActionType === 'open' && 'Abertura de Caixa'}
                {cashActionType === 'sangria' && 'Sangria (Retirada de Dinheiro)'}
                {cashActionType === 'suprimento' && 'Suprimento (Reforço de Dinheiro)'}
                {cashActionType === 'close' && 'Fechamento de Caixa'}
              </h3>
              <button onClick={() => setIsCashModalOpen(false)} className="p-1 text-[#726C74]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#726C74] font-bold mb-1">
                  {cashActionType === 'close' ? 'Valor Contado em Gaveta (R$)' : 'Valor (R$)'}
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={cashInputValue}
                  onChange={(e) => setCashInputValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-bold text-base text-[#69318A]"
                />
              </div>

              <div>
                <label className="block text-[#726C74] font-bold mb-1">Observações / Descrição</label>
                <input
                  type="text"
                  value={cashInputDesc}
                  onChange={(e) => setCashInputDesc(e.target.value)}
                  placeholder="Ex: Fundo de troco, pagamento fornecedor..."
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsCashModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#28242A] text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleCashSubmit}
                className="flex-1 py-2.5 bg-[#69318A] hover:bg-[#572185] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="Ex: Brownie artesanal"
                  className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[#726C74] font-bold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Descrição dos ingredientes"
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

              {/* Imagem do Produto com Upload e Presets */}
              <div className="space-y-2">
                <label className="block text-[#726C74] font-bold">Fotografia do Produto</label>
                
                <div className="flex items-center gap-2">
                  <label className="flex-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#69318A] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Download className="w-4 h-4 rotate-180" />
                    <span>Upload Foto do Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            return alert('A imagem deve ter no máximo 5MB');
                          }
                          const reader = new FileReader();
                          reader.onload = (loadEvt) => {
                            if (loadEvt.target?.result) {
                              setEditingProduct({ ...editingProduct, image: loadEvt.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] text-[#726C74] mb-1">Ou selecione uma foto padrão oficial:</label>
                  <select
                    value={editingProduct.image.startsWith('/images/products/') ? editingProduct.image : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditingProduct({ ...editingProduct, image: e.target.value });
                      }
                    }}
                    className="w-full p-2 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs outline-none"
                  >
                    <option value="">-- Escolha uma foto do catálogo --</option>
                    <option value="/images/products/acai-tradicional.webp">Açaí Tradicional (Puro)</option>
                    <option value="/images/products/acai-morango-leite-po.webp">Açaí com Morango e Leite em Pó</option>
                    <option value="/images/products/acai-banana-granola.webp">Açaí com Banana e Granola</option>
                    <option value="/images/products/acai-creme-avela.webp">Açaí com Creme de Avelã</option>
                    <option value="/images/products/combo-dois.webp">Combo para Dois</option>
                    <option value="/images/products/combo-familia.webp">Combo Família</option>
                    <option value="/images/products/barca-acai.webp">Barca de Açaí</option>
                    <option value="/images/products/brownie.webp">Brownie Artesanal</option>
                    <option value="/images/products/mousse-maracuja.webp">Mousse de Maracujá</option>
                    <option value="/images/products/suco-acai.webp">Suco Natural de Açaí</option>
                    <option value="/images/products/agua-mineral.webp">Água Mineral 500ml</option>
                    <option value="/images/products/refrigerante.webp">Refrigerante Lata 350ml</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#726C74] mb-1">Ou cole uma URL externa:</label>
                  <input
                    type="text"
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    placeholder="/images/products/... ou https://..."
                    className="w-full p-2 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs outline-none"
                  />
                </div>

                {editingProduct.image && (
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#ECE8F0] bg-gray-50">
                    <img 
                      src={editingProduct.image} 
                      alt="Preview" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/products/product-placeholder.webp';
                      }}
                      className="w-full h-full object-cover object-center" 
                    />
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                      Proporção 4:3
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Categoria</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
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
                    updateProduct(editingProduct);
                    logAudit('Produto Atualizado', 'Produtos', `Produto ${editingProduct.name} atualizado (R$ ${editingProduct.price})`);
                  } else {
                    addProduct(editingProduct);
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
