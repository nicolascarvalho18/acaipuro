import { getOrder, getOrderStatusHistoryDb, getSupabaseClient } from '../_services/db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const orderNumber = req.query?.orderNumber || req.query?.orderId || req.query?.id;
    const token = req.query?.token;

    if (!orderNumber && !token) {
      return res.status(400).json({ success: false, error: 'Identificador do pedido ou token é obrigatório.' });
    }

    const searchKey = String(orderNumber || token).trim();
    const order = await getOrder(searchKey);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
    }

    // Validação de token de segurança
    const isAuthorized = !order.access_token || !token || order.access_token === token;

    // Buscar histórico real de status
    const history = await getOrderStatusHistoryDb(order.order_number, order.id);

    // Buscar notificações reais
    let notifications: any[] = [];
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: notifs } = await supabase
          .from('order_notifications')
          .select('*')
          .or(`order_id.eq.${order.id},order_number.eq.${order.order_number}`)
          .order('sent_at', { ascending: true });
        if (notifs && notifs.length > 0) notifications = notifs;
      } catch {}
    }

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
      history,
      notifications,
    });
  } catch (err: any) {
    console.error('[Tracking API Error]:', err);
    return res.status(500).json({ success: false, error: 'Erro ao consultar acompanhamento', message: err?.message });
  }
}
