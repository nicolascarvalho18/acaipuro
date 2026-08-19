import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateOrderStatus, DbOrder } from '../_services/db';

const VALID_STATUSES: DbOrder['order_status'][] = [
  'new',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PATCH,OPTIONS');
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
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || 'acai123';

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== adminPassword) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
    }

    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Parâmetros orderId e status são obrigatórios.' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` });
    }

    const updated = await updateOrderStatus(orderId, status);

    if (!updated) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.status(200).json({ success: true, order: updated });
  } catch (err: any) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar status', message: err?.message });
  }
}
