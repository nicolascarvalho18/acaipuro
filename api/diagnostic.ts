import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient, listOrders } from './_services/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabaseClient();
    const hasSupabase = !!supabase;
    
    let dbStatus = 'desconectado';
    let dbError = null;
    if (hasSupabase && supabase) {
      try {
        const { data, error } = await supabase.from('orders').select('id, order_number, status').limit(5);
        if (error) {
          dbStatus = 'erro_tabela';
          dbError = error.message;
        } else {
          dbStatus = 'conectado';
        }
      } catch (e: any) {
        dbStatus = 'erro_conexao';
        dbError = e?.message;
      }
    }

    const hasWhatsApp = !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    const hasEmail = !!(process.env.STORE_ALERT_EMAIL && process.env.RESEND_API_KEY);
    const hasMercadoPago = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const recentOrders = await listOrders();
    const lastOrder = recentOrders.length > 0 ? recentOrders[0] : null;

    return res.status(200).json({
      success: true,
      diagnostics: {
        database: {
          status: dbStatus,
          provider: hasSupabase ? 'Supabase PostgreSQL' : 'Armazenamento em Memória (Fallback)',
          error: dbError,
          supabaseUrlConfigured: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
          supabaseKeyConfigured: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        },
        realtime: {
          status: hasSupabase ? 'conectado' : 'polling_ativo',
          channel: 'orders_realtime_broadcast',
        },
        whatsapp: {
          status: hasWhatsApp ? 'configurado' : 'nao_configurado',
          targetPhone: process.env.STORE_WHATSAPP_NUMBER || '5513991509733',
        },
        email: {
          status: hasEmail ? 'configurado' : 'nao_configurado',
        },
        mercadopago: {
          status: hasMercadoPago ? 'configurado' : 'nao_configurado',
        },
        lastOrderReceived: lastOrder ? {
          orderNumber: lastOrder.order_number,
          createdAt: lastOrder.created_at,
          status: lastOrder.status,
          total: lastOrder.total,
        } : null,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter diagnósticos', message: err?.message });
  }
}
