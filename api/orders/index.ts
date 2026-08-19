import type { VercelRequest, VercelResponse } from '@vercel/node';
import { waitUntil } from '@vercel/functions';
import { insertOrderWithItems, listAllOrders, DbOrder } from '../_services/db';
import { dispatchAllBackgroundNotifications } from '../_services/notifications';

function generateShortOrderNumber(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // GET: Listar pedidos para o Painel do Lojista
  if (req.method === 'GET') {
    try {
      const statusFilter = req.query.status as string | undefined;
      const orders = await listAllOrders(statusFilter);
      return res.status(200).json({ success: true, orders });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao listar pedidos', message: e?.message });
    }
  }

  // POST: Registrar novo pedido
  if (req.method === 'POST') {
    const startTime = Date.now();
    try {
      const body = req.body;

      if (!body || !body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: 'Dados do pedido incompletos ou carrinho vazio.' });
      }

      // 1. Recalcular e estruturar itens e adicionais
      let calculatedSubtotal = 0;
      const parsedItems = body.items.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const uPrice = Number(item.unitPrice || item.unit_price) || 0;
        const tPrice = Number(item.totalPrice || item.total_price) || (qty * uPrice);
        calculatedSubtotal += tPrice;

        const addons = (item.additionals || item.addons || []).map((addon: any) => {
          if (typeof addon === 'string') {
            return { addon_name: addon, addon_price: 0, quantity: 1 };
          }
          return {
            addon_name: addon.name || addon.addon_name || 'Adicional',
            addon_price: Number(addon.price || addon.addon_price) || 0,
            quantity: Number(addon.quantity) || 1,
          };
        });

        return {
          product_id: String(item.product_id || item.product?.id || 'acai_item'),
          product_name: String(item.product_name || item.name || item.product?.name || 'Açaí'),
          size: item.size || item.selectedSize?.ml,
          base: item.base || item.selectedBase?.name,
          quantity: qty,
          unit_price: uPrice,
          total_price: tPrice,
          notes: item.notes,
          addons,
        };
      });

      const fulfillmentType = body.fulfillmentType === 'pickup' || body.deliveryType === 'pickup' ? 'pickup' : 'delivery';
      const deliveryFee = fulfillmentType === 'delivery' ? (Number(body.deliveryFee ?? body.delivery_fee) || 5.0) : 0.0;
      const total = Number((calculatedSubtotal + deliveryFee).toFixed(2));
      const orderNumber = body.orderNumber || body.order_number || generateShortOrderNumber();

      const orderData: DbOrder = {
        order_number: orderNumber,
        customer_name: body.customerName.trim(),
        customer_phone: body.customerPhone ? body.customerPhone.trim() : undefined,
        fulfillment_type: fulfillmentType,
        address_street: body.address?.street || body.address_street,
        address_number: body.address?.number || body.address_number,
        address_neighborhood: body.address?.neighborhood || body.address_neighborhood,
        address_complement: body.address?.complement || body.address_complement,
        address_reference: body.address?.reference || body.address_reference,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        total,
        payment_method: body.paymentMethod || body.payment_method || 'delivery',
        payment_status: body.paymentStatus || body.payment_status || (body.paymentMethod === 'delivery' ? 'paid_on_delivery' : 'pending'),
        status: 'novo',
        notes: body.notes || body.generalNotes,
        items: parsedItems,
      };

      // 2. Salva no Banco de Dados
      const savedOrder = await insertOrderWithItems(orderData);
      const elapsedMs = Date.now() - startTime;
      console.log(`[API /orders] Order #${savedOrder.order_number} saved in ${elapsedMs}ms.`);

      // 3. Notificações em Segundo Plano (Non-Blocking)
      try {
        waitUntil(dispatchAllBackgroundNotifications(savedOrder as any));
      } catch {
        dispatchAllBackgroundNotifications(savedOrder as any).catch(e => console.warn('Notification background error:', e));
      }

      // 4. Retorna confirmação instantânea
      return res.status(201).json({
        success: true,
        orderId: savedOrder.id || savedOrder.order_number,
        orderNumber: savedOrder.order_number,
        status: savedOrder.status,
        savedInMs: elapsedMs,
      });

    } catch (err: any) {
      console.error('[API /orders] Create error:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar pedido no servidor.',
        message: err?.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
