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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    if (!action || !orderId) {
      return res.status(400).json({ error: 'action e orderId são obrigatórios' });
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (!supabase) {
      return res.status(200).json({ success: true, action, orderId });
    }

    if (action === 'archive') {
      await supabase
        .from('orders')
        .update({ is_archived: true, updated_at: now })
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);

      await supabase.from('audit_logs').insert({
        user_email: adminEmail,
        action: 'Arquivamento de Pedido',
        entity: 'orders',
        entity_id: orderId,
        details: { action: 'archive' },
      });

      return res.status(200).json({ success: true, message: 'Pedido arquivado com sucesso' });
    }

    if (action === 'unarchive') {
      await supabase
        .from('orders')
        .update({ is_archived: false, updated_at: now })
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);

      return res.status(200).json({ success: true, message: 'Pedido desarquivado com sucesso' });
    }

    if (action === 'delete') {
      await supabase
        .from('orders')
        .update({
          deleted_at: now,
          deleted_by: adminEmail,
          updated_at: now,
        })
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);

      await supabase.from('audit_logs').insert({
        user_email: adminEmail,
        action: 'Exclusão Lógica de Pedido',
        entity: 'orders',
        entity_id: orderId,
        details: { action: 'soft_delete', deleted_by: adminEmail },
      });

      return res.status(200).json({ success: true, message: 'Pedido excluído logicamente' });
    }

    if (action === 'restore') {
      await supabase
        .from('orders')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: now,
        })
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);

      await supabase.from('audit_logs').insert({
        user_email: adminEmail,
        action: 'Restauração de Pedido Excluído',
        entity: 'orders',
        entity_id: orderId,
        details: { action: 'restore' },
      });

      return res.status(200).json({ success: true, message: 'Pedido restaurado com sucesso' });
    }

    if (action === 'update_notes') {
      await supabase
        .from('orders')
        .update({
          internal_notes: notes || null,
          updated_at: now,
        })
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);

      return res.status(200).json({ success: true, message: 'Observações internas salvas' });
    }

    return res.status(400).json({ error: 'Ação não reconhecida' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerenciar pedido', message: err?.message });
  }
}
