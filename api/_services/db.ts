import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendCustomerWhatsAppStatusNotification } from './whatsapp';

export interface DbOrderItem {
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

export interface DbOrder {
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
  items: DbOrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: 'new' | 'confirmed' | 'preparing' | 'delivering' | 'ready_for_pickup' | 'done' | 'cancelled' | 'out_for_delivery' | 'completed';
  notes?: string;
  cancellation_reason?: string;
  internal_notes?: string;
  is_archived?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  idempotency_key?: string;
  status_history?: Array<{
    previous_status?: string | null;
    new_status: string;
    changed_by?: string;
    reason?: string | null;
    created_at: string;
  }>;
}

export interface ListOrdersOptions {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  deletedOnly?: boolean;
  statusFilter?: string;
}

import fs from 'fs';
import path from 'path';

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless 
  ? path.join('/tmp', '.data') 
  : path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'orders_store.json');

function getOrdersStore(): DbOrder[] {
  if ((globalThis as any).__ACAI_PERSISTENT_ORDERS__) {
    return (globalThis as any).__ACAI_PERSISTENT_ORDERS__;
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        (globalThis as any).__ACAI_PERSISTENT_ORDERS__ = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[DB] Could not load persistent orders from file:', e);
  }
  (globalThis as any).__ACAI_PERSISTENT_ORDERS__ = [];
  return (globalThis as any).__ACAI_PERSISTENT_ORDERS__;
}

function saveOrdersStore(orders: DbOrder[]) {
  (globalThis as any).__ACAI_PERSISTENT_ORDERS__ = orders;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[DB] Could not save persistent orders to file:', e);
  }
}

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key && url.trim().startsWith('http') && key.trim().length > 10) {
    try {
      return createClient(url.trim(), key.trim(), {
        auth: { persistSession: false },
      });
    } catch (e) {
      console.error('[DB] Error initializing Supabase client:', e);
      return null;
    }
  }
  return null;
}

export function normalizeOrderStatus(status: string): DbOrder['status'] {
  const s = String(status || '').toLowerCase().trim();
  if (['new', 'novo', 'novos', 'pending', 'open', 'created'].includes(s)) return 'new';
  if (['confirmed', 'confirmado', 'confirmados', 'accepted', 'aceito'].includes(s)) return 'confirmed';
  if (['preparing', 'em_preparo', 'preparo', 'preparando', 'in_production'].includes(s)) return 'preparing';
  if (['delivering', 'out_for_delivery', 'saiu_para_entrega', 'em_entrega', 'a_caminho'].includes(s)) return 'delivering';
  if (['ready_for_pickup', 'pronto', 'prontos', 'pronto_para_retirada', 'ready'].includes(s)) return 'ready_for_pickup';
  if (['done', 'completed', 'entregue', 'concluido', 'concluído', 'finalizado', 'retirado'].includes(s)) return 'done';
  if (['cancelled', 'canceled', 'cancelado', 'cancelados', 'rejected', 'recusado'].includes(s)) return 'cancelled';
  return 'new';
}

function getNotificationMessage(status: string, orderNumber: string, reason?: string, fulfillmentType: string = 'delivery'): string {
  switch (status) {
    case 'new':
      return `Recebemos seu pedido #${orderNumber}. Em instantes vamos confirmar.`;
    case 'confirmed':
      return `Seu pedido #${orderNumber} foi confirmado e já entrou na fila de produção.`;
    case 'preparing':
      return `Seu pedido #${orderNumber} está sendo preparado.`;
    case 'delivering':
    case 'out_for_delivery':
      return `Seu pedido #${orderNumber} saiu para entrega. Em breve chegará ao endereço informado.`;
    case 'ready_for_pickup':
      return `Seu pedido #${orderNumber} está pronto para retirada no balcão.`;
    case 'done':
    case 'completed':
      return fulfillmentType === 'pickup'
        ? `Seu pedido #${orderNumber} foi retirado. Obrigado pela preferência!`
        : `Seu pedido #${orderNumber} foi entregue. Obrigado por escolher a Açaí Puro Sabor!`;
    case 'cancelled':
      return `Seu pedido #${orderNumber} foi cancelado. Motivo: ${reason || 'Cancelamento solicitado pela loja'}.`;
    default:
      return `Status do pedido #${orderNumber} atualizado para ${status}.`;
  }
}

