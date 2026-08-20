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

let memoryAssignments: any[] = [];

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

  // GET: Listar ofertas abertas ou corrida ativa de um entregador
  if (req.method === 'GET') {
    try {
      const driverId = req.query?.driverId;
      const orderNumber = req.query?.orderNumber;

      if (supabase) {
        try {
          let query = supabase
            .from('delivery_assignments')
            .select(`
              *,
              driver:delivery_drivers(*),
              order:orders(*)
            `)
            .order('created_at', { ascending: false });

          if (orderNumber) {
            query = query.eq('order_number', orderNumber);
          } else if (driverId) {
            // Buscar corrida ativa do entregador OU ofertas abertas
            query = query.or(`driver_id.eq.${driverId},status.eq.offered`);
          }

          const { data, error } = await query;
          if (!error && data) {
            return res.status(200).json({ success: true, assignments: data });
          }
        } catch (e) {
          console.warn('Supabase assignment query error:', e);
        }
      }

      let filtered = memoryAssignments;
      if (orderNumber) {
        filtered = filtered.filter(a => a.order_number === orderNumber);
      } else if (driverId) {
        filtered = filtered.filter(a => a.driver_id === driverId || a.status === 'offered');
      }

      return res.status(200).json({ success: true, assignments: filtered });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao buscar atribuições', message: e?.message });
    }
  }

  // POST: Ações de atribuição
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }

      const { action, orderId, orderNumber, driverId, deliveryFee = 5.00 } = body || {};

      // 1. Criar Oferta de Corrida (Despacho pela Loja)
      if (action === 'create_offer' || action === 'dispatch_broadcast') {
        if (!orderNumber) {
          return res.status(400).json({ error: 'orderNumber é obrigatório' });
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId || '');

        if (supabase) {
          try {
            // Verificar se já existe atribuição ativa para este pedido
            const { data: existing } = await supabase
              .from('delivery_assignments')
              .select('*')
              .eq('order_number', orderNumber)
              .not('status', 'eq', 'cancelled')
              .maybeSingle();

            if (existing) {
              return res.status(200).json({ success: true, assignment: existing, message: 'Oferta já ativa' });
            }

            const { data: newAssign, error } = await supabase
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

            if (!error && newAssign) {
              return res.status(201).json({ success: true, assignment: newAssign });
            }
          } catch (e) {
            console.warn('Supabase create_offer error:', e);
          }
        }

        const memOffer = {
          id: `asg_${Date.now()}`,
          order_id: orderId,
          order_number: orderNumber,
          driver_id: null,
          status: 'offered',
          delivery_fee: Number(deliveryFee),
          offered_at: now,
          created_at: now,
        };
        memoryAssignments.unshift(memOffer);

        return res.status(201).json({ success: true, assignment: memOffer });
      }

      // 2. Entregador Aceita a Corrida (Atomicidade para Evitar Conflito de 2 Aceites)
      if (action === 'accept_offer') {
        const assignmentId = body?.assignmentId;
        if (!driverId || (!assignmentId && !orderNumber)) {
          return res.status(400).json({ error: 'driverId e assignmentId ou orderNumber são obrigatórios' });
        }

        if (supabase) {
          try {
            // Busca atômica: aceita apenas se o status ainda for 'offered' e driver_id for null
            let query = supabase
              .from('delivery_assignments')
              .update({
                driver_id: driverId,
                status: 'accepted',
                accepted_at: now,
                updated_at: now,
              })
              .eq('status', 'offered');

            if (assignmentId) {
              query = query.eq('id', assignmentId);
            } else {
              query = query.eq('order_number', orderNumber);
            }

            const { data: accepted, error } = await query.select(`*, driver:delivery_drivers(*)`).maybeSingle();

            if (error || !accepted) {
              return res.status(409).json({
                success: false,
                error: 'Esta corrida já foi aceita por outro entregador ou não está mais disponível.',
              });
            }

            // Atualizar status do entregador para ocupado
            await supabase
              .from('delivery_drivers')
              .update({ availability_status: 'busy', updated_at: now })
              .eq('id', driverId);

            // Gravar notificação para o cliente
            await supabase.from('order_notifications').insert({
              order_number: accepted.order_number,
              status: 'driver_assigned',
              message: `O entregador ${accepted.driver?.name || 'parceiro'} aceitou seu pedido e está a caminho da loja!`,
              channel: 'app_timeline',
              sent_at: now,
            });

            return res.status(200).json({ success: true, assignment: accepted });
          } catch (e) {
            console.warn('Supabase accept error:', e);
          }
        }

        const mem = memoryAssignments.find(a => (a.id === assignmentId || a.order_number === orderNumber) && a.status === 'offered');
        if (!mem) {
          return res.status(409).json({ error: 'Corrida não mais disponível.' });
        }

        mem.driver_id = driverId;
        mem.status = 'accepted';
        mem.accepted_at = now;
        return res.status(200).json({ success: true, assignment: mem });
      }

      // 3. Atribuição Direta pela Loja a um Entregador Específico
      if (action === 'assign_specific') {
        if (!orderNumber || !driverId) {
          return res.status(400).json({ error: 'orderNumber e driverId são obrigatórios' });
        }

        if (supabase) {
          try {
            const { data: assigned, error } = await supabase
              .from('delivery_assignments')
              .upsert({
                order_number: orderNumber,
                driver_id: driverId,
                status: 'accepted',
                delivery_fee: Number(deliveryFee),
                accepted_at: now,
                updated_at: now,
              }, { onConflict: 'order_number' })
              .select()
              .single();

            if (!error && assigned) {
              await supabase
                .from('delivery_drivers')
                .update({ availability_status: 'busy', updated_at: now })
                .eq('id', driverId);

              return res.status(200).json({ success: true, assignment: assigned });
            }
          } catch (e) {
            console.warn('Supabase assign_specific error:', e);
          }
        }

        const memSpecific = {
          id: `asg_${Date.now()}`,
          order_number: orderNumber,
          driver_id: driverId,
          status: 'accepted',
          delivery_fee: Number(deliveryFee),
          accepted_at: now,
          updated_at: now,
        };
        memoryAssignments.unshift(memSpecific);

        return res.status(200).json({ success: true, assignment: memSpecific });
      }

      return res.status(400).json({ error: 'Ação não reconhecida' });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro interno ao processar atribuição', message: e?.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
