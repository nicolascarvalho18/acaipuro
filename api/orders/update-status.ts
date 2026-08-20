import { createClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(str?: string): boolean {
  if (!str) return false;
  return UUID_REGEX.test(String(str).trim());
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key && url.trim().startsWith('http') && key.trim().length > 10) {
    try {
      return createClient(url.trim(), key.trim(), {
        auth: { persistSession: false },
      });
    } catch {
      return null;
    }
  }
  return null;
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
      return `Seu pedido #${orderNumber} saiu para entrega. Em breve chegará ao endereço informado.`;
    case 'ready_for_pickup':
      return `Seu pedido #${orderNumber} está pronto para retirada no balcão.`;
    case 'done':
      return fulfillmentType === 'pickup'
        ? `Seu pedido #${orderNumber} foi retirado. Obrigado pela preferência!`
        : `Seu pedido #${orderNumber} foi entregue. Obrigado por escolher a Açaí Puro Sabor!`;
    case 'cancelled':
      return `Seu pedido #${orderNumber} foi cancelado. Motivo: ${reason || 'Cancelamento solicitado pela loja'}.`;
    default:
      return `Status do pedido #${orderNumber} atualizado para ${status}.`;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PATCH,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { orderId, status, reason, changedBy = 'admin' } = body || {};

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Parâmetros orderId e status são obrigatórios.' });
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const isIdUuid = isUUID(orderId);

    if (supabase) {
      try {
        // 1. Obter status anterior e dados do pedido
        let selectQuery = supabase.from('orders').select('*');
        if (isIdUuid) {
          selectQuery = selectQuery.eq('id', orderId);
        } else {
          selectQuery = selectQuery.eq('order_number', orderId);
        }

        const { data: currentOrder, error: selectErr } = await selectQuery.maybeSingle();

        if (selectErr) {
          console.warn('[Supabase select error]:', selectErr);
        }

        const previousStatus = currentOrder?.status || 'new';
        const fulfillmentType = currentOrder?.fulfillment_type || 'delivery';
        const orderNumber = currentOrder?.order_number || orderId;
        const actualOrderId = isUUID(currentOrder?.id) ? currentOrder.id : (isIdUuid ? orderId : null);

        const updatePayload: any = {
          status,
          updated_at: now,
        };

        if (status === 'done') {
          updatePayload.completed_at = now;
        }

        if (status === 'cancelled') {
          updatePayload.cancellation_reason = reason || 'Cancelado pela loja';
        }

        // 2. Atualizar pedido
        let updateQuery = supabase.from('orders').update(updatePayload);
        if (isIdUuid) {
          updateQuery = updateQuery.eq('id', orderId);
        } else {
          updateQuery = updateQuery.eq('order_number', orderId);
        }

        const { data: updatedOrder, error: updateErr } = await updateQuery.select().maybeSingle();

        if (updateErr) {
          console.error('[Supabase update error]:', updateErr);
        }

        const notificationMessage = getNotificationMessage(status, orderNumber, reason, fulfillmentType);

        // 3. Gravar no histórico de status se tivermos o UUID ou order_number
        try {
          await supabase.from('order_status_history').insert({
            order_id: actualOrderId,
            order_number: orderNumber,
            previous_status: previousStatus,
            new_status: status,
            changed_by: changedBy,
            reason: reason || null,
            created_at: now,
          });
        } catch (hErr) {
          console.warn('[History insert error]:', hErr);
        }

        // 4. Gravar notificação
        try {
          await supabase.from('order_notifications').insert({
            order_id: actualOrderId,
            order_number: orderNumber,
            status,
            message: notificationMessage,
            channel: 'app_timeline',
            sent_at: now,
          });
        } catch (nErr) {
          console.warn('[Notification insert error]:', nErr);
        }

        // 5. Registrar em auditoria
        try {
          await supabase.from('audit_logs').insert({
            user_email: changedBy,
            action: 'Atualização de Status do Pedido',
            entity: 'orders',
            entity_id: actualOrderId || orderNumber,
            details: {
              orderNumber,
              from: previousStatus,
              to: status,
              reason: reason || null,
            },
          });
        } catch (aErr) {
          console.warn('[Audit insert error]:', aErr);
        }

        return res.status(200).json({
          success: true,
          order: updatedOrder || currentOrder || { id: orderId, order_number: orderNumber, status },
          notificationMessage,
        });
      } catch (err) {
        console.error('Supabase update status exception:', err);
      }
    }

    const fallbackMessage = getNotificationMessage(status, orderId, reason);
    return res.status(200).json({
      success: true,
      order: { id: orderId, order_number: orderId, status },
      notificationMessage: fallbackMessage,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar status', message: err?.message });
  }
}
