import type { 
  Product, 
  CategoryInfo, 
  ProductSize, 
  BaseOption, 
  AdditionalItem 
} from '../types';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'all', name: 'Todos', iconName: 'Sparkles', description: 'Todos os produtos' },
  { id: 'acai', name: 'Açaí', iconName: 'Flame', description: 'Copos e tigelas de açaí' },
  { id: 'combos', name: 'Combos', iconName: 'Gift', description: 'Combinações especiais' },
  { id: 'barcas', name: 'Barcas', iconName: 'Crown', description: 'Barcas para compartilhar' },
  { id: 'bebidas', name: 'Bebidas', iconName: 'Coffee', description: 'Sucos e refrigerantes' },
  { id: 'sobremesas', name: 'Sobremesas', iconName: 'Cake', description: 'Doces e sobremesas' },
];

export const DEFAULT_SIZES: ProductSize[] = [
  { id: 'size_300', name: '300 ml', ml: '300 ml', price: 16.90, isDefault: true },
  { id: 'size_500', name: '500 ml', ml: '500 ml', price: 21.90 },
  { id: 'size_700', name: '700 ml', ml: '700 ml', price: 27.90 },
  { id: 'size_1000', name: '1 litro', ml: '1 Litro', price: 38.90 },
];

export const BARCA_SIZES: ProductSize[] = [
  { id: 'barca_p', name: 'Barca Individual', ml: '800 ml', price: 36.90, isDefault: true },
  { id: 'barca_m', name: 'Barca Tradicional', ml: '1.2 Litros', price: 49.90 },
];

export const BASE_OPTIONS: BaseOption[] = [
  { id: 'base_tradicional', name: 'Açaí tradicional', description: 'Polpa pura e consistência cremosa', extraPrice: 0, isDefault: true },
  { id: 'base_zero', name: 'Açaí zero açúcar', description: 'Sem adição de açúcares', extraPrice: 2.00 },
  { id: 'base_cupuacu', name: 'Açaí com cupuaçu', description: 'Metade açaí e metade creme de cupuaçu', extraPrice: 2.50 },
];

