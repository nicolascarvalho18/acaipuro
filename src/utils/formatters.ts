import type { OrderDetails, StoreConfig } from '../types';

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (BRL)
 * Exemplo: 18.9 -> "R$ 18,90"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Gera um identificador único de pedido no formato: PED-YYYYMMDD-HHMMSS-XXX
 */
export function generateOrderId(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const randomPart = Math.floor(100 + Math.random() * 900);
  
  return `PED-${year}${month}${day}-${hours}${minutes}${seconds}-${randomPart}`;
}

/**
 * Formata máscara de telefone celular brasileiro (XX) XXXXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}

/**
 * Constrói a mensagem formatada para envio direto ao WhatsApp da loja
 */
export function buildWhatsAppMessage(order: OrderDetails, storeConfig: StoreConfig): string {
  const lines: string[] = [];

  lines.push(`*NOVO PEDIDO - ${storeConfig.storeName.toUpperCase()}*`);
  lines.push(`Olá! Gostaria de fazer o seguinte pedido:`);
  lines.push(``);
  lines.push(`*Pedido:* ${order.orderId}`);
  lines.push(`----------------------------------------`);
  lines.push(`*ITENS:*`);

  order.items.forEach((item) => {
    const sizeName = item.selectedSize ? ` (${item.selectedSize.ml})` : '';
    lines.push(`• ${item.quantity}x *${item.product.name}*${sizeName} — ${formatCurrency(item.totalPrice)}`);

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
    lines.push(`Forma: Pix`);
  } else if (order.paymentMethod === 'card_delivery') {
    const cardInfo = order.cardType === 'credit' ? 'Cartão de Crédito' : order.cardType === 'debit' ? 'Cartão de Débito' : 'Cartão';
    lines.push(`Forma: ${cardInfo} na entrega`);
  } else if (order.paymentMethod === 'cash') {
    lines.push(`Forma: Dinheiro`);
    if (order.changeFor && order.changeFor > order.total) {
      lines.push(`Troco para: ${formatCurrency(order.changeFor)}`);
    } else {
      lines.push(`Troco: Não precisa de troco`);
    }
  }

  if (order.generalNotes && order.generalNotes.trim()) {
    lines.push(``);
    lines.push(`*Observações:* ${order.generalNotes.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Cria a URL completa do WhatsApp para redirecionamento
 */
export function getWhatsAppUrl(order: OrderDetails, storeConfig: StoreConfig): string {
  const message = buildWhatsAppMessage(order, storeConfig);
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = storeConfig.whatsappNumber.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Verifica se a loja está aberta no horário atual
 */
export function isStoreOpen(storeConfig: StoreConfig): { isOpen: boolean; message: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const timeInDecimal = currentHour + currentMinutes / 60;

  const start = storeConfig.openingHours.startHour;
  const end = storeConfig.openingHours.endHour;

  const isOpen = timeInDecimal >= start && timeInDecimal < end;

  if (isOpen) {
    return {
      isOpen: true,
      message: `Aberto agora • Fecha às ${end}h`
    };
  } else {
    return {
      isOpen: false,
      message: `Fechado • Abre às ${start}h`
    };
  }
}
