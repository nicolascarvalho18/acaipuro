import { createClient } from '@supabase/supabase-js';

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

  // GET: Obter localização atual do entregador para um pedido
  if (req.method === 'GET') {
    try {
      const orderNumber = req.query?.orderNumber;
      const driverId = req.query?.driverId;
      const assignmentId = req.query?.assignmentId;

      if (!orderNumber && !driverId && !assignmentId) {
        return res.status(400).json({ error: 'orderNumber, driverId ou assignmentId é obrigatório' });
      }

      if (supabase) {
        try {
          let targetDriverId = driverId;

          // Se passar orderNumber, encontrar o driver_id correspondente
          if (orderNumber && !targetDriverId) {
            const { data: assign } = await supabase
              .from('delivery_assignments')
              .select('driver_id, status')
              .eq('order_number', orderNumber)
              .not('status', 'eq', 'cancelled')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (assign && assign.driver_id) {
              targetDriverId = assign.driver_id;
            }
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
        } catch (e) {
          console.warn('Supabase location query error:', e);
        }
      }

      return res.status(200).json({
        success: true,
        location: null,
        message: 'Localização ainda não disponível'
      });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao buscar localização', message: e?.message });
    }
  }

  // POST: Entregador envia coordenadas de GPS em tempo real
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }

      const { driverId, assignmentId, latitude, longitude, accuracy, speed, heading } = body || {};

      const lat = Number(latitude);
      const lng = Number(longitude);
      const acc = accuracy !== undefined ? Number(accuracy) : null;

      // Validação de coordenadas reais
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Coordenadas de geolocalização inválidas' });
      }

      // Descartar se a precisão for extremamente baixa (> 1000 metros)
      if (acc && acc > 1000) {
        return res.status(400).json({ error: 'Precisão do GPS muito baixa para rastreamento' });
      }

      if (supabase) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId || '');

          // 1. Atualizar última posição no registro do entregador
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

          // 2. Gravar no histórico de localizações se vinculado a uma corrida
          const isAssignUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentId || '');
          if (isAssignUuid && isUuid) {
            await supabase.from('delivery_locations').insert({
              assignment_id: assignmentId,
              driver_id: driverId,
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              speed: speed !== undefined ? Number(speed) : null,
              heading: heading !== undefined ? Number(heading) : null,
              recorded_at: now,
            });
          }

          return res.status(200).json({
            success: true,
            recordedAt: now,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
          });
        } catch (dbErr) {
          console.error('Supabase location insert error:', dbErr);
        }
      }

      return res.status(200).json({
        success: true,
        recordedAt: now,
        latitude: lat,
        longitude: lng,
      });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao processar localização', message: e?.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
