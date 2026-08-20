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

// Mock fallback drivers in memory
let memoryDrivers = [
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

function normalizePhone(p: string): string {
  return String(p || '').replace(/\D/g, '');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient();

  // GET: Listar entregadores
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('delivery_drivers')
          .select('id, name, phone, photo_url, vehicle_type, vehicle_plate, availability_status, is_active, last_latitude, last_longitude, last_accuracy, last_location_at')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          return res.status(200).json({ success: true, drivers: data });
        }
      }

      return res.status(200).json({ success: true, drivers: memoryDrivers });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao listar entregadores', message: e?.message });
    }
  }

  // POST: Login / Autenticação do Entregador ou Alteração de Status
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }

      const { action, phone, pin, driverId, availabilityStatus } = body || {};

      // 1. Login do Entregador
      if (action === 'login') {
        const cleanPhone = normalizePhone(phone);
        const pinCode = String(pin || '').trim();

        if (!cleanPhone || !pinCode) {
          return res.status(400).json({ error: 'Telefone e PIN são obrigatórios' });
        }

        if (supabase) {
          try {
            const { data: drivers } = await supabase
              .from('delivery_drivers')
              .select('*')
              .eq('is_active', true);

            const found = drivers?.find(d => normalizePhone(d.phone) === cleanPhone || d.phone === phone);
            if (found) {
              if (found.pin_code && found.pin_code !== pinCode) {
                return res.status(401).json({ error: 'PIN incorreto' });
              }
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

        const mem = memoryDrivers.find(d => normalizePhone(d.phone) === cleanPhone || d.phone === phone);
        if (mem) {
          if (mem.pin_code && mem.pin_code !== pinCode) {
            return res.status(401).json({ error: 'PIN incorreto' });
          }
          return res.status(200).json({
            success: true,
            driver: mem,
            token: `drv_tok_${mem.id}_${Date.now()}`,
          });
        }

        return res.status(404).json({ error: 'Entregador não cadastrado. Verifique o telefone informado.' });
      }

      // 2. Alterar Disponibilidade (Ficar Disponível / Offline / Ocupado)
      if (action === 'toggle_availability') {
        if (!driverId || !availabilityStatus) {
          return res.status(400).json({ error: 'driverId e availabilityStatus são obrigatórios' });
        }

        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('delivery_drivers')
              .update({ availability_status: availabilityStatus, updated_at: new Date().toISOString() })
              .eq('id', driverId)
              .select()
              .single();

            if (!error && data) {
              return res.status(200).json({ success: true, driver: data });
            }
          } catch {}
        }

        const mem = memoryDrivers.find(d => d.id === driverId);
        if (mem) {
          mem.availability_status = availabilityStatus;
          return res.status(200).json({ success: true, driver: mem });
        }

        return res.status(200).json({ success: true, driverId, availabilityStatus });
      }

      return res.status(400).json({ error: 'Ação não reconhecida' });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro interno', message: e?.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
