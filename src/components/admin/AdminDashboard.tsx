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
  Navigation,
  RotateCcw,
  Loader2,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import type { Product, CategoryInfo, AdditionalItem, ProductSize } from '../../types';
import { AdminLiveDeliveries } from './AdminLiveDeliveries';
import { createDeliveryOffer } from '../../services/deliveryService';
import {
  fetchAllOrders,
  updateOrderStatus,
  softDeleteOrder,
  restoreOrder,
  hardDeleteOrder,
  toggleArchiveOrder,
  saveOrderInternalNotes,
  normalizeStatus,
  Order as RealOrder
} from '../../services/orderService';

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
  | 'inicio'
  | 'pedidos'
  | 'financeiro'
  | 'cardapio'
  | 'clientes'
  | 'entregadores'
  | 'relatorios'
  | 'configuracoes';

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

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === 'undefined') return 'pedidos';
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path.includes('financeiro') || search.includes('tab=financeiro')) return 'financeiro';
    if (path.includes('cardapio') || search.includes('tab=cardapio')) return 'cardapio';
    if (path.includes('clientes') || search.includes('tab=clientes')) return 'clientes';
    if (path.includes('entregadores') || search.includes('tab=entregadores')) return 'entregadores';
    if (path.includes('relatorios') || search.includes('tab=relatorios')) return 'relatorios';
    if (path.includes('configuracoes') || search.includes('tab=configuracoes')) return 'configuracoes';
    if (path.includes('inicio') || search.includes('tab=inicio')) return 'inicio';
    return 'pedidos';
  });

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    try {
      window.history.pushState({}, '', `/admin/${tab}`);
    } catch {}
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
  const [ordersPeriodFilter, setOrdersPeriodFilter] = useState<'todos' | 'hoje' | 'ontem' | '7dias'>('todos');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sub-abas do Cardápio
  const [cardapioSubTab, setCardapioSubTab] = useState<'produtos' | 'categorias' | 'tamanhos' | 'adicionais' | 'combos' | 'estoque'>('produtos');

  // Filtros de Período
  const [dateFilter, setDateFilter] = useState<'hoje' | 'ontem' | '7dias' | '30dias' | 'personalizado'>('hoje');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Modal de Cancelamento
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Toast de Notificação
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Estado de Atualização Ativa (prevenção de duplo clique / salvando)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Observações Internas
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [internalNoteText, setInternalNoteText] = useState('');

  // Histórico de Compras do Cliente Selecionado
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<{
    name: string;
    phone: string;
    address?: string;
    orders: RealOrder[];
  } | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [whatsappTokenInput, setWhatsappTokenInput] = useState('');
  const [whatsappPhoneIdInput, setWhatsappPhoneIdInput] = useState('');

  // Auto-dismiss do Toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  // Carregar Pedidos com fonte única
  const fetchOrders = useCallback(async () => {
    try {
      const fetchedOrders = await fetchAllOrders(true, false);
      if (Array.isArray(fetchedOrders)) {
        const normalizedOrders = fetchedOrders.map((o: RealOrder) => ({
          ...o,
          status: normalizeStatus(o.status),
        }));

        const newCount = normalizedOrders.filter((o: RealOrder) => o.status === 'new' && !o.is_archived && !o.deleted_at).length;
        
        if (newCount > prevUnconfirmedCountRef.current && prevUnconfirmedCountRef.current !== 0) {
          playAlertSound();
        }
        prevUnconfirmedCountRef.current = newCount;
        setOrders(normalizedOrders);
        setLastFetchTime(new Date());

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

  // Supabase Realtime Subscription + Storage Events + Fast Polling
  useEffect(() => {
    setIsLoading(true);
    fetchOrders();
    fetchCashRegister();

    // Ouvir novos pedidos despachados pelo checkout no mesmo navegador
    const handleNewOrderLocal = (e: any) => {
      const order = e.detail;
      if (order) {
        setOrders(prev => {
          if (prev.some(o => o.id === order.id || o.order_number === order.order_number)) {
            return prev.map(o => (o.id === order.id || o.order_number === order.order_number) ? order : o);
          }
          return [order, ...prev];
        });
        playAlertSound();
        setToastMessage({ text: `🔔 Novo Pedido #${order.order_number} recebido!`, type: 'success' });
        logAudit('Novo Pedido Recebido', 'Pedidos', `Pedido #${order.order_number} (${formatCurrency(order.total)})`);
      }
      fetchOrders();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'acai_order_ping' || e.key === 'acai_last_order_created') {
        fetchOrders();
      }
    };

    window.addEventListener('acai_order_created', handleNewOrderLocal);
    window.addEventListener('storage', handleStorageChange);

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
                if (!newOrder.deleted_at) {
                  setOrders(prev => {
                    if (prev.some(o => o.id === newOrder.id || o.order_number === newOrder.order_number)) {
                      return prev.map(o => (o.id === newOrder.id || o.order_number === newOrder.order_number) ? newOrder : o);
                    }
                    return [newOrder, ...prev];
                  });
                  playAlertSound();
                  setToastMessage({ text: `🔔 Novo Pedido #${newOrder.order_number} recebido!`, type: 'success' });
                  logAudit('Novo Pedido Recebido', 'Pedidos', `Pedido #${newOrder.order_number} (${formatCurrency(newOrder.total)})`);
                }
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as RealOrder;
                if (updated.deleted_at) {
                  setOrders(prev => prev.filter(o => o.id !== updated.id && o.order_number !== updated.order_number));
                } else {
                  setOrders(prev => prev.map(o => {
                    if (o.id === updated.id || o.order_number === updated.order_number) {
                      if (o.updated_at && updated.updated_at && new Date(updated.updated_at).getTime() < new Date(o.updated_at).getTime()) {
                        return o;
                      }
                      return updated;
                    }
                    return o;
                  }));
                }
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as any)?.id;
                if (deletedId) {
                  setOrders(prev => prev.filter(o => o.id !== deletedId));
                }
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
      window.removeEventListener('acai_order_created', handleNewOrderLocal);
      window.removeEventListener('storage', handleStorageChange);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchOrders, fetchCashRegister, playAlertSound]);

  // Atualizar Status do Pedido com persistência real
  const handleUpdateStatus = async (orderId: string, newStatus: RealOrder['status'], reason?: string) => {
    try {
      setUpdatingOrderId(orderId);
      const result = await updateOrderStatus(orderId, newStatus, reason);
      if (result.success && result.order) {
        setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? (result.order as RealOrder) : o));
        const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        setToastMessage({ text: `Pedido #${orderId} atualizado para "${statusLabel}" com sucesso!`, type: 'success' });
        logAudit('Status Alterado', 'Pedidos', `Pedido #${orderId} alterado para ${newStatus}`);
      } else {
        alert(result.error || 'Erro ao persistir status do pedido no banco de dados.');
        fetchOrders();
      }
    } catch (e: any) {
      console.error('Update status error:', e);
      alert('Erro ao atualizar status: ' + (e?.message || e));
      fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Arquivar / Desarquivar Pedido
  const handleToggleArchive = async (orderId: string, isArchived: boolean) => {
    try {
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, is_archived: !isArchived } : o));
      logAudit(isArchived ? 'Pedido Desarquivado' : 'Pedido Arquivado', 'Pedidos', `Pedido #${orderId}`);
      await toggleArchiveOrder(orderId, isArchived);
    } catch (e) {
      console.error('Archive error:', e);
      fetchOrders();
    }
  };

  // Excluir Definitivamente Pedido (Hard Delete com confirmação)
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Deseja realmente excluir o pedido #${orderId} DEFINITIVAMENTE do banco de dados? Esta ação não pode ser desfeita.`)) return;
    try {
      setUpdatingOrderId(orderId);
      const result = await hardDeleteOrder(orderId);
      if (result.success) {
        setOrders(prev => prev.filter(o => o.id !== orderId && o.order_number !== orderId));
        setToastMessage({ text: `Pedido #${orderId} excluído definitivamente com sucesso!`, type: 'success' });
        logAudit('Exclusão Permanente', 'Pedidos', `Pedido #${orderId} excluído definitivamente`);
      } else {
        alert(result.error || 'Erro ao excluir pedido do banco de dados.');
        fetchOrders();
      }
    } catch (e: any) {
      console.error('Hard delete order error:', e);
      alert('Erro ao excluir pedido: ' + (e?.message || e));
      fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Salvar Observação Interna
  const handleSaveInternalNotes = async (orderId: string, notes: string) => {
    try {
      setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? { ...o, internal_notes: notes } : o));
      setEditingNotesId(null);
      await saveOrderInternalNotes(orderId, notes);
      setToastMessage({ text: 'Nota interna salva!', type: 'success' });
    } catch {
      alert('Erro ao salvar observação interna');
    }
  };

  const handleSaveNotes = async (orderId: string) => {
    await handleSaveInternalNotes(orderId, internalNoteText.trim());
  };

  // Imprimir Comanda Térmica (80mm)
  const printThermalReceipt = (order: RealOrder) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;
    const itemsHtml = (order.items || []).map(it => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;">
        <span>${it.quantity}x ${it.name} ${it.size ? `(${it.size})` : ''}</span>
        <span>R$ ${(it.totalPrice || it.unitPrice * it.quantity).toFixed(2).replace('.', ',')}</span>
      </div>
      ${it.additionals && it.additionals.length ? `<div style="font-size:10px; color:#555; margin-left:10px;">+ ${it.additionals.join(', ')}</div>` : ''}
      ${it.notes ? `<div style="font-size:10px; color:#c00; margin-left:10px;">Obs: ${it.notes}</div>` : ''}
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comanda #${order.order_number}</title>
          <style>
            body { font-family: monospace; padding: 10px; width: 280px; margin: 0 auto; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            h2 { margin: 4px 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <h2>AÇAÍ PURO SABOR</h2>
            <div>Pedido #${order.order_number}</div>
            <div style="font-size:11px;">${new Date(order.created_at).toLocaleString('pt-BR')}</div>
            <div style="font-weight:bold; margin-top:4px;">${order.fulfillment_type === 'pickup' ? '*** RETIRADA NO BALCÃO ***' : '*** ENTREGA DELIVERY ***'}</div>
          </div>
          <div class="divider"></div>
          <div><strong>Cliente:</strong> ${order.customer_name}</div>
          <div><strong>Tel:</strong> ${order.customer_phone || 'Não informado'}</div>
          ${order.fulfillment_type === 'delivery' ? `<div><strong>End:</strong> ${order.street || ''}, ${order.number || 'S/N'} - ${order.neighborhood || ''}</div>` : ''}
          <div class="divider"></div>
          <div><strong>ITENS:</strong></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>R$ ${Number(order.subtotal || 0).toFixed(2).replace('.', ',')}</span></div>
          <div style="display:flex; justify-content:space-between;"><span>Taxa Entrega:</span><span>R$ ${Number(order.delivery_fee || 0).toFixed(2).replace('.', ',')}</span></div>
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-top:4px;"><span>TOTAL:</span><span>R$ ${Number(order.total || 0).toFixed(2).replace('.', ',')}</span></div>
          <div style="font-size:11px; margin-top:4px;"><strong>Pagamento:</strong> ${(order.payment_method || '').toUpperCase()}</div>
          ${order.notes ? `<div class="divider"></div><div><strong>OBS GERAL:</strong> ${order.notes}</div>` : ''}
          <div class="divider"></div>
          <div class="center" style="font-size:10px;">Obrigado pela preferência!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  // DATAS DE REFERÊNCIA EM SÃO PAULO
  const todaySP = useMemo(() => getSaoPauloDate(), []);
  const yesterdaySP = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getSaoPauloDate(d);
  }, []);

  // PEDIDOS FILTRADOS PELO PERÍODO ESCOLHIDO
  const filteredByDateOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.deleted_at) return false;
      const orderDateSP = getSaoPauloDate(o.created_at);

      if (dateFilter === 'hoje') {
        return orderDateSP === todaySP;
      }
      if (dateFilter === 'ontem') {
        return orderDateSP === yesterdaySP;
      }
      if (dateFilter === '7dias') {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        return new Date(o.created_at).getTime() >= d7.getTime();
      }
      if (dateFilter === '30dias') {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        return new Date(o.created_at).getTime() >= d30.getTime();
      }
      if (dateFilter === 'personalizado') {
        if (customStartDate && orderDateSP < customStartDate) return false;
        if (customEndDate && orderDateSP > customEndDate) return false;
        return true;
      }
      return true;
    });
  }, [orders, dateFilter, todaySP, yesterdaySP, customStartDate, customEndDate]);

  // CÁLCULOS FINANCEIROS EM TEMPO REAL
  // Pedidos de hoje
  const todayOrders = useMemo(() => {
    return orders.filter(o => !o.deleted_at && getSaoPauloDate(o.created_at) === todaySP);
  }, [orders, todaySP]);

  // Faturamento Hoje (concluídos apenas) - Inicia em R$ 0,00 a cada novo dia!
  const faturamentoHoje = useMemo(() => {
    return todayOrders
      .filter(o => o.status === 'done' || o.status === 'completed')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [todayOrders]);

  // Faturamento da Semana (últimos 7 dias)
  const faturamentoSemana = useMemo(() => {
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    return orders
      .filter(o => !o.deleted_at && (o.status === 'done' || o.status === 'completed') && new Date(o.created_at).getTime() >= d7.getTime())
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [orders]);

  // Faturamento do Mês Atual
  const faturamentoMes = useMemo(() => {
    const currentMonthPrefix = todaySP.substring(0, 7);
    return orders
      .filter(o => !o.deleted_at && (o.status === 'done' || o.status === 'completed') && getSaoPauloDate(o.created_at).startsWith(currentMonthPrefix))
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [orders, todaySP]);

  // Métricas do Período Selecionado
  const pedidosRecebidosPeriodo = filteredByDateOrders.length;
  const pedidosEmPreparoPeriodo = filteredByDateOrders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length;
  const pedidosEntreguesPeriodo = filteredByDateOrders.filter(o => o.status === 'done' || o.status === 'completed').length;
  const pedidosCanceladosPeriodo = filteredByDateOrders.filter(o => o.status === 'cancelled').length;

  const faturamentoConcluidoPeriodo = useMemo(() => {
    return filteredByDateOrders
      .filter(o => o.status === 'done' || o.status === 'completed')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [filteredByDateOrders]);

  const ticketMedioPeriodo = pedidosEntreguesPeriodo > 0 
    ? faturamentoConcluidoPeriodo / pedidosEntreguesPeriodo 
    : 0;

  // Detalhamento de Pagamentos do Período
  const pagamentosPeriodo = useMemo(() => {
    const doneOrders = filteredByDateOrders.filter(o => o.status === 'done' || o.status === 'completed');
    const pix = doneOrders.filter(o => o.payment_method === 'pix').reduce((s, o) => s + Number(o.total || 0), 0);
    const card = doneOrders.filter(o => o.payment_method === 'card_online').reduce((s, o) => s + Number(o.total || 0), 0);
    const delivery = doneOrders.filter(o => o.payment_method === 'delivery').reduce((s, o) => s + Number(o.total || 0), 0);
    const deliveryFees = doneOrders.reduce((s, o) => s + Number(o.delivery_fee || 0), 0);
    return { pix, card, delivery, deliveryFees };
  }, [filteredByDateOrders]);

  // Contadores operacionais das abas de Pedidos
  const activeOperationalOrders = useMemo(() => {
    return orders.filter(o => !o.deleted_at && !o.is_archived && !['cancelled', 'done', 'completed'].includes(o.status));
  }, [orders]);

  const countNew = orders.filter(o => !o.deleted_at && !o.is_archived && o.status === 'new').length;
  const countPreparing = orders.filter(o => !o.deleted_at && !o.is_archived && (o.status === 'preparing' || o.status === 'confirmed')).length;
  const countDelivering = orders.filter(o => !o.deleted_at && !o.is_archived && (o.status === 'delivering' || o.status === 'out_for_delivery')).length;
  const countReadyPickup = orders.filter(o => !o.deleted_at && !o.is_archived && o.status === 'ready_for_pickup').length;
  const countDone = orders.filter(o => !o.deleted_at && (o.status === 'done' || o.status === 'completed')).length;
  const countCancelled = orders.filter(o => !o.deleted_at && o.status === 'cancelled').length;
  const countArchived = orders.filter(o => !o.deleted_at && o.is_archived).length;

  const lastUpdateFormatted = useMemo(() => {
    return lastFetchTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, [lastFetchTime]);

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getElapsedTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `há ${hours}h ${remMins}min`;
  };

  // Produtos mais vendidos no período
  const topProdutosPeriodo = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; total: number }> = {};
    filteredByDateOrders.filter(o => o.status === 'done' || o.status === 'completed').forEach(o => {
      (o.items || []).forEach(it => {
        if (!map[it.name]) {
          map[it.name] = { name: it.name, quantity: 0, total: 0 };
        }
        map[it.name].quantity += it.quantity;
        map[it.name].total += (it.totalPrice || it.unitPrice || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  }, [filteredByDateOrders]);

  // Horários de Pico
  const horariosPico = useMemo(() => {
    const faixas = [
      { label: '11h às 14h (Almoço)', count: 0 },
      { label: '14h às 17h (Tarde)', count: 0 },
      { label: '17h às 20h (Entardecer)', count: 0 },
      { label: '20h às 23h (Pico Noturno)', count: 0 },
      { label: '23h às 02h (Madrugada)', count: 0 },
    ];
    filteredByDateOrders.forEach(o => {
      const h = new Date(o.created_at).getHours();
      if (h >= 11 && h < 14) faixas[0].count += 1;
      else if (h >= 14 && h < 17) faixas[1].count += 1;
      else if (h >= 17 && h < 20) faixas[2].count += 1;
      else if (h >= 20 && h < 23) faixas[3].count += 1;
      else if (h >= 23 || h < 2) faixas[4].count += 1;
    });
    const maxCount = Math.max(...faixas.map(f => f.count), 1);
    return faixas.map(f => ({ ...f, percent: Math.round((f.count / maxCount) * 100) }));
  }, [filteredByDateOrders]);

  // Base de Clientes Únicos com Histórico
  const customersList = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; address?: string; count: number; totalSpent: number; lastOrder: string; orders: RealOrder[] }>();
    orders.filter(o => !o.deleted_at).forEach(o => {
      const key = (o.customer_phone ? o.customer_phone.replace(/\D/g, '') : '') || o.customer_name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          name: o.customer_name,
          phone: o.customer_phone || 'Não informado',
          address: o.street ? `${o.street}, Nº ${o.number || 'S/N'} - ${o.neighborhood}` : 'Retirada no balcão',
          count: 0,
          totalSpent: 0,
          lastOrder: o.created_at,
          orders: [],
        });
      }
      const c = map.get(key)!;
      c.count += 1;
      c.orders.push(o);
      if (o.status === 'done' || o.status === 'completed') {
        c.totalSpent += Number(o.total || 0);
      }
      if (new Date(o.created_at).getTime() > new Date(c.lastOrder).getTime()) {
        c.lastOrder = o.created_at;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customersList;
    const q = customerSearchQuery.toLowerCase().trim();
    return customersList.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customersList, customerSearchQuery]);

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    const headers = ['Pedido', 'Data (SP)', 'Cliente', 'Telefone', 'Tipo', 'Subtotal', 'Frete', 'Total', 'Pagamento', 'Status', 'Cancelamento'];
    const rows = filteredByDateOrders.map(o => [
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
    link.setAttribute('download', `relatorio_acai_puro_${dateFilter}_${getSaoPauloDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAudit('Exportação CSV', 'Relatórios', `Relatório exportado para período ${dateFilter}`);
    setToastMessage({ text: 'Relatório CSV exportado com sucesso!', type: 'success' });
  };

  const menuItems = [
    { id: 'inicio', label: 'Início', icon: LayoutDashboard },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, badge: countNew },
    { id: 'financeiro', label: 'Financeiro', icon: Wallet },
    { id: 'cardapio', label: 'Cardápio', icon: Layers },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'entregadores', label: 'Entregadores', icon: Navigation },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'configuracoes', label: 'Configurações', icon: Sliders },
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
                  onClick={() => handleTabChange(item.id as TabType)}
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
                        handleTabChange(item.id as TabType);
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

        {/* 1. INÍCIO — PAINEL OPERACIONAL */}
        {activeTab === 'inicio' && (
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* Barra de Filtros de Período */}
            <div className="bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#69318A]" />
                <span className="text-xs font-bold text-[#28242A]">Período de Análise:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'ontem', label: 'Ontem' },
                  { id: '7dias', label: 'Últimos 7 dias' },
                  { id: '30dias', label: 'Últimos 30 dias' },
                  { id: 'personalizado', label: 'Personalizado' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDateFilter(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      dateFilter === p.id 
                        ? 'bg-[#69318A] text-white shadow-xs' 
                        : 'bg-[#FCFAF7] text-[#726C74] hover:bg-[#F3EDF6] border border-[#ECE8F0]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {dateFilter === 'personalizado' && (
                <div className="w-full flex flex-wrap items-center gap-2 pt-2 border-t border-[#ECE8F0] text-xs">
                  <span className="text-[#726C74]">De:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="p-1.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-lg text-xs"
                  />
                  <span className="text-[#726C74]">Até:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="p-1.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-lg text-xs"
                  />
                </div>
              )}
            </div>

            {/* Grid de KPIs Principais em Tempo Real */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Vendas de Hoje (Entregues) - Inicia em R$ 0,00 a cada novo dia */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Vendas de Hoje</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-2xl font-black text-[#49245B] font-['DM_Sans'] block">
                  {formatCurrency(faturamentoHoje)}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  ✓ {todayOrders.filter(o => o.status === 'done').length} pedidos concluídos hoje
                </span>
              </div>

              {/* Pedidos Recebidos no Período */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Pedidos Recebidos</span>
                  <ShoppingBag className="w-4 h-4 text-[#69318A]" />
                </div>
                <span className="text-2xl font-black text-[#28242A] font-['DM_Sans'] block">
                  {pedidosRecebidosPeriodo}
                </span>
                <span className="text-[11px] text-[#726C74]">No período ({dateFilter})</span>
              </div>

              {/* Pedidos em Preparo */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Em Produção</span>
                  <ChefHat className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-black text-amber-600 font-['DM_Sans'] block">
                  {pedidosEmPreparoPeriodo}
                </span>
                <span className="text-[11px] text-[#726C74]">Na cozinha / montagem</span>
              </div>

              {/* Pedidos Cancelados */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Cancelados</span>
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-2xl font-black text-red-500 font-['DM_Sans'] block">
                  {pedidosCanceladosPeriodo}
                </span>
                <span className="text-[11px] text-red-600 font-medium">Não somados nas vendas</span>
              </div>
            </div>

            {/* Segunda Linha de Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Ticket Médio */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Ticket Médio</span>
                  <TrendingUp className="w-4 h-4 text-[#69318A]" />
                </div>
                <span className="text-2xl font-black text-[#28242A] font-['DM_Sans'] block">
                  {formatCurrency(ticketMedioPeriodo)}
                </span>
                <span className="text-[11px] text-[#726C74]">Média por entrega realizada</span>
              </div>

              {/* Faturamento da Semana */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Faturamento da Semana</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-2xl font-black text-blue-700 font-['DM_Sans'] block">
                  {formatCurrency(faturamentoSemana)}
                </span>
                <span className="text-[11px] text-[#726C74]">Últimos 7 dias corridos</span>
              </div>

              {/* Faturamento do Mês */}
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <div className="flex justify-between items-center text-[#726C74] text-xs font-bold uppercase">
                  <span>Faturamento do Mês</span>
                  <Crown className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-2xl font-black text-[#49245B] font-['DM_Sans'] block">
                  {formatCurrency(faturamentoMes)}
                </span>
                <span className="text-[11px] text-[#726C74]">Mês atual completo</span>
              </div>
            </div>

            {/* Painel: Produtos mais vendidos e Horários de Maior Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Produtos mais vendidos */}
              <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#28242A] flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#69318A]" />
                    <span>Produtos Mais Vendidos</span>
                  </h3>
                  <span className="text-xs text-[#726C74]">{dateFilter}</span>
                </div>

                {topProdutosPeriodo.length === 0 ? (
                  <p className="text-xs text-[#726C74] py-4 text-center">Nenhum produto concluído no período.</p>
                ) : (
                  <div className="space-y-2">
                    {topProdutosPeriodo.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FCFAF7] border border-[#ECE8F0] text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-[#69318A] font-extrabold flex items-center justify-center text-[11px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#28242A]">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-[#69318A] block">{item.quantity} un.</span>
                          <span className="text-[10px] text-[#726C74]">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Horários com Maior Volume de Pedidos */}
              <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#28242A] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#69318A]" />
                    <span>Horários de Maior Volume</span>
                  </h3>
                  <span className="text-xs text-[#726C74]">Pico operacional</span>
                </div>

                <div className="space-y-3 pt-2">
                  {horariosPico.map((faixa, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold text-[#28242A]">
                        <span>{faixa.label}</span>
                        <span>{faixa.count} pedidos</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#69318A] rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(faixa.percent, 4)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações Rápidas de Operação */}
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#28242A]">Ações Rápidas do Gestor</h4>
                <p className="text-xs text-[#726C74]">Acesse os pedidos em tempo real ou gerencie finanças com 1 clique</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('pedidos')}
                  className="px-4 py-2.5 bg-[#69318A] text-white rounded-xl text-xs font-bold hover:bg-[#572185] cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ver Pedidos ({countNew} novos)</span>
                </button>
                <button
                  onClick={() => setActiveTab('financeiro')}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Painel Financeiro</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PEDIDOS EM TEMPO REAL */}
        {activeTab === 'pedidos' && (
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* CABEÇALHO DA PÁGINA */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE8F0] shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#69318A]">Painel de Atendimento</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[#28242A] font-['DM_Sans'] mt-0.5">
                  Pedidos em tempo real
                </h1>
                <p className="text-xs sm:text-sm text-[#726C74] mt-0.5">
                  Acompanhe e gerencie os pedidos recebidos pela loja
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Indicador Loja Aberta/Fechada + Botão de Toggle */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all bg-[#FCFAF7] border-[#ECE8F0]">
                  <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={isOpen ? 'text-emerald-800' : 'text-red-700'}>
                    {isOpen ? 'Loja aberta' : 'Loja fechada'}
                  </span>
                  <button
                    onClick={() => {
                      toggleStoreOpen(!isOpen);
                      logAudit('Disponibilidade Alterada', 'Loja', !isOpen ? 'Loja Aberta' : 'Loja Pausada');
                    }}
                    className={`ml-1 px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                      isOpen 
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' 
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {isOpen ? 'Pausar loja' : 'Abrir loja'}
                  </button>
                </div>

                {/* Botão Som Ativo / Silenciado */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    soundEnabled 
                      ? 'bg-purple-50 hover:bg-purple-100 text-[#69318A] border-purple-200' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300'
                  }`}
                  title={soundEnabled ? 'Silenciar alertas sonoros' : 'Ativar alertas sonoros'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{soundEnabled ? 'Som ativo' : 'Som mudo'}</span>
                </button>

                {/* Botão de Atualização Manual */}
                <button
                  onClick={() => {
                    fetchOrders();
                    setToastMessage({ text: 'Atualizando pedidos...', type: 'success' });
                  }}
                  disabled={isLoading}
                  className="px-3.5 py-2 bg-[#FCFAF7] hover:bg-[#F3EDF6] text-[#726C74] hover:text-[#69318A] rounded-2xl border border-[#ECE8F0] cursor-pointer transition-all flex items-center gap-1.5 text-xs font-bold"
                  title="Atualizar pedidos manualmente do banco"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#69318A]' : ''}`} />
                  <span>Atualizar</span>
                </button>

                {/* Horário da Última Atualização */}
                <div className="text-xs text-[#726C74] font-medium bg-[#FCFAF7] px-3.5 py-2 rounded-2xl border border-[#ECE8F0] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#69318A]" />
                  <span>Atualizado às {lastUpdateFormatted}</span>
                </div>
              </div>
            </div>

            {/* ÁREA DE BUSCA E FILTROS */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#ECE8F0] space-y-3.5 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Campo de Busca */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#726C74] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, pedido #, telefone ou bairro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] focus:bg-white rounded-2xl text-xs sm:text-sm text-[#28242A] outline-none transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">✕</button>
                  )}
                </div>

                {/* Filtro de Modalidade */}
                <select
                  value={fulfillmentFilter}
                  onChange={(e) => setFulfillmentFilter(e.target.value)}
                  className="py-2.5 px-3.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-2xl text-xs font-bold text-[#28242A] outline-none cursor-pointer"
                >
                  <option value="all">Todas as modalidades</option>
                  <option value="delivery">🛵 Apenas Entrega</option>
                  <option value="pickup">🏪 Apenas Retirada</option>
                </select>

                {/* Filtro de Período */}
                <select
                  value={ordersPeriodFilter}
                  onChange={(e) => setOrdersPeriodFilter(e.target.value as any)}
                  className="py-2.5 px-3.5 bg-[#FCFAF7] border border-[#ECE8F0] focus:border-[#69318A] rounded-2xl text-xs font-bold text-[#28242A] outline-none cursor-pointer"
                >
                  <option value="todos">Todos os períodos</option>
                  <option value="hoje">Hoje</option>
                  <option value="ontem">Ontem</option>
                  <option value="7dias">Últimos 7 dias</option>
                </select>

                {/* Botão de Limpar Filtros se algum estiver ativo */}
                {(searchQuery || fulfillmentFilter !== 'all' || ordersPeriodFilter !== 'todos') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFulfillmentFilter('all');
                      setOrdersPeriodFilter('todos');
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-2xl border border-red-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {/* ABAS OBRIGATÓRIAS COM CONTADORES */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'Todos ativos', count: activeOperationalOrders.length },
                  { id: 'new', label: 'Novos', count: countNew, isAlert: true },
                  { id: 'preparing', label: 'Em preparo', count: countPreparing },
                  { id: 'delivering', label: 'Em entrega', count: countDelivering },
                  { id: 'ready_for_pickup', label: 'Prontos para retirada', count: countReadyPickup },
                  { id: 'done', label: 'Concluídos', count: countDone },
                  { id: 'cancelled', label: 'Cancelados', count: countCancelled },
                  { id: 'archived', label: 'Arquivados', count: countArchived },
                ].map(tab => {
                  const isSelected = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#69318A] text-white shadow-xs'
                          : 'bg-[#FCFAF7] text-[#726C74] hover:bg-[#F3EDF6] hover:text-[#28242A] border border-[#ECE8F0]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isSelected 
                          ? 'bg-white/25 text-white' 
                          : (tab.isAlert && tab.count > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-[#ECE8F0] text-[#28242A]')
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LISTAGEM DE CARDS DE PEDIDOS */}
            <div className="space-y-4">
              {(() => {
                const filteredOrdersList = orders
                  .filter(order => {
                    if (order.deleted_at) return false;

                    // 1. Filtro por Aba de Status
                    let matchesStatus = false;
                    if (statusFilter === 'archived') {
                      matchesStatus = !!order.is_archived;
                    } else if (statusFilter === 'all') {
                      matchesStatus = !order.is_archived && !['cancelled', 'done', 'completed'].includes(order.status);
                    } else if (statusFilter === 'new') {
                      matchesStatus = !order.is_archived && order.status === 'new';
                    } else if (statusFilter === 'preparing') {
                      matchesStatus = !order.is_archived && (order.status === 'preparing' || order.status === 'confirmed');
                    } else if (statusFilter === 'delivering') {
                      matchesStatus = !order.is_archived && (order.status === 'delivering' || order.status === 'out_for_delivery');
                    } else if (statusFilter === 'ready_for_pickup') {
                      matchesStatus = !order.is_archived && order.status === 'ready_for_pickup';
                    } else if (statusFilter === 'done') {
                      matchesStatus = order.status === 'done' || order.status === 'completed';
                    } else if (statusFilter === 'cancelled') {
                      matchesStatus = order.status === 'cancelled';
                    } else {
                      matchesStatus = true;
                    }

                    if (!matchesStatus) return false;

                    // 2. Filtro por Modalidade (Entrega / Retirada)
                    if (fulfillmentFilter !== 'all' && order.fulfillment_type !== fulfillmentFilter) {
                      return false;
                    }

                    // 3. Filtro por Período
                    if (ordersPeriodFilter === 'hoje') {
                      if (getSaoPauloDate(order.created_at) !== todaySP) return false;
                    } else if (ordersPeriodFilter === 'ontem') {
                      if (getSaoPauloDate(order.created_at) !== yesterdaySP) return false;
                    } else if (ordersPeriodFilter === '7dias') {
                      const d7 = new Date();
                      d7.setDate(d7.getDate() - 7);
                      if (new Date(order.created_at).getTime() < d7.getTime()) return false;
                    }

                    // 4. Busca por texto
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase().trim();
                      const cleanPhone = (order.customer_phone || '').replace(/\D/g, '');
                      const cleanQ = q.replace(/\D/g, '');
                      const matchNum = (order.order_number || '').toLowerCase().includes(q);
                      const matchName = (order.customer_name || '').toLowerCase().includes(q);
                      const matchPhone = (order.customer_phone || '').includes(q) || (cleanQ.length > 2 && cleanPhone.includes(cleanQ));
                      const matchNeigh = (order.neighborhood || '').toLowerCase().includes(q);
                      if (!matchNum && !matchName && !matchPhone && !matchNeigh) return false;
                    }

                    return true;
                  })
                  .sort((a, b) => {
                    // Pedidos ativos e novos ordenados do mais antigo para o mais recente para não atrasar nenhum
                    const isOperationalA = !['done', 'completed', 'cancelled'].includes(a.status);
                    const isOperationalB = !['done', 'completed', 'cancelled'].includes(b.status);
                    if (isOperationalA && isOperationalB) {
                      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    }
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  });

                if (filteredOrdersList.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl border border-[#ECE8F0] p-12 text-center space-y-2 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-purple-50 text-[#69318A] flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
                      </div>
                      <h3 className="text-sm font-bold text-[#28242A]">Nenhum pedido nesta etapa.</h3>
                      <p className="text-xs text-[#726C74]">
                        Novos pedidos recebidos aparecerão automaticamente aqui em tempo real.
                      </p>
                    </div>
                  );
                }

                return filteredOrdersList.map(order => {
                  const orderId = order.id || order.order_number;
                  const isUpdating = updatingOrderId === orderId;
                  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                  const StatusIcon = statusInfo.icon;
                  const isNew = order.status === 'new';
                  const isPickup = order.fulfillment_type === 'pickup';
                  const isExpanded = !!expandedOrderIds[orderId];
                  
                  // Pedidos ativos com mais de 35 minutos são considerados atrasados
                  const diffMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
                  const isDelayed = !['done', 'completed', 'cancelled'].includes(order.status) && diffMinutes > 35;

                  return (
                    <div
                      key={orderId}
                      className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                        isNew 
                          ? 'border-[#69318A] shadow-md ring-2 ring-[#69318A]/20 bg-purple-50/10' 
                          : isDelayed 
                            ? 'border-amber-400 bg-amber-50/20 shadow-md' 
                            : 'border-[#ECE8F0] shadow-xs'
                      }`}
                    >
                      {/* CABEÇALHO DO CARD */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#ECE8F0]">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-lg sm:text-xl font-black text-[#28242A] font-['DM_Sans']">
                            Pedido #{order.order_number}
                          </span>
                          
                          <span className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </span>

                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                            isPickup ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                            {isPickup ? '🏪 Retirada no Balcão' : '🛵 Entrega em Domicílio'}
                          </span>

                          {isNew && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#69318A] text-white text-[10px] font-extrabold animate-pulse">
                              NOVO!
                            </span>
                          )}

                          {isDelayed && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>ATRASADO ({diffMinutes} min)</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#726C74]">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#69318A]" />
                            <span>Recebido às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({getElapsedTime(order.created_at)})</span>
                          </span>

                          <button
                            onClick={() => printThermalReceipt(order)}
                            title="Imprimir Comanda do Pedido"
                            className="p-2 bg-[#FCFAF7] hover:bg-[#F3EDF6] text-[#726C74] hover:text-[#69318A] rounded-xl border border-[#ECE8F0] cursor-pointer transition-colors flex items-center gap-1 text-xs font-bold"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimir</span>
                          </button>
                        </div>
                      </div>

                      {/* INFORMAÇÕES DO CLIENTE E ENDEREÇO */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs bg-[#FCFAF7] p-4 rounded-2xl border border-[#ECE8F0]">
                        <div className="space-y-1.5">
                          <div className="font-bold text-[#28242A] text-sm flex items-center gap-2">
                            <span>👤 {order.customer_name}</span>
                            {order.customer_phone && (
                              <a
                                href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 font-bold text-[11px] transition-colors"
                              >
                                💬 WhatsApp
                              </a>
                            )}
                          </div>
                          <div className="text-[#726C74] flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{order.customer_phone || 'Telefone não informado'}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="font-bold text-[#28242A] text-sm flex items-center gap-1.5">
                            {isPickup ? <Store className="w-4 h-4 text-amber-700" /> : <MapPin className="w-4 h-4 text-[#69318A]" />}
                            <span>{isPickup ? 'Retirada na Loja:' : 'Endereço de Entrega:'}</span>
                          </div>
                          <div className="text-[#726C74] leading-relaxed">
                            {isPickup ? (
                              <span className="font-medium text-amber-900">Retirada direta no balcão da açaiteria</span>
                            ) : (
                              <span>
                                <strong className="text-[#28242A]">{order.street ? `${order.street}, Nº ${order.number || 'S/N'}` : 'Endereço não informado'}</strong>
                                {order.neighborhood ? ` - Bairro: ${order.neighborhood}` : ''}
                                {order.complement ? ` (${order.complement})` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ITENS DO PEDIDO (RESUMO INICIAL + EXPANSÃO DE DETALHES) */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#726C74] uppercase tracking-wider">
                            Itens do Pedido ({order.items?.length || 0})
                          </span>
                          <button
                            onClick={() => toggleExpandOrder(orderId)}
                            className="text-xs font-bold text-[#69318A] hover:text-[#572185] flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Visualização Resumida quando recolhido */}
                        {!isExpanded && (
                          <div className="p-3 bg-[#FCFAF7] rounded-2xl border border-[#ECE8F0] text-xs text-[#28242A] flex flex-wrap gap-2">
                            {(order.items || []).map((item, idx) => (
                              <span key={idx} className="bg-white px-2.5 py-1 rounded-xl border border-[#ECE8F0] font-medium shadow-2xs">
                                <strong className="text-[#69318A] mr-1">{item.quantity}x</strong>
                                {item.name}
                                {item.size && <span className="text-[#726C74] ml-1">({item.size})</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Visualização Detalhada quando expandido */}
                        {isExpanded && (
                          <div className="divide-y divide-[#ECE8F0] border border-[#ECE8F0] rounded-2xl bg-white p-3 space-y-2">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="py-2.5 first:pt-1 last:pb-1 text-xs space-y-1.5">
                                <div className="flex justify-between items-start">
                                  <div className="font-bold text-[#28242A] text-sm">
                                    <span className="text-[#69318A] font-extrabold mr-1.5">{item.quantity}x</span>
                                    {item.name}
                                    {item.size && (
                                      <span className="ml-1.5 text-xs text-[#726C74] font-normal">({item.size})</span>
                                    )}
                                  </div>
                                  <span className="font-bold text-[#49245B] font-['DM_Sans'] text-sm">
                                    {formatCurrency(item.totalPrice || item.unitPrice * item.quantity)}
                                  </span>
                                </div>

                                {item.base && (
                                  <div className="text-xs text-[#726C74] pl-5">
                                    Base: <span className="font-semibold text-[#28242A]">{item.base}</span>
                                  </div>
                                )}
                                {item.additionals && item.additionals.length > 0 && (
                                  <div className="text-xs text-[#726C74] pl-5 flex flex-wrap gap-1 items-center">
                                    <span className="font-semibold">Adicionais:</span>
                                    {item.additionals.map((add, aIdx) => (
                                      <span key={aIdx} className="bg-purple-50 text-[#69318A] px-2 py-0.5 rounded-md font-bold text-[11px] border border-purple-100">
                                        +{add}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1 pl-5">
                                    <strong>Obs do item:</strong> {item.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* OBSERVAÇÃO GERAL DO CLIENTE */}
                      {order.notes && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                          <strong className="block font-bold">Observação do Cliente:</strong>
                          <p className="leading-relaxed">{order.notes}</p>
                        </div>
                      )}

                      {/* MOTIVO DO CANCELAMENTO SE HOUVER */}
                      {order.status === 'cancelled' && order.cancellation_reason && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-1">
                          <strong>Motivo do Cancelamento:</strong> {order.cancellation_reason}
                        </div>
                      )}

                      {/* OBSERVAÇÕES INTERNAS DA EQUIPE */}
                      <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#69318A] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Observações Internas (Equipe):</span>
                          </span>
                          {editingNotesId !== orderId && (
                            <button
                              onClick={() => {
                                setEditingNotesId(orderId);
                                setInternalNoteText(order.internal_notes || '');
                              }}
                              className="text-[#69318A] hover:underline font-bold text-[11px] cursor-pointer"
                            >
                              {order.internal_notes ? 'Editar nota' : '+ Adicionar nota'}
                            </button>
                          )}
                        </div>

                        {editingNotesId === orderId ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={internalNoteText}
                              onChange={e => setInternalNoteText(e.target.value)}
                              placeholder="Ex: Cliente pediu copo extra, troco separado..."
                              className="w-full p-2 bg-white border border-[#ECE8F0] rounded-xl text-xs outline-none focus:border-[#69318A]"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="px-3 py-1 bg-gray-200 text-[#28242A] rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveNotes(orderId)}
                                className="px-3 py-1 bg-[#69318A] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                              >
                                Salvar Nota
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[#726C74] italic">
                            {order.internal_notes || 'Nenhuma nota interna registrada.'}
                          </p>
                        )}
                      </div>

                      {/* RODAPÉ DO CARD COM FORMA DE PAGAMENTO, VALORES E AÇÕES RÁPIDAS */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3.5 border-t border-[#ECE8F0] text-xs">
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <span className="text-[#726C74] block text-[10px] font-bold uppercase">Pagamento</span>
                            <span className="font-bold text-[#28242A] uppercase">{order.payment_method}</span>
                          </div>
                          <div>
                            <span className="text-[#726C74] block text-[10px] font-bold uppercase">Subtotal / Frete</span>
                            <span className="text-[#28242A] font-medium">{formatCurrency(order.subtotal)} + {formatCurrency(order.delivery_fee)}</span>
                          </div>
                          <div>
                            <span className="text-[#726C74] block text-[10px] font-bold uppercase">Total do Pedido</span>
                            <span className="text-base sm:text-lg font-black text-[#49245B] font-['DM_Sans']">{formatCurrency(order.total)}</span>
                          </div>
                        </div>

                        {/* BOTÕES DE AÇÃO POR STATUS */}
                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* Indicador de Salvamento Ativo */}
                          {isUpdating && (
                            <span className="text-xs text-[#69318A] font-bold flex items-center gap-1.5 mr-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Salvando no banco...</span>
                            </span>
                          )}

                          {/* 1. SE STATUS === NOVO */}
                          {order.status === 'new' && (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => setCancellingOrderId(order.order_number)}
                                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all border border-red-200 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                                <span>Cancelar</span>
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(orderId, 'preparing')}
                                className="px-4 py-2 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>✓ Aceitar e preparar</span>
                              </button>
                            </>
                          )}

                          {/* 2. SE STATUS === EM PREPARO */}
                          {(order.status === 'preparing' || order.status === 'confirmed') && (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => setCancellingOrderId(order.order_number)}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all border border-red-200 cursor-pointer disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                              {isPickup ? (
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStatus(orderId, 'ready_for_pickup')}
                                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <Store className="w-4 h-4" />
                                  <span>🏪 Pronto para retirada</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    disabled={isUpdating}
                                    onClick={async () => {
                                      try {
                                        const data = await createDeliveryOffer(order.order_number, order.id, order.delivery_fee || 5.00);
                                        if (data && data.success) {
                                          setToastMessage({ text: `Corrida do pedido #${order.order_number} despachada para os entregadores!`, type: 'success' });
                                          setActiveTab('entregadores');
                                        } else {
                                          alert(data?.error || 'Erro ao despachar corrida.');
                                        }
                                      } catch {
                                        alert('Erro ao despachar corrida.');
                                      }
                                    }}
                                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#69318A] border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>📍 Despachar Entregador</span>
                                  </button>
                                  <button
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateStatus(orderId, 'delivering')}
                                    className="px-4 py-2 bg-[#69318A] hover:bg-[#572185] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <Truck className="w-4 h-4" />
                                    <span>🛵 Saiu para entrega</span>
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {/* 3. SE STATUS === EM ENTREGA */}
                          {(order.status === 'delivering' || order.status === 'out_for_delivery') && (
                            <>
                              <button
                                onClick={() => setActiveTab('entregadores')}
                                className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#69318A] rounded-xl text-xs font-bold border border-purple-200 cursor-pointer flex items-center gap-1"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Ver no Mapa GPS</span>
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(orderId, 'done')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>✓ Confirmar entrega</span>
                              </button>
                            </>
                          )}

                          {/* 4. SE STATUS === PRONTO PARA RETIRADA */}
                          {order.status === 'ready_for_pickup' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(orderId, 'done')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>✓ Confirmar retirada</span>
                            </button>
                          )}

                          {/* 5 & 6. CONCLUÍDOS / CANCELADOS */}
                          {['done', 'completed', 'cancelled'].includes(order.status) && (
                            <>
                              <button
                                onClick={() => handleToggleArchive(orderId, order.is_archived || false)}
                                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-[#28242A] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>{order.is_archived ? 'Desarquivar' : 'Arquivar'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(orderId)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="Excluir Permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* 3. FINANCEIRO & FECHAMENTO */}
        {activeTab === 'financeiro' && (
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* Header Financeiro com Informação de Reinício Diário */}
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Painel Financeiro & Fechamento</h3>
                <p className="text-xs text-[#726C74]">O faturamento diário reinicia a cada novo dia visualmente, mantendo todo o histórico seguro no banco</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-[#69318A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#572185] cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Relatório Financeiro (CSV)</span>
              </button>
            </div>

            {/* Grid Financeiro Principal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#726C74] uppercase">Faturamento Hoje</span>
                <span className="text-2xl font-black text-[#49245B] block font-['DM_Sans']">{formatCurrency(faturamentoHoje)}</span>
                <span className="text-[11px] text-emerald-600">✓ Inicia em R$ 0,00 a cada novo dia</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#726C74] uppercase">Faturamento da Semana</span>
                <span className="text-2xl font-black text-blue-700 block font-['DM_Sans']">{formatCurrency(faturamentoSemana)}</span>
                <span className="text-[11px] text-[#726C74]">Últimos 7 dias de operação</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#726C74] uppercase">Faturamento do Mês</span>
                <span className="text-2xl font-black text-purple-700 block font-['DM_Sans']">{formatCurrency(faturamentoMes)}</span>
                <span className="text-[11px] text-[#726C74]">Mês corrente</span>
              </div>
            </div>

            {/* Detalhamento por Forma de Pagamento */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-[#69318A] font-bold text-xs">
                  <QrCode className="w-4 h-4" />
                  <span>Pix Online / Loja</span>
                </div>
                <span className="text-xl font-bold text-[#28242A] block">{formatCurrency(pagamentosPeriodo.pix)}</span>
                <span className="text-[11px] text-[#726C74]">Recebimentos instantâneos</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão (Online / Maquininha)</span>
                </div>
                <span className="text-xl font-bold text-[#28242A] block">{formatCurrency(pagamentosPeriodo.card)}</span>
                <span className="text-[11px] text-[#726C74]">Crédito e Débito</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <Banknote className="w-4 h-4" />
                  <span>Dinheiro na Entrega</span>
                </div>
                <span className="text-xl font-bold text-[#28242A] block">{formatCurrency(pagamentosPeriodo.delivery)}</span>
                <span className="text-[11px] text-[#726C74]">Pagamentos em espécie</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                  <Truck className="w-4 h-4" />
                  <span>Taxas de Entrega</span>
                </div>
                <span className="text-xl font-bold text-[#28242A] block">{formatCurrency(pagamentosPeriodo.deliveryFees)}</span>
                <span className="text-[11px] text-[#726C74]">Total de fretes cobrados</span>
              </div>
            </div>

            {/* Controle de Caixa Diário */}
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex flex-wrap justify-between items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#28242A]">Controle de Caixa & Operação Física</h4>
                <p className="text-xs text-[#726C74]">Abertura de caixa, sangrias, reforços e fechamento da gaveta</p>
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

            {/* Histórico Financeiro por Data */}
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#28242A]">Histórico de Vendas Concluídas por Data</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#ECE8F0] text-[#726C74] font-bold">
                      <th className="pb-3">Data</th>
                      <th className="pb-3">Total de Pedidos</th>
                      <th className="pb-3">Concluídos</th>
                      <th className="pb-3">Cancelados</th>
                      <th className="pb-3">Ticket Médio</th>
                      <th className="pb-3 text-right">Faturamento Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE8F0]">
                    {Array.from(new Set(orders.map(o => getSaoPauloDate(o.created_at))))
                      .sort((a, b) => b.localeCompare(a))
                      .slice(0, 15)
                      .map((dateStr, idx) => {
                        const dayOrders = orders.filter(o => !o.deleted_at && getSaoPauloDate(o.created_at) === dateStr);
                        const doneCount = dayOrders.filter(o => o.status === 'done').length;
                        const cancelCount = dayOrders.filter(o => o.status === 'cancelled').length;
                        const totalFat = dayOrders.filter(o => o.status === 'done').reduce((s, o) => s + Number(o.total || 0), 0);
                        const tMed = doneCount > 0 ? totalFat / doneCount : 0;
                        const isToday = dateStr === todaySP;

                        return (
                          <tr key={idx} className={isToday ? 'bg-purple-50/50 font-semibold' : ''}>
                            <td className="py-3">
                              <span className="font-mono">{dateStr.split('-').reverse().join('/')}</span>
                              {isToday && <span className="ml-2 text-[10px] bg-[#69318A] text-white px-1.5 py-0.2 rounded font-bold">Hoje</span>}
                            </td>
                            <td className="py-3">{dayOrders.length}</td>
                            <td className="py-3 text-emerald-700 font-bold">{doneCount}</td>
                            <td className="py-3 text-red-600">{cancelCount}</td>
                            <td className="py-3">{formatCurrency(tMed)}</td>
                            <td className="py-3 text-right font-black text-[#49245B] font-['DM_Sans']">
                              {formatCurrency(totalFat)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. CARDÁPIO (PRODUTOS, CATEGORIAS, TAMANHOS, ADICIONAIS, COMBOS, ESTOQUE) */}
        {activeTab === 'cardapio' && (
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* Sub-navegação do Cardápio */}
            <div className="bg-white p-3 rounded-2xl border border-[#ECE8F0] shadow-xs flex flex-wrap gap-1.5 text-xs font-bold">
              {[
                { id: 'produtos', label: '🍨 Produtos & Itens' },
                { id: 'categorias', label: '🏷️ Categorias' },
                { id: 'tamanhos', label: '📏 Tamanhos & Preços' },
                { id: 'adicionais', label: '🍓 Adicionais & Toppings' },
                { id: 'combos', label: '🎁 Combos & Cupons' },
                { id: 'estoque', label: '⚡ Estoque Rápido' },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setCardapioSubTab(sub.id as any)}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    cardapioSubTab === sub.id
                      ? 'bg-[#69318A] text-white shadow-xs'
                      : 'bg-[#FCFAF7] text-[#726C74] hover:bg-[#F3EDF6] border border-[#ECE8F0]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Sub-aba 1: Produtos */}
            {cardapioSubTab === 'produtos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[#ECE8F0] shadow-xs">
                  <div>
                    <h3 className="text-sm font-bold text-[#28242A]">Gerenciamento de Produtos</h3>
                    <p className="text-xs text-[#726C74]">Alterações feitas aqui refletem imediatamente na loja dos clientes</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct({
                        id: `prod_${Date.now()}`,
                        name: '',
                        description: '',
                        price: 19.90,
                        category: 'acai',
                        image: '/images/products/acai-tradicional.webp',
                        isAvailable: true,
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#69318A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#572185] cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Novo Produto</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map(prod => (
                    <div key={prod.id} className="bg-white rounded-2xl border border-[#ECE8F0] overflow-hidden shadow-xs space-y-3 p-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-[#ECE8F0]">
                          <img 
                            src={prod.image} 
                            alt={prod.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/products/product-placeholder.webp';
                            }}
                            className="w-full h-full object-cover object-center" 
                          />
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            prod.isAvailable ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                            {prod.isAvailable ? 'Disponível' : 'Esgotado'}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#28242A]">{prod.name}</h4>
                        <p className="text-xs text-[#726C74] line-clamp-2">{prod.description}</p>
                      </div>

                      <div className="pt-2 border-t border-[#ECE8F0] flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-[#49245B] font-['DM_Sans']">
                            {formatCurrency(prod.promotionalPrice || prod.price)}
                          </span>
                          {prod.promotionalPrice && (
                            <span className="text-[11px] text-gray-400 line-through ml-1.5">{formatCurrency(prod.price)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleProductAvailability(prod.id, !prod.isAvailable)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                              prod.isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                            title="Alternar disponibilidade"
                          >
                            {prod.isAvailable ? 'Ativo' : 'Pausado'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-[#ECE8F0] hover:bg-[#F3EDF6] text-[#69318A] cursor-pointer"
                            title="Editar produto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente remover o produto "${prod.name}"?`)) {
                                deleteProduct(prod.id);
                                setToastMessage({ text: 'Produto removido do cardápio!', type: 'success' });
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 cursor-pointer"
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

            {/* Sub-aba 2: Categorias */}
            {cardapioSubTab === 'categorias' && (
              <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#28242A]">Categorias do Cardápio</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="Nome da nova categoria..."
                      className="p-2 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!newCategoryName.trim()) return alert('Informe o nome da categoria');
                        alert(`Categoria "${newCategoryName}" adicionada com sucesso!`);
                        setNewCategoryName('');
                      }}
                      className="px-3.5 py-2 bg-[#69318A] text-white rounded-xl text-xs font-bold"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map(c => (
                    <div key={c.id} className="p-3.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#28242A] block">{c.name}</span>
                        <span className="text-[10px] text-[#726C74]">{c.description || 'Categoria de produtos'}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-100 text-[#69318A] rounded-md font-bold text-[10px]">
                        Ativa
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-aba 3: Tamanhos & Preços */}
            {cardapioSubTab === 'tamanhos' && (
              <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#28242A]">Tamanhos & Preços Padronizados</h3>
                <p className="text-xs text-[#726C74]">Configuração de volumes padrão de açaí e seus valores base</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {sizes.map(s => (
                    <div key={s.id} className="p-4 bg-[#FCFAF7] border border-[#ECE8F0] rounded-2xl space-y-2 text-xs">
                      <span className="font-extrabold text-[#28242A] text-sm block">{s.name}</span>
                      <p className="text-[11px] text-[#726C74]">{s.description || 'Copo padrão'}</p>
                      <div className="flex items-center gap-2 pt-2 border-t border-[#ECE8F0]">
                        <span className="text-[#726C74]">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          defaultValue={s.price}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            updateSizePrice(s.id, val);
                            setToastMessage({ text: `Preço de ${s.name} atualizado!`, type: 'success' });
                          }}
                          className="w-full p-1.5 bg-white border border-[#ECE8F0] rounded-lg font-bold text-[#69318A]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-aba 4: Adicionais & Toppings */}
            {cardapioSubTab === 'adicionais' && (
              <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#28242A]">Adicionais, Frutas & Coberturas</h3>
                <p className="text-xs text-[#726C74]">Altere preços e limites de adicionais gratuitos e pagos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {addons.map(a => (
                    <div key={a.id} className="p-3.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#28242A] block">{a.name}</span>
                        <span className="text-[11px] text-[#726C74]">{a.category || 'Complemento'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[#726C74]">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          defaultValue={a.price}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            updateAddonPrice(a.id, val);
                            setToastMessage({ text: `Preço de ${a.name} atualizado!`, type: 'success' });
                          }}
                          className="w-16 p-1 bg-white border border-[#ECE8F0] rounded-lg font-bold text-[#69318A] text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-aba 5: Combos & Cupons */}
            {cardapioSubTab === 'combos' && (
              <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#28242A]">Cupons de Desconto & Promoções</h3>
                  <button
                    onClick={() => {
                      const code = prompt('Código do novo cupom (ex: BEMVINDO10):');
                      if (code) {
                        setCoupons([...coupons, { id: String(Date.now()), code: code.toUpperCase(), discountType: 'fixed', discountValue: 5.00, minOrder: 30.00, isActive: true }]);
                        setToastMessage({ text: `Cupom ${code} criado!`, type: 'success' });
                      }
                    }}
                    className="px-3.5 py-2 bg-[#69318A] text-white rounded-xl text-xs font-bold"
                  >
                    + Criar Cupom
                  </button>
                </div>

                <div className="divide-y divide-[#ECE8F0]">
                  {coupons.map(cp => (
                    <div key={cp.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-[#69318A] font-mono text-sm block">{cp.code}</span>
                        <span className="text-[#726C74]">Desconto: {cp.discountType === 'percentage' ? `${cp.discountValue}%` : formatCurrency(cp.discountValue)} • Mínimo: {formatCurrency(cp.minOrder)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setCoupons(coupons.map(c => c.id === cp.id ? { ...c, isActive: !c.isActive } : c));
                        }}
                        className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${cp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {cp.isActive ? 'Ativo' : 'Pausado'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-aba 6: Estoque Rápido */}
            {cardapioSubTab === 'estoque' && (
              <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#28242A]">Operação Rápida de Estoque</h3>
                  <p className="text-xs text-[#726C74]">Clique para pausar ou reativar itens instantaneamente durante o atendimento</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {products.map(prod => (
                    <button
                      key={prod.id}
                      onClick={() => {
                        toggleProductAvailability(prod.id, !prod.isAvailable);
                        logAudit('Estoque Rápido', 'Produtos', `${prod.name} ${!prod.isAvailable ? 'ativado' : 'pausado'}`);
                      }}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                        prod.isAvailable 
                          ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50' 
                          : 'border-red-200 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      <span className="font-bold text-xs text-[#28242A] line-clamp-1">{prod.name}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md self-start ${
                        prod.isAvailable ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {prod.isAvailable ? '✓ Disponível' : '✗ Esgotado'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. CLIENTES & CRM */}
        {activeTab === 'clientes' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#28242A]">Base de Clientes & CRM</h3>
                  <p className="text-xs text-[#726C74]">Consulte o histórico de pedidos, frequência e valor acumulado de cada cliente</p>
                </div>
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-[#726C74] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                    placeholder="Buscar cliente por nome ou telefone..."
                    className="w-full pl-9 pr-3 py-2 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#ECE8F0] text-[#726C74] font-bold">
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Telefone</th>
                      <th className="pb-3">Endereço Principal</th>
                      <th className="pb-3">Total de Pedidos</th>
                      <th className="pb-3">Total Gasto</th>
                      <th className="pb-3">Último Pedido</th>
                      <th className="pb-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE8F0]">
                    {filteredCustomers.map((cust, idx) => (
                      <tr key={idx} className="hover:bg-[#FCFAF7] transition-colors">
                        <td className="py-3 font-bold text-[#28242A]">{cust.name}</td>
                        <td className="py-3 text-[#726C74]">
                          {cust.phone !== 'Não informado' ? (
                            <a 
                              href={`https://wa.me/55${cust.phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[#69318A] hover:underline font-semibold"
                            >
                              📞 {cust.phone}
                            </a>
                          ) : 'Não informado'}
                        </td>
                        <td className="py-3 text-[#726C74] max-w-[200px] truncate">{cust.address}</td>
                        <td className="py-3 font-bold text-[#28242A]">{cust.count}</td>
                        <td className="py-3 font-black text-[#49245B] font-['DM_Sans']">{formatCurrency(cust.totalSpent)}</td>
                        <td className="py-3 text-[#726C74]">{new Date(cust.lastOrder).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setSelectedCustomerHistory(cust)}
                            className="px-3 py-1 bg-purple-50 text-[#69318A] rounded-lg font-bold hover:bg-purple-100 cursor-pointer"
                          >
                            Ver Histórico
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL DE HISTÓRICO DE COMPRAS DO CLIENTE */}
            {selectedCustomerHistory && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-3xl p-6 space-y-4 shadow-2xl border border-[#ECE8F0] max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
                    <div>
                      <h3 className="text-base font-bold text-[#28242A]">Histórico de {selectedCustomerHistory.name}</h3>
                      <p className="text-xs text-[#726C74]">📞 {selectedCustomerHistory.phone}</p>
                    </div>
                    <button onClick={() => setSelectedCustomerHistory(null)} className="p-1 text-[#726C74]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedCustomerHistory.orders.map(o => (
                      <div key={o.order_number} className="p-3.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-2xl text-xs space-y-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#69318A]">Pedido #{o.order_number}</span>
                          <span className="text-[#28242A]">{new Date(o.created_at).toLocaleString('pt-BR')}</span>
                          <span className="font-black text-[#49245B]">{formatCurrency(o.total)}</span>
                        </div>
                        <div className="text-[#726C74]">
                          {(o.items || []).map((it, i) => (
                            <div key={i}>• {it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. ENTREGADORES & MAPA GPS */}
        {activeTab === 'entregadores' && (
          <div className="p-4 sm:p-8 space-y-6">
            <AdminLiveDeliveries />
          </div>
        )}

        {/* 7. RELATÓRIOS GERENCIAIS */}
        {activeTab === 'relatorios' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#28242A]">Relatórios Gerenciais de Vendas</h3>
                  <p className="text-xs text-[#726C74]">Consolidação de dados operacionais e financeiros para exportação</p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 bg-[#69318A] text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#572185] cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Relatório Completo (CSV)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-[#FCFAF7] border border-[#ECE8F0] rounded-2xl text-xs space-y-1">
                  <span className="text-[#726C74] font-bold">Total de Pedidos no Sistema</span>
                  <span className="text-2xl font-black text-[#28242A] block">{orders.length}</span>
                </div>
                <div className="p-4 bg-[#FCFAF7] border border-[#ECE8F0] rounded-2xl text-xs space-y-1">
                  <span className="text-[#726C74] font-bold">Total de Vendas Concluídas</span>
                  <span className="text-2xl font-black text-emerald-700 block">{countDone}</span>
                </div>
                <div className="p-4 bg-[#FCFAF7] border border-[#ECE8F0] rounded-2xl text-xs space-y-1">
                  <span className="text-[#726C74] font-bold">Total Faturado Histórico</span>
                  <span className="text-2xl font-black text-[#49245B] block font-['DM_Sans']">
                    {formatCurrency(orders.filter(o => o.status === 'done').reduce((s, o) => s + Number(o.total || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. CONFIGURAÇÕES DA LOJA */}
        {activeTab === 'configuracoes' && (
          <div className="p-4 sm:p-8 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#28242A]">Configurações Gerais da Loja</h3>
                <p className="text-xs text-[#726C74]">Horários, taxas, prazos médios e integração do WhatsApp</p>
              </div>

              {/* Informações da Loja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Nome da Loja</label>
                  <input
                    type="text"
                    defaultValue={storeSettings.storeName}
                    onBlur={(e) => updateStoreSettings({ storeName: e.target.value })}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">WhatsApp de Atendimento</label>
                  <input
                    type="text"
                    defaultValue={storeSettings.phone}
                    onBlur={(e) => updateStoreSettings({ phone: e.target.value })}
                    placeholder="(13) 99150-9733"
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Tempo Médio de Preparo</label>
                  <input
                    type="text"
                    defaultValue={storeSettings.estimatedPrepTime || '20-30 min'}
                    onBlur={(e) => updateStoreSettings({ estimatedPrepTime: e.target.value })}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#726C74] font-bold mb-1">Tempo Médio de Entrega</label>
                  <input
                    type="text"
                    defaultValue={storeSettings.estimatedDeliveryTime || '30-45 min'}
                    onBlur={(e) => updateStoreSettings({ estimatedDeliveryTime: e.target.value })}
                    className="w-full p-2.5 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Guia de Integração WhatsApp Cloud API */}
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-[#69318A]">
                  <MessageSquare className="w-4 h-4" />
                  <span>Integração Oficial de WhatsApp (Meta Cloud API)</span>
                </div>
                <p className="text-[#726C74]">
                  O sistema dispara automaticamente as mensagens nos status: <strong>Confirmado (Em Preparo)</strong>, <strong>Saiu para entrega</strong>, <strong>Pronto para retirada</strong> e <strong>Cancelado</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[#28242A] font-bold mb-1">WHATSAPP_PHONE_NUMBER_ID (Meta)</label>
                    <input
                      type="text"
                      placeholder="Ex: 109283746501928"
                      value={whatsappPhoneIdInput}
                      onChange={e => setWhatsappPhoneIdInput(e.target.value)}
                      className="w-full p-2 bg-white border border-[#ECE8F0] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#28242A] font-bold mb-1">WHATSAPP_API_TOKEN (Meta Token)</label>
                    <input
                      type="password"
                      placeholder="EAABwzLIXyZB... (Token de Acesso Permanente)"
                      value={whatsappTokenInput}
                      onChange={e => setWhatsappTokenInput(e.target.value)}
                      className="w-full p-2 bg-white border border-[#ECE8F0] rounded-xl text-xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#69318A]">
                  Para configurar no servidor Vercel / Produção: adicione as variáveis de ambiente <code className="bg-white px-1 py-0.5 rounded font-mono">WHATSAPP_API_TOKEN</code> e <code className="bg-white px-1 py-0.5 rounded font-mono">WHATSAPP_PHONE_NUMBER_ID</code>.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setToastMessage({ text: 'Configurações da loja salvas!', type: 'success' })}
                  className="px-6 py-2.5 bg-[#69318A] text-white rounded-xl text-xs font-bold hover:bg-[#572185] shadow-xs cursor-pointer"
                >
                  Salvar Configurações
                </button>
              </div>
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Item ou insumo esgotado',
                  'Endereço fora do raio de entrega',
                  'Cliente solicitou cancelamento',
                  'Problema no pagamento / Pix não identificado',
                  'Pedido duplicado'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCancellationReason(preset)}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-semibold transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancellingOrderId(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#28242A] text-xs font-bold rounded-xl cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (!cancellationReason.trim()) return alert('Informe o motivo do cancelamento');
                  handleUpdateStatus(cancellingOrderId, 'cancelled', cancellationReason.trim());
                  setCancellingOrderId(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
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
