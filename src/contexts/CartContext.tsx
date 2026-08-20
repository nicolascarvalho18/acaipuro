import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { CartItem, Product, DeliveryType } from '../types';
import { STORE_CONFIG } from '../config/storeConfig';
import confetti from 'canvas-confetti';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'cartItemId' | 'totalPrice'>) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  deliveryType: DeliveryType;
  setDeliveryType: (type: DeliveryType) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  selectedProductForModal: Product | null;
  openProductModal: (product: Product) => void;
  closeProductModal: () => void;
  subtotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  remainingForFreeDelivery: number;
  isFreeDelivery: boolean;
  total: number;
  itemCount: number;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  lastAddedItem: CartItem | null;
  activeTrackingOrder: { orderNumber: string; token?: string } | null;
  openOrderTracking: (orderNumber: string, token?: string) => void;
  closeOrderTracking: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'acai_cart_items_v1';
const LOCAL_STORAGE_DELIVERY_KEY = 'acai_delivery_type_v1';
const LOCAL_STORAGE_TRACKING_KEY = 'active_acai_order_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryType, setDeliveryTypeState] = useState<DeliveryType>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DELIVERY_KEY);
      return (saved === 'pickup' || saved === 'delivery') ? saved : 'delivery';
    } catch {
      return 'delivery';
    }
  });

  const [activeTrackingOrder, setActiveTrackingOrder] = useState<{ orderNumber: string; token?: string } | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TRACKING_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);

  // Salvar no localStorage sempre que o carrinho mudar
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Erro ao salvar carrinho no localStorage:', e);
    }
  }, [cart]);

  // Salvar preferência de entrega
  const setDeliveryType = (type: DeliveryType) => {
    setDeliveryTypeState(type);
    try {
      localStorage.setItem(LOCAL_STORAGE_DELIVERY_KEY, type);
    } catch (e) {
      console.error('Erro ao salvar tipo de entrega:', e);
    }
  };

  const openOrderTracking = (orderNumber: string, token?: string) => {
    const data = { orderNumber, token };
    setActiveTrackingOrder(data);
    try {
      localStorage.setItem(LOCAL_STORAGE_TRACKING_KEY, JSON.stringify(data));
    } catch {}
  };

  const closeOrderTracking = () => {
    setActiveTrackingOrder(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  const openProductModal = (product: Product) => {
    setSelectedProductForModal(product);
  };

  const closeProductModal = () => {
    setSelectedProductForModal(null);
  };

  const addToCart = (itemData: Omit<CartItem, 'cartItemId' | 'totalPrice'>) => {
    const unitPrice = itemData.unitPrice;
    const totalPrice = unitPrice * itemData.quantity;
    
    // Gerar um identificador único para o item com suas combinações específicas
    const uniqueId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const newItem: CartItem = {
      ...itemData,
      cartItemId: uniqueId,
      totalPrice,
    };

    setCart((prev) => [...prev, newItem]);
    setLastAddedItem(newItem);
    showToast(`✓ "${itemData.product.name}" adicionado à sacola!`);

    // Micro-efeito de celebração discreto
    try {
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.85, x: 0.9 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#22c55e'],
        disableForReducedMotion: true,
      });
    } catch {
      // Confetti fallback
    }
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: item.unitPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const removed = prev.find(i => i.cartItemId === cartItemId);
      if (removed) {
        showToast(`Item removido da sacola`);
      }
      return prev.filter((item) => item.cartItemId !== cartItemId);
    });
  };

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const freeDeliveryThreshold = STORE_CONFIG.delivery.freeDeliveryThreshold;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold || deliveryType === 'pickup';
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  const deliveryFee = useMemo(() => {
    if (deliveryType === 'pickup' || subtotal === 0) return 0;
    if (subtotal >= freeDeliveryThreshold) return 0;
    return STORE_CONFIG.delivery.defaultFee;
  }, [deliveryType, subtotal, freeDeliveryThreshold]);

  const total = useMemo(() => {
    return Number((subtotal + deliveryFee).toFixed(2));
  }, [subtotal, deliveryFee]);

  const itemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        deliveryType,
        setDeliveryType,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        selectedProductForModal,
        openProductModal,
        closeProductModal,
        subtotal,
        deliveryFee,
        freeDeliveryThreshold,
        remainingForFreeDelivery,
        isFreeDelivery,
        total,
        itemCount,
        toastMessage,
        showToast,
        lastAddedItem,
        activeTrackingOrder,
        openOrderTracking,
        closeOrderTracking,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
};
