import {
  insertOrder,
  listAllOrders,
  getOrder,
  updateOrderStatusDb,
  softDeleteOrderDb,
  restoreOrderDb,
  hardDeleteOrderDb,
  archiveOrderDb,
  updateInternalNotesDb,
  getSupabaseClient,
  isStoreOpenDb,
  getStoreSettings,
  DbOrder
} from '../_services/db';

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

const DEFAULT_DRIVERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Lucas Motoboy',
    phone: '(13) 99111-2222',
    pin_code: '1234',
    vehicle_type: 'motorcycle',
    vehicle_plate: 'BRA2E19',
    availability_status: 'available',
    is_active: true,
    last_latitude: -23.9618,
    last_longitude: -46.3322,
    last_location_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Marcos Ciclista',
    phone: '(13) 99222-3333',
    pin_code: '1234',
    vehicle_type: 'bicycle',
    vehicle_plate: null,
    availability_status: 'available',
    is_active: true,
    last_latitude: -23.9580,
    last_longitude: -46.3300,
    last_location_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Rafael Santos',
    phone: '(13) 99333-4444',
    pin_code: '1234',
    vehicle_type: 'motorcycle',
    vehicle_plate: 'SPO4F88',
    availability_status: 'available',
    is_active: true,
    last_latitude: -23.9650,
    last_longitude: -46.3350,
    last_location_at: new Date().toISOString(),
  }
];
let memoryDrivers = [...DEFAULT_DRIVERS];
let memoryAssignments: any[] = [];

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  return digits;
}

