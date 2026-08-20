import { createClient } from '@supabase/supabase-js';

// Catálogo base de fallback
const DEFAULT_CATALOG: Record<string, { basePrice: number; promoPrice?: number; sizes?: Record<string, number>; maxFree?: number }> = {
  'prod_acai_tradicional': {
    basePrice: 16.90,
    sizes: { '300 ml': 16.90, '500 ml': 21.90, '700 ml': 27.90, '1 litro': 38.90, '1 Litro': 38.90 },
    maxFree: 3,
  },
  'prod_acai_morango_leite_po': {
    basePrice: 21.90,
    sizes: { '300 ml': 21.90, '500 ml': 26.90, '700 ml': 32.90, '1 litro': 43.90, '1 Litro': 43.90 },
    maxFree: 3,
  },
  'prod_acai_banana_granola': {
    basePrice: 19.90,
    sizes: { '300 ml': 19.90, '500 ml': 24.90, '700 ml': 30.90, '1 litro': 41.90, '1 Litro': 41.90 },
    maxFree: 3,
  },
  'prod_acai_creme_avela': {
    basePrice: 26.90,
    sizes: { '300 ml': 26.90, '500 ml': 31.90, '700 ml': 37.90, '1 litro': 48.90, '1 Litro': 48.90 },
    maxFree: 2,
  },
  'combo_para_dois': {
    basePrice: 44.90,
    promoPrice: 39.90,
    maxFree: 3,
  },
  'combo_familia': {
    basePrice: 68.90,
    maxFree: 3,
  },
  'prod_barca_acai': {
    basePrice: 49.90,
    sizes: { 'Barca Individual': 36.90, '800 ml': 36.90, 'Barca Tradicional': 49.90, '1.2 Litros': 49.90 },
    maxFree: 4,
  },
  'prod_brownie_artesanal': { basePrice: 12.90 },
  'prod_mousse_maracuja': { basePrice: 9.90 },
  'prod_suco_acai': { basePrice: 14.90 },
  'prod_agua_mineral': { basePrice: 4.50 },
  'prod_refrigerante_lata': { basePrice: 6.50 },
};

