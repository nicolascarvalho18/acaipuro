import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { INITIAL_PRODUCTS, CATEGORIES, ALL_ADDITIONALS, DEFAULT_SIZES } from '../data/mockProducts';
import type { Product, CategoryInfo, AdditionalItem, ProductSize } from '../types';

export interface StoreSettings {
  storeName: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  openingHoursText: string;
  isOpen: boolean;
  pausedUntil: string | null;
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderValue: number;
  estimatedDeliveryTime: string;
}

export interface DeliveryZone {
  id: string;
  neighborhood: string;
  fee: number;
  minOrder: number;
  estimatedTime: string;
  isActive: boolean;
}

interface StoreContextType {
  storeSettings: StoreSettings;
  isOpen: boolean;
  pausedUntil: string | null;
  products: Product[];
  categories: CategoryInfo[];
  addons: AdditionalItem[];
  sizes: ProductSize[];
  deliveryZones: DeliveryZone[];
  isLoading: boolean;
  isOnline: boolean;
  refreshCatalog: () => Promise<void>;
  updateStoreSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  toggleStoreOpen: (open: boolean, pauseDuration?: string) => Promise<void>;
  toggleProductAvailability: (productId: string, available: boolean) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
}

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Açaí Puro Sabor',
  phone: '(13) 99150-9733',
  whatsappNumber: '5513991509733',
  address: 'Santos - SP',
  openingHoursText: 'Todos os dias das 13h às 23h',
  isOpen: true,
  pausedUntil: null,
  defaultDeliveryFee: 5.00,
  freeDeliveryThreshold: 45.00,
  minOrderValue: 15.00,
  estimatedDeliveryTime: '30 a 45 minutos',
};

