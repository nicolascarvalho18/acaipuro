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
