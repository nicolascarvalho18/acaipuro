import { supabase } from './supabaseClient';

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

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  return digits;
}

export async function fetchDeliveryDrivers() {
  // 1. Supabase direto
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('delivery_drivers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('[DeliveryService] Supabase fetchDeliveryDrivers error:', e);
    }
  }

  // 2. API Endpoints
  try {
    let res = await fetch('/api/orders/update-status?type=drivers');
    if (!res.ok) res = await fetch('/api/orders/delivery?type=drivers');
    if (res.ok) {
      const data = await res.json();
      if (data.drivers && data.drivers.length > 0) return data.drivers;
    }
  } catch (e) {
    console.warn('[DeliveryService] API fetchDeliveryDrivers error:', e);
  }

  return DEFAULT_DRIVERS;
}

export async function loginDriver(phone: string, pin: string) {
  const cleanPhone = normalizePhone(phone);
  const pinCode = String(pin || '').trim();

  // 1. Supabase direto
  if (supabase) {
    try {
      const { data: drivers, error } = await supabase
        .from('delivery_drivers')
        .select('*')
        .eq('is_active', true);

      if (!error && drivers) {
        const found = drivers.find(d => normalizePhone(d.phone) === cleanPhone || d.phone === phone);
        if (found) {
          if (found.pin_code && String(found.pin_code).trim() !== pinCode) {
            return { success: false, error: 'PIN incorreto' };
          }
          return {
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
          };
        }
      }
    } catch (e) {
      console.warn('[DeliveryService] Supabase login error:', e);
    }
  }

  // 2. API Endpoints
  const payload = { action: 'driver_login', phone, pin };
  try {
    let res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      res = await fetch('/api/orders/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[DeliveryService] API login error:', e);
  }

  // 3. Fallback em memória
  const mem = DEFAULT_DRIVERS.find(d => normalizePhone(d.phone) === cleanPhone || d.phone === phone);
  if (mem) {
    if (mem.pin_code && String(mem.pin_code).trim() !== pinCode) {
      return { success: false, error: 'PIN incorreto' };
    }
    return {
      success: true,
      driver: {
        id: mem.id,
        name: mem.name,
        phone: mem.phone,
        vehicle_type: mem.vehicle_type,
        vehicle_plate: mem.vehicle_plate,
        availability_status: mem.availability_status,
      },
      token: `drv_tok_${mem.id}_${Date.now()}`,
    };
  }

  return { success: false, error: 'Entregador não encontrado com este telefone' };
}

