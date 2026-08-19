import type { VercelRequest, VercelResponse } from '@vercel/node';

interface OrderItemPayload {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  additionals?: string[];
  notes?: string;
}

interface CreatePreferencePayload {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  deliveryType: 'delivery' | 'pickup';
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  paymentType: 'pix' | 'card_online' | 'delivery';
  items: OrderItemPayload[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurações de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload: CreatePreferencePayload = req.body;

    if (!payload || !payload.orderId || !payload.items || payload.items.length === 0) {
      return res.status(400).json({ error: 'Dados do pedido inválidos ou incompletos.' });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const appUrl = process.env.PUBLIC_APP_URL || req.headers.origin || 'https://' + req.headers.host;

    // Fallback gracioso caso o lojista ainda não tenha cadastrado o token de produção
    if (!accessToken || accessToken.trim() === '') {
      return res.status(200).json({
        success: false,
        fallbackToWhatsApp: true,
        error: 'CREDENTIALS_NOT_CONFIGURED',
        message: 'O pagamento online está temporariamente em configuração. Você pode finalizar seu pedido diretamente pelo WhatsApp com pagamento na entrega ou Pix.',
      });
    }

    // Recalcular e mapear itens para o formato do Mercado Pago
    const mpItems = payload.items.map((item, index) => {
      let description = '';
      if (item.size) description += `Tamanho: ${item.size}. `;
      if (item.additionals && item.additionals.length > 0) {
        description += `Adicionais: ${item.additionals.join(', ')}. `;
      }
      if (item.notes) description += `Obs: ${item.notes}`;

      return {
        id: `item-${index + 1}`,
        title: item.name,
        description: description.trim() || 'Açaí artesanal',
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: Number(item.unitPrice.toFixed(2)),
      };
    });

    // Se houver taxa de entrega, adiciona como item ou custo de envio
    if (payload.deliveryType === 'delivery' && payload.deliveryFee > 0) {
      mpItems.push({
        id: 'delivery-fee',
        title: 'Taxa de Entrega (Delivery)',
        description: `Entrega para ${payload.address?.neighborhood || 'região'}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(payload.deliveryFee.toFixed(2)),
      });
    }

    // Configurar métodos de pagamento
    const paymentMethods: Record<string, any> = {
      installments: 12,
    };

    if (payload.paymentType === 'pix') {
      paymentMethods.default_payment_method_id = 'pix';
    }

    // Montar payload da Preferência de Checkout Pro
    const preferenceBody = {
      items: mpItems,
      payer: {
        name: payload.customerName,
        phone: payload.customerPhone ? {
          number: payload.customerPhone.replace(/\D/g, ''),
        } : undefined,
        address: payload.address ? {
          street_name: payload.address.street,
          street_number: Number(payload.address.number) || 0,
        } : undefined,
      },
      back_urls: {
        success: `${appUrl}/?status=approved&order_id=${encodeURIComponent(payload.orderId)}`,
        pending: `${appUrl}/?status=pending&order_id=${encodeURIComponent(payload.orderId)}`,
        failure: `${appUrl}/?status=failure&order_id=${encodeURIComponent(payload.orderId)}`,
      },
      auto_return: 'approved',
      external_reference: payload.orderId,
      notification_url: `${appUrl}/api/payments/webhook`,
      statement_descriptor: 'ACAI PURO SABOR',
      payment_methods: paymentMethods,
      metadata: {
        order_id: payload.orderId,
        customer_name: payload.customerName,
        customer_phone: payload.customerPhone,
        delivery_type: payload.deliveryType,
        total: payload.total,
      }
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago API Error:', data);
      return res.status(response.status).json({
        success: false,
        error: data.message || 'Erro ao comunicar com o Mercado Pago.',
      });
    }

    return res.status(200).json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      orderId: payload.orderId,
    });

  } catch (error: any) {
    console.error('Create preference error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao gerar pagamento online.',
      message: error?.message,
    });
  }
}
