import { supabase } from './supabaseClient';

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

export interface Order {
  id: string;
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
  status: 'new' | 'confirmed' | 'preparing' | 'delivering' | 'ready_for_pickup' | 'done' | 'cancelled' | 'out_for_delivery' | 'completed';
  notes?: string;
  cancellation_reason?: string;
  internal_notes?: string;
  is_archived?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());
}

export function normalizeStatus(status: string): Order['status'] {
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

// 1. Buscar Pedidos (com prioridade na API central do Backend e fallback seguro)
export async function fetchAllOrders(includeArchived: boolean = true, includeDeleted: boolean = false): Promise<Order[]> {
  // 1. Chamar primariamente a API do Backend
  try {
    const params = new URLSearchParams();
    if (includeArchived) params.set('includeArchived', 'true');
    if (includeDeleted) params.set('includeDeleted', 'true');

    const res = await fetch(`/api/orders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        return data.orders as Order[];
      }
    }
  } catch (err) {
    console.warn('[OrderService] API fetch warn:', err);
  }

  // 2. Fallback para Supabase direto
  if (supabase) {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as Order[];
      }
    } catch (e) {
      console.warn('[OrderService] Supabase query warn:', e);
    }
  }

  return [];
}

// 2. Atualizar Status de Pedido (com persistência atômica, histórico e rollback)
export async function updateOrderStatus(
  orderIdOrNumber: string,
  newStatus: string,
  reason?: string,
  changedBy: string = 'admin@acaipuro.com.br'
): Promise<{ success: boolean; order?: Order; error?: string }> {
  const normalized = normalizeStatus(newStatus);

  // 1. Chamar Backend API primeiro para persistência centralizada
  try {
    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderIdOrNumber, status: normalized, reason, changedBy }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.order) {
        try {
          window.dispatchEvent(new CustomEvent('acai_order_status_changed', { detail: data.order }));
        } catch {}
        return { success: true, order: data.order as Order };
      }
    }
  } catch (err: any) {
    console.warn('[OrderService] API update-status error:', err);
  }

  // 2. Fallback para Supabase direto
  if (supabase) {
    try {
      const now = new Date().toISOString();
      const isIdUuid = isUUID(orderIdOrNumber);
      const updatePayload: any = {
        status: normalized,
        updated_at: now,
      };

      if (normalized === 'done') {
        updatePayload.completed_at = now;
      }
      if (normalized === 'cancelled') {
        updatePayload.cancellation_reason = reason || 'Cancelado pela loja';
      }

      let updateQ = supabase.from('orders').update(updatePayload);
      if (isIdUuid) updateQ = updateQ.eq('id', orderIdOrNumber);
      else updateQ = updateQ.eq('order_number', orderIdOrNumber);

      const { data: updatedOrder, error: updateErr } = await updateQ.select().single();

      if (!updateErr && updatedOrder) {
        try {
          window.dispatchEvent(new CustomEvent('acai_order_status_changed', { detail: updatedOrder }));
        } catch {}
        return { success: true, order: updatedOrder as Order };
      }
    } catch (e: any) {
      console.warn('[OrderService] Direct Supabase update error:', e);
    }
  }

  return { success: false, error: 'Não foi possível atualizar o pedido no banco de dados' };
}

// 3. Exclusão Lógica com Motivo e Auditoria
export async function softDeleteOrder(
  orderIdOrNumber: string,
  reason: string,
  deletedBy: string = 'admin@acaipuro.com.br'
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);

  if (supabase) {
    try {
      let q = supabase.from('orders').update({
        deleted_at: now,
        deleted_by: deletedBy,
        deletion_reason: reason || 'Exclusão solicitada pelo administrador',
        updated_at: now,
      });
      if (isIdUuid) q = q.eq('id', orderIdOrNumber);
      else q = q.eq('order_number', orderIdOrNumber);

      const { error } = await q;
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

        fetch('/api/orders/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderIdOrNumber, action: 'delete', reason, adminEmail: deletedBy }),
        }).catch(() => {});

        return { success: true };
      }
    } catch (e: any) {
      console.warn('[OrderService] Direct Supabase delete error:', e);
    }
  }

  try {
    const res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderIdOrNumber, action: 'delete', reason, adminEmail: deletedBy }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir pedido' };
  }

  return { success: false, error: 'Falha ao excluir pedido' };
}

// 4. Restaurar Pedido da Lixeira
export async function restoreOrder(
  orderIdOrNumber: string,
  restoredBy: string = 'admin@acaipuro.com.br'
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);

  if (supabase) {
    try {
      let q = supabase.from('orders').update({
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
        updated_at: now,
      });
      if (isIdUuid) q = q.eq('id', orderIdOrNumber);
      else q = q.eq('order_number', orderIdOrNumber);

      const { error } = await q;
      if (!error) {
        try {
          await supabase.from('audit_logs').insert({
            user_email: restoredBy,
            action: 'Restauração de Pedido Excluído',
            entity: 'orders',
            entity_id: orderIdOrNumber,
            details: { action: 'restore', restored_by: restoredBy },
          });
        } catch {}

        fetch('/api/orders/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderIdOrNumber, action: 'restore', adminEmail: restoredBy }),
        }).catch(() => {});

        return { success: true };
      }
    } catch (e: any) {
      console.warn('[OrderService] Direct Supabase restore error:', e);
    }
  }

  try {
    const res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderIdOrNumber, action: 'restore', adminEmail: restoredBy }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao restaurar pedido' };
  }

  return { success: false, error: 'Falha ao restaurar pedido' };
}

// 5. Excluir Definitivamente da Lixeira (Hard Delete)
export async function hardDeleteOrder(
  orderIdOrNumber: string,
  user: string = 'admin@acaipuro.com.br'
): Promise<{ success: boolean; error?: string }> {
  const isIdUuid = isUUID(orderIdOrNumber);

  if (supabase) {
    try {
      let q = supabase.from('orders').delete();
      if (isIdUuid) q = q.eq('id', orderIdOrNumber);
      else q = q.eq('order_number', orderIdOrNumber);

      const { error } = await q;
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

        fetch('/api/orders/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderIdOrNumber, action: 'hard_delete', adminEmail: user }),
        }).catch(() => {});

        return { success: true };
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderIdOrNumber, action: 'hard_delete', adminEmail: user }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir permanentemente' };
  }

  return { success: false, error: 'Falha ao excluir permanentemente' };
}

// 6. Arquivar / Desarquivar
export async function toggleArchiveOrder(
  orderIdOrNumber: string,
  isArchived: boolean,
  user: string = 'admin@acaipuro.com.br'
): Promise<{ success: boolean; error?: string }> {
  const action = isArchived ? 'unarchive' : 'archive';
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);

  if (supabase) {
    try {
      let q = supabase.from('orders').update({ is_archived: !isArchived, updated_at: now });
      if (isIdUuid) q = q.eq('id', orderIdOrNumber);
      else q = q.eq('order_number', orderIdOrNumber);
      const { error } = await q;
      if (!error) {
        fetch('/api/orders/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderIdOrNumber, action, adminEmail: user }),
        }).catch(() => {});
        return { success: true };
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderIdOrNumber, action, adminEmail: user }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao arquivar' };
  }

  return { success: false, error: 'Falha ao arquivar' };
}

// 7. Salvar Observação Interna
export async function saveOrderInternalNotes(
  orderIdOrNumber: string,
  notes: string,
  user: string = 'admin@acaipuro.com.br'
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const isIdUuid = isUUID(orderIdOrNumber);

  if (supabase) {
    try {
      let q = supabase.from('orders').update({ internal_notes: notes || null, updated_at: now });
      if (isIdUuid) q = q.eq('id', orderIdOrNumber);
      else q = q.eq('order_number', orderIdOrNumber);
      const { error } = await q;
      if (!error) {
        fetch('/api/orders/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderIdOrNumber, action: 'update_notes', notes, adminEmail: user }),
        }).catch(() => {});
        return { success: true };
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderIdOrNumber, action: 'update_notes', notes, adminEmail: user }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar notas' };
  }

  return { success: false, error: 'Falha ao salvar notas' };
}
