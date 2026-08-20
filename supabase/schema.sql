-- ==============================================================================
-- SCHEMA SUPABASE POSTGRESQL - SISTEMA ADMINISTRATIVO AÇAÍ PURO SABOR
-- ==============================================================================

-- 1. CATEGORIAS DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Sparkles',
    image_url TEXT,
    color_hex TEXT DEFAULT '#69318A',
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO public.categories (id, name, description, icon_name, sort_order, is_active, slug)
VALUES 
    ('acai', 'Açaí', 'Copos e tigelas de açaí artesanal', 'Flame', 1, true, 'acai'),
    ('combos', 'Combos', 'Combinações especiais para compartilhar', 'Gift', 2, true, 'combos'),
    ('barcas', 'Barcas', 'Barcas generosas de açaí e frutas', 'Crown', 3, true, 'barcas'),
    ('bebidas', 'Bebidas', 'Sucos naturais, refrigerantes e água', 'Coffee', 4, true, 'bebidas'),
    ('sobremesas', 'Sobremesas', 'Doces artesanais e sobremesas', 'Cake', 5, true, 'sobremesas')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. CATÁLOGO DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    sku TEXT,
    name TEXT NOT NULL,
    short_description TEXT,
    full_description TEXT,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    product_type TEXT NOT NULL DEFAULT 'simple' CHECK (product_type IN ('simple', 'by_size', 'combo', 'customizable')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    promotional_price NUMERIC(10, 2),
    promo_start_date TIMESTAMPTZ,
    promo_end_date TIMESTAMPTZ,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    badge TEXT,
    allows_customization BOOLEAN NOT NULL DEFAULT false,
    max_free_addons INTEGER NOT NULL DEFAULT 0,
    max_total_addons INTEGER NOT NULL DEFAULT 10,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir produtos padrão com preços oficiais corretos
INSERT INTO public.products (id, name, short_description, category_id, product_type, price, promotional_price, image_url, is_available, is_featured, badge, allows_customization, max_free_addons, sort_order)
VALUES
    ('prod_acai_tradicional', 'Açaí tradicional', 'Escolha o tamanho e monte com seus acompanhamentos favoritos.', 'acai', 'by_size', 16.90, NULL, '/images/products/acai-tradicional.webp', true, true, 'Mais pedido', true, 3, 1),
    ('prod_acai_morango_leite_po', 'Açaí com morango e leite em pó', 'Açaí cremoso com morango fresco, leite em pó e leite condensado.', 'acai', 'by_size', 21.90, NULL, '/images/products/acai-morango-leite-po.webp', true, true, NULL, true, 3, 2),
    ('prod_acai_banana_granola', 'Açaí com banana e granola', 'Açaí acompanhado de banana fatiada, granola crocante e paçoca.', 'acai', 'by_size', 19.90, NULL, '/images/products/acai-banana-granola.webp', true, false, NULL, true, 3, 3),
    ('prod_acai_creme_avela', 'Açaí com creme de avelã', 'Açaí com creme de avelã generoso e chocolate crocante.', 'acai', 'by_size', 26.90, NULL, '/images/products/acai-creme-avela.webp', true, false, NULL, true, 2, 4),
    ('combo_para_dois', 'Combo para dois', 'Dois açaís de 500 ml com acompanhamentos à sua escolha para compartilhar.', 'combos', 'combo', 44.90, 39.90, '/images/products/combo-dois.webp', true, true, 'Oferta', true, 3, 5),
    ('combo_familia', 'Combo família', 'Três açaís de 500 ml e uma bebida refrescante para a família.', 'combos', 'combo', 68.90, NULL, '/images/products/combo-familia.webp', true, false, NULL, true, 3, 6),
    ('prod_barca_acai', 'Barca de açaí', 'Barca especial recheada de açaí com morango, banana, kiwi, granola e chocolates.', 'barcas', 'by_size', 49.90, NULL, '/images/products/barca-acai.webp', true, false, NULL, true, 4, 7),
    ('prod_brownie_artesanal', 'Brownie artesanal', 'Brownie de chocolate nobre com casquinha crocante e interior macio.', 'sobremesas', 'simple', 12.90, NULL, '/images/products/brownie.webp', true, false, NULL, false, 0, 8),
    ('prod_mousse_maracuja', 'Mousse de maracujá', 'Mousse cremoso de maracujá com calda da fruta e sementes.', 'sobremesas', 'simple', 9.90, NULL, '/images/products/mousse-maracuja.webp', true, false, NULL, false, 0, 9),
    ('prod_suco_acai', 'Suco natural de açaí 400 ml', 'Suco de açaí puro batido e servido bem gelado.', 'bebidas', 'simple', 14.90, NULL, '/images/products/suco-acai.webp', true, false, NULL, false, 0, 10),
    ('prod_agua_mineral', 'Água mineral 500 ml', 'Água mineral garrafa 500 ml pura e gelada.', 'bebidas', 'simple', 4.50, NULL, '/images/products/agua-mineral.webp', true, false, NULL, false, 0, 11),
    ('prod_refrigerante_lata', 'Refrigerante lata 350 ml', 'Refrigerante em lata 350 ml servido gelado.', 'bebidas', 'simple', 6.50, NULL, '/images/products/refrigerante.webp', true, false, NULL, false, 0, 12)
ON CONFLICT (id) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    price = EXCLUDED.price,
    promotional_price = EXCLUDED.promotional_price,
    allows_customization = EXCLUDED.allows_customization;

-- 3. TAMANHOS DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.product_sizes (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    volume TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir tamanhos do açaí tradicional
INSERT INTO public.product_sizes (id, product_id, name, volume, price, is_default, sort_order)
VALUES
    ('size_acai_300', 'prod_acai_tradicional', '300 ml', '300 ml', 16.90, true, 1),
    ('size_acai_500', 'prod_acai_tradicional', '500 ml', '500 ml', 21.90, false, 2),
    ('size_acai_700', 'prod_acai_tradicional', '700 ml', '700 ml', 27.90, false, 3),
    ('size_acai_1000', 'prod_acai_tradicional', '1 litro', '1 Litro', 38.90, false, 4),
    ('size_barca_p', 'prod_barca_acai', 'Barca Individual', '800 ml', 36.90, true, 1),
    ('size_barca_m', 'prod_barca_acai', 'Barca Tradicional', '1.2 Litros', 49.90, false, 2)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;

-- 4. ADICIONAIS E COMPLEMENTOS
CREATE TABLE IF NOT EXISTS public.addons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('frutas', 'cremes', 'chocolates', 'crocantes', 'caldas', 'outros')),
    description TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_free_eligible BOOLEAN NOT NULL DEFAULT true,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir adicionais padrão
INSERT INTO public.addons (id, name, category, price, is_free_eligible, is_available, sort_order)
VALUES
    ('add_morango', 'Morango', 'frutas', 3.50, true, true, 1),
    ('add_banana', 'Banana', 'frutas', 2.00, true, true, 2),
    ('add_kiwi', 'Kiwi', 'frutas', 3.50, true, true, 3),
    ('add_manga', 'Manga', 'frutas', 3.00, true, true, 4),
    ('add_uva', 'Uva', 'frutas', 3.50, true, true, 5),
    ('add_leite_cond', 'Leite condensado', 'cremes', 2.50, true, true, 6),
    ('add_creme_avela', 'Creme de avelã', 'cremes', 4.50, false, true, 7),
    ('add_doce_leite', 'Doce de leite', 'cremes', 3.50, false, true, 8),
    ('add_pasta_amendoim', 'Pasta de amendoim', 'cremes', 3.00, true, true, 9),
    ('add_chocolate', 'Chocolate picado', 'chocolates', 3.50, false, true, 10),
    ('add_gotas_choco', 'Gotas de chocolate', 'chocolates', 3.00, false, true, 11),
    ('add_bombom', 'Bombom', 'chocolates', 3.50, false, true, 12),
    ('add_granola', 'Granola', 'crocantes', 2.00, true, true, 13),
    ('add_leite_po', 'Leite em pó', 'crocantes', 2.50, true, true, 14),
    ('add_pacoca', 'Paçoca', 'crocantes', 2.00, true, true, 15),
    ('add_castanha', 'Castanha de caju', 'crocantes', 4.00, true, true, 16)
ON CONFLICT (id) DO NOTHING;

-- 5. CUPONS E PROMOÇÕES
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir cupom de boas-vindas
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, is_active)
VALUES ('PRIMEIRACOMPRA', 'fixed', 5.00, 30.00, true)
ON CONFLICT (code) DO NOTHING;

