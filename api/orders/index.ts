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

      // Se for consulta de rastreamento de pedido individual
      if (orderNumber) {
        if (supabase) {
          try {
            const { data: order, error } = await supabase
              .from('orders')
              .select('*')
              .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
              .single();

            if (!error && order) {
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

              // Buscar histórico e notificações se existirem
              let history: any[] = [];
              let notifications: any[] = [];
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

              return res.status(200).json({
                success: true,
                order: sanitizedOrder,
                history,
                notifications,
                isAuthorized,
              });
            }
          } catch (e) {
            console.warn('Supabase tracking lookup error:', e);
          }
        }

        const mem = memoryOrders.find(o => o.order_number === orderNumber || o.id === orderNumber);
        if (mem) {
          return res.status(200).json({
            success: true,
            order: mem,
            history: [],
            notifications: [],
            isAuthorized: true,
          });
        }

        return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
      }

      if (supabase) {
        try {
          let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

          if (!includeDeleted) {
            query = query.is('deleted_at', null);
          }

          if (!includeArchived && statusFilter !== 'archived') {
            query = query.eq('is_archived', false);
          } else if (statusFilter === 'archived') {
            query = query.eq('is_archived', true);
          }

          if (statusFilter && statusFilter !== 'all' && statusFilter !== 'archived') {
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

      let filtered = memoryOrders.filter(o => !o.deleted_at);
      if (!includeArchived) filtered = filtered.filter(o => !o.is_archived);
      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter);
      }

      return res.status(200).json({ success: true, orders: filtered });
    } catch {
      return res.status(200).json({ success: true, orders: memoryOrders });
    }
  }

  // POST: Criar e Recalcular Pedido Oficial ou Ações de Entrega
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

      // 5. Atualizar Status da Entrega
      if (action === 'update_delivery_status' || action === 'update_status') {
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

            if (status === 'picked_up' || status === 'in_transit') {
              await supabase.from('orders').update({ status: 'delivering', updated_at: now }).eq('order_number', orderNumber);
            } else if (status === 'delivered') {
              await supabase.from('orders').update({ status: 'done', completed_at: now, updated_at: now }).eq('order_number', orderNumber);
              if (driverId) {
                await supabase.from('delivery_drivers').update({ availability_status: 'available', updated_at: now }).eq('id', driverId);
              }
            }
            return res.status(200).json({ success: true, assignment: data });
          } catch {}
        }
        return res.status(200).json({ success: true, status, assignmentId, orderNumber });
      }

      // 6. Atualizar Localização GPS do Entregador
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
      const accessToken = generateRandomToken();
      const now = new Date().toISOString();
      const rawPhone = body.customerPhone ? String(body.customerPhone).trim() : null;
      const normalized = rawPhone ? normalizePhone(rawPhone) : null;

      const orderData = {
        order_number: orderNumber,
        access_token: accessToken,
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
        is_archived: false,
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
              access_token: orderData.access_token,
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
              is_archived: false,
            })
            .select()
            .single();

          if (!error && data) {
            // Inserir histórico inicial
            await supabase.from('order_status_history').insert({
              order_id: data.id,
              order_number: data.order_number,
              previous_status: null,
              new_status: 'new',
              changed_by: 'cliente',
              reason: 'Pedido finalizado pelo cliente no site',
              created_at: now,
            });

            // Inserir notificação inicial
            await supabase.from('order_notifications').insert({
              order_id: data.id,
              order_number: data.order_number,
              status: 'new',
              message: `Recebemos seu pedido #${data.order_number}. Em instantes vamos confirmar.`,
              channel: 'app_timeline',
              sent_at: now,
            });

            return res.status(201).json({
              success: true,
              orderId: data.id || data.order_number,
              orderNumber: data.order_number,
              accessToken: data.access_token,
              trackingUrl: `/pedido/${data.order_number}?token=${data.access_token}`,
              total: data.total,
              status: 'new',
              order: data,
            });
          }
        } catch (dbEx) {
          console.error('[Supabase Order Insert Exception]:', dbEx);
        }
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
        accessToken: memoryOrder.access_token,
        trackingUrl: `/pedido/${memoryOrder.order_number}?token=${memoryOrder.access_token}`,
        total: memoryOrder.total,
        status: 'new',
        order: memoryOrder,
      });

    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao salvar pedido.',
        message: err?.message,
      });
    }
  }

  // PATCH: Atualizar Pedido
  if (req.method === 'PATCH') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      const { orderId, status, cancellationReason, internalNotes, isArchived } = body || {};
      const orderIdentifier = orderId || body?.orderNumber || body?.id;

      if (!orderIdentifier) {
        return res.status(400).json({ error: 'orderId ou orderNumber é obrigatório' });
      }

      const now = new Date().toISOString();
      const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdentifier);

      const updateData: any = { updated_at: now };
      if (status) updateData.status = status;
      if (status === 'done') updateData.completed_at = now;
      if (status === 'cancelled' && cancellationReason) updateData.cancellation_reason = cancellationReason;
      if (internalNotes !== undefined) updateData.internal_notes = internalNotes;
      if (isArchived !== undefined) updateData.is_archived = isArchived;

      if (supabase) {
        try {
          let query = supabase.from('orders').update(updateData);
          if (isIdUuid) {
            query = query.eq('id', orderIdentifier);
          } else {
            query = query.eq('order_number', orderIdentifier);
          }

          const { data, error } = await query.select().maybeSingle();
          if (!error && data) {
            return res.status(200).json({ success: true, order: data });
          }
        } catch (e) {
          console.warn('[Supabase PATCH error]:', e);
        }
      }

      const mem = memoryOrders.find(o => o.id === orderIdentifier || o.order_number === orderIdentifier);
      if (mem) {
        Object.assign(mem, updateData);
        return res.status(200).json({ success: true, order: mem });
      }

      return res.status(200).json({ success: true, order: { id: orderIdentifier, ...updateData } });
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro ao atualizar pedido', message: err?.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