const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  { id: '1', neighborhood: 'Gonzaga', fee: 4.00, minOrder: 20.00, estimatedTime: '25 a 35 min', isActive: true },
  { id: '2', neighborhood: 'Boqueirão', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 40 min', isActive: true },
  { id: '3', neighborhood: 'Embaré', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
  { id: '4', neighborhood: 'Ponta da Praia', fee: 6.00, minOrder: 25.00, estimatedTime: '35 a 50 min', isActive: true },
  { id: '5', neighborhood: 'Aparecida', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
  { id: '6', neighborhood: 'Campo Grande', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
  { id: '7', neighborhood: 'Marapé', fee: 5.00, minOrder: 20.00, estimatedTime: '30 a 45 min', isActive: true },
  { id: '8', neighborhood: 'São Vicente (Centro)', fee: 8.00, minOrder: 35.00, estimatedTime: '40 a 55 min', isActive: true },
];

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('acai_store_settings_cache');
      return saved ? JSON.parse(saved) : DEFAULT_STORE_SETTINGS;
    } catch {
      return DEFAULT_STORE_SETTINGS;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('acai_admin_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [categories, setCategories] = useState<CategoryInfo[]>(CATEGORIES.filter(c => c.id !== 'all'));
  const [addons, setAddons] = useState<AdditionalItem[]>(ALL_ADDITIONALS);
  const [sizes, setSizes] = useState<ProductSize[]>(DEFAULT_SIZES);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(DEFAULT_DELIVERY_ZONES);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Carregar dados iniciais do Supabase ou cache
  const refreshCatalog = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Carregar configurações da loja
      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (settingsData) {
        const loadedSettings: StoreSettings = {
          storeName: settingsData.store_name || DEFAULT_STORE_SETTINGS.storeName,
          phone: settingsData.phone || DEFAULT_STORE_SETTINGS.phone,
          whatsappNumber: settingsData.whatsapp_number || DEFAULT_STORE_SETTINGS.whatsappNumber,
          address: settingsData.address || DEFAULT_STORE_SETTINGS.address,
          openingHoursText: settingsData.opening_hours_text || DEFAULT_STORE_SETTINGS.openingHoursText,
          isOpen: settingsData.is_open ?? true,
          pausedUntil: settingsData.paused_until || null,
          defaultDeliveryFee: Number(settingsData.default_delivery_fee) || 5.00,
          freeDeliveryThreshold: Number(settingsData.free_delivery_threshold) || 45.00,
          minOrderValue: Number(settingsData.min_order_value) || 15.00,
          estimatedDeliveryTime: settingsData.estimated_delivery_time || '30 a 45 minutos',
        };
        setStoreSettings(loadedSettings);
        try {
          localStorage.setItem('acai_store_settings_cache', JSON.stringify(loadedSettings));
        } catch {}
      }

      // 2. Carregar produtos
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (prodData && prodData.length > 0) {
        const mapped: Product[] = prodData.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.short_description || p.full_description || '',
          category: p.category_id,
          price: Number(p.price) || 0,
          promotionalPrice: p.promotional_price ? Number(p.promotional_price) : undefined,
          image: p.image_url || 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80',
          isAvailable: p.is_available ?? true,
          isFeatured: p.is_featured ?? false,
          badge: p.badge || undefined,
          sizes: p.category_id === 'acai' ? DEFAULT_SIZES : undefined,
          allowsCustomization: p.allows_customization ?? (p.category_id === 'acai' || p.category_id === 'combos'),
          maxFreeAdditionals: p.max_free_addons ?? (p.category_id === 'acai' ? 3 : 0),
          displayOrder: p.sort_order || 1,
        }));
        setProducts(mapped);
        try {
          localStorage.setItem('acai_admin_products', JSON.stringify(mapped));
        } catch {}
      }

      // 3. Carregar categorias
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (catData && catData.length > 0) {
        setCategories(catData.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          iconName: c.icon_name || 'Sparkles',
        })));
      }

      // 4. Carregar adicionais
      const { data: addData } = await supabase
        .from('addons')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (addData && addData.length > 0) {
        setAddons(addData.map((a: any) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          price: Number(a.price) || 0,
          isFreeEligible: a.is_free_eligible ?? true,
          isAvailable: a.is_available ?? true,
        })));
      }

      // 5. Carregar zonas de entrega
      const { data: zoneData } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true);

      if (zoneData && zoneData.length > 0) {
        setDeliveryZones(zoneData.map((z: any) => ({
          id: z.id,
          neighborhood: z.neighborhood,
          fee: Number(z.fee) || 5.00,
          minOrder: Number(z.min_order) || 20.00,
          estimatedTime: z.estimated_time || '30 a 45 min',
          isActive: z.is_active ?? true,
        })));
      }

      setIsOnline(true);
    } catch (err) {
      console.warn('[StoreContext] Refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Supabase Realtime Listener para sincronização cruzada de todos os dispositivos
  useEffect(() => {
    refreshCatalog();

    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('public:store_sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'store_settings' },
            (payload) => {
              if (payload.new) {
                const s = payload.new as any;
                setStoreSettings(prev => ({
                  ...prev,
                  isOpen: s.is_open ?? prev.isOpen,
                  pausedUntil: s.paused_until,
                  defaultDeliveryFee: Number(s.default_delivery_fee) || prev.defaultDeliveryFee,
                  freeDeliveryThreshold: Number(s.free_delivery_threshold) || prev.freeDeliveryThreshold,
                  storeName: s.store_name || prev.storeName,
                }));
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            (payload) => {
              if (payload.eventType === 'UPDATE' && payload.new) {
                const updated = payload.new as any;
                setProducts(prev => prev.map(p => p.id === updated.id ? {
                  ...p,
                  name: updated.name,
                  price: Number(updated.price) || p.price,
                  promotionalPrice: updated.promotional_price ? Number(updated.promotional_price) : undefined,
                  image: updated.image_url || p.image,
                  isAvailable: updated.is_available ?? p.isAvailable,
                } : p));
              } else if (payload.eventType === 'INSERT' && payload.new) {
                const inserted = payload.new as any;
                setProducts(prev => [...prev.filter(p => p.id !== inserted.id), {
                  id: inserted.id,
                  name: inserted.name,
                  description: inserted.short_description || '',
                  category: inserted.category_id,
                  price: Number(inserted.price) || 0,
                  image: inserted.image_url || 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80',
                  isAvailable: inserted.is_available ?? true,
                  isFeatured: inserted.is_featured ?? false,
                  displayOrder: inserted.sort_order || 99,
                }]);
              } else if (payload.eventType === 'DELETE' && payload.old) {
                const oldId = (payload.old as any).id;
                setProducts(prev => prev.filter(p => p.id !== oldId));
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }

    // Polling a cada 5 segundos como redundância
    const interval = setInterval(refreshCatalog, 5000);

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshCatalog]);

  // Ações Administrativas Conectadas ao Banco
  const updateStoreSettings = async (newSettings: Partial<StoreSettings>) => {
    setStoreSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('acai_store_settings_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (supabase) {
      try {
        await supabase
          .from('store_settings')
          .update({
            store_name: newSettings.storeName,
            phone: newSettings.phone,
            whatsapp_number: newSettings.whatsappNumber,
            address: newSettings.address,
            opening_hours_text: newSettings.openingHoursText,
            is_open: newSettings.isOpen,
            paused_until: newSettings.pausedUntil,
            default_delivery_fee: newSettings.defaultDeliveryFee,
            free_delivery_threshold: newSettings.freeDeliveryThreshold,
            estimated_delivery_time: newSettings.estimatedDeliveryTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'default');
      } catch (e) {
        console.error('Update store settings Supabase error:', e);
      }
    }
  };

  const toggleStoreOpen = async (open: boolean, pauseDuration?: string) => {
    const paused = pauseDuration ? `Pausada por ${pauseDuration}` : null;
    await updateStoreSettings({ isOpen: open, pausedUntil: paused });
  };

  const toggleProductAvailability = async (productId: string, available: boolean) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isAvailable: available } : p));
    if (supabase) {
      try {
        await supabase
          .from('products')
          .update({ is_available: available, updated_at: new Date().toISOString() })
          .eq('id', productId);
      } catch (e) {
        console.error('Toggle availability error:', e);
      }
    }
  };

  const updateProduct = async (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    if (supabase) {
      try {
        await supabase
          .from('products')
          .update({
            name: product.name,
            short_description: product.description,
            price: product.price,
            promotional_price: product.promotionalPrice || null,
            image_url: product.image,
            category_id: product.category,
            badge: product.badge || null,
            is_available: product.isAvailable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);
      } catch (e) {
        console.error('Update product error:', e);
      }
    }
  };

  const addProduct = async (product: Product) => {
    setProducts(prev => [...prev, product]);
    if (supabase) {
      try {
        await supabase
          .from('products')
          .insert({
            id: product.id,
            name: product.name,
            short_description: product.description,
            price: product.price,
            promotional_price: product.promotionalPrice || null,
            image_url: product.image,
            category_id: product.category,
            badge: product.badge || null,
            is_available: product.isAvailable,
          });
      } catch (e) {
        console.error('Add product error:', e);
      }
    }
  };

  const deleteProduct = async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    if (supabase) {
      try {
        await supabase
          .from('products')
          .update({ is_archived: true, is_available: false })
          .eq('id', productId);
      } catch (e) {
        console.error('Delete product error:', e);
      }
    }
  };

  return (
    <StoreContext.Provider
      value={{
        storeSettings,
        isOpen: storeSettings.isOpen,
        pausedUntil: storeSettings.pausedUntil,
        products,
        categories,
        addons,
        sizes,
        deliveryZones,
        isLoading,
        isOnline,
        refreshCatalog,
        updateStoreSettings,
        toggleStoreOpen,
        toggleProductAvailability,
        updateProduct,
        deleteProduct,
        addProduct,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
