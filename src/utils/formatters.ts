import type { OrderDetails, StoreConfig } from '../types';

/**
 * Formata um valor numérico para Moeda Brasileira (R$ 0,00)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Gera um ID único e amigável para o pedido (Ex: #PED-20260819-143022-849)
 */
export function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  return `PED-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;
}

/**
 * Monta o texto padronizado do pedido para envio via WhatsApp
 */
export function buildWhatsAppMessage(order: OrderDetails, config: StoreConfig): string {
  const lines: string[] = [];

  const isApproved = order.status === 'approved';

  if (isApproved) {
    lines.push(`*NOVO PEDIDO - PAGAMENTO APROVADO ONLINE*`);
  } else {
    lines.push(`*NOVO PEDIDO - ${config.storeName.toUpperCase()}*`);
  }

  lines.push(`*Código:* #${order.orderId}`);
  lines.push(`----------------------------------------`);
  lines.push(`*ITENS DO PEDIDO:*`);

  order.items.forEach((item, index) => {
    let itemTitle = `${item.quantity}x ${item.product.name}`;
    if (item.selectedSize) {
      itemTitle += ` (${item.selectedSize.ml})`;
    }
    lines.push(`${index + 1}. *${itemTitle}* - ${formatCurrency(item.totalPrice)}`);

    if (item.selectedBase && item.selectedBase.id !== 'base_tradicional') {
      lines.push(`  Base: ${item.selectedBase.name}`);
    }

    if (item.selectedAdditionals && item.selectedAdditionals.length > 0) {
      const freeAdds = item.selectedAdditionals
        .filter(a => a.isFree)
        .map(a => a.additional.name);
      
      const paidAdds = item.selectedAdditionals
        .filter(a => !a.isFree)
        .map(a => `${a.additional.name} (+${formatCurrency(a.unitPrice)})`);

      if (freeAdds.length > 0) {
        lines.push(`  Adicionais: ${freeAdds.join(', ')}`);
      }
      if (paidAdds.length > 0) {
        lines.push(`  Extras: ${paidAdds.join(', ')}`);
      }
    }

    if (item.notes && item.notes.trim()) {
      lines.push(`  Obs: ${item.notes.trim()}`);
    }
  });

  lines.push(`----------------------------------------`);
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);
  
  if (order.deliveryType === 'delivery') {
    lines.push(`Taxa de entrega: ${order.deliveryFee === 0 ? 'Grátis' : formatCurrency(order.deliveryFee)}`);
  } else {
    lines.push(`Recebimento: Retirada na loja`);
  }
  
  lines.push(`*Total: ${formatCurrency(order.total)}*`);
  lines.push(`----------------------------------------`);
  lines.push(`*DADOS DE ENTREGA:*`);
  lines.push(`Nome: ${order.customerName}`);
  if (order.customerPhone) {
    lines.push(`Telefone: ${order.customerPhone}`);
  }
  lines.push(`Tipo: ${order.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}`);

  if (order.deliveryType === 'delivery' && order.address) {
    lines.push(`Endereço: ${order.address.street}, Nº ${order.address.number}`);
    lines.push(`Bairro: ${order.address.neighborhood}`);
    if (order.address.complement && order.address.complement.trim()) {
      lines.push(`Complemento: ${order.address.complement.trim()}`);
    }
    if (order.address.reference && order.address.reference.trim()) {
      lines.push(`Ponto de referência: ${order.address.reference.trim()}`);
    }
  }

  lines.push(``);
  lines.push(`*PAGAMENTO:*`);
  if (order.paymentMethod === 'pix') {
    lines.push(`Forma: Pix online ${isApproved ? '(Aprovado no Mercado Pago)' : '(Aguardando / Em processamento)'}`);
  } else if (order.paymentMethod === 'card_online') {
    lines.push(`Forma: Cartão online ${isApproved ? '(Aprovado no Mercado Pago)' : '(Aguardando / Em processamento)'}`);
  } else if (order.paymentMethod === 'delivery') {
    if (order.deliveryPaymentMethod === 'cash') {
      lines.push(`Forma: Dinheiro na entrega`);
      if (order.changeFor && order.changeFor > order.total) {
        lines.push(`Troco para: ${formatCurrency(order.changeFor)}`);
      } else {
        lines.push(`Troco: Não precisa de troco`);
      }
    } else {
      const cardInfo = order.cardType === 'credit' ? 'Cartão de Crédito' : order.cardType === 'debit' ? 'Cartão de Débito' : 'Cartão';
      lines.push(`Forma: ${cardInfo} na entrega (levar maquininha)`);
    }
  }

  if (order.generalNotes && order.generalNotes.trim()) {
    lines.push(``);
    lines.push(`*Observações:* ${order.generalNotes.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Cria a URL completa do WhatsApp para envio do pedido
 */
export function getWhatsAppUrl(order: OrderDetails, config: StoreConfig): string {
  const message = buildWhatsAppMessage(order, config);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${config.whatsappNumber}?text=${encodedMessage}`;
}

/**
 * Formata telefone enquanto o usuário digita: (XX) XXXXX-XXXX
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
