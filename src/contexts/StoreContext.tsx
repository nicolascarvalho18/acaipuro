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
  updateSizePrice: (sizeId: string, newPrice: number) => Promise<void>;
  updateAddonPrice: (addonId: string, newPrice: number, isAvailable?: boolean) => Promise<void>;
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

  // Carregar dados de /api/catalog e Supabase
  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
            try {
              localStorage.setItem('acai_admin_products', JSON.stringify(data.products));
            } catch {}
          }
          if (data.storeSettings) {
            setStoreSettings(data.storeSettings);
            try {
              localStorage.setItem('acai_store_settings_cache', JSON.stringify(data.storeSettings));
            } catch {}
          }
          if (Array.isArray(data.sizes) && data.sizes.length > 0) {
            setSizes(data.sizes);
          }
          if (Array.isArray(data.addons) && data.addons.length > 0) {
            setAddons(data.addons);
          }
        }
      }
      setIsOnline(true);
    } catch (err) {
      console.warn('[StoreContext] Catalog fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Supabase Realtime + Polling a cada 3 segundos
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
            () => { refreshCatalog(); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            () => { refreshCatalog(); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'product_sizes' },
            () => { refreshCatalog(); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'addons' },
            () => { refreshCatalog(); }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }

    const interval = setInterval(refreshCatalog, 3000);

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshCatalog]);

  // Ações Administrativas Persistidas no Servidor e Supabase
  const updateStoreSettings = async (newSettings: Partial<StoreSettings>) => {
    setStoreSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('acai_store_settings_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_store_settings', payload: newSettings }),
      });
    } catch (e) {
      console.error('Update settings API error:', e);
    }
  };

  const toggleStoreOpen = async (open: boolean, pauseDuration?: string) => {
    const paused = pauseDuration ? `Pausada por ${pauseDuration}` : null;
    await updateStoreSettings({ isOpen: open, pausedUntil: paused });
  };

  const updateProduct = async (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    try {
      localStorage.setItem('acai_admin_products', JSON.stringify(products.map(p => p.id === product.id ? product : p)));
    } catch {}

    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_product', payload: product }),
      });
    } catch (e) {
      console.error('Update product API error:', e);
    }
  };

  const toggleProductAvailability = async (productId: string, available: boolean) => {
    const target = products.find(p => p.id === productId);
    if (target) {
      await updateProduct({ ...target, isAvailable: available });
    }
  };

  const addProduct = async (product: Product) => {
    setProducts(prev => [...prev, product]);
    try {
      localStorage.setItem('acai_admin_products', JSON.stringify([...products, product]));
    } catch {}

    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_product', payload: product }),
      });
    } catch (e) {
      console.error('Add product API error:', e);
    }
  };

  const deleteProduct = async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    try {
      localStorage.setItem('acai_admin_products', JSON.stringify(products.filter(p => p.id !== productId)));
    } catch {}

    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_product', payload: { id: productId } }),
      });
    } catch (e) {
      console.error('Delete product API error:', e);
    }
  };

  const updateSizePrice = async (sizeId: string, newPrice: number) => {
    setSizes(prev => prev.map(s => s.id === sizeId ? { ...s, price: newPrice } : s));
    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_size', payload: { id: sizeId, price: newPrice } }),
      });
    } catch (e) {
      console.error('Update size API error:', e);
    }
  };

  const updateAddonPrice = async (addonId: string, newPrice: number, isAvailable?: boolean) => {
    setAddons(prev => prev.map(a => a.id === addonId ? { ...a, price: newPrice, isAvailable: isAvailable ?? a.isAvailable } : a));
    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_addon', payload: { id: addonId, price: newPrice, isAvailable } }),
      });
    } catch (e) {
      console.error('Update addon API error:', e);
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
        updateSizePrice,
        updateAddonPrice,
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
