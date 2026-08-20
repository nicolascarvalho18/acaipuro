import { createClient } from '@supabase/supabase-js';

// Catálogo padrão de inicialização com fotografias reais padronizadas
const DEFAULT_PRODUCTS = [
  {
    id: 'prod_acai_tradicional',
    name: 'Açaí tradicional',
    description: 'Escolha o tamanho e monte com seus acompanhamentos favoritos.',
    category: 'acai',
    price: 16.90,
    image: '/images/products/acai-tradicional.webp',
    isAvailable: true,
    isFeatured: true,
    badge: 'Mais pedido',
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 1,
  },
  {
    id: 'prod_acai_morango_leite_po',
    name: 'Açaí com morango e leite em pó',
    description: 'Açaí cremoso com morango fresco, leite em pó e leite condensado.',
    category: 'acai',
    price: 21.90,
    image: '/images/products/acai-morango-leite-po.webp',
    isAvailable: true,
    isFeatured: true,
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 2,
  },
  {
    id: 'prod_acai_banana_granola',
    name: 'Açaí com banana e granola',
    description: 'Açaí acompanhado de banana fatiada, granola crocante e paçoca.',
    category: 'acai',
    price: 19.90,
    image: '/images/products/acai-banana-granola.webp',
    isAvailable: true,
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 3,
  },
  {
    id: 'prod_acai_creme_avela',
    name: 'Açaí com creme de avelã',
    description: 'Açaí com creme de avelã generoso e chocolate crocante.',
    category: 'acai',
    price: 26.90,
    image: '/images/products/acai-creme-avela.webp',
    isAvailable: true,
    allowsCustomization: true,
    maxFreeAdditionals: 2,
    displayOrder: 4,
  },
  {
    id: 'combo_para_dois',
    name: 'Combo para dois',
    description: 'Dois açaís de 500 ml com acompanhamentos à sua escolha para compartilhar.',
    category: 'combos',
    price: 44.90,
    promotionalPrice: 39.90,
    image: '/images/products/combo-dois.webp',
    isAvailable: true,
    isFeatured: true,
    badge: 'Oferta',
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 5,
  },
  {
    id: 'combo_familia',
    name: 'Combo família',
    description: 'Três açaís de 500 ml e uma bebida refrescante para a família.',
    category: 'combos',
    price: 68.90,
    image: '/images/products/combo-familia.webp',
    isAvailable: true,
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 6,
  },
  {
    id: 'prod_barca_acai',
    name: 'Barca de açaí',
    description: 'Barca especial recheada de açaí com morango, banana, kiwi, granola e chocolates.',
    category: 'barcas',
    price: 49.90,
    image: '/images/products/barca-acai.webp',
    isAvailable: true,
    allowsCustomization: true,
    maxFreeAdditionals: 4,
    displayOrder: 7,
  },
  {
    id: 'prod_brownie_artesanal',
    name: 'Brownie artesanal',
    description: 'Brownie de chocolate nobre com casquinha crocante e interior macio.',
    category: 'sobremesas',
    price: 12.90,
    image: '/images/products/brownie.webp',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 8,
  },
  {
    id: 'prod_mousse_maracuja',
    name: 'Mousse de maracujá',
    description: 'Mousse cremoso de maracujá com calda da fruta e sementes.',
    category: 'sobremesas',
    price: 9.90,
    image: '/images/products/mousse-maracuja.webp',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 9,
  },
  {
    id: 'prod_suco_acai',
    name: 'Suco natural de açaí 400 ml',
    description: 'Suco de açaí puro batido e servido bem gelado.',
    category: 'bebidas',
    price: 14.90,
    image: '/images/products/suco-acai.webp',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 10,
  },
  {
    id: 'prod_agua_mineral',
    name: 'Água mineral 500 ml',
    description: 'Água mineral garrafa 500 ml pura e gelada.',
    category: 'bebidas',
    price: 4.50,
    image: '/images/products/agua-mineral.webp',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 11,
  },
  {
    id: 'prod_refrigerante_lata',
    name: 'Refrigerante lata 350 ml',
    description: 'Refrigerante em lata 350 ml servido gelado.',
    category: 'bebidas',
    price: 6.50,
    image: '/images/products/refrigerante.webp',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 12,
  },
];

let globalProducts = [...DEFAULT_PRODUCTS];
let globalStoreSettings = {
  storeName: 'Açaí Puro Sabor',
  phone: '(13) 99150-9733',
  whatsappNumber: '5513991509733',
  address: 'Santos - SP',
  openingHoursText: 'Todos os dias das 13h às 23h',
  isOpen: true,
  pausedUntil: null as string | null,
  defaultDeliveryFee: 5.00,
  freeDeliveryThreshold: 45.00,
  minOrderValue: 15.00,
  estimatedDeliveryTime: '30 a 45 minutos',
};

