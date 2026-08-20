import { createClient } from '@supabase/supabase-js';

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
      return `Seu pedido #${orderNumber} está pronto para retirada.`;
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

    if (supabase) {
      try {
        // 1. Obter status anterior e dados do pedido
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('*')
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .single();

        const previousStatus = currentOrder?.status || 'new';
        const fulfillmentType = currentOrder?.fulfillment_type || 'delivery';
        const orderNumber = currentOrder?.order_number || orderId;
        const actualOrderId = currentOrder?.id || orderId;

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
        const { data: updatedOrder, error: updateErr } = await supabase
          .from('orders')
          .update(updatePayload)
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .select()
          .single();

        if (updateErr) {
          console.error('[Supabase update error]:', updateErr);
        }

        // 3. Gravar no histórico de status
        await supabase.from('order_status_history').insert({
          order_id: actualOrderId,
          order_number: orderNumber,
          previous_status: previousStatus,
          new_status: status,
          changed_by: changedBy,
          reason: reason || null,
          created_at: now,
        });

        // 4. Gravar notificação profissional
        const notificationMessage = getNotificationMessage(status, orderNumber, reason, fulfillmentType);
        await supabase.from('order_notifications').insert({
          order_id: actualOrderId,
          order_number: orderNumber,
          status,
          message: notificationMessage,
          channel: 'app_timeline',
          sent_at: now,
        });

        // 5. Registrar em auditoria
        await supabase.from('audit_logs').insert({
          user_email: changedBy,
          action: 'Atualização de Status do Pedido',
          entity: 'orders',
          entity_id: actualOrderId,
          details: {
            orderNumber,
            from: previousStatus,
            to: status,
            reason: reason || null,
          },
        });

        return res.status(200).json({
          success: true,
          order: updatedOrder || { id: orderId, status },
          notificationMessage,
        });
      } catch (err) {
        console.error('Supabase update status exception:', err);
      }
    }

    const fallbackMessage = getNotificationMessage(status, orderId, reason);
    return res.status(200).json({
      success: true,
      order: { id: orderId, status },
      notificationMessage: fallbackMessage,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar status', message: err?.message });
  }
}
