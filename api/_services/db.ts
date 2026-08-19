import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DbOrder {
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
  items: any[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: 'pix' | 'card_online' | 'delivery';
  delivery_payment_method?: 'cash' | 'card_delivery';
  card_type?: 'credit' | 'debit';
  change_for?: number;
  payment_status: 'pending' | 'approved' | 'paid_on_delivery' | 'rejected';
  payment_id?: string;
  order_status: 'novo' | 'confirmado' | 'em_preparo' | 'saiu_para_entrega' | 'entregue' | 'cancelado';
  general_notes?: string;
  whatsapp_notification_status: 'sent' | 'failed' | 'pending' | 'not_configured';
  whatsapp_error_message?: string;
  created_at?: string;
  updated_at?: string;
}

// Fallback in-memory store quando Supabase ainda não estiver provisionado
const memoryOrders: DbOrder[] = [];

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && key && url.trim() !== '' && key.trim() !== '') {
    try {
      return createClient(url.trim(), key.trim());
    } catch (e) {
      console.error('Error initializing Supabase client:', e);
      return null;
    }
  }
  return null;
}

export async function insertOrder(order: DbOrder): Promise<DbOrder> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          delivery_type: order.delivery_type,
          address_street: order.address_street,
          address_number: order.address_number,
          address_neighborhood: order.address_neighborhood,
          address_complement: order.address_complement,
          address_reference: order.address_reference,
          items: order.items,
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          discount: order.discount,
          total: order.total,
          payment_method: order.payment_method,
          delivery_payment_method: order.delivery_payment_method,
          card_type: order.card_type,
          change_for: order.change_for,
          payment_status: order.payment_status,
          payment_id: order.payment_id,
          order_status: order.order_status || 'novo',
          general_notes: order.general_notes,
          whatsapp_notification_status: order.whatsapp_notification_status,
          whatsapp_error_message: order.whatsapp_error_message,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error, falling back to memory store:', error);
      } else if (data) {
        return data as DbOrder;
      }
    } catch (e) {
      console.error('Supabase exception:', e);
    }
  }

  // Fallback para memória
  const newOrder: DbOrder = {
    ...order,
    id: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    created_at: now,
    updated_at: now,
  };
  memoryOrders.unshift(newOrder);
  return newOrder;
}

export async function listOrders(statusFilter?: string): Promise<DbOrder[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('order_status', statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as DbOrder[];
      }
      console.error('Supabase list error:', error);
    } catch (e) {
      console.error('Supabase list exception:', e);
    }
  }

  // Fallback para memória
  if (statusFilter && statusFilter !== 'all') {
    return memoryOrders.filter(o => o.order_status === statusFilter);
  }
  return memoryOrders;
}

export async function updateOrderStatus(
  orderIdOrNumber: string,
  newStatus: DbOrder['order_status']
): Promise<DbOrder | null> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ order_status: newStatus, updated_at: new Date().toISOString() })
        .or(`id.eq.${orderIdOrNumber},order_number.eq.${orderIdOrNumber}`)
        .select()
        .single();

      if (!error && data) {
        return data as DbOrder;
      }
    } catch (e) {
      console.error('Supabase update exception:', e);
    }
  }

  // Fallback memória
  const order = memoryOrders.find(
    o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber
  );
  if (order) {
    order.order_status = newStatus;
    order.updated_at = new Date().toISOString();
    return order;
  }

  return null;
}

export async function updateNotificationStatus(
  orderIdOrNumber: string,
  status: DbOrder['whatsapp_notification_status'],
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      await supabase
        .from('orders')
        .update({
          whatsapp_notification_status: status,
          whatsapp_error_message: errorMessage || null,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${orderIdOrNumber},order_number.eq.${orderIdOrNumber}`);
      return;
    } catch (e) {
      console.error('Supabase update notification status exception:', e);
    }
  }

  const order = memoryOrders.find(
    o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber
  );
  if (order) {
    order.whatsapp_notification_status = status;
    order.whatsapp_error_message = errorMessage;
    order.updated_at = new Date().toISOString();
  }
}
