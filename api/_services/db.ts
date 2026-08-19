import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DbOrderItem {
  name: string;
  size?: string;
  base?: string;
  additionals?: string[];
  notes?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DbOrder {
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
  items: DbOrderItem[];
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
  notification_attempts: number;
  last_notification_error?: string;
  confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Armazenamento em memória para garantir funcionamento 100% imediato e fallback
const memoryOrders: DbOrder[] = [];

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && key && url.trim() !== '' && key.trim() !== '') {
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
          fulfillment_type: order.fulfillment_type,
          address: order.address || {},
          items: order.items,
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          total: order.total,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          order_status: order.order_status || 'new',
          notes: order.notes,
          whatsapp_status: order.whatsapp_status || 'pending',
          push_status: order.push_status || 'pending',
          email_status: order.email_status || 'pending',
          notification_attempts: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[DB] Supabase insert error, saving to memory fallback:', error);
      } else if (data) {
        console.log(`[DB] Order ${order.order_number} saved to Supabase successfully.`);
        return data as DbOrder;
      }
    } catch (e) {
      console.error('[DB] Supabase insert exception:', e);
    }
  }

  // Fallback em memória
  const newOrder: DbOrder = {
    ...order,
    id: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    created_at: now,
    updated_at: now,
  };
  memoryOrders.unshift(newOrder);
  console.log(`[DB] Order ${order.order_number} saved to memory store.`);
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
      console.error('[DB] Supabase list error:', error);
    } catch (e) {
      console.error('[DB] Supabase list exception:', e);
    }
  }

  // Fallback memória
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
  const now = new Date().toISOString();

  const updateData: any = {
    order_status: newStatus,
    updated_at: now,
  };

  if (newStatus === 'confirmed') {
    updateData.confirmed_at = now;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .or(`id.eq.${orderIdOrNumber},order_number.eq.${orderIdOrNumber}`)
        .select()
        .single();

      if (!error && data) {
        return data as DbOrder;
      }
    } catch (e) {
      console.error('[DB] Supabase update exception:', e);
    }
  }

  // Fallback memória
  const order = memoryOrders.find(
    o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber
  );
  if (order) {
    order.order_status = newStatus;
    order.updated_at = now;
    if (newStatus === 'confirmed') {
      order.confirmed_at = now;
    }
    return order;
  }

  return null;
}

export async function updateNotificationResults(
  orderIdOrNumber: string,
  updates: {
    whatsapp_status?: DbOrder['whatsapp_status'];
    push_status?: DbOrder['push_status'];
    email_status?: DbOrder['email_status'];
    last_notification_error?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      await supabase
        .from('orders')
        .update({
          ...updates,
          notification_attempts: 1,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${orderIdOrNumber},order_number.eq.${orderIdOrNumber}`);
      return;
    } catch (e) {
      console.error('[DB] Supabase update notification exception:', e);
    }
  }

  const order = memoryOrders.find(
    o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber
  );
  if (order) {
    if (updates.whatsapp_status) order.whatsapp_status = updates.whatsapp_status;
    if (updates.push_status) order.push_status = updates.push_status;
    if (updates.email_status) order.email_status = updates.email_status;
    if (updates.last_notification_error !== undefined) {
      order.last_notification_error = updates.last_notification_error;
    }
    order.notification_attempts += 1;
    order.updated_at = new Date().toISOString();
  }
}