export async function insertOrder(order: DbOrder): Promise<DbOrder> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const normalizedStatus = normalizeOrderStatus(order.status || 'new');
  const store = getOrdersStore();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: order.order_number,
          access_token: order.access_token || `tok_${Math.random().toString(36).substring(2, 12)}`,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          fulfillment_type: order.fulfillment_type || 'delivery',
          street: order.street,
          number: order.number,
          neighborhood: order.neighborhood,
          complement: order.complement,
          items: order.items,
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          total: order.total,
          payment_method: order.payment_method,
          status: normalizedStatus,
          notes: order.notes,
          internal_notes: order.internal_notes,
          is_archived: false,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        console.log(`[DB] Order ${data.order_number} saved in Supabase with ID ${data.id}`);
        // Também atualizar o cache de memória local persistente
        const existingIdx = store.findIndex(o => o.order_number === data.order_number || o.id === data.id);
        if (existingIdx >= 0) store[existingIdx] = data as DbOrder;
        else store.unshift(data as DbOrder);
        saveOrdersStore(store);

        // Gravar primeiro status no histórico
        try {
          await supabase.from('order_status_history').insert({
            order_id: data.id,
            order_number: data.order_number,
            previous_status: null,
            new_status: normalizedStatus,
            changed_by: 'checkout',
            created_at: now,
          });
        } catch {}

        return data as DbOrder;
      }
      if (error) {
        console.error('[DB] Supabase insert error:', error.message);
      }
    } catch (e: any) {
      console.error('[DB] Supabase insert exception:', e?.message || e);
    }
  }

  // Fallback seguro persistente
  const newOrder: DbOrder = {
    ...order,
    id: order.id || `ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    access_token: order.access_token || `tok_${Math.random().toString(36).substring(2, 12)}`,
    status: normalizedStatus,
    is_archived: false,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  const existingIdx = store.findIndex(o => o.order_number === newOrder.order_number || o.id === newOrder.id);
  if (existingIdx >= 0) store[existingIdx] = newOrder;
  else store.unshift(newOrder);
  saveOrdersStore(store);

  console.log(`[DB] Order ${newOrder.order_number} saved in persistent fallback.`);
  return newOrder;
}

export async function listAllOrders(options: ListOrdersOptions = {}): Promise<DbOrder[]> {
  const { includeArchived = false, includeDeleted = false, deletedOnly = false, statusFilter } = options;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (deletedOnly) {
        query = query.not('deleted_at', 'is', null);
      } else if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      if (!includeArchived && statusFilter !== 'archived') {
        query = query.eq('is_archived', false);
      } else if (statusFilter === 'archived') {
        query = query.eq('is_archived', true);
      }

      if (statusFilter && statusFilter !== 'all' && statusFilter !== 'archived') {
        const norm = normalizeOrderStatus(statusFilter);
        query = query.eq('status', norm);
      }

      const { data, error } = await query;
      if (!error && data) {
        // Sincronizar e mesclar cache persistente com dados reais do Supabase
        const currentStore = getOrdersStore();
        (data as DbOrder[]).forEach(supaOrder => {
          const idx = currentStore.findIndex(o => (supaOrder.id && o.id === supaOrder.id) || (supaOrder.order_number && o.order_number === supaOrder.order_number));
          if (idx >= 0) currentStore[idx] = supaOrder;
          else currentStore.unshift(supaOrder);
        });
        saveOrdersStore(currentStore);
      }
      if (error) {
        console.error('[DB] Supabase query error:', error.message);
      }
    } catch (e: any) {
      console.error('[DB] Supabase query exception:', e?.message || e);
    }
  }

  // Filtragem no armazenamento persistente unificado
  const store = getOrdersStore();
  let filtered = [...store];
  if (deletedOnly) {
    filtered = filtered.filter(o => !!o.deleted_at);
  } else if (!includeDeleted) {
    filtered = filtered.filter(o => !o.deleted_at);
  }

  if (!includeArchived && statusFilter !== 'archived') {
    filtered = filtered.filter(o => !o.is_archived);
  } else if (statusFilter === 'archived') {
    filtered = filtered.filter(o => !!o.is_archived);
  }

  if (statusFilter && statusFilter !== 'all' && statusFilter !== 'archived') {
    const norm = normalizeOrderStatus(statusFilter);
    filtered = filtered.filter(o => o.status === norm);
  }

  // Ordenar decrescente por data
  return filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

export const listOrders = listAllOrders;

export async function getOrder(orderIdOrNumberOrToken: string): Promise<DbOrder | null> {
  const supabase = getSupabaseClient();
  const searchKey = String(orderIdOrNumberOrToken || '').trim();
  if (!searchKey) return null;

  if (supabase) {
    try {
      const isIdUuid = isUUID(searchKey);
      let query = supabase.from('orders').select('*');
      if (isIdUuid) {
        query = query.eq('id', searchKey);
      } else {
        query = query.or(`order_number.eq.${searchKey},access_token.eq.${searchKey},id.eq.${searchKey}`);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) return data as DbOrder;
    } catch {}
  }

  const store = getOrdersStore();
  const found = store.find(o => 
    o.id === searchKey || 
    o.order_number === searchKey || 
    o.access_token === searchKey
  );
  return found || null;
}

export async function getOrderStatusHistoryDb(orderNumber: string, orderId?: string): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('order_status_history').select('*');
      if (orderId && isUUID(orderId)) {
        query = query.or(`order_id.eq.${orderId},order_number.eq.${orderNumber}`);
      } else {
        query = query.eq('order_number', orderNumber);
      }
      const { data, error } = await query.order('created_at', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }

  const store = getOrdersStore();
  const found = store.find(o => o.order_number === orderNumber || (orderId && o.id === orderId));
  if (found && Array.isArray(found.status_history) && found.status_history.length > 0) {
    return found.status_history;
  }
  return [];
}

export async function updateOrderStatusDb(
  orderIdOrNumber: string,
  newStatus: string,
  reason?: string,
  changedBy: string = 'admin'
): Promise<DbOrder | null> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const normalizedStatus = normalizeOrderStatus(newStatus);
  const isIdUuid = isUUID(orderIdOrNumber);
  const store = getOrdersStore();

  if (supabase) {
    try {
      // 1. Obter pedido atual
      let sel = supabase.from('orders').select('*');
      if (isIdUuid) sel = sel.eq('id', orderIdOrNumber);
      else sel = sel.eq('order_number', orderIdOrNumber);
      const { data: currentOrder } = await sel.maybeSingle();

      const previousStatus = currentOrder?.status || 'new';
      const orderNumber = currentOrder?.order_number || orderIdOrNumber;
      const actualOrderId = isUUID(currentOrder?.id) ? currentOrder.id : (isIdUuid ? orderIdOrNumber : null);
      const fulfillmentType = currentOrder?.fulfillment_type || 'delivery';

      const updatePayload: any = {
        status: normalizedStatus,
        updated_at: now,
      };

      if (normalizedStatus === 'done') {
        updatePayload.completed_at = now;
      }
      if (normalizedStatus === 'cancelled') {
        updatePayload.cancellation_reason = reason || 'Cancelado pela loja';
      }

      // 2. Executar UPDATE
      let query = supabase.from('orders').update(updatePayload);
      if (isIdUuid) query = query.eq('id', orderIdOrNumber);
      else query = query.eq('order_number', orderIdOrNumber);

      const { data: updatedOrder, error } = await query.select().maybeSingle();

      if (!error && updatedOrder) {
        const notifMsg = getNotificationMessage(normalizedStatus, orderNumber, reason, fulfillmentType);

        // 3. Gravar histórico
        try {
          await supabase.from('order_status_history').insert({
            order_id: actualOrderId,
            order_number: orderNumber,
            previous_status: previousStatus,
            new_status: normalizedStatus,
            changed_by: changedBy,
            reason: reason || null,
            created_at: now,
          });
        } catch {}

        // 4. Gravar notificação
        try {
          await supabase.from('order_notifications').insert({
            order_id: actualOrderId,
            order_number: orderNumber,
            status: normalizedStatus,
            message: notifMsg,
            channel: 'app_timeline',
            sent_at: now,
          });
        } catch {}

        // 5. Gravar auditoria
        try {
          await supabase.from('audit_logs').insert({
            user_email: changedBy,
            action: 'Atualização de Status do Pedido',
            entity: 'orders',
            entity_id: actualOrderId || orderNumber,
            details: { orderNumber, from: previousStatus, to: normalizedStatus, reason: reason || null },
          });
        } catch {}

        // Sincronizar cache persistente e status_history
        const memIdx = store.findIndex(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
        const memOrder = memIdx >= 0 ? store[memIdx] : (updatedOrder as DbOrder);
        if (!memOrder.status_history) memOrder.status_history = [];
        memOrder.status_history.push({
          previous_status: previousStatus,
          new_status: normalizedStatus,
          changed_by: changedBy,
          reason: reason || null,
          created_at: now,
        });
        (updatedOrder as any).status_history = memOrder.status_history;

        if (memIdx >= 0) store[memIdx] = updatedOrder as DbOrder;
        else store.unshift(updatedOrder as DbOrder);
        saveOrdersStore(store);

        // 6. Disparar notificação automática para o WhatsApp do cliente
        sendCustomerWhatsAppStatusNotification(updatedOrder as DbOrder, normalizedStatus).catch(e => {
          console.warn('[WhatsApp Customer Dispatch Error]:', e);
        });

        return updatedOrder as DbOrder;
      }
    } catch (e: any) {
      console.error('[DB] Supabase update status exception:', e?.message || e);
    }
  }

  // Fallback persistente
  const order = store.find(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
  if (order) {
    const previousStatus = order.status || 'new';
    order.status = normalizedStatus;
    order.updated_at = now;
    if (normalizedStatus === 'done') order.completed_at = now;
    if (normalizedStatus === 'cancelled') order.cancellation_reason = reason || 'Cancelado pela loja';
    
    if (!order.status_history) order.status_history = [];
    order.status_history.push({
      previous_status: previousStatus,
      new_status: normalizedStatus,
      changed_by: changedBy,
      reason: reason || null,
      created_at: now,
    });

    saveOrdersStore(store);

    // Disparar notificação automática para o WhatsApp do cliente no fallback
    sendCustomerWhatsAppStatusNotification(order, normalizedStatus).catch(e => {
      console.warn('[WhatsApp Customer Dispatch Fallback Error]:', e);
    });

    return order;
  }

  return null;
}

export async function softDeleteOrderDb(
  orderIdOrNumber: string,
  reason: string = 'Exclusão solicitada pelo lojista',
  deletedBy: string = 'admin@acaipuro.com.br'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);
  const store = getOrdersStore();

  if (supabase) {
    try {
      let query = supabase.from('orders').update({
        deleted_at: now,
        deleted_by: deletedBy,
        deletion_reason: reason,
        updated_at: now,
      });
      if (isIdUuid) query = query.eq('id', orderIdOrNumber);
      else query = query.eq('order_number', orderIdOrNumber);

      const { error } = await query;
      if (!error) {
        try {
          await supabase.from('audit_logs').insert({
            user_email: deletedBy,
            action: 'Exclusão Lógica de Pedido',
            entity: 'orders',
            entity_id: orderIdOrNumber,
            details: { action: 'soft_delete', reason, deleted_by: deletedBy },
          });
        } catch {}

        const memIdx = store.findIndex(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
        if (memIdx >= 0) {
          store[memIdx].deleted_at = now;
          store[memIdx].deleted_by = deletedBy;
          store[memIdx].deletion_reason = reason;
          saveOrdersStore(store);
        }
        return true;
      }
    } catch (e) {
      console.error('[DB] Soft delete exception:', e);
    }
  }

  const order = store.find(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
  if (order) {
    order.deleted_at = now;
    order.deleted_by = deletedBy;
    order.deletion_reason = reason;
    order.updated_at = now;
    saveOrdersStore(store);
    return true;
  }

  return false;
}

export async function restoreOrderDb(
  orderIdOrNumber: string,
  user: string = 'admin@acaipuro.com.br'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);
  const store = getOrdersStore();

  if (supabase) {
    try {
      let query = supabase.from('orders').update({
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: now,
      });
      if (isIdUuid) query = query.eq('id', orderIdOrNumber);
      else query = query.eq('order_number', orderIdOrNumber);

      const { error } = await query;
      if (!error) {
        try {
          await supabase.from('audit_logs').insert({
            user_email: user,
            action: 'Restauração de Pedido Excluído',
            entity: 'orders',
            entity_id: orderIdOrNumber,
            details: { action: 'restore', restored_by: user },
          });
        } catch {}

        const memIdx = store.findIndex(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
        if (memIdx >= 0) {
          store[memIdx].deleted_at = null;
          store[memIdx].deleted_by = null;
          store[memIdx].deletion_reason = null;
          saveOrdersStore(store);
        }
        return true;
      }
    } catch (e) {
      console.error('[DB] Restore exception:', e);
    }
  }

  const order = store.find(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
  if (order) {
    order.deleted_at = null;
    order.deleted_by = null;
    order.deletion_reason = null;
    order.updated_at = now;
    saveOrdersStore(store);
    return true;
  }

  return false;
}

export async function hardDeleteOrderDb(
  orderIdOrNumber: string,
  user: string = 'admin@acaipuro.com.br'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const isIdUuid = isUUID(orderIdOrNumber);
  const store = getOrdersStore();

  if (supabase) {
    try {
      let query = supabase.from('orders').delete();
      if (isIdUuid) query = query.eq('id', orderIdOrNumber);
      else query = query.eq('order_number', orderIdOrNumber);

      const { error } = await query;
      if (!error) {
        try {
          await supabase.from('audit_logs').insert({
            user_email: user,
            action: 'Exclusão Permanente de Pedido',
            entity: 'orders',
            entity_id: orderIdOrNumber,
            details: { action: 'hard_delete' },
          });
        } catch {}

        const updated = store.filter(o => o.id !== orderIdOrNumber && o.order_number !== orderIdOrNumber);
        saveOrdersStore(updated);
        return true;
      }
    } catch {}
  }

  const updated = store.filter(o => o.id !== orderIdOrNumber && o.order_number !== orderIdOrNumber);
  saveOrdersStore(updated);
  return true;
}

export async function archiveOrderDb(
  orderIdOrNumber: string,
  isArchived: boolean,
  user: string = 'admin@acaipuro.com.br'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);
  const store = getOrdersStore();

  if (supabase) {
    try {
      let query = supabase.from('orders').update({
        is_archived: isArchived,
        updated_at: now,
      });
      if (isIdUuid) query = query.eq('id', orderIdOrNumber);
      else query = query.eq('order_number', orderIdOrNumber);

      const { error } = await query;
      if (!error) {
        const memIdx = store.findIndex(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
        if (memIdx >= 0) {
          store[memIdx].is_archived = isArchived;
          saveOrdersStore(store);
        }
        return true;
      }
    } catch {}
  }

  const order = store.find(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
  if (order) {
    order.is_archived = isArchived;
    order.updated_at = now;
    saveOrdersStore(store);
    return true;
  }
  return false;
}

export async function updateInternalNotesDb(
  orderIdOrNumber: string,
  notes: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);
  const store = getOrdersStore();

  if (supabase) {
    try {
      let query = supabase.from('orders').update({
        internal_notes: notes || null,
        updated_at: now,
      });
      if (isIdUuid) query = query.eq('id', orderIdOrNumber);
      else query = query.eq('order_number', orderIdOrNumber);

      const { error } = await query;
      if (!error) {
        const memIdx = store.findIndex(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
        if (memIdx >= 0) {
          store[memIdx].internal_notes = notes;
          saveOrdersStore(store);
        }
        return true;
      }
    } catch {}
  }

  const order = store.find(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
  if (order) {
    order.internal_notes = notes;
    order.updated_at = now;
    saveOrdersStore(store);
    return true;
  }
  return false;
}

const SETTINGS_FILE = path.join(DATA_DIR, 'store_settings.json');

const DEFAULT_STORE_SETTINGS = {
  id: 'default',
  storeName: 'Açaí Puro Sabor',
  phone: '(13) 99150-9733',
  whatsappNumber: '5513991509733',
  address: 'Santos - SP',
  openingHoursText: 'Todos os dias das 13h às 23h',
  isOpen: true,
  pausedUntil: null as string | null,
  defaultDeliveryFee: 5.00,
  freeDeliveryThreshold: 45.00,
  minOrderValue: 15.00,
  estimatedDeliveryTime: '30 a 45 minutos',
};

export function getStoreSettingsStore(): typeof DEFAULT_STORE_SETTINGS {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        (globalThis as any).__ACAI_STORE_SETTINGS__ = parsed;
        return parsed;
      }
    }
  } catch {}
  if (!(globalThis as any).__ACAI_STORE_SETTINGS__) {
    (globalThis as any).__ACAI_STORE_SETTINGS__ = { ...DEFAULT_STORE_SETTINGS };
  }
  return (globalThis as any).__ACAI_STORE_SETTINGS__;
}

export function saveStoreSettingsStore(settings: any) {
  try {
    (globalThis as any).__ACAI_STORE_SETTINGS__ = settings;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[DB] Failed to save store settings to disk:', e);
  }
}

export async function getStoreSettings(): Promise<any> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('store_settings').select('*').eq('id', 'default').maybeSingle();
      if (!error && data) {
        const mapped = {
          id: 'default',
          storeName: data.store_name || data.storeName || 'Açaí Puro Sabor',
          phone: data.phone || '(13) 99150-9733',
          whatsappNumber: data.whatsapp_number || data.whatsappNumber || '5513991509733',
          address: data.address || 'Santos - SP',
          openingHoursText: data.opening_hours_text || data.openingHoursText || 'Todos os dias das 13h às 23h',
          isOpen: data.is_open !== undefined ? data.is_open : (data.isOpen !== undefined ? data.isOpen : true),
          pausedUntil: data.paused_until || data.pausedUntil || null,
          defaultDeliveryFee: Number(data.default_delivery_fee || data.defaultDeliveryFee) || 5.00,
          freeDeliveryThreshold: Number(data.free_delivery_threshold || data.freeDeliveryThreshold) || 45.00,
          minOrderValue: Number(data.min_order_value || data.minOrderValue) || 15.00,
          estimatedDeliveryTime: data.estimated_delivery_time || data.estimatedDeliveryTime || '30 a 45 minutos',
        };
        saveStoreSettingsStore(mapped);
        return mapped;
      }
    } catch {}
  }
  return getStoreSettingsStore();
}

export async function updateStoreSettings(payload: any): Promise<any> {
  const current = await getStoreSettings();
  const updated = { ...current, ...payload };
  saveStoreSettingsStore(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('store_settings').upsert({
        id: 'default',
        store_name: updated.storeName,
        phone: updated.phone,
        whatsapp_number: updated.whatsappNumber,
        address: updated.address,
        opening_hours_text: updated.openingHoursText,
        is_open: updated.isOpen,
        paused_until: updated.pausedUntil,
        default_delivery_fee: updated.defaultDeliveryFee,
        free_delivery_threshold: updated.freeDeliveryThreshold,
        min_order_value: updated.minOrderValue,
        estimated_delivery_time: updated.estimatedDeliveryTime,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[DB] Supabase store_settings upsert error:', e);
    }
  }
  return updated;
}

export async function isStoreOpenDb(): Promise<boolean> {
  const settings = await getStoreSettings();
  return settings.isOpen !== false;
}