export async function fetchDriverAssignments(driverId?: string, orderNumber?: string) {
  if (supabase) {
    try {
      let query = supabase
        .from('delivery_assignments')
        .select('*, driver:delivery_drivers(*), order:orders(*)')
        .order('created_at', { ascending: false });

      if (orderNumber) {
        query = query.eq('order_number', orderNumber);
      } else if (driverId) {
        query = query.or(`driver_id.eq.${driverId},status.eq.offered`);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('[DeliveryService] Supabase fetchDriverAssignments error:', e);
    }
  }

  try {
    const params = new URLSearchParams();
    params.set('type', 'assignments');
    if (driverId) params.set('driverId', driverId);
    if (orderNumber) params.set('orderNumber', orderNumber);

    let res = await fetch(`/api/orders/update-status?${params.toString()}`);
    if (!res.ok) res = await fetch(`/api/orders/delivery?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.assignments || [];
    }
  } catch (e) {
    console.warn('[DeliveryService] API fetchDriverAssignments error:', e);
  }

  return [];
}

export async function createDeliveryOffer(orderNumber: string, orderId?: string, deliveryFee: number = 5.0) {
  const now = new Date().toISOString();
  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId || '');
      const { data, error } = await supabase
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
      if (!error && data) {
        return { success: true, assignment: data };
      }
    } catch (e) {
      console.warn('[DeliveryService] Supabase createOffer error:', e);
    }
  }

  const payload = { action: 'create_delivery_offer', orderNumber, orderId, deliveryFee };
  try {
    let res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {}

  return {
    success: true,
    assignment: {
      id: `asg_${Date.now()}`,
      order_number: orderNumber,
      driver_id: null,
      status: 'offered',
      delivery_fee: deliveryFee,
      offered_at: now,
    }
  };
}

export async function acceptDeliveryOffer(driverId: string, assignmentId?: string, orderNumber?: string) {
  const now = new Date().toISOString();
  if (supabase) {
    try {
      let q = supabase
        .from('delivery_assignments')
        .update({ driver_id: driverId, status: 'accepted', accepted_at: now, updated_at: now })
        .eq('status', 'offered');
      if (assignmentId) q = q.eq('id', assignmentId);
      else if (orderNumber) q = q.eq('order_number', orderNumber);

      const { data, error } = await q.select('*, driver:delivery_drivers(*)').maybeSingle();
      if (!error && data) {
        await supabase.from('delivery_drivers').update({ availability_status: 'busy', updated_at: now }).eq('id', driverId);
        return { success: true, assignment: data };
      }
    } catch (e) {
      console.warn('[DeliveryService] Supabase acceptOffer error:', e);
    }
  }

  const payload = { action: 'accept_delivery_offer', driverId, assignmentId, orderNumber };
  try {
    let res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {}

  return {
    success: true,
    assignment: {
      id: assignmentId || `asg_${Date.now()}`,
      order_number: orderNumber,
      driver_id: driverId,
      status: 'accepted',
      accepted_at: now,
    }
  };
}

export async function sendDriverLocation(driverId: string, lat: number, lng: number, accuracy?: number, assignmentId?: string) {
  const now = new Date().toISOString();
  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId);
      if (isUuid) {
        await supabase
          .from('delivery_drivers')
          .update({
            last_latitude: lat,
            last_longitude: lng,
            last_accuracy: accuracy || null,
            last_location_at: now,
            updated_at: now,
          })
          .eq('id', driverId);
      }
    } catch (e) {
      console.warn('[DeliveryService] Supabase sendLocation error:', e);
    }
  }

  const payload = {
    action: 'update_driver_location',
    driverId,
    assignmentId,
    latitude: lat,
    longitude: lng,
    accuracy,
  };

  try {
    await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return true;
  }
}

export async function getDriverLocation(orderNumber: string) {
  if (supabase) {
    try {
      const { data: assign } = await supabase
        .from('delivery_assignments')
        .select('driver_id, status')
        .eq('order_number', orderNumber)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assign && assign.driver_id) {
        const { data: driver } = await supabase
          .from('delivery_drivers')
          .select('id, name, vehicle_type, vehicle_plate, last_latitude, last_longitude, last_accuracy, last_location_at, availability_status')
          .eq('id', assign.driver_id)
          .maybeSingle();

        if (driver) {
          return {
            driverId: driver.id,
            name: driver.name,
            vehicleType: driver.vehicle_type,
            vehiclePlate: driver.vehicle_plate,
            latitude: driver.last_latitude,
            longitude: driver.last_longitude,
            accuracy: driver.last_accuracy,
            recordedAt: driver.last_location_at,
            isLive: driver.last_location_at ? (Date.now() - new Date(driver.last_location_at).getTime()) < 120000 : false,
          };
        }
      }
    } catch (e) {
      console.warn('[DeliveryService] Supabase getDriverLocation error:', e);
    }
  }

  try {
    let res = await fetch(`/api/orders/update-status?type=location&orderNumber=${encodeURIComponent(orderNumber)}`);
    if (res.ok) {
      const data = await res.json();
      return data.location || null;
    }
  } catch {}

  return null;
}

export async function updateDeliveryStatus(assignmentId?: string, orderNumber?: string, driverId?: string, status?: string, reason?: string) {
  const now = new Date().toISOString();
  if (supabase) {
    try {
      const updatePayload: any = { status, updated_at: now };
      if (status === 'picked_up') updatePayload.picked_up_at = now;
      if (status === 'in_transit') updatePayload.started_delivery_at = now;
      if (status === 'delivered') updatePayload.delivered_at = now;
      if (status === 'cancelled' || status === 'problem') updatePayload.cancellation_reason = reason;

      let q = supabase.from('delivery_assignments').update(updatePayload);
      if (assignmentId) q = q.eq('id', assignmentId);
      else if (orderNumber) q = q.eq('order_number', orderNumber);

      const { data } = await q.select('*, driver:delivery_drivers(*)').maybeSingle();

      if (orderNumber) {
        if (status === 'picked_up' || status === 'in_transit') {
          await supabase.from('orders').update({ status: 'delivering', updated_at: now }).eq('order_number', orderNumber);
        } else if (status === 'delivered') {
          await supabase.from('orders').update({ status: 'done', completed_at: now, updated_at: now }).eq('order_number', orderNumber);
          if (driverId) {
            await supabase.from('delivery_drivers').update({ availability_status: 'available', updated_at: now }).eq('id', driverId);
          }
        }
      }

      return { success: true, assignment: data };
    } catch (e) {
      console.warn('[DeliveryService] Supabase updateDeliveryStatus error:', e);
    }
  }

  const payload = {
    action: 'update_delivery_status',
    assignmentId,
    orderNumber,
    driverId,
    status,
    reason,
  };

  try {
    let res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch {}

  return { success: true, status, assignmentId, orderNumber };
}
