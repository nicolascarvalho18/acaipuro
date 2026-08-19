import { DbOrder, updateNotificationResults } from './db';
import { buildStoreNotificationMessage } from './whatsapp';

/**
 * Dispara todas as notificações em segundo plano (WhatsApp, Push, E-mail)
 * Não bloqueia a resposta do pedido para o cliente.
 */
export async function dispatchAllBackgroundNotifications(order: DbOrder): Promise<void> {
  const orderIdentifier = order.id || order.order_number;
  console.log(`[Notifications] Starting background dispatch for order ${order.order_number}...`);

  let whatsappStatus: DbOrder['whatsapp_status'] = 'pending';
  let pushStatus: DbOrder['push_status'] = 'pending';
  let emailStatus: DbOrder['email_status'] = 'pending';
  let lastError: string | undefined = undefined;

  // 1. WHATSAPP BUSINESS CLOUD API (META)
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const storePhone = process.env.STORE_WHATSAPP_NUMBER || '5513991509733';

  if (!token || !phoneNumberId || token.trim() === '' || phoneNumberId.trim() === '') {
    console.log('[WhatsApp] WhatsApp Cloud API credentials not configured.');
    whatsappStatus = 'not_configured';
  } else {
    try {
      const formattedRecipient = storePhone.replace(/\D/g, '');
      const messageText = buildStoreNotificationMessage(order);

      const sendWhatsApp = async () => {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId.trim()}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedRecipient,
              type: 'text',
              text: { preview_url: false, body: messageText },
            }),
          }
        );
        return response;
      };

      let resp = await sendWhatsApp();

      // Se falhar na primeira tentativa, tenta novamente após 2 segundos
      if (!resp.ok) {
        console.warn('[WhatsApp] First attempt failed, retrying in 2s...');
        await new Promise(r => setTimeout(r, 2000));
        resp = await sendWhatsApp();
      }

      if (resp.ok) {
        const resData = await resp.json();
        console.log('[WhatsApp] Notification sent successfully:', resData);
        whatsappStatus = 'sent';
      } else {
        const errData = await resp.json();
        console.error('[WhatsApp] Meta API Error:', errData);
        whatsappStatus = 'failed';
        lastError = errData.error?.message || 'Erro na API do WhatsApp Meta';
      }
    } catch (err: any) {
      console.error('[WhatsApp] Network Error:', err);
      whatsappStatus = 'failed';
      lastError = err?.message;
    }
  }

  // 2. E-MAIL DE EMERGÊNCIA (FALLBACK)
  const emailRecipient = process.env.STORE_ALERT_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!emailRecipient || !resendApiKey) {
    emailStatus = 'not_configured';
  } else {
    try {
      const emailResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Açaí Puro Sabor <pedidos@acaipuro.com.br>',
          to: [emailRecipient.trim()],
          subject: `Novo pedido #${order.order_number} — Açaí Puro Sabor`,
          text: buildStoreNotificationMessage(order),
        }),
      });

      if (emailResp.ok) {
        console.log('[Email] Fallback alert email sent.');
        emailStatus = 'sent';
      } else {
        emailStatus = 'failed';
      }
    } catch (e: any) {
      console.error('[Email] Failed to send email alert:', e);
      emailStatus = 'failed';
    }
  }

  // 3. ATUALIZA RESULTADOS NO BANCO DE DADOS
  await updateNotificationResults(orderIdentifier, {
    whatsapp_status: whatsappStatus,
    push_status: pushStatus,
    email_status: emailStatus,
    last_notification_error: lastError,
  });

  console.log(`[Notifications] Finished background dispatch for order ${order.order_number}. WhatsApp: ${whatsappStatus}`);
}
