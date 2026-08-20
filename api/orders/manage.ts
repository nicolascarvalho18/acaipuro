import { createClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(str?: string): boolean {
  if (!str) return false;
  return UUID_REGEX.test(String(str).trim());
}

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  return digits;
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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

  // GET: Consulta de Entregadores, Corridas e Localização
  if (req.method === 'GET') {
    const type = req.query?.type;

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

    return res.status(200).json({ success: true, message: 'Manage endpoint active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { action, orderId, adminEmail = 'admin@acaipuro.com.br', notes } = body || {};

    // 1. Driver Login
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

    // 2. Toggle Driver Availability
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

    // 3. Create Delivery Offer
    if (action === 'create_delivery_offer' || action === 'create_offer') {
      const { orderNumber, deliveryFee = 5.00 } = body;
      const orderIdentifier = orderId || orderNumber;
      if (supabase) {
        try {
          const isUuid = isUUID(orderIdentifier);
          const { data: newAssign } = await supabase
            .from('delivery_assignments')
            .insert({
              order_id: isUuid ? orderIdentifier : null,
              order_number: orderNumber || orderIdentifier,
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
        order_number: orderNumber || orderIdentifier,
        driver_id: null,
        status: 'offered',
        delivery_fee: Number(deliveryFee),
        offered_at: now,
      };
      memoryAssignments.unshift(memOffer);
      return res.status(201).json({ success: true, assignment: memOffer });
    }

    // 4. Accept Delivery Offer
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

    // 5. Update Delivery Status
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

    // 6. Update Driver Location
    if (action === 'update_driver_location' || action === 'update_location') {
      const { driverId, latitude, longitude, accuracy } = body;
      const lat = Number(latitude);
      const lng = Number(longitude);
      const acc = accuracy ? Number(accuracy) : null;
      if (supabase) {
        try {
          const isUuid = isUUID(driverId);
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

    if (!action || !orderId) {
      return res.status(400).json({ error: 'action e orderId são obrigatórios' });
    }

    const isIdUuid = isUUID(orderId);
    if (!supabase) {
      return res.status(200).json({ success: true, action, orderId });
    }

    const applyOrderFilter = (query: any) => {
      return isIdUuid ? query.eq('id', orderId) : query.eq('order_number', orderId);
    };

    if (action === 'archive') {
      await applyOrderFilter(supabase.from('orders').update({ is_archived: true, updated_at: now }));
      try {
        await supabase.from('audit_logs').insert({
          user_email: adminEmail,
          action: 'Arquivamento de Pedido',
          entity: 'orders',
          entity_id: orderId,
          details: { action: 'archive' },
        });
      } catch {}
      return res.status(200).json({ success: true, message: 'Pedido arquivado com sucesso' });
    }

    if (action === 'unarchive') {
      await applyOrderFilter(supabase.from('orders').update({ is_archived: false, updated_at: now }));
      return res.status(200).json({ success: true, message: 'Pedido desarquivado com sucesso' });
    }

    if (action === 'delete') {
      await applyOrderFilter(
        supabase.from('orders').update({
          deleted_at: now,
          deleted_by: adminEmail,
          updated_at: now,
        })
      );
      try {
        await supabase.from('audit_logs').insert({
          user_email: adminEmail,
          action: 'Exclusão Lógica de Pedido',
          entity: 'orders',
          entity_id: orderId,
          details: { action: 'soft_delete', deleted_by: adminEmail },
        });
      } catch {}
      return res.status(200).json({ success: true, message: 'Pedido excluído logicamente' });
    }

    if (action === 'restore') {
      await applyOrderFilter(
        supabase.from('orders').update({
          deleted_at: null,
          deleted_by: null,
          updated_at: now,
        })
      );
      try {
        await supabase.from('audit_logs').insert({
          user_email: adminEmail,
          action: 'Restauração de Pedido Excluído',
          entity: 'orders',
          entity_id: orderId,
          details: { action: 'restore' },
        });
      } catch {}
      return res.status(200).json({ success: true, message: 'Pedido restaurado com sucesso' });
    }

    if (action === 'update_notes') {
      await applyOrderFilter(
        supabase.from('orders').update({
          internal_notes: notes || null,
          updated_at: now,
        })
      );
      return res.status(200).json({ success: true, message: 'Observações internas salvas' });
    }

    return res.status(400).json({ error: 'Ação não reconhecida' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerenciar pedido', message: err?.message });
  }
}
