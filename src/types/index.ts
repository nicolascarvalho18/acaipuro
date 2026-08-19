export type ProductCategory = 
  | 'all' 
  | 'acai' 
  | 'combos' 
  | 'barcas' 
  | 'bebidas' 
  | 'sobremesas' 
  | 'picoles';

export interface ProductSize {
  id: string;
  name: string;
  ml: string;
  price: number;
  isDefault?: boolean;
}

export type AdditionalCategory = 
  | 'frutas' 
  | 'cremes' 
  | 'chocolates' 
  | 'crocantes' 
  | 'coberturas' 
  | 'especiais';

export interface AdditionalItem {
  id: string;
  name: string;
  category: AdditionalCategory;
  price: number; // Price when charged as extra
  isFreeEligible: boolean; // Can be chosen as part of free toppings limit
  image?: string;
  popular?: boolean;
  maxQuantity?: number;
}

export interface BaseOption {
  id: string;
  name: string;
  description?: string;
  extraPrice: number;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number; // Base price or starting price
  promotionalPrice?: number;
  image: string;
  isAvailable: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isPromotion?: boolean;
  badge?: string;
  sizes?: ProductSize[];
  bases?: BaseOption[];
  allowsCustomization: boolean;
  maxFreeAdditionals?: number;
  availableAdditionals?: string[]; // IDs or empty for all
  displayOrder?: number;
}

export interface SelectedAdditional {
  additional: AdditionalItem;
  quantity: number;
  isFree: boolean;
  unitPrice: number;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  selectedSize?: ProductSize;
  selectedBase?: BaseOption;
  selectedAdditionals: SelectedAdditional[];
  notes?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type DeliveryType = 'delivery' | 'pickup';

export type PaymentMethod = 'pix' | 'card_delivery' | 'cash';

export type CardType = 'credit' | 'debit';

export interface CustomerAddress {
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
  city?: string;
  cep?: string;
}

export interface OrderDetails {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address?: CustomerAddress;
  paymentMethod: PaymentMethod;
  cardType?: CardType;
  cardBrand?: string;
  changeFor?: number;
  generalNotes?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  createdAt: string;
}

export interface StoreConfig {
  storeName: string;
  tagline: string;
  phone: string;
  whatsappNumber: string; // e.g. "5511999999999" (only digits)
  whatsappFormatted: string; // e.g. "(11) 99999-9999"
  instagram: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    fullAddress: string;
  };
  mapsUrl: string;
  openingHours: {
    weekdays: string;
    weekend: string;
    hoursSummary: string;
    startHour: number; // e.g. 13 for 13:00
    endHour: number; // e.g. 23 for 23:00
  };
  delivery: {
    defaultFee: number;
    freeDeliveryThreshold: number;
    estimatedTime: string;
    coveredNeighborhoods: string[];
  };
  pix: {
    key: string;
    keyType: string;
    receiverName: string;
    city: string;
  };
  googleSheetCsvUrl?: string;
  announcementBanner?: {
    enabled: boolean;
    text: string;
    badgeText?: string;
  };
}

export interface CategoryInfo {
  id: ProductCategory;
  name: string;
  iconName: string;
  description: string;
}
