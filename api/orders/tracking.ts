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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderNumber, token } = req.query || {};

    if (!orderNumber) {
      return res.status(400).json({ error: 'Número do pedido é obrigatório.' });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(200).json({
        success: true,
        order: {
          order_number: orderNumber,
          status: 'new',
          customer_name: 'Cliente',
          fulfillment_type: 'delivery',
          items: [],
          subtotal: 0,
          delivery_fee: 0,
          total: 0,
          payment_method: 'pix',
          created_at: new Date().toISOString(),
        },
        history: [],
        notifications: [],
      });
    }

    // Buscar pedido
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    // Proteção de token: se o pedido tiver access_token e o token passado não coincidir
    const isAuthorized = !order.access_token || !token || order.access_token === token;

    // Buscar histórico de status e notificações
    const [historyRes, notifRes] = await Promise.all([
      supabase
        .from('order_status_history')
        .select('*')
        .or(`order_id.eq.${order.id},order_number.eq.${order.order_number}`)
        .order('created_at', { ascending: true }),
      supabase
        .from('order_notifications')
        .select('*')
        .or(`order_id.eq.${order.id},order_number.eq.${order.order_number}`)
        .order('sent_at', { ascending: true }),
    ]);

    // Se não for autorizado pelo token, mascara telefone e endereço por segurança
    const sanitizedOrder = isAuthorized
      ? order
      : {
          ...order,
          customer_phone: order.customer_phone ? '***' + order.customer_phone.slice(-4) : null,
          street: order.street ? '***' : null,
          number: '***',
          complement: null,
        };

    return res.status(200).json({
      success: true,
      order: sanitizedOrder,
      isAuthorized,
      history: historyRes.data || [],
      notifications: notifRes.data || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao consultar acompanhamento', message: err?.message });
  }
}
