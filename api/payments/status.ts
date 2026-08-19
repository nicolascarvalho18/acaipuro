import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { payment_id } = req.query;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!payment_id) {
      return res.status(400).json({ error: 'Parâmetro payment_id obrigatório' });
    }

    if (!accessToken) {
      return res.status(200).json({
        configured: false,
        status: 'unknown',
        message: 'Token do Mercado Pago não configurado',
      });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao consultar pagamento' });
    }

    const data = await response.json();

    return res.status(200).json({
      configured: true,
      status: data.status,
      statusDetail: data.status_detail,
      orderId: data.external_reference,
      transactionAmount: data.transaction_amount,
      paymentMethodId: data.payment_method_id,
      dateApproved: data.date_approved,
    });
  } catch (error: any) {
    console.error('Check status error:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar status' });
  }
}