-- 6. ZONAS DE ENTREGA E TAXAS POR BAIRRO
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood TEXT UNIQUE NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    min_order NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    estimated_time TEXT NOT NULL DEFAULT '30 a 45 min',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir bairros atendidos
INSERT INTO public.delivery_zones (neighborhood, fee, min_order, estimated_time, is_active)
VALUES
    ('Gonzaga', 4.00, 20.00, '25 a 35 min', true),
    ('Boqueirão', 5.00, 20.00, '30 a 40 min', true),
    ('Embaré', 5.00, 20.00, '30 a 45 min', true),
    ('Ponta da Praia', 6.00, 25.00, '35 a 50 min', true),
    ('Aparecida', 5.00, 20.00, '30 a 45 min', true),
    ('Campo Grande', 5.00, 20.00, '30 a 45 min', true),
    ('Marapé', 5.00, 20.00, '30 a 45 min', true),
    ('Encruzilhada', 5.00, 20.00, '30 a 45 min', true),
    ('Vila Belmiro', 5.00, 20.00, '30 a 45 min', true),
    ('São Vicente (Centro)', 8.00, 35.00, '40 a 55 min', true),
    ('Itararé', 7.00, 30.00, '35 a 50 min', true)
ON CONFLICT (neighborhood) DO NOTHING;