let memoryOrders: any[] = [];

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  return digits;
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key && url.trim().startsWith('http') && key.trim().length > 10) {
    try {
      return createClient(url.trim(), key.trim(), {
        auth: { persistSession: false },
      });
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
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

  const supabase = getSupabaseClient();

  // GET: Listar Pedidos
  if (req.method === 'GET') {
    try {
      const statusFilter = req.query?.status;

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
    } catch {
      return res.status(200).json({ success: true, orders: memoryOrders });
    }
  }

  // POST: Criar e Recalcular Pedido Oficial no Servidor
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

      // 1. Validar se a loja está aberta
      if (supabase) {
        try {
          const { data: storeSettings } = await supabase
            .from('store_settings')
            .select('is_open')
            .eq('id', 'default')
            .single();

          if (storeSettings && storeSettings.is_open === false) {
            return res.status(400).json({
              success: false,
              code: 'STORE_CLOSED',
              message: 'A loja está fechada e não está recebendo pedidos no momento.',
            });
          }
        } catch {}
      }

      // 2. Buscar catálogo atualizado do Supabase para validação dinâmica de preços
      let dbProductsMap: Record<string, any> = {};
      if (supabase) {
        try {
          const { data: prods } = await supabase.from('products').select('*');
          if (prods && prods.length > 0) {
            prods.forEach(p => {
              dbProductsMap[p.id] = p;
            });
          }
        } catch {}
      }

      // 3. Recalcular e validar cada produto
      let calculatedSubtotal = 0;
      const parsedItems = body.items.map((item: any) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const prodId = item.productId || item.id || '';
        const prodName = String(item.name || 'Produto');
        const sizeStr = item.size ? String(item.size).trim() : undefined;

        let officialUnitPrice = Number(item.unitPrice) || 0;

        // Se o produto está no Supabase, usa o preço atualizado pelo administrador
        if (dbProductsMap[prodId]) {
          const dbProd = dbProductsMap[prodId];
          officialUnitPrice = Number(dbProd.promotional_price || dbProd.price) || officialUnitPrice;
        } else {
          // Fallback para catálogo
          const catalogItem = DEFAULT_CATALOG[prodId] || Object.entries(DEFAULT_CATALOG).find(([k]) => prodName.toLowerCase().includes(k.replace('prod_', '').replace('combo_', '').replace(/_/g, ' ')))?.[1];
          if (catalogItem) {
            if (sizeStr && catalogItem.sizes && catalogItem.sizes[sizeStr]) {
              officialUnitPrice = catalogItem.sizes[sizeStr];
            } else {
              officialUnitPrice = catalogItem.promoPrice || catalogItem.basePrice;
            }
          }
        }

        // Se houver adicionais extras
        if (Array.isArray(item.additionals) && item.additionals.length > 0 && Number(item.unitPrice) > officialUnitPrice) {
          officialUnitPrice = Number(item.unitPrice);
        }

        const itemTotal = Number((officialUnitPrice * qty).toFixed(2));
        calculatedSubtotal += itemTotal;

        return {
          productId: prodId,
          name: prodName,
          quantity: qty,
          unitPrice: officialUnitPrice,
          totalPrice: itemTotal,
          size: sizeStr,
          base: item.base,
          additionals: item.additionals || [],
          notes: item.notes,
        };
      });

      const fulfillmentType = (body.fulfillmentType === 'pickup' || body.deliveryType === 'pickup') ? 'pickup' : 'delivery';
      
      let deliveryFee = 0;
      if (fulfillmentType === 'delivery') {
        deliveryFee = calculatedSubtotal >= 45.00 ? 0.00 : (Number(body.deliveryFee) || 5.00);
      }

      const total = Number((calculatedSubtotal + deliveryFee).toFixed(2));
      const orderNumber = body.orderNumber || `PED-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      const rawPhone = body.customerPhone ? String(body.customerPhone).trim() : null;
      const normalized = rawPhone ? normalizePhone(rawPhone) : null;

      const orderData = {
        order_number: orderNumber,
        customer_name: String(body.customerName).trim(),
        customer_phone: rawPhone,
        fulfillment_type: fulfillmentType,
        street: body.street || body.address?.street || null,
        number: body.number || body.address?.number || null,
        neighborhood: body.neighborhood || body.address?.neighborhood || null,
        complement: body.complement || body.address?.complement || null,
        items: parsedItems,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        total,
        payment_method: body.paymentMethod || 'delivery',
        status: 'new',
        notes: body.notes || body.generalNotes || null,
        created_at: now,
        updated_at: now,
      };

      // 4. Cadastrar / Atualizar Cliente Automaticamente
      if (supabase && normalized) {
        try {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', normalized)
            .single();

          if (existingCustomer) {
            await supabase
              .from('customers')
              .update({
                name: orderData.customer_name,
                total_orders: (existingCustomer.total_orders || 0) + 1,
                total_spent: Number((Number(existingCustomer.total_spent || 0) + total).toFixed(2)),
                last_order_at: now,
                updated_at: now,
              })
              .eq('id', existingCustomer.id);
          } else {
            await supabase
              .from('customers')
              .insert({
                name: orderData.customer_name,
                phone: normalized,
                total_orders: 1,
                total_spent: total,
                last_order_at: now,
              });
          }
        } catch {}
      }

      // 5. Salvar Pedido no Supabase
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
            return res.status(201).json({
              success: true,
              orderId: data.id || data.order_number,
              orderNumber: data.order_number,
              total: data.total,
              status: 'new',
            });
          }
        } catch {}
      }

      // Fallback em memória
      const memoryOrder = {
        ...orderData,
        id: `ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      };
      memoryOrders.unshift(memoryOrder);

      return res.status(201).json({
        success: true,
        orderId: memoryOrder.id,
        orderNumber: memoryOrder.order_number,
        total: memoryOrder.total,
        status: 'new',
      });

    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao salvar pedido.',
        message: err?.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
