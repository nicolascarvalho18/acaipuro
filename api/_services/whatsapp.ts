import type { DbOrder } from './db';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

export function buildStoreNotificationMessage(order: DbOrder): string {
  const lines: string[] = [];

  lines.push(`🔔 *NOVO PEDIDO #${order.order_number}*`);
  lines.push(``);
  lines.push(`*Cliente:* ${order.customer_name}`);
  lines.push(`*Telefone:* ${order.customer_phone || 'Não informado'}`);
  lines.push(``);
  lines.push(`*ITENS*`);
  lines.push(``);

  if (Array.isArray(order.items)) {
    order.items.forEach((item: any) => {
      let itemLine = `${item.quantity || 1}x ${item.name}`;
      if (item.size) {
        itemLine += ` — ${item.size}`;
      }
      lines.push(itemLine);

      if (item.base && item.base !== 'Açaí tradicional') {
        lines.push(`Base: ${item.base}`);
      }

      if (item.additionals && Array.isArray(item.additionals) && item.additionals.length > 0) {
        lines.push(`Adicionais: ${item.additionals.join(', ')}.`);
      }

      const itemVal = item.totalPrice || item.unitPrice || 0;
      lines.push(`Valor: ${formatCurrency(itemVal)}.`);
      lines.push(``);
    });
  }

  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}.`);
  if (order.delivery_type === 'delivery') {
    lines.push(`Entrega: ${order.delivery_fee === 0 ? 'Grátis' : formatCurrency(order.delivery_fee)}.`);
  }
  lines.push(`*Total: ${formatCurrency(order.total)}.*`);
  lines.push(``);

  lines.push(`*Recebimento:* ${order.delivery_type === 'delivery' ? 'entrega' : 'retirada'}.`);
  lines.push(``);

  if (order.delivery_type === 'delivery' && (order.address_street || order.address_neighborhood)) {
    lines.push(`*Endereço:*`);
    lines.push(`${order.address_street || 'Rua não informada'}, ${order.address_number || 'S/N'}.`);
    if (order.address_neighborhood) {
      lines.push(`Bairro: ${order.address_neighborhood}.`);
    }
    if (order.address_complement && order.address_complement.trim()) {
      lines.push(`Complemento: ${order.address_complement.trim()}.`);
    }
    if (order.address_reference && order.address_reference.trim()) {
      lines.push(`Referência: ${order.address_reference.trim()}.`);
    }
    lines.push(``);
  }

  let paymentText = 'Pix';
  if (order.payment_method === 'pix') {
    paymentText = order.payment_status === 'approved' ? 'Pix (Aprovado online)' : 'Pix';
  } else if (order.payment_method === 'card_online') {
    paymentText = order.payment_status === 'approved' ? 'Cartão (Aprovado online)' : 'Cartão online';
  } else if (order.payment_method === 'delivery') {
    if (order.delivery_payment_method === 'cash') {
      paymentText = 'Dinheiro na entrega';
      if (order.change_for && order.change_for > order.total) {
        paymentText += ` (Troco para ${formatCurrency(order.change_for)})`;
      }
    } else {
      const cardType = order.card_type === 'debit' ? 'Débito' : 'Crédito';
      paymentText = `Cartão ${cardType} na entrega (levar maquininha)`;
    }
  }

  lines.push(`*Pagamento:* ${paymentText}.`);

  if (order.general_notes && order.general_notes.trim()) {
    lines.push(``);
    lines.push(`*Observações:*`);
    lines.push(order.general_notes.trim());
  }

  return lines.join('\n');
}

export async function sendWhatsAppNotification(
  order: DbOrder
): Promise<{ sent: boolean; status: 'sent' | 'failed' | 'not_configured'; error?: string }> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const storePhone = process.env.STORE_WHATSAPP_NUMBER || '5513991509733';

  if (!token || !phoneNumberId || token.trim() === '' || phoneNumberId.trim() === '') {
    console.log('[WhatsApp Notification] WhatsApp Cloud API credentials not configured yet.');
    return {
      sent: false,
      status: 'not_configured',
      error: 'Credenciais da API do WhatsApp Cloud não configuradas no servidor.',
    };
  }

  try {
    const formattedRecipient = storePhone.replace(/\D/g, '');
    const messageText = buildStoreNotificationMessage(order);

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId.trim()}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedRecipient,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Notification] Error from Meta Graph API:', data);
      return {
        sent: false,
        status: 'failed',
        error: data.error?.message || 'Falha ao enviar mensagem pelo WhatsApp.',
      };
    }

    console.log('[WhatsApp Notification] Message sent successfully:', data);
    return {
      sent: true,
      status: 'sent',
    };
  } catch (err: any) {
    console.error('[WhatsApp Notification] Network/Execution error:', err);
    return {
      sent: false,
      status: 'failed',
      error: err?.message || 'Erro de conexão com a API do WhatsApp.',
    };
  }
}

/**
 * Envia notificação automática no WhatsApp do cliente ao mudar o status do pedido
 */
export async function sendCustomerWhatsAppStatusNotification(
  order: DbOrder,
  newStatus: string
): Promise<{ sent: boolean; status: 'sent' | 'failed' | 'not_configured'; error?: string; message?: string }> {
  const customerName = order.customer_name || 'Cliente';
  const orderNumber = order.order_number;
  const rawPhone = order.customer_phone || '';
  let cleanPhone = rawPhone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10) {
    console.log(`[WhatsApp Customer] Telefone do cliente inválido ou ausente no pedido #${orderNumber}: "${rawPhone}"`);
    return {
      sent: false,
      status: 'failed',
      error: 'Telefone do cliente não informado ou formato inválido.',
    };
  }

  // Garantir DDI 55 (Brasil)
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  let messageText = '';
  const statusNorm = newStatus.toLowerCase().trim();

  if (statusNorm === 'confirmed' || statusNorm === 'preparing') {
    messageText = `Olá, ${customerName}! Seu pedido #${orderNumber} foi confirmado e já está sendo preparado. Avisaremos quando sair para entrega.`;
  } else if (statusNorm === 'delivering' || statusNorm === 'out_for_delivery') {
    messageText = `Olá, ${customerName}! Seu pedido #${orderNumber} saiu para entrega e chegará em breve.`;
  } else if (statusNorm === 'ready_for_pickup') {
    messageText = `Olá, ${customerName}! Seu pedido #${orderNumber} está pronto para retirada.`;
  } else if (statusNorm === 'cancelled') {
    messageText = `Olá, ${customerName}. Seu pedido #${orderNumber} foi cancelado. Em caso de dúvidas, entre em contato conosco.`;
  } else if (statusNorm === 'done' || statusNorm === 'completed') {
    messageText = `Olá, ${customerName}! Seu pedido #${orderNumber} foi finalizado com sucesso. Bom apetite e obrigado pela preferência!`;
  } else {
    return { sent: false, status: 'not_configured', error: 'Status sem mensagem configurada.' };
  }

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId || token.trim() === '' || phoneNumberId.trim() === '') {
    console.log(`[WhatsApp Customer] API do WhatsApp Cloud não configurada. Mensagem preparada para #${orderNumber} (${cleanPhone}):\n"${messageText}"`);
    return {
      sent: false,
      status: 'not_configured',
      error: 'Credenciais WHATSAPP_API_TOKEN ou WHATSAPP_PHONE_NUMBER_ID não configuradas no servidor.',
      message: messageText,
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId.trim()}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Customer] Erro na Meta Graph API:', data);
      return {
        sent: false,
        status: 'failed',
        error: data.error?.message || 'Falha ao enviar mensagem pelo WhatsApp.',
        message: messageText,
      };
    }

    console.log(`[WhatsApp Customer] Mensagem enviada com sucesso para ${cleanPhone} (Pedido #${orderNumber})`);
    return {
      sent: true,
      status: 'sent',
      message: messageText,
    };
  } catch (err: any) {
    console.error('[WhatsApp Customer] Erro de rede:', err);
    return {
      sent: false,
      status: 'failed',
      error: err?.message || 'Erro de conexão com a API do WhatsApp.',
      message: messageText,
    };
  }
}
