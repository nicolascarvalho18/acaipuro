-- ==============================================================================
-- SCHEMA SUPABASE POSTGRESQL - SISTEMA REAL DE PEDIDOS AÇAÍ PURO SABOR
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE PEDIDOS (orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
    
    -- Endereço
    street TEXT,
    number TEXT,
    neighborhood TEXT,
    complement TEXT,
    
    -- Itens do pedido estruturados em JSON
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Valores
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Pagamento
    payment_method TEXT NOT NULL,
    
    -- Status do pedido: 'new', 'confirmed', 'preparing', 'delivering', 'done', 'cancelled'
    status TEXT NOT NULL DEFAULT 'new',
    
    -- Observações gerais
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 3. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- 4. HABILITAR SUPABASE REALTIME NA TABELA orders
-- Isso transmite os eventos INSERT e UPDATE instantaneamente para o Painel do Lojista
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para criação e leitura de pedidos
CREATE POLICY "Permitir inserção pública de pedidos" 
ON public.orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir leitura de pedidos" 
ON public.orders FOR SELECT 
USING (true);

CREATE POLICY "Permitir atualização de pedidos pelo lojista" 
ON public.orders FOR UPDATE 
USING (true);
