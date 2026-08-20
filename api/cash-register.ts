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

  // GET: Obter sessão de caixa aberta, movimentações e histórico
  if (req.method === 'GET') {
    try {
      if (!supabase) {
        return res.status(200).json({
          success: true,
          activeSession: null,
          movements: [],
          recentSessions: [],
        });
      }

      // 1. Buscar sessão ativa (status = 'open')
      const { data: activeSession } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let movements: any[] = [];
      if (activeSession) {
        const { data: movs } = await supabase
          .from('cash_register_movements')
          .select('*')
          .eq('session_id', activeSession.id)
          .order('created_at', { ascending: false });
        movements = movs || [];
      }

      // 2. Buscar últimas sessões fechadas
      const { data: recentSessions } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(10);

      return res.status(200).json({
        success: true,
        activeSession: activeSession || null,
        movements,
        recentSessions: recentSessions || [],
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro ao buscar dados do caixa', message: err?.message });
    }
  }

  // POST: Ações do Caixa (abertura, sangria, suprimento, fechamento)
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      const { action, initialCash, sessionId, amount, type, description, finalCash, notes, adminEmail = 'admin@acaipuro.com.br' } = body || {};

      if (!supabase) {
        return res.status(200).json({ success: true, action, message: 'Operação realizada em modo offline' });
      }

      const now = new Date().toISOString();

      // 1. Abrir Caixa
      if (action === 'open_session') {
        const initial = Number(initialCash) || 0.00;
        const { data: newSession, error } = await supabase
          .from('cash_register_sessions')
          .insert({
            opened_at: now,
            opened_by: adminEmail,
            initial_cash: initial,
            status: 'open',
            notes: notes || null,
          })
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: 'Erro ao abrir caixa', details: error });
        }

        await supabase.from('audit_logs').insert({
          user_email: adminEmail,
          action: 'Abertura de Caixa',
          entity: 'cash_register_sessions',
          entity_id: newSession.id,
          details: { initialCash: initial },
        });

        return res.status(200).json({ success: true, session: newSession });
      }

      // 2. Sangria / Suprimento
      if (action === 'add_movement') {
        if (!sessionId || !amount || !type) {
          return res.status(400).json({ error: 'sessionId, amount e type são obrigatórios' });
        }

        const { data: movement, error } = await supabase
          .from('cash_register_movements')
          .insert({
            session_id: sessionId,
            movement_type: type, // 'sangria' | 'suprimento'
            amount: Number(amount),
            description: description || (type === 'sangria' ? 'Sangria de caixa' : 'Reforço de caixa'),
            performed_by: adminEmail,
            created_at: now,
          })
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: 'Erro ao registrar movimentação', details: error });
        }

        await supabase.from('audit_logs').insert({
          user_email: adminEmail,
          action: type === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Caixa',
          entity: 'cash_register_movements',
          entity_id: movement.id,
          details: { sessionId, amount: Number(amount), description },
        });

        return res.status(200).json({ success: true, movement });
      }

      // 3. Fechar Caixa
      if (action === 'close_session') {
        if (!sessionId) {
          return res.status(400).json({ error: 'sessionId é obrigatório' });
        }

        // Buscar sessão e movimentações
        const { data: session } = await supabase
          .from('cash_register_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!session) {
          return res.status(404).json({ error: 'Sessão de caixa não encontrada' });
        }

        const { data: movs } = await supabase
          .from('cash_register_movements')
          .select('*')
          .eq('session_id', sessionId);

        let totalSuprimentos = 0;
        let totalSangrias = 0;
        (movs || []).forEach(m => {
          if (m.movement_type === 'suprimento') totalSuprimentos += Number(m.amount);
          if (m.movement_type === 'sangria') totalSangrias += Number(m.amount);
        });

        const countedCash = Number(finalCash) || 0;
        const expectedCash = Number(session.initial_cash) + totalSuprimentos - totalSangrias;
        const diff = Number((countedCash - expectedCash).toFixed(2));

        const { data: closedSession, error } = await supabase
          .from('cash_register_sessions')
          .update({
            closed_at: now,
            closed_by: adminEmail,
            final_cash: countedCash,
            calculated_cash: expectedCash,
            difference: diff,
            status: 'closed',
            notes: notes || null,
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: 'Erro ao fechar caixa', details: error });
        }

        await supabase.from('audit_logs').insert({
          user_email: adminEmail,
          action: 'Fechamento de Caixa',
          entity: 'cash_register_sessions',
          entity_id: sessionId,
          details: { countedCash, expectedCash, difference: diff },
        });

        return res.status(200).json({ success: true, session: closedSession });
      }

      return res.status(400).json({ error: 'Ação não reconhecida' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro ao processar operação do caixa', message: err?.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
