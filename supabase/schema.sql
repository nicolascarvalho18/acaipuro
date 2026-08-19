-- ==============================================================================
-- TABELA DE PEDIDOS EM TEMPO REAL - AÇAÍ PURO SABOR
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase (https://supabase.com)

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('delivery', 'pickup')),
    
    -- Endereço estruturado (JSONB)
    address JSONB DEFAULT '{}'::jsonb,
    
    -- Itens e personalizações completos (JSONB)
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Valores financeiros
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Pagamento
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card_online', 'delivery')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid_on_delivery', 'rejected')),
    
    -- Status do pedido (exatamente os 7 status solicitados)
    order_status TEXT NOT NULL DEFAULT 'new' CHECK (order_status IN ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
    
    -- Observações do cliente
    notes TEXT,
    
    -- Notificações em segundo plano
    whatsapp_status TEXT NOT NULL DEFAULT 'pending' CHECK (whatsapp_status IN ('pending', 'sent', 'failed', 'not_configured')),
    push_status TEXT NOT NULL DEFAULT 'pending' CHECK (push_status IN ('pending', 'sent', 'failed', 'not_configured')),
    email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed', 'not_configured')),
    notification_attempts INTEGER NOT NULL DEFAULT 0,
    last_notification_error TEXT,
    
    -- Horários
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Inscrições Push Web para o lojista
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT UNIQUE NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Trigger de atualização de timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();

-- HABILITAR SUPABASE REALTIME NA TABELA DE PEDIDOS
-- Isso permite que o painel do lojista receba pedidos instantaneamente sem polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- RLS (Row Level Security)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserção de pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de pedidos" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Permitir atualização de status de pedidos" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Permitir gerenciar push subscriptions" ON public.push_subscriptions FOR ALL USING (true);
