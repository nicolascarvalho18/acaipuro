import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DbOrderItem {
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
  status: 'new' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Fallback em memória caso as variáveis do Supabase ainda não tenham sido configuradas na Vercel
let globalMemoryOrders: DbOrder[] = [];

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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
          street: order.street,
          number: order.number,
          neighborhood: order.neighborhood,
          complement: order.complement,
          items: order.items,
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          total: order.total,
          payment_method: order.payment_method,
          status: 'new',
          notes: order.notes,
        })
        .select()
        .single();

      if (error) {
        console.error('[DB] Supabase insert error:', error);
        throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
      }

      if (data) {
        console.log(`[DB] Order ${data.order_number} saved in Supabase with ID ${data.id}`);
        return data as DbOrder;
      }
    } catch (e: any) {
      console.error('[DB] Supabase insert exception:', e);
      throw e;
    }
  }

  // Se não houver Supabase configurado, salva no fallback
  const newOrder: DbOrder = {
    ...order,
    id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    status: 'new',
    created_at: now,
    updated_at: now,
  };
  globalMemoryOrders.unshift(newOrder);
  return newOrder;
}

export async function listAllOrders(statusFilter?: string): Promise<DbOrder[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[DB] Supabase query error:', error);
      } else if (data) {
        return data as DbOrder[];
      }
    } catch (e) {
      console.error('[DB] Supabase query exception:', e);
    }
  }

  if (statusFilter && statusFilter !== 'all') {
    return globalMemoryOrders.filter(o => o.status === statusFilter);
  }
  return globalMemoryOrders;
}

export async function updateOrderStatusDb(
  orderIdOrNumber: string,
  newStatus: DbOrder['status']
): Promise<DbOrder | null> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: now,
        })
        .or(`id.eq.${orderIdOrNumber},order_number.eq.${orderIdOrNumber}`)
        .select()
        .single();

      if (!error && data) {
        return data as DbOrder;
      }
    } catch (e) {
      console.error('[DB] Supabase update status error:', e);
    }
  }

  const order = globalMemoryOrders.find(o => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber);
  if (order) {
    order.status = newStatus;
    order.updated_at = now;
    return order;
  }
  return null;
}
