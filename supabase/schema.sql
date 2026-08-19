-- ==============================================================================
-- SCHEMA SUPABASE POSTGRESQL - SISTEMA REAL DE PEDIDOS AÇAÍ PURO SABOR
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE PEDIDOS (orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('delivery', 'pickup')),
    
    -- Endereço
    address_street TEXT,
    address_number TEXT,
    address_neighborhood TEXT,
    address_complement TEXT,
    address_reference TEXT,
    
    -- Valores
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Pagamento
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'card_online', 'delivery')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'paid_on_delivery', 'rejected')),
    
    -- Status do pedido (exatamente os 6 status em português)
    status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado')),
    
    -- Observações gerais
    notes TEXT,
    
    -- Notificações
    whatsapp_status TEXT NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE ITENS DO PEDIDO (order_items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    size TEXT,
    base TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA DE ADICIONAIS DOS ITENS (order_item_addons)
CREATE TABLE IF NOT EXISTS public.order_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    addon_name TEXT NOT NULL,
    addon_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA DE CONFIGURAÇÕES DA LOJA (store_settings)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    is_open BOOLEAN NOT NULL DEFAULT true,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    free_delivery_threshold NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
    estimated_delivery_time TEXT NOT NULL DEFAULT '30 a 45 minutos',
    opening_hours TEXT NOT NULL DEFAULT 'Todos os dias das 13h às 23h',
    whatsapp_number TEXT NOT NULL DEFAULT '5513991509733',
    neighborhoods JSONB NOT NULL DEFAULT '["Gonzaga", "Boqueirão", "Embaré", "Ponta da Praia", "Aparecida", "Campo Grande", "Marapé", "Encruzilhada", "Vila Belmiro", "São Vicente (Centro)", "Itararé"]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir configuração padrão se não existir
INSERT INTO public.store_settings (id, is_open, delivery_fee, free_delivery_threshold, estimated_delivery_time, opening_hours, whatsapp_number)
VALUES ('default', true, 5.00, 45.00, '30 a 45 minutos', 'Todos os dias das 13h às 23h', '5513991509733')
ON CONFLICT (id) DO NOTHING;

-- 5. TABELA DE PRODUTOS PARA GESTÃO DE CARDÁPIO (products_catalog)
CREATE TABLE IF NOT EXISTS public.products_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    promotional_price NUMERIC(10, 2),
    image TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    badge TEXT,
    sizes JSONB DEFAULT '[]'::jsonb,
    bases JSONB DEFAULT '[]'::jsonb,
    allows_customization BOOLEAN NOT NULL DEFAULT true,
    max_free_additionals INTEGER DEFAULT 3,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_addons_item_id ON public.order_item_addons(order_item_id);

-- 7. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE UPDATED_AT
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 8. HABILITAR SUPABASE REALTIME EM TODAS AS TABELAS
-- Isso permite a sincronização instantânea entre múltiplos computadores e celulares
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_item_addons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products_catalog;

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_catalog ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para criação de pedidos e leitura de cardápio/configurações
CREATE POLICY "Permitir inserção de pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de pedidos" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Permitir atualização de status de pedidos" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Permitir inserção de itens de pedido" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de itens de pedido" ON public.order_items FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de adicionais" ON public.order_item_addons FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de adicionais" ON public.order_item_addons FOR SELECT USING (true);

CREATE POLICY "Permitir leitura de configurações da loja" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Permitir atualização de configurações da loja" ON public.store_settings FOR ALL USING (true);

CREATE POLICY "Permitir leitura e escrita do cardápio" ON public.products_catalog FOR ALL USING (true);
