import type { Product, ProductCategory, AdditionalItem } from '../types';
import { INITIAL_PRODUCTS, ALL_ADDITIONALS, DEFAULT_SIZES, BASE_OPTIONS } from '../data/mockProducts';
import { STORE_CONFIG } from '../config/storeConfig';
import { supabase } from './supabaseClient';

export function getLocalOrSavedProducts(): Product[] {
  try {
    const saved = localStorage.getItem('acai_admin_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local admin products:', e);
  }
  return INITIAL_PRODUCTS;
}

/**
 * Busca os produtos cadastrados no Supabase, no painel administrativo ou base padrão
 */
export async function fetchProducts(): Promise<{ products: Product[]; isFromGoogleSheets: boolean; error?: string }> {
  // 1. Tentar carregar do Supabase se disponível
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const mappedProducts: Product[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.short_description || p.full_description || '',
          category: p.category_id as ProductCategory,
          price: Number(p.price) || 0,
          promotionalPrice: p.promotional_price ? Number(p.promotional_price) : undefined,
          image: p.image_url || INITIAL_PRODUCTS.find(ip => ip.id === p.id)?.image || '/images/products/product-placeholder.webp',
          isAvailable: p.is_available ?? true,
          isFeatured: p.is_featured ?? false,
          badge: p.badge || undefined,
          sizes: p.category_id === 'acai' ? DEFAULT_SIZES : undefined,
          bases: p.category_id === 'acai' ? BASE_OPTIONS : undefined,
          allowsCustomization: p.allows_customization ?? (p.category_id === 'acai' || p.category_id === 'combos'),
          maxFreeAdditionals: p.max_free_addons ?? (p.category_id === 'acai' ? 3 : 0),
          displayOrder: p.sort_order || 1,
        }));

        return {
          products: mappedProducts,
          isFromGoogleSheets: false,
        };
      }
    } catch (supaErr) {
      console.warn('Supabase fetch products exception:', supaErr);
    }
  }

  // 2. Fallback para produtos salvos pelo lojista no painel
  const localProducts = getLocalOrSavedProducts();
  return {
    products: localProducts,
    isFromGoogleSheets: false,
  };
}

export function getAdditionals(): AdditionalItem[] {
  return ALL_ADDITIONALS;
}