export const ALL_ADDITIONALS: AdditionalItem[] = [
  // Frutas
  { id: 'add_morango', name: 'Morango', category: 'frutas', price: 3.50, isFreeEligible: true, popular: true },
  { id: 'add_banana', name: 'Banana', category: 'frutas', price: 2.00, isFreeEligible: true, popular: true },
  { id: 'add_kiwi', name: 'Kiwi', category: 'frutas', price: 3.50, isFreeEligible: true },
  { id: 'add_manga', name: 'Manga', category: 'frutas', price: 3.00, isFreeEligible: true },
  { id: 'add_uva', name: 'Uva', category: 'frutas', price: 3.50, isFreeEligible: true },

  // Cremes
  { id: 'add_leite_cond', name: 'Leite condensado', category: 'cremes', price: 2.50, isFreeEligible: true, popular: true },
  { id: 'add_creme_avela', name: 'Creme de avelã', category: 'cremes', price: 4.50, isFreeEligible: false, popular: true },
  { id: 'add_doce_leite', name: 'Doce de leite', category: 'cremes', price: 3.50, isFreeEligible: false },
  { id: 'add_pasta_amendoim', name: 'Pasta de amendoim', category: 'cremes', price: 3.00, isFreeEligible: true },

  // Chocolates
  { id: 'add_chocolate', name: 'Chocolate picado', category: 'chocolates', price: 3.50, isFreeEligible: false, popular: true },
  { id: 'add_gotas_choco', name: 'Gotas de chocolate', category: 'chocolates', price: 3.00, isFreeEligible: false },
  { id: 'add_bombom', name: 'Bombom', category: 'chocolates', price: 3.50, isFreeEligible: false },

  // Crocantes
  { id: 'add_granola', name: 'Granola', category: 'crocantes', price: 2.00, isFreeEligible: true, popular: true },
  { id: 'add_leite_po', name: 'Leite em pó', category: 'crocantes', price: 2.50, isFreeEligible: true, popular: true },
  { id: 'add_pacoca', name: 'Paçoca', category: 'crocantes', price: 2.00, isFreeEligible: true, popular: true },
  { id: 'add_castanha', name: 'Castanha de caju', category: 'crocantes', price: 4.00, isFreeEligible: true },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_acai_tradicional',
    name: 'Açaí tradicional',
    description: 'Escolha o tamanho e monte com seus acompanhamentos favoritos.',
    category: 'acai',
    price: 16.90,
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    isFeatured: true,
    badge: 'Mais pedido',
    sizes: DEFAULT_SIZES,
    bases: BASE_OPTIONS,
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 1,
  },
  {
    id: 'prod_acai_morango_leite_po',
    name: 'Açaí com morango e leite em pó',
    description: 'Açaí cremoso com morango, leite em pó e leite condensado.',
    category: 'acai',
    price: 21.90,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    isFeatured: true,
    sizes: DEFAULT_SIZES,
    bases: BASE_OPTIONS,
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 2,
  },
  {
    id: 'prod_acai_banana_granola',
    name: 'Açaí com banana e granola',
    description: 'Açaí acompanhado de banana, granola e paçoca.',
    category: 'acai',
    price: 19.90,
    image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    sizes: DEFAULT_SIZES,
    bases: BASE_OPTIONS,
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 3,
  },
  {
    id: 'prod_acai_creme_avela',
    name: 'Açaí com creme de avelã',
    description: 'Açaí com creme de avelã e chocolate crocante.',
    category: 'acai',
    price: 26.90,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    sizes: DEFAULT_SIZES,
    bases: BASE_OPTIONS,
    allowsCustomization: true,
    maxFreeAdditionals: 2,
    displayOrder: 4,
  },
  {
    id: 'combo_para_dois',
    name: 'Combo para dois',
    description: 'Dois açaís de 500 ml, com três adicionais em cada.',
    category: 'combos',
    price: 44.90,
    promotionalPrice: 39.90,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
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
    description: 'Três açaís de 500 ml e uma bebida para compartilhar.',
    category: 'combos',
    price: 68.90,
    image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    allowsCustomization: true,
    maxFreeAdditionals: 3,
    displayOrder: 6,
  },
  {
    id: 'prod_barca_acai',
    name: 'Barca de açaí',
    description: 'Açaí com frutas e acompanhamentos à sua escolha.',
    category: 'barcas',
    price: 49.90,
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    sizes: BARCA_SIZES,
    bases: BASE_OPTIONS,
    allowsCustomization: true,
    maxFreeAdditionals: 4,
    displayOrder: 7,
  },
  {
    id: 'prod_brownie_artesanal',
    name: 'Brownie artesanal',
    description: 'Brownie de chocolate com casquinha crocante.',
    category: 'sobremesas',
    price: 12.90,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 8,
  },
  {
    id: 'prod_mousse_maracuja',
    name: 'Mousse de maracujá',
    description: 'Mousse cremoso com calda de maracujá.',
    category: 'sobremesas',
    price: 9.90,
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 9,
  },
  {
    id: 'prod_suco_acai',
    name: 'Suco natural de açaí 400 ml',
    description: 'Suco de açaí batido na hora com água ou laranja.',
    category: 'bebidas',
    price: 14.90,
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 10,
  },
  {
    id: 'prod_agua_mineral',
    name: 'Água mineral 500 ml',
    description: 'Água mineral garrafa 500 ml gelada.',
    category: 'bebidas',
    price: 4.50,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 11,
  },
  {
    id: 'prod_refrigerante_lata',
    name: 'Refrigerante lata 350 ml',
    description: 'Refrigerante em lata gelado.',
    category: 'bebidas',
    price: 6.50,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    allowsCustomization: false,
    displayOrder: 12,
  }
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: "Camila Rodrigues",
    role: "Cliente",
    rating: 5,
    comment: "O açaí chegou no ponto perfeito e as frutas estavam muito frescas. Recomendo.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: 2,
    name: "Lucas Mendes",
    role: "Cliente",
    rating: 5,
    comment: "Muito prático pedir pelo WhatsApp. Entrega rápida e produto muito bem embalado.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: 3,
    name: "Beatriz Silveira",
    role: "Cliente",
    rating: 5,
    comment: "Excelente qualidade. A consistência do açaí é muito cremosa e saborosa.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
  }
];