let globalSizes = [
  { id: 'size_300', name: '300 ml', ml: '300 ml', price: 16.90, isDefault: true },
  { id: 'size_500', name: '500 ml', ml: '500 ml', price: 21.90 },
  { id: 'size_700', name: '700 ml', ml: '700 ml', price: 27.90 },
  { id: 'size_1000', name: '1 litro', ml: '1 Litro', price: 38.90 },
];

let globalAddons = [
  { id: 'add_morango', name: 'Morango', category: 'frutas', price: 3.50, isFreeEligible: true, isAvailable: true },
  { id: 'add_banana', name: 'Banana', category: 'frutas', price: 2.00, isFreeEligible: true, isAvailable: true },
  { id: 'add_kiwi', name: 'Kiwi', category: 'frutas', price: 3.50, isFreeEligible: true, isAvailable: true },
  { id: 'add_manga', name: 'Manga', category: 'frutas', price: 3.00, isFreeEligible: true, isAvailable: true },
  { id: 'add_uva', name: 'Uva', category: 'frutas', price: 3.50, isFreeEligible: true, isAvailable: true },
  { id: 'add_leite_cond', name: 'Leite condensado', category: 'cremes', price: 2.50, isFreeEligible: true, isAvailable: true },
  { id: 'add_creme_avela', name: 'Creme de avelã', category: 'cremes', price: 4.50, isFreeEligible: false, isAvailable: true },
  { id: 'add_doce_leite', name: 'Doce de leite', category: 'cremes', price: 3.50, isFreeEligible: false, isAvailable: true },
  { id: 'add_pasta_amendoim', name: 'Pasta de amendoim', category: 'cremes', price: 3.00, isFreeEligible: true, isAvailable: true },
  { id: 'add_chocolate', name: 'Chocolate picado', category: 'chocolates', price: 3.50, isFreeEligible: false, isAvailable: true },
  { id: 'add_gotas_choco', name: 'Gotas de chocolate', category: 'chocolates', price: 3.00, isFreeEligible: false, isAvailable: true },
  { id: 'add_bombom', name: 'Bombom', category: 'chocolates', price: 3.50, isFreeEligible: false, isAvailable: true },
  { id: 'add_granola', name: 'Granola', category: 'crocantes', price: 2.00, isFreeEligible: true, isAvailable: true },
  { id: 'add_leite_po', name: 'Leite em pó', category: 'crocantes', price: 2.50, isFreeEligible: true, isAvailable: true },
  { id: 'add_pacoca', name: 'Paçoca', category: 'crocantes', price: 2.00, isFreeEligible: true, isAvailable: true },
  { id: 'add_castanha', name: 'Castanha de caju', category: 'crocantes', price: 4.00, isFreeEligible: true, isAvailable: true },
];

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient();

  // GET: Obter catálogo completo em tempo real
  if (req.method === 'GET') {
    try {
      if (supabase) {
        try {
          const [pRes, sRes, szRes, aRes] = await Promise.all([
            supabase.from('products').select('*').eq('is_archived', false).order('sort_order', { ascending: true }),
            supabase.from('store_settings').select('*').eq('id', 'default').single(),
            supabase.from('product_sizes').select('*').order('sort_order', { ascending: true }),
            supabase.from('addons').select('*').eq('is_archived', false).order('sort_order', { ascending: true }),
          ]);

          if (!pRes.error && pRes.data && pRes.data.length > 0) {
            globalProducts = pRes.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.short_description || p.full_description || '',
              category: p.category_id,
              price: Number(p.price) || 0,
              promotionalPrice: p.promotional_price ? Number(p.promotional_price) : undefined,
              image: p.image_url || DEFAULT_PRODUCTS.find(dp => dp.id === p.id)?.image || '/images/products/product-placeholder.webp',
              isAvailable: p.is_available ?? true,
              isFeatured: p.is_featured ?? false,
              badge: p.badge || undefined,
              allowsCustomization: p.allows_customization ?? (p.category_id === 'acai' || p.category_id === 'combos'),
              maxFreeAdditionals: p.max_free_addons ?? (p.category_id === 'acai' ? 3 : 0),
              displayOrder: p.sort_order || 1,
            }));
          }

          if (!sRes.error && sRes.data) {
            globalStoreSettings = {
              storeName: sRes.data.store_name || globalStoreSettings.storeName,
              phone: sRes.data.phone || globalStoreSettings.phone,
              whatsappNumber: sRes.data.whatsapp_number || globalStoreSettings.whatsappNumber,
              address: sRes.data.address || globalStoreSettings.address,
              openingHoursText: sRes.data.opening_hours_text || globalStoreSettings.openingHoursText,
              isOpen: sRes.data.is_open ?? true,
              pausedUntil: sRes.data.paused_until || null,
              defaultDeliveryFee: Number(sRes.data.default_delivery_fee) || 5.00,
              freeDeliveryThreshold: Number(sRes.data.free_delivery_threshold) || 45.00,
              minOrderValue: Number(sRes.data.min_order_value) || 15.00,
              estimatedDeliveryTime: sRes.data.estimated_delivery_time || '30 a 45 minutos',
            };
          }
        } catch (dbErr) {
          console.warn('[Catalog Supabase error]:', dbErr);
        }
      }

      return res.status(200).json({
        success: true,
        products: globalProducts,
        storeSettings: globalStoreSettings,
        sizes: globalSizes,
        addons: globalAddons,
      });
    } catch {
      return res.status(200).json({
        success: true,
        products: globalProducts,
        storeSettings: globalStoreSettings,
        sizes: globalSizes,
        addons: globalAddons,
      });
    }
  }

  // POST: Atualizar produto, preço, status ou configuração da loja
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      const { action, payload } = body || {};

      if (action === 'update_product' && payload) {
        const prod = payload;
        const idx = globalProducts.findIndex(p => p.id === prod.id);
        if (idx >= 0) {
          globalProducts[idx] = { ...globalProducts[idx], ...prod };
        } else {
          globalProducts.push(prod);
        }

        if (supabase) {
          try {
            await supabase.from('products').upsert({
              id: prod.id,
              name: prod.name,
              short_description: prod.description,
              category_id: prod.category,
              price: Number(prod.price) || 0,
              promotional_price: prod.promotionalPrice ? Number(prod.promotionalPrice) : null,
              image_url: prod.image,
              is_available: prod.isAvailable ?? true,
              is_featured: prod.isFeatured ?? false,
              badge: prod.badge || null,
              allows_customization: prod.allowsCustomization ?? true,
              max_free_addons: prod.maxFreeAdditionals ?? 3,
              updated_at: new Date().toISOString(),
            });
          } catch (supaErr) {
            console.warn('[Supabase update product error]:', supaErr);
          }
        }

        return res.status(200).json({ success: true, product: prod, products: globalProducts });
      }

      if (action === 'delete_product' && payload?.id) {
        globalProducts = globalProducts.filter(p => p.id !== payload.id);
        if (supabase) {
          try {
            await supabase.from('products').update({ is_archived: true, is_available: false }).eq('id', payload.id);
          } catch {}
        }
        return res.status(200).json({ success: true, products: globalProducts });
      }

      if (action === 'update_store_settings' && payload) {
        globalStoreSettings = { ...globalStoreSettings, ...payload };
        if (supabase) {
          try {
            await supabase.from('store_settings').upsert({
              id: 'default',
              store_name: globalStoreSettings.storeName,
              phone: globalStoreSettings.phone,
              whatsapp_number: globalStoreSettings.whatsappNumber,
              address: globalStoreSettings.address,
              opening_hours_text: globalStoreSettings.openingHoursText,
              is_open: globalStoreSettings.isOpen,
              paused_until: globalStoreSettings.pausedUntil,
              default_delivery_fee: globalStoreSettings.defaultDeliveryFee,
              free_delivery_threshold: globalStoreSettings.freeDeliveryThreshold,
              estimated_delivery_time: globalStoreSettings.estimatedDeliveryTime,
              updated_at: new Date().toISOString(),
            });
          } catch {}
        }
        return res.status(200).json({ success: true, storeSettings: globalStoreSettings });
      }

      if (action === 'update_size' && payload) {
        globalSizes = globalSizes.map(s => s.id === payload.id ? { ...s, price: Number(payload.price) } : s);
        if (supabase) {
          try {
            await supabase.from('product_sizes').update({ price: Number(payload.price) }).eq('id', payload.id);
          } catch {}
        }
        return res.status(200).json({ success: true, sizes: globalSizes });
      }

      if (action === 'update_addon' && payload) {
        globalAddons = globalAddons.map(a => a.id === payload.id ? { ...a, ...payload } : a);
        if (supabase) {
          try {
            await supabase.from('addons').update({ price: Number(payload.price), is_available: payload.isAvailable }).eq('id', payload.id);
          } catch {}
        }
        return res.status(200).json({ success: true, addons: globalAddons });
      }

      return res.status(400).json({ success: false, error: 'Ação não reconhecida' });

    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Erro ao processar alteração' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
