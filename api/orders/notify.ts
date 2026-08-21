import { listOrders, updateNotificationStatus } from '../_services/db';
import { sendWhatsAppNotification } from '../_services/whatsapp';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'ID do pedido obrigatório' });
    }

    const allOrders = await listOrders();
    const order = allOrders.find(
      o => o.id === orderId || o.order_number === orderId
    );

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const result = await sendWhatsAppNotification(order);
    await updateNotificationStatus(orderId, result.status, result.error);

    return res.status(200).json({
      success: result.sent,
      status: result.status,
      error: result.error,
    });
  } catch (err: any) {
    console.error('Manual notify error:', err);
    return res.status(500).json({ error: 'Erro ao disparar notificação', message: err?.message });
  }
}
