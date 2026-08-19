import type { VercelRequest, VercelResponse } from '@vercel/node';
import { waitUntil } from '@vercel/functions';
import { insertOrder, listOrders, DbOrder } from '../_services/db';
import { dispatchAllBackgroundNotifications } from '../_services/notifications';

function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PED-${year}${month}${day}-${randomSuffix}`;
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

  // GET: Listar pedidos para o Painel Administrativo do Lojista
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || 'acai123';

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

  // POST: Registrar novo pedido no banco de dados e notificar em segundo plano
  if (req.method === 'POST') {
    const startTime = Date.now();
    try {
      const body = req.body;

      if (!body || !body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: 'Dados do pedido incompletos ou carrinho vazio.' });
      }

      // 1. Recalcular e validar valores no servidor
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

      const fulfillmentType = body.fulfillmentType === 'pickup' || body.deliveryType === 'pickup' ? 'pickup' : 'delivery';
      const deliveryFee = fulfillmentType === 'delivery' ? (Number(body.deliveryFee) || 5.0) : 0.0;
      const total = calculatedSubtotal + deliveryFee;

      const orderNumber = body.orderNumber || generateOrderNumber();

      const orderData: DbOrder = {
        order_number: orderNumber,
        customer_name: body.customerName.trim(),
        customer_phone: body.customerPhone ? body.customerPhone.trim() : undefined,
        fulfillment_type: fulfillmentType,
        address: body.address ? {
          street: body.address.street,
          number: body.address.number,
          neighborhood: body.address.neighborhood,
          complement: body.address.complement,
          reference: body.address.reference,
        } : undefined,
        items: parsedItems,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        total: Number(total.toFixed(2)),
        payment_method: body.paymentMethod || 'delivery',
        payment_status: body.paymentStatus || (body.paymentMethod === 'delivery' ? 'paid_on_delivery' : 'pending'),
        order_status: 'new', // Status inicial obrigatório
        notes: body.notes || body.generalNotes,
        whatsapp_status: 'pending',
        push_status: 'pending',
        email_status: 'pending',
        notification_attempts: 0,
      };

      // 2. SALVA IMEDIATAMENTE NO BANCO DE DADOS
      const savedOrder = await insertOrder(orderData);
      const elapsedMs = Date.now() - startTime;
      console.log(`[API /orders] Order ${savedOrder.order_number} saved to database in ${elapsedMs}ms.`);

      // 3. EXECUTA NOTIFICAÇÕES EM SEGUNDO PLANO (NON-BLOCKING)
      try {
        waitUntil(dispatchAllBackgroundNotifications(savedOrder));
      } catch (waitErr) {
        // Fallback para execução assíncrona se não estiver em ambiente serverless Vercel
        dispatchAllBackgroundNotifications(savedOrder).catch(err =>
          console.error('[Background Notification Error]:', err)
        );
      }

      // 4. RETORNA HTTP 201 IMEDIATAMENTE AO CLIENTE
      return res.status(201).json({
        success: true,
        orderId: savedOrder.id || savedOrder.order_number,
        orderNumber: savedOrder.order_number,
        status: savedOrder.order_status,
        savedInMs: elapsedMs,
      });

    } catch (err: any) {
      console.error('[API /orders] Error creating order:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao salvar pedido no banco de dados.',
        message: err?.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
