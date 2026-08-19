import { createClient } from '@supabase/supabase-js';

// Armazenamento em memória caso o Supabase não esteja configurado
let memoryOrders: any[] = [];

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key && url.trim().startsWith('http') && key.trim().length > 10) {
    try {
      return createClient(url.trim(), key.trim(), {
        auth: { persistSession: false },
      });
    } catch (e) {
      console.error('[Supabase Init Error]:', e);
      return null;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  // Configuração de CORS e Cabeçalhos JSON
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Listar Pedidos
  if (req.method === 'GET') {
    try {
      const statusFilter = req.query?.status;
      const supabase = getSupabaseClient();

      if (supabase) {
        try {
          let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

          if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
          }

          const { data, error } = await query;
          if (!error && data) {
            return res.status(200).json({ success: true, orders: data });
          }
        } catch (dbErr) {
          console.error('[Supabase Query Error]:', dbErr);
        }
      }

      const filtered = statusFilter && statusFilter !== 'all'
        ? memoryOrders.filter(o => o.status === statusFilter)
        : memoryOrders;

      return res.status(200).json({ success: true, orders: filtered });
    } catch (e: any) {
      return res.status(200).json({ success: true, orders: memoryOrders });
    }
  }

  // POST: Criar Pedido
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      if (!body || !body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados do pedido incompletos ou carrinho vazio.',
        });
      }

      const orderNumber = body.orderNumber || `PED-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      const orderData = {
        order_number: orderNumber,
        customer_name: String(body.customerName).trim(),
        customer_phone: body.customerPhone ? String(body.customerPhone).trim() : null,
        fulfillment_type: (body.fulfillmentType === 'pickup' || body.deliveryType === 'pickup') ? 'pickup' : 'delivery',
        street: body.street || body.address?.street || null,
        number: body.number || body.address?.number || null,
        neighborhood: body.neighborhood || body.address?.neighborhood || null,
        complement: body.complement || body.address?.complement || null,
        items: body.items,
        subtotal: Number(body.subtotal) || 0,
        delivery_fee: Number(body.deliveryFee) || 0,
        total: Number(body.total) || 0,
        payment_method: body.paymentMethod || 'delivery',
        status: 'new',
        notes: body.notes || body.generalNotes || null,
        created_at: now,
        updated_at: now,
      };

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .insert({
              order_number: orderData.order_number,
              customer_name: orderData.customer_name,
              customer_phone: orderData.customer_phone,
              fulfillment_type: orderData.fulfillment_type,
              street: orderData.street,
              number: orderData.number,
              neighborhood: orderData.neighborhood,
              complement: orderData.complement,
              items: orderData.items,
              subtotal: orderData.subtotal,
              delivery_fee: orderData.delivery_fee,
              total: orderData.total,
              payment_method: orderData.payment_method,
              status: 'new',
              notes: orderData.notes,
            })
            .select()
            .single();

          if (!error && data) {
            console.log(`[Supabase] Order #${data.order_number} saved.`);
            return res.status(201).json({
              success: true,
              orderId: data.id || data.order_number,
              orderNumber: data.order_number,
              status: 'new',
            });
          }
          if (error) {
            console.error('[Supabase Insert Error]:', error.message);
          }
        } catch (supaEx: any) {
          console.error('[Supabase Insert Exception]:', supaEx?.message || supaEx);
        }
      }

      // Fallback em memória se Supabase não estiver configurado
      const memoryOrder = {
        ...orderData,
        id: `ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      };
      memoryOrders.unshift(memoryOrder);

      return res.status(201).json({
        success: true,
        orderId: memoryOrder.id,
        orderNumber: memoryOrder.order_number,
        status: 'new',
      });

    } catch (err: any) {
      console.error('[API /orders POST Exception]:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao salvar pedido.',
        message: err?.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
