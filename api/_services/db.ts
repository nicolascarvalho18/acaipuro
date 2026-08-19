import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DbOrderAddon {
  id?: string;
  addon_name: string;
  addon_price: number;
  quantity: number;
}

export interface DbOrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  size?: string;
  base?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  addons?: DbOrderAddon[];
}

export interface DbOrder {
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
  created_at?: string;
  confirmed_at?: string;
  updated_at?: string;
  items?: DbOrderItem[];
}

export interface StoreSettings {
  id: string;
  is_open: boolean;
  delivery_fee: number;
  free_delivery_threshold: number;
  estimated_delivery_time: string;
  opening_hours: string;
  whatsapp_number: string;
  neighborhoods: string[];
}

// Armazenamento em memória sincronizado
let memoryOrders: DbOrder[] = [];
let memorySettings: StoreSettings = {
  id: 'default',
  is_open: true,
  delivery_fee: 5.00,
  free_delivery_threshold: 45.00,
  estimated_delivery_time: '30 a 45 minutos',
  opening_hours: 'Todos os dias das 13h às 23h',
  whatsapp_number: '5513991509733',
  neighborhoods: ['Gonzaga', 'Boqueirão', 'Embaré', 'Ponta da Praia', 'Aparecida', 'Campo Grande', 'Marapé', 'Encruzilhada', 'Vila Belmiro', 'São Vicente (Centro)', 'Itararé'],
};

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

export async function insertOrderWithItems(order: DbOrder): Promise<DbOrder> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      // 1. Inserir Pedido Principal
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          fulfillment_type: order.fulfillment_type,
          address_street: order.address_street,
          address_number: order.address_number,
          address_neighborhood: order.address_neighborhood,
          address_complement: order.address_complement,
          address_reference: order.address_reference,
          subtotal: order.subtotal,
          delivery_fee: order.delivery_fee,
          total: order.total,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          status: 'novo',
          notes: order.notes,
          whatsapp_status: 'pending',
        })
        .select()
        .single();

      if (orderError || !orderData) {
        console.error('[DB] Supabase insert order error:', orderError);
      } else {
        const orderId = orderData.id;

        // 2. Inserir Itens do Pedido
        if (order.items && order.items.length > 0) {
          for (const item of order.items) {
            const { data: itemData, error: itemError } = await supabase
              .from('order_items')
              .insert({
                order_id: orderId,
                product_id: item.product_id || 'item',
                product_name: item.product_name,
                size: item.size,
                base: item.base,
                quantity: item.quantity || 1,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes,
              })
              .select()
              .single();

            // 3. Inserir Adicionais do Item
            if (!itemError && itemData && item.addons && item.addons.length > 0) {
              const addonsToInsert = item.addons.map(addon => ({
                order_item_id: itemData.id,
                addon_name: addon.addon_name,
                addon_price: addon.addon_price || 0,
                quantity: addon.quantity || 1,
              }));

              await supabase.from('order_item_addons').insert(addonsToInsert);
            }
          }
        }

        console.log(`[DB] Order ${order.order_number} saved to Supabase.`);
        return {
          ...orderData,
          items: order.items,
        };
      }
    } catch (e) {
      console.error('[DB] Supabase order insertion exception:', e);
    }
  }

  // Fallback em memória
  const newOrder: DbOrder = {
    ...order,
    id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    status: 'novo',
    created_at: now,
    updated_at: now,
  };
  memoryOrders.unshift(newOrder);
  console.log(`[DB] Order ${order.order_number} saved to memory store.`);
  return newOrder;
}

export async function listAllOrders(statusFilter?: string): Promise<DbOrder[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            size,
            base,
            quantity,
            unit_price,
            total_price,
            notes,
            order_item_addons (
              id,
              addon_name,
              addon_price,
              quantity
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map(o => ({
          ...o,
          items: (o.order_items || []).map((it: any) => ({
            ...it,
            addons: it.order_item_addons || [],
          })),
        }));
      }
      console.error('[DB] Supabase list orders error:', error);
    } catch (e) {
      console.error('[DB] Supabase list exception:', e);
    }
  }

  if (statusFilter && statusFilter !== 'all') {
    return memoryOrders.filter(o => o.status === statusFilter);
  }
  return memoryOrders;
}

export async function getOrderByIdOrNumber(idOrNumber: string): Promise<DbOrder | null> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            size,
            base,
            quantity,
            unit_price,
            total_price,
            notes,
            order_item_addons (
              id,
              addon_name,
              addon_price,
              quantity
            )
          )
        `)
        .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
        .single();

      if (!error && data) {
        return {
          ...data,
          items: (data.order_items || []).map((it: any) => ({
            ...it,
            addons: it.order_item_addons || [],
          })),
        };
      }
    } catch (e) {
      console.error('[DB] Error getting order:', e);
    }
  }

  return memoryOrders.find(o => o.id === idOrNumber || o.order_number === idOrNumber) || null;
}

export async function updateOrderStatusDb(
  idOrNumber: string,
  newStatus: DbOrder['status']
): Promise<DbOrder | null> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const updateData: any = {
    status: newStatus,
    updated_at: now,
  };

  if (newStatus === 'confirmado') {
    updateData.confirmed_at = now;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.error('[DB] Supabase update status exception:', e);
    }
  }

  const order = memoryOrders.find(o => o.id === idOrNumber || o.order_number === idOrNumber);
  if (order) {
    order.status = newStatus;
    order.updated_at = now;
    if (newStatus === 'confirmado') order.confirmed_at = now;
    return order;
  }
  return null;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (!error && data) {
        return data as StoreSettings;
      }
    } catch (e) {
      console.error('[DB] Error getting store settings:', e);
    }
  }

  return memorySettings;
}

export async function updateStoreSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .upsert({
          id: 'default',
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) {
        return data as StoreSettings;
      }
    } catch (e) {
      console.error('[DB] Error updating store settings:', e);
    }
  }

  memorySettings = { ...memorySettings, ...updates };
  return memorySettings;
}
