import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertOrder, listAllOrders, DbOrder } from '../_services/db';

function generateShortOrderNumber(): string {
  return `PED-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Listar pedidos reais da tabela orders
  if (req.method === 'GET') {
    try {
      const statusFilter = req.query.status as string | undefined;
      const orders = await listAllOrders(statusFilter);
      return res.status(200).json({ success: true, orders: orders || [] });
    } catch (e: any) {
      console.error('[API /orders] Error listing orders:', e);
      return res.status(200).json({ success: true, orders: [] });
    }
  }

  // POST: Inserir novo pedido na tabela orders
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          //
        }
      }

      if (!body || !body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados do pedido incompletos ou carrinho vazio.',
        });
      }

      // 1. Validar e estruturar itens
      let calculatedSubtotal = 0;
      const parsedItems = body.items.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const uPrice = Number(item.unitPrice || item.unit_price) || 0;
        const tPrice = Number(item.totalPrice || item.total_price) || (qty * uPrice);
        calculatedSubtotal += tPrice;

        return {
          name: String(item.name || item.product?.name || 'Açaí'),
          quantity: qty,
          unitPrice: uPrice,
          totalPrice: tPrice,
          size: item.size || item.selectedSize?.ml,
          base: item.base || item.selectedBase?.name,
          additionals: item.additionals || (item.selectedAdditionals?.map((a: any) => a.additional?.name || a.name || a)) || [],
          notes: item.notes,
        };
      });

      const fulfillmentType = (body.fulfillmentType === 'pickup' || body.deliveryType === 'pickup') ? 'pickup' : 'delivery';
      const deliveryFee = fulfillmentType === 'delivery' ? (Number(body.deliveryFee ?? body.delivery_fee) || 5.0) : 0.0;
      const total = Number((calculatedSubtotal + deliveryFee).toFixed(2));
      const orderNumber = body.orderNumber || generateShortOrderNumber();

      const orderData: DbOrder = {
        order_number: orderNumber,
        customer_name: body.customerName.trim(),
        customer_phone: body.customerPhone ? body.customerPhone.trim() : undefined,
        fulfillment_type: fulfillmentType,
        street: body.address?.street || body.street,
        number: body.address?.number || body.number,
        neighborhood: body.address?.neighborhood || body.neighborhood,
        complement: body.address?.complement || body.complement,
        items: parsedItems,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        total,
        payment_method: body.paymentMethod || body.payment_method || 'delivery',
        status: 'new',
        notes: body.notes || body.generalNotes,
      };

      // 2. Inserir no Banco de Dados
      const savedOrder = await insertOrder(orderData);

      console.log(`[API /orders] Order #${savedOrder.order_number} saved.`);

      // 3. Retorno de Sucesso com JSON garantido
      return res.status(201).json({
        success: true,
        orderId: savedOrder.id || savedOrder.order_number,
        orderNumber: savedOrder.order_number,
        status: 'new',
      });

    } catch (err: any) {
      console.error('[API /orders] Create error:', err);
      return res.status(500).json({
        success: false,
        error: 'Não foi possível salvar o pedido no momento. Tente novamente.',
        message: err?.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
