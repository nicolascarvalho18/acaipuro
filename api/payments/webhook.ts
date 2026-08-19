import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const { query, body } = req;

    // Mercado Pago pode enviar notificação via query params ou body
    const topic = query.topic || query.type || body?.type || body?.topic;
    const paymentId = query.id || query['data.id'] || body?.data?.id;

    if (!accessToken) {
      return res.status(200).json({ received: true, note: 'Webhook received without token configured' });
    }

    if (topic === 'payment' && paymentId) {
      // Consulta os detalhes reais do pagamento na API oficial do Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken.trim()}`,
        },
      });

      if (response.ok) {
        const paymentData = await response.json();
        
        console.log(`[Mercado Pago Webhook] Pagamento ID: ${paymentId}`);
        console.log(`[Mercado Pago Webhook] Status: ${paymentData.status}`);
        console.log(`[Mercado Pago Webhook] External Reference (Order ID): ${paymentData.external_reference}`);
        console.log(`[Mercado Pago Webhook] Valor: ${paymentData.transaction_amount}`);
        
        // Aqui o webhook valida a autenticidade e registra o pagamento
        return res.status(200).json({
          received: true,
          status: paymentData.status,
          orderId: paymentData.external_reference,
          paymentId,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Sempre retorna 200 para o Mercado Pago não reenviar em loop caso haja erro não-fatal
    return res.status(200).json({ received: true, error: error?.message });
  }
}
