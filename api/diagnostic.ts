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
    if (hasSupabase) {
      try {
        const { error } = await supabase.from('orders').select('id').limit(1);
        dbStatus = error ? 'erro_tabela' : 'conectado';
      } catch (e) {
        dbStatus = 'erro_conexao';
      }
    }

    const hasWhatsApp = !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    const hasEmail = !!(process.env.STORE_ALERT_EMAIL && process.env.RESEND_API_KEY);
    const hasMercadoPago = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const recentOrders = await listOrders();
    const lastOrder = recentOrders.length > 0 ? recentOrders[0] : null;
    const lastErrorOrder = recentOrders.find(o => o.last_notification_error);

    return res.status(200).json({
      success: true,
      diagnostics: {
        database: {
          status: dbStatus,
          provider: hasSupabase ? 'Supabase PostgreSQL' : 'Armazenamento em Memória (Fallback)',
        },
        realtime: {
          status: hasSupabase ? 'conectado' : 'polling_ativo',
          channel: 'orders_realtime_broadcast',
        },
        whatsapp: {
          status: hasWhatsApp ? 'configurado' : 'nao_configurado',
          targetPhone: process.env.STORE_WHATSAPP_NUMBER || '5513991509733',
        },
        push: {
          status: 'ativo',
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
          status: lastOrder.order_status,
          total: lastOrder.total,
        } : null,
        lastNotificationError: lastErrorOrder ? {
          orderNumber: lastErrorOrder.order_number,
          error: lastErrorOrder.last_notification_error,
        } : null,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter diagnósticos', message: err?.message });
  }
}