function generateRandomToken(): string {
  return 'tok_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // GET: Listar Pedidos, Rastrear Pedido Individual ou Consulta de Entregas
  if (req.method === 'GET') {
    try {
      const type = req.query?.type;

      // 1. Consulta de entregadores
      if (type === 'drivers' || type === 'delivery_drivers') {
        if (supabase) {
          try {
            const { data } = await supabase
              .from('delivery_drivers')
              .select('id, name, phone, photo_url, vehicle_type, vehicle_plate, availability_status, is_active, last_latitude, last_longitude, last_accuracy, last_location_at')
              .eq('is_active', true)
              .order('name', { ascending: true });
            if (data && data.length > 0) return res.status(200).json({ success: true, drivers: data });
          } catch {}
        }
        return res.status(200).json({ success: true, drivers: memoryDrivers });
      }

      // 2. Consulta de atribuições / ofertas de entrega
      if (type === 'assignments' || type === 'delivery_assignments' || type === 'assign') {
        const driverId = req.query?.driverId;
        const orderNum = req.query?.orderNumber;
        if (supabase) {
          try {
            let query = supabase
              .from('delivery_assignments')
              .select('*, driver:delivery_drivers(*), order:orders(*)')
              .order('created_at', { ascending: false });
            if (orderNum) query = query.eq('order_number', orderNum);
            else if (driverId) query = query.or(`driver_id.eq.${driverId},status.eq.offered`);
            const { data } = await query;
            if (data) return res.status(200).json({ success: true, assignments: data });
          } catch {}
        }
        let filtered = memoryAssignments;
        if (orderNum) filtered = filtered.filter(a => a.order_number === orderNum);
        else if (driverId) filtered = filtered.filter(a => a.driver_id === driverId || a.status === 'offered');
        return res.status(200).json({ success: true, assignments: filtered });
      }

      // 3. Consulta de localização de entregador
      if (type === 'location' || type === 'driver_location') {
        const orderNum = req.query?.orderNumber;
        const driverId = req.query?.driverId;
        if (supabase) {
          try {
            let targetDriverId = driverId;
            if (orderNum && !targetDriverId) {
              const { data: assign } = await supabase
                .from('delivery_assignments')
                .select('driver_id, status')
                .eq('order_number', orderNum)
                .not('status', 'eq', 'cancelled')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (assign && assign.driver_id) targetDriverId = assign.driver_id;
            }
            if (targetDriverId) {
              const { data: driver } = await supabase
                .from('delivery_drivers')
                .select('id, name, vehicle_type, vehicle_plate, last_latitude, last_longitude, last_accuracy, last_location_at, availability_status')
                .eq('id', targetDriverId)
                .maybeSingle();
              if (driver) {
                return res.status(200).json({
                  success: true,
                  location: {
                    driverId: driver.id,
                    name: driver.name,
                    vehicleType: driver.vehicle_type,
                    vehiclePlate: driver.vehicle_plate,
                    latitude: driver.last_latitude,
                    longitude: driver.last_longitude,
                    accuracy: driver.last_accuracy,
                    recordedAt: driver.last_location_at,
                    isLive: driver.last_location_at ? (Date.now() - new Date(driver.last_location_at).getTime()) < 120000 : false,
                  }
                });
              }
            }
          } catch {}
        }
        return res.status(200).json({ success: true, location: null });
      }

      const orderNumber = req.query?.orderNumber || req.query?.orderId;
      const token = req.query?.token;
      const statusFilter = req.query?.status;
      const includeArchived = req.query?.includeArchived === 'true';
      const includeDeleted = req.query?.includeDeleted === 'true';
      const deletedOnly = req.query?.deletedOnly === 'true';

      // Se for consulta de rastreamento de pedido individual
      if (orderNumber) {
        const order = await getOrder(orderNumber);
        if (order) {
          const isAuthorized = !order.access_token || !token || order.access_token === token;
          const sanitizedOrder = {
            id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_phone: isAuthorized ? order.customer_phone : '***',
            fulfillment_type: order.fulfillment_type,
            street: isAuthorized ? order.street : undefined,
            number: isAuthorized ? order.number : undefined,
            neighborhood: order.neighborhood,
            complement: isAuthorized ? order.complement : undefined,
            items: order.items,
            subtotal: order.subtotal,
            delivery_fee: order.delivery_fee,
            total: order.total,
            payment_method: order.payment_method,
            status: order.status,
            notes: isAuthorized ? order.notes : undefined,
            cancellation_reason: order.cancellation_reason,
            created_at: order.created_at,
            updated_at: order.updated_at,
            completed_at: order.completed_at,
          };

          let history: any[] = [];
          let notifications: any[] = [];
          if (supabase && order.id) {
            try {
              const { data: hData } = await supabase
                .from('order_status_history')
                .select('*')
                .eq('order_id', order.id)
                .order('created_at', { ascending: true });
              if (hData) history = hData;

              const { data: nData } = await supabase
                .from('order_notifications')
                .select('*')
                .eq('order_id', order.id)
                .order('created_at', { ascending: false });
              if (nData) notifications = nData;
            } catch {}
          }

          return res.status(200).json({
            success: true,
            order: sanitizedOrder,
            history,
            notifications,
            isAuthorized,
          });
        }

        return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
      }

      // Consulta de todos os pedidos com fonte única
      const orders = await listAllOrders({ includeArchived, includeDeleted, deletedOnly, statusFilter });
      return res.status(200).json({ success: true, orders });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  }

  // POST: Criar e Recalcular Pedido Oficial ou Ações de Entrega / Gestão
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      const action = body?.action || req.query?.action || body?.type;

      // 1. Login do Entregador
      if (action === 'driver_login' || action === 'login') {
        const cleanPhone = normalizePhone(body?.phone);
        const pinCode = String(body?.pin || '').trim();
        if (supabase) {
          try {
            const { data: drivers } = await supabase.from('delivery_drivers').select('*').eq('is_active', true);
            const found = drivers?.find(d => normalizePhone(d.phone) === cleanPhone || d.phone === body?.phone);
            if (found) {
              if (found.pin_code && found.pin_code !== pinCode) return res.status(401).json({ error: 'PIN incorreto' });
              return res.status(200).json({
                success: true,
                driver: {
                  id: found.id,
                  name: found.name,
                  phone: found.phone,
                  vehicle_type: found.vehicle_type,
                  vehicle_plate: found.vehicle_plate,
                  availability_status: found.availability_status,
                },
                token: `drv_tok_${found.id}_${Date.now()}`,
              });
            }
          } catch {}
        }
        const mem = memoryDrivers.find(d => normalizePhone(d.phone) === cleanPhone || d.phone === body?.phone);
        if (mem) {
          if (mem.pin_code && mem.pin_code !== pinCode) return res.status(401).json({ error: 'PIN incorreto' });
          return res.status(200).json({ success: true, driver: mem, token: `drv_tok_${mem.id}_${Date.now()}` });
        }
        return res.status(404).json({ error: 'Entregador não encontrado' });
      }

      // 2. Toggle Disponibilidade do Entregador
      if (action === 'toggle_driver_availability' || action === 'toggle_availability') {
        const { driverId, availabilityStatus } = body;
        if (supabase) {
          try {
            const { data } = await supabase
              .from('delivery_drivers')
              .update({ availability_status: availabilityStatus, updated_at: now })
              .eq('id', driverId)
              .select()
              .single();
            if (data) return res.status(200).json({ success: true, driver: data });
          } catch {}
        }
        const mem = memoryDrivers.find(d => d.id === driverId);
        if (mem) {
          mem.availability_status = availabilityStatus;
          return res.status(200).json({ success: true, driver: mem });
        }
        return res.status(200).json({ success: true, driverId, availabilityStatus });
      }

      // 3. Criar Oferta de Entrega
      if (action === 'create_delivery_offer' || action === 'create_offer') {
        const { orderNumber, orderId, deliveryFee = 5.00 } = body;
        if (supabase) {
          try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId || '');
            const { data: newAssign } = await supabase
              .from('delivery_assignments')
              .insert({
                order_id: isUuid ? orderId : null,
                order_number: orderNumber,
                driver_id: null,
                status: 'offered',
                delivery_fee: Number(deliveryFee),
                offered_at: now,
              })
              .select()
              .single();
            if (newAssign) return res.status(201).json({ success: true, assignment: newAssign });
          } catch {}
        }
        const memOffer = {
          id: `asg_${Date.now()}`,
          order_number: orderNumber,
          driver_id: null,
          status: 'offered',
          delivery_fee: Number(deliveryFee),
          offered_at: now,
        };
        memoryAssignments.unshift(memOffer);
        return res.status(201).json({ success: true, assignment: memOffer });
      }

      // 4. Aceitar Oferta de Entrega
      if (action === 'accept_delivery_offer' || action === 'accept_offer') {
        const { driverId, assignmentId, orderNumber } = body;
        if (supabase) {
          try {
            let q = supabase
              .from('delivery_assignments')
              .update({ driver_id: driverId, status: 'accepted', accepted_at: now, updated_at: now })
              .eq('status', 'offered');
            if (assignmentId) q = q.eq('id', assignmentId);
            else q = q.eq('order_number', orderNumber);

            const { data: accepted } = await q.select('*, driver:delivery_drivers(*)').maybeSingle();
            if (accepted) {
              await supabase.from('delivery_drivers').update({ availability_status: 'busy', updated_at: now }).eq('id', driverId);
              return res.status(200).json({ success: true, assignment: accepted });
            }
          } catch {}
        }
        const mem = memoryAssignments.find(a => (a.id === assignmentId || a.order_number === orderNumber) && a.status === 'offered');
        if (mem) {
          mem.driver_id = driverId;
          mem.status = 'accepted';
          mem.accepted_at = now;
          return res.status(200).json({ success: true, assignment: mem });
        }
        return res.status(409).json({ error: 'Corrida não mais disponível' });
      }

      // 5. Atualizar Status de Entrega
      if (action === 'update_delivery_status') {
        const { assignmentId, orderNumber, driverId, status, reason } = body;
        const updatePayload: any = { status, updated_at: now };
        if (status === 'picked_up') updatePayload.picked_up_at = now;
        if (status === 'in_transit') updatePayload.started_delivery_at = now;
        if (status === 'delivered') updatePayload.delivered_at = now;
        if (status === 'cancelled' || status === 'problem') updatePayload.cancellation_reason = reason;

        if (supabase) {
          try {
            let q = supabase.from('delivery_assignments').update(updatePayload);
            if (assignmentId) q = q.eq('id', assignmentId);
            else q = q.eq('order_number', orderNumber);
            const { data } = await q.select('*, driver:delivery_drivers(*)').maybeSingle();

            if (orderNumber) {
              if (status === 'picked_up' || status === 'in_transit') {
                await updateOrderStatusDb(orderNumber, 'delivering', reason, 'driver');
              } else if (status === 'delivered') {
                await updateOrderStatusDb(orderNumber, 'done', reason, 'driver');
                if (driverId) {
                  await supabase.from('delivery_drivers').update({ availability_status: 'available', updated_at: now }).eq('id', driverId);
                }
              }
            }
            return res.status(200).json({ success: true, assignment: data });
          } catch {}
        }
        return res.status(200).json({ success: true, status, assignmentId, orderNumber });
      }

      // 6. Atualizar GPS do Entregador
      if (action === 'update_driver_location' || action === 'update_location') {
        const { driverId, latitude, longitude, accuracy } = body;
        const lat = Number(latitude);
        const lng = Number(longitude);
        const acc = accuracy ? Number(accuracy) : null;
        if (supabase) {
          try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId || '');
            if (isUuid) {
              await supabase
                .from('delivery_drivers')
                .update({
                  last_latitude: lat,
                  last_longitude: lng,
                  last_accuracy: acc,
                  last_location_at: now,
                  updated_at: now,
                })
                .eq('id', driverId);
            }
            return res.status(200).json({ success: true, latitude: lat, longitude: lng, recordedAt: now });
          } catch {}
        }
        return res.status(200).json({ success: true, latitude: lat, longitude: lng, recordedAt: now });
      }

      // 7. Ações de Gestão de Pedidos
      if (action === 'update_status') {
        const { orderId, orderNumber, status, reason, changedBy = 'admin' } = body;
        const targetId = orderId || orderNumber;
        const updated = await updateOrderStatusDb(targetId, status, reason, changedBy);
        return res.status(200).json({ success: true, order: updated });
      }

      if (action === 'delete') {
        const { orderId, orderNumber, reason, adminEmail } = body;
        const targetId = orderId || orderNumber;
        const ok = await softDeleteOrderDb(targetId, reason, adminEmail);
        return res.status(200).json({ success: ok });
      }

      if (action === 'restore') {
        const { orderId, orderNumber, adminEmail } = body;
        const targetId = orderId || orderNumber;
        const ok = await restoreOrderDb(targetId, adminEmail);
        return res.status(200).json({ success: ok });
      }

      if (action === 'hard_delete') {
        const { orderId, orderNumber, adminEmail } = body;
        const targetId = orderId || orderNumber;
        const ok = await hardDeleteOrderDb(targetId, adminEmail);
        return res.status(200).json({ success: ok });
      }

      if (action === 'archive' || action === 'unarchive') {
        const { orderId, orderNumber, adminEmail } = body;
        const targetId = orderId || orderNumber;
        const ok = await archiveOrderDb(targetId, action === 'archive', adminEmail);
        return res.status(200).json({ success: ok });
      }

      if (action === 'update_notes') {
        const { orderId, orderNumber, notes } = body;
        const targetId = orderId || orderNumber;
        const ok = await updateInternalNotesDb(targetId, notes);
        return res.status(200).json({ success: ok });
      }

      // 8. Criação de Pedido
      console.log(`[API/orders] [${now}] Requisição de criação de pedido recebida.`);
      if (!body || !body.customerName || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        console.warn('[API/orders] Rejeitado: Dados incompletos ou carrinho vazio.');
        return res.status(400).json({
          success: false,
          error: 'Dados do pedido incompletos ou carrinho vazio.',
        });
      }

      // Validar estritamente se a loja está aberta (Backend Enforcement)
      const storeOpen = await isStoreOpenDb();
      console.log(`[API/orders] Status da loja: ${storeOpen ? 'ABERTA' : 'FECHADA'}`);
      if (!storeOpen) {
        return res.status(409).json({
          success: false,
          code: 'STORE_CLOSED',
          message: 'A loja está fechada e não está recebendo pedidos.',
        });
      }

      // 8.1 Verificação de Idempotência (Prevenção de duplicidade por duplo clique)
      const idempotencyKey = body.idempotencyKey || body.clientOrderId;
      if (idempotencyKey) {
        const all = await listAllOrders({ includeArchived: true, includeDeleted: false });
        const existing = all.find(o => (o as any).idempotency_key === idempotencyKey);
        if (existing) {
          console.log(`[API/orders] Idempotência acionada para chave: ${idempotencyKey} -> Pedido #${existing.order_number}`);
          return res.status(200).json({
            success: true,
            orderNumber: existing.order_number,
            orderId: existing.id || existing.order_number,
            accessToken: existing.access_token,
            status: existing.status,
            message: 'Pedido já recebido e processado.',
          });
        }
      }

      // Buscar catálogo atualizado do Supabase
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

      // Recalcular e validar cada produto
      let calculatedSubtotal = 0;
      const parsedItems = body.items.map((item: any) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const prodId = item.productId || item.id || '';
        const prodName = String(item.name || 'Produto');
        const sizeStr = item.size ? String(item.size).trim() : undefined;

        let officialUnitPrice = Number(item.unitPrice) || 0;

        if (dbProductsMap[prodId]) {
          const dbProd = dbProductsMap[prodId];
          officialUnitPrice = Number(dbProd.promotional_price || dbProd.price) || officialUnitPrice;
        } else {
          const catalogItem = DEFAULT_CATALOG[prodId] || Object.entries(DEFAULT_CATALOG).find(([k]) => prodName.toLowerCase().includes(k.replace('prod_', '').replace('combo_', '').replace(/_/g, ' ')))?.[1];
          if (catalogItem) {
            if (sizeStr && catalogItem.sizes && catalogItem.sizes[sizeStr]) {
              officialUnitPrice = catalogItem.sizes[sizeStr];
            } else {
              officialUnitPrice = catalogItem.promoPrice || catalogItem.basePrice;
            }
          }
        }

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
      // Geração estrita do número do pedido no backend (PED-XXXX)
      const orderNumber = `PED-${Math.floor(1000 + Math.random() * 9000)}`;
      const accessToken = generateRandomToken();
      const rawPhone = body.customerPhone ? String(body.customerPhone).trim() : null;
      const normalized = rawPhone ? normalizePhone(rawPhone) : null;

      console.log(`[API/orders] Pedido validado: cliente="${body.customerName}", modalidade=${fulfillmentType}, itens=${parsedItems.length}, total=R$ ${total.toFixed(2)}`);

      const orderData: DbOrder = {
        order_number: orderNumber,
        access_token: accessToken,
        customer_name: String(body.customerName).trim(),
        customer_phone: rawPhone || undefined,
        fulfillment_type: fulfillmentType,
        street: body.street || body.address?.street || undefined,
        number: body.number || body.address?.number || undefined,
        neighborhood: body.neighborhood || body.address?.neighborhood || undefined,
        complement: body.complement || body.address?.complement || undefined,
        items: parsedItems,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        total,
        payment_method: body.paymentMethod || 'delivery',
        status: 'new',
        notes: body.notes || body.generalNotes || undefined,
        is_archived: false,
        idempotency_key: idempotencyKey || undefined,
      };

      // Atualizar Cliente
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

      // Inserir Pedido usando o serviço unificado de banco
      console.log(`[API/orders] Gravando pedido #${orderNumber} no banco...`);
      const savedOrder = await insertOrder(orderData);
      console.log(`[API/orders] ✅ Pedido #${savedOrder.order_number} gravado com sucesso! ID: ${savedOrder.id}`);

      return res.status(201).json({
        success: true,
        order: {
          ...savedOrder,
          id: savedOrder.id || savedOrder.order_number,
          orderNumber: savedOrder.order_number,
          status: savedOrder.status || 'new',
        },
        orderId: savedOrder.id || savedOrder.order_number,
        orderNumber: savedOrder.order_number,
        accessToken: savedOrder.access_token,
        trackingUrl: `/pedido/${savedOrder.order_number}?token=${savedOrder.access_token}`,
        total: savedOrder.total,
        status: savedOrder.status,
      });
    } catch (err: any) {
      console.error('[API/orders] ❌ Erro interno ao gravar pedido:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao processar pedido.',
        details: err?.message,
      });
    }
  }

  // PATCH: Atualização atômica de pedidos
  if (req.method === 'PATCH') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }

      const { orderId, orderNumber, status, internalNotes, isArchived, cancellationReason, changedBy = 'admin' } = body || {};
      const orderIdentifier = orderId || orderNumber;

      if (!orderIdentifier) {
        return res.status(400).json({ error: 'orderId ou orderNumber é obrigatório' });
      }

      let updated: any = null;
      if (status) {
        updated = await updateOrderStatusDb(orderIdentifier, status, cancellationReason, changedBy);
      }
      if (internalNotes !== undefined) {
        await updateInternalNotesDb(orderIdentifier, internalNotes);
      }
      if (isArchived !== undefined) {
        await archiveOrderDb(orderIdentifier, isArchived, changedBy);
      }

      return res.status(200).json({ success: true, order: updated || { id: orderIdentifier, status } });
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro ao atualizar pedido', message: err?.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
