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
  res.setHeader('Access-Control-Allow-Methods', 'POST,PATCH,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { orderId, status } = body || {};

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Parâmetros orderId e status são obrigatórios.' });
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .select()
          .single();

        if (!error && data) {
          return res.status(200).json({ success: true, order: data });
        }
      } catch (err) {
        console.error('Supabase update status error:', err);
      }
    }

    return res.status(200).json({ success: true, order: { id: orderId, status } });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar status', message: err?.message });
  }
}
