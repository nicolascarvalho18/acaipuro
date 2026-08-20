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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const { assignmentId, orderNumber, driverId, status, reason } = body || {};

    if ((!assignmentId && !orderNumber) || !status) {
      return res.status(400).json({ error: 'assignmentId ou orderNumber e status são obrigatórios' });
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const updatePayload: any = {
      status,
      updated_at: now,
    };

    if (status === 'picked_up') {
      updatePayload.picked_up_at = now;
    } else if (status === 'in_transit') {
      updatePayload.started_delivery_at = now;
    } else if (status === 'delivered') {
      updatePayload.delivered_at = now;
    } else if (status === 'cancelled' || status === 'problem') {
      updatePayload.cancellation_reason = reason || 'Problema informado pelo entregador';
    }

    let customerNotificationMessage = '';
    let orderNewStatus: string | null = null;

    switch (status) {
      case 'going_to_store':
        customerNotificationMessage = `O entregador está se deslocando até a loja para retirar seu pedido.`;
        break;
      case 'at_store':
        customerNotificationMessage = `O entregador chegou na loja e está aguardando a embalagem do seu pedido.`;
        break;
      case 'picked_up':
      case 'in_transit':
        orderNewStatus = 'delivering';
        customerNotificationMessage = `Seu pedido saiu para entrega! Acompanhe o trajeto em tempo real no mapa.`;
        break;
      case 'delivered':
        orderNewStatus = 'done';
        customerNotificationMessage = `Seu pedido foi entregue! Bom apetite e obrigado por escolher a Açaí Puro Sabor!`;
        break;
      case 'problem':
        customerNotificationMessage = `O entregador informou uma ocorrência: ${reason || 'Entraremos em contato em instantes'}.`;
        break;
    }

    if (supabase) {
      try {
        let q = supabase.from('delivery_assignments').update(updatePayload);
        if (assignmentId) {
          q = q.eq('id', assignmentId);
        } else {
          q = q.eq('order_number', orderNumber);
        }

        const { data: updatedAssign, error } = await q.select('*, driver:delivery_drivers(*)').maybeSingle();

        if (error) {
          console.error('[Delivery Status Update Error]:', error);
        }

        const actualOrderNum = updatedAssign?.order_number || orderNumber;
        const actualDriverId = updatedAssign?.driver_id || driverId;

        // Atualizar status na tabela principal de pedidos
        if (orderNewStatus && actualOrderNum) {
          const orderUpdateData: any = {
            status: orderNewStatus,
            updated_at: now,
          };
          if (orderNewStatus === 'done') {
            orderUpdateData.completed_at = now;
          }
          await supabase.from('orders').update(orderUpdateData).eq('order_number', actualOrderNum);

          // Registrar histórico do pedido
          await supabase.from('order_status_history').insert({
            order_number: actualOrderNum,
            new_status: orderNewStatus,
            changed_by: `entregador_${actualDriverId || 'app'}`,
            reason: customerNotificationMessage,
            created_at: now,
          });
        }

        // Gravar notificação para o cliente
        if (customerNotificationMessage && actualOrderNum) {
          await supabase.from('order_notifications').insert({
            order_number: actualOrderNum,
            status: status,
            message: customerNotificationMessage,
            channel: 'app_timeline',
            sent_at: now,
          });
        }

        // Se entregue ou cancelado, liberar o entregador para novas corridas
        if ((status === 'delivered' || status === 'cancelled') && actualDriverId) {
          await supabase
            .from('delivery_drivers')
            .update({ availability_status: 'available', updated_at: now })
            .eq('id', actualDriverId);
        }

        return res.status(200).json({
          success: true,
          assignment: updatedAssign,
          customerNotification: customerNotificationMessage,
          orderStatus: orderNewStatus,
        });
      } catch (dbErr) {
        console.error('Supabase status error:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      assignmentId,
      orderNumber,
      status,
      customerNotification: customerNotificationMessage,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao atualizar status da entrega', message: e?.message });
  }
}
