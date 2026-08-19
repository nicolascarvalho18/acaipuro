-- ==============================================================================
-- TABELA DE PEDIDOS - AÇAÍ PURO SABOR
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto no Supabase (https://supabase.com)

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
    
    -- Endereço de Entrega
    address_street TEXT,
    address_number TEXT,
    address_neighborhood TEXT,
    address_complement TEXT,
    address_reference TEXT,
    
    -- Itens e Personalizações (Armazenados em JSON estruturado)
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Valores
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Pagamento
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card_online', 'delivery')),
    delivery_payment_method TEXT CHECK (delivery_payment_method IN ('cash', 'card_delivery')),
    card_type TEXT CHECK (card_type IN ('credit', 'debit')),
    change_for NUMERIC(10, 2),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid_on_delivery', 'rejected')),
    payment_id TEXT,
    
    -- Status do Pedido
    order_status TEXT NOT NULL DEFAULT 'novo' CHECK (order_status IN ('novo', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado')),
    
    -- Observações e Metadados
    general_notes TEXT,
    whatsapp_notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (whatsapp_notification_status IN ('sent', 'failed', 'pending', 'not_configured')),
    whatsapp_error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Política de Leitura e Inserção para Serverless Functions (com chave de serviço ou anon com backend)
CREATE POLICY "Permitir inserção de pedidos via API"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir leitura de pedidos via API"
ON public.orders FOR SELECT
USING (true);

CREATE POLICY "Permitir atualização de status via API"
ON public.orders FOR UPDATE
USING (true);
