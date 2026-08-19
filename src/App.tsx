import React, { useState, useEffect, useMemo } from 'react';
import { CartProvider, useCart } from './contexts/CartContext';
import type { Product, ProductCategory } from './types';
import { fetchProducts } from './services/menuService';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Diferenciais } from './components/Diferenciais';
import { Promotions } from './components/Promotions';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { FloatingCartBar } from './components/FloatingCartBar';
import { CheckoutModal } from './components/CheckoutModal';
import { Testimonials } from './components/Testimonials';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { ToastNotification } from './components/ToastNotification';
import { GoogleSheetsGuideModal } from './components/GoogleSheetsGuideModal';
import { UtensilsCrossed, RefreshCw, AlertTriangle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { selectedProductForModal, closeProductModal } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnlineSource, setIsOnlineSource] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetsGuideOpen, setIsSheetsGuideOpen] = useState(false);

  const loadCatalog = async () => {
    setIsLoading(true);
    setLoadError(undefined);
    try {
      const result = await fetchProducts();
      setProducts(result.products);
      setIsOnlineSource(result.isFromGoogleSheets);
      if (result.error) {
        setLoadError(result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Contagem de produtos por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<ProductCategory, number> = {
      all: products.length,
      acai: 0,
      combos: 0,
      barcas: 0,
      bebidas: 0,
      sobremesas: 0,
      picoles: 0,
    };

    products.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });

    return counts;
  }, [products]);

  // Filtragem de produtos por categoria e termo de busca
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        product.name.toLowerCase().includes(query) || 
        product.description.toLowerCase().includes(query) ||
        (product.badge && product.badge.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFAFF] text-gray-800 font-sans selection:bg-purple-500 selection:text-white">
      
      {/* Barra de Avisos Superior */}
      <AnnouncementBar />

      {/* Cabeçalho */}
      <Header onOpenSheetsGuide={() => setIsSheetsGuideOpen(true)} />

      {/* Hero Principal */}
      <Hero />

      {/* Diferenciais de Qualidade */}
      <Diferenciais />

      {/* Promoções e Ofertas da Semana */}
      <Promotions products={products} />

      {/* Seção do Cardápio Digital Interativo */}
      <section id="cardapio" className="py-16 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-2">
              <UtensilsCrossed className="w-3.5 h-3.5 text-purple-600" />
              Cardápio Digital Interativo
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2B0938] tracking-tight font-['Outfit']">
              Escolha e Monte do Seu Jeito
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Selecione seus itens favoritos, escolha adicionais e receba quentinho ou geladinho na sua casa.
            </p>
          </div>

          {/* Aviso de erro suave na planilha, se houver */}
          {loadError && (
            <div className="max-w-xl mx-auto mb-6 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                onClick={loadCatalog}
                className="p-1 hover:bg-amber-100 rounded-lg text-amber-800 transition-colors"
                title="Tentar novamente"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Filtros de Categoria e Busca */}
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryCounts={categoryCounts}
          />

          {/* Grid de Produtos */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-500">Carregando cardápio delicioso...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-3 bg-purple-50/50 p-8 rounded-3xl border border-purple-100">
              <div className="text-4xl">🔍</div>
              <h3 className="text-lg font-bold text-gray-900 font-['Outfit']">Nenhum produto encontrado</h3>
              <p className="text-xs text-gray-500">
                Não encontramos nenhum item correspondente a "{searchQuery}". Tente buscar por outros termos como "açaí", "morango" ou "nutella".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-[#3D0C5A] text-white text-xs font-bold rounded-xl hover:bg-[#2B0938] transition-all"
              >
                Limpar filtros de busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Avaliações e Prova Social */}
      <Testimonials />

      {/* Localização, Horários e Contato */}
      <ContactSection />

      {/* Rodapé */}
      <Footer />

      {/* Modais e Drawers Flutuantes */}
      {selectedProductForModal && (
        <ProductModal
          product={selectedProductForModal}
          onClose={closeProductModal}
        />
      )}

      {/* Sacola Lateral */}
      <CartDrawer />

      {/* Barra Fixa Mobile */}
      <FloatingCartBar />

      {/* Checkout Completo com WhatsApp */}
      <CheckoutModal />

      {/* Notificações Toast */}
      <ToastNotification />

      {/* Modal Guia do Lojista / Planilha Google */}
      <GoogleSheetsGuideModal
        isOpen={isSheetsGuideOpen}
        onClose={() => setIsSheetsGuideOpen(false)}
        isOnlineSource={isOnlineSource}
        onRefreshProducts={loadCatalog}
      />

    </div>
  );
};

export function App() {
  return (
    <CartProvider>
      <MainContent />
    </CartProvider>
  );
}

export default App;