-- 7. CONFIGURAÇÕES DA LOJA
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'Açaí Puro Sabor',
    tagline TEXT DEFAULT 'Açaí Artesanal & Delivery',
    phone TEXT DEFAULT '(13) 99150-9733',
    whatsapp_number TEXT DEFAULT '5513991509733',
    instagram_handle TEXT DEFAULT '@acaipurosabor',
    address TEXT DEFAULT 'Santos - SP',
    opening_hours_text TEXT DEFAULT 'Todos os dias das 13h às 23h',
    is_open BOOLEAN NOT NULL DEFAULT true,
    paused_until TIMESTAMPTZ,
    default_delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    free_delivery_threshold NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
    min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
    estimated_delivery_time TEXT NOT NULL DEFAULT '30 a 45 minutos',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.store_settings (id, store_name, is_open, default_delivery_fee, free_delivery_threshold)
VALUES ('default', 'Açaí Puro Sabor', true, 5.00, 45.00)
ON CONFLICT (id) DO NOTHING;

-- 8. CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    last_order_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABELA PRINCIPAL DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    fulfillment_type TEXT NOT NULL DEFAULT 'delivery' CHECK (fulfillment_type IN ('delivery', 'pickup')),
    street TEXT,
    number TEXT,
    neighborhood TEXT,
    complement TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'preparing', 'delivering', 'ready_for_pickup', 'done', 'cancelled')),
    notes TEXT,
    cancellation_reason TEXT,
    internal_notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. HISTÓRICO DE STATUS DO PEDIDO
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'admin',
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. NOTIFICAÇÕES DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.order_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'app_timeline',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SESSÕES DE CAIXA DIÁRIO
CREATE TABLE IF NOT EXISTS public.cash_register_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opened_by TEXT NOT NULL DEFAULT 'admin',
    closed_by TEXT,
    initial_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_cash NUMERIC(10, 2),
    calculated_cash NUMERIC(10, 2),
    difference NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. MOVIMENTAÇÕES DE CAIXA (SANGRIA / REFORÇO)
CREATE TABLE IF NOT EXISTS public.cash_register_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.cash_register_sessions(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sangria', 'suprimento', 'venda_dinheiro')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    performed_by TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL DEFAULT 'admin@acaipuro.com.br',
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_access_token ON public.orders(access_token);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders(is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(is_available);

-- 16. HABILITAR SUPABASE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.addons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;

-- 17. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Permitir alteração de categorias" ON public.categories FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Permitir alteração de produtos" ON public.products FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de tamanhos" ON public.product_sizes FOR SELECT USING (true);
CREATE POLICY "Permitir alteração de tamanhos" ON public.product_sizes FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de adicionais" ON public.addons FOR SELECT USING (true);
CREATE POLICY "Permitir alteração de adicionais" ON public.addons FOR ALL USING (true);

CREATE POLICY "Permitir leitura pública de configurações" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Permitir alteração de configurações" ON public.store_settings FOR ALL USING (true);

CREATE POLICY "Permitir inserção e leitura de pedidos" ON public.orders FOR ALL USING (true);
CREATE POLICY "Permitir histórico de pedidos" ON public.order_status_history FOR ALL USING (true);
CREATE POLICY "Permitir notificações de pedidos" ON public.order_notifications FOR ALL USING (true);
CREATE POLICY "Permitir sessões de caixa" ON public.cash_register_sessions FOR ALL USING (true);
CREATE POLICY "Permitir movimentações de caixa" ON public.cash_register_movements FOR ALL USING (true);
CREATE POLICY "Permitir leitura e escrita de clientes" ON public.customers FOR ALL USING (true);
CREATE POLICY "Permitir leitura e escrita de auditoria" ON public.audit_logs FOR ALL USING (true);

