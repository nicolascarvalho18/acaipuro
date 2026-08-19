import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertOrder, listOrders, DbOrder } from '../_services/db';
import { sendWhatsAppNotification } from '../_services/whatsapp';

function generateShortOrderNumber(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${hours}${minutes}${randomSuffix}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Listar pedidos (Painel Administrativo)
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || 'acai123';

    // Se fornecido header de autenticação, valida
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== adminPassword) {
        return res.status(401).json({ error: 'Senha de administrador inválida.' });
      }
    }

    try {
      const statusFilter = req.query.status as string | undefined;
      const orders = await listOrders(statusFilter);
      return res.status(200).json({ success: true, orders });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao listar pedidos', message: e?.message });
    }
  }

  // POST: Registrar novo pedido
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (!body || !body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: 'Dados do pedido incompletos.' });
      }

      // Recalcular e validar valores no servidor
      let calculatedSubtotal = 0;
      const parsedItems = body.items.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const uPrice = Number(item.unitPrice) || 0;
        const tPrice = Number(item.totalPrice) || (qty * uPrice);
        calculatedSubtotal += tPrice;

        return {
          name: String(item.name || item.product?.name || 'Item'),
          size: item.size || item.selectedSize?.ml,
          base: item.base || item.selectedBase?.name,
          additionals: item.additionals || item.selectedAdditionals?.map((a: any) => a.additional?.name || a.name),
          notes: item.notes,
          quantity: qty,
          unitPrice: uPrice,
          totalPrice: tPrice,
        };
      });

      const deliveryType = body.deliveryType === 'pickup' ? 'pickup' : 'delivery';
      const deliveryFee = deliveryType === 'delivery' ? (Number(body.deliveryFee) || 5.0) : 0.0;
      const total = calculatedSubtotal + deliveryFee;

      const orderNumber = body.orderNumber || generateShortOrderNumber();

      const orderData: DbOrder = {
        order_number: orderNumber,
        customer_name: body.customerName.trim(),
        customer_phone: body.customerPhone ? body.customerPhone.trim() : undefined,
        delivery_type: deliveryType,
        address_street: body.address?.street,
        address_number: body.address?.number,
        address_neighborhood: body.address?.neighborhood,
        address_complement: body.address?.complement,
        address_reference: body.address?.reference,
        items: parsedItems,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        discount: 0.0,
        total: Number(total.toFixed(2)),
        payment_method: body.paymentMethod || 'delivery',
        delivery_payment_method: body.deliveryPaymentMethod,
        card_type: body.cardType,
        change_for: body.changeFor ? Number(body.changeFor) : undefined,
        payment_status: body.paymentStatus || (body.paymentMethod === 'delivery' ? 'paid_on_delivery' : 'pending'),
        payment_id: body.paymentId,
        order_status: 'novo',
        general_notes: body.generalNotes,
        whatsapp_notification_status: 'pending',
      };

      // 1. Salva o pedido no banco de dados (Supabase / Memory)
      const savedOrder = await insertOrder(orderData);

      // 2. Dispara a notificação automática para o WhatsApp da loja (13) 99150-9733
      let notificationResult = { sent: false, status: 'pending' as const, error: undefined as string | undefined };
      try {
        notificationResult = await sendWhatsAppNotification(savedOrder);
      } catch (notifErr: any) {
        console.error('Error dispatching automated WhatsApp notification:', notifErr);
        notificationResult = { sent: false, status: 'failed', error: notifErr?.message };
      }

      return res.status(201).json({
        success: true,
        orderId: savedOrder.order_number,
        order: savedOrder,
        notification: notificationResult,
      });

    } catch (err: any) {
      console.error('Create order error:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao registrar pedido.',
        message: err?.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
