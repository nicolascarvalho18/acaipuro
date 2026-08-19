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
import { PaymentResultModal } from './components/PaymentResultModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { ToastNotification } from './components/ToastNotification';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { selectedProductForModal, closeProductModal } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Roteamento Administrativo síncrono para evitar tela branca
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    return path.includes('/admin') || search.includes('admin=true') || search.includes('admin=1');
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!sessionStorage.getItem('admin_auth_token');
  });

  // Acompanhamento de Pedido do Cliente
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string | null>(null);

  const loadCatalog = async () => {
    setIsLoading(true);
    setLoadError(undefined);
    try {
      const result = await fetchProducts();
      setProducts(result.products);
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
    if (!isAdminRoute) {
      loadCatalog();
    }

    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const isAdm = path.includes('/admin') || search.includes('admin=true') || search.includes('admin=1');
      setIsAdminRoute(isAdm);
      setIsAdminAuthenticated(!!sessionStorage.getItem('admin_auth_token'));
    };

    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, [isAdminRoute]);

  const handleOpenAdmin = () => {
    setIsAdminRoute(true);
    const token = sessionStorage.getItem('admin_auth_token');
    if (token) {
      setIsAdminAuthenticated(true);
    }
    window.history.pushState({}, '', '/admin/pedidos');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_auth_token');
    setIsAdminAuthenticated(false);
    setIsAdminRoute(false);
    window.history.pushState({}, '', '/');
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  // Se estiver na rota /admin
  if (isAdminRoute) {
    if (!isAdminAuthenticated) {
      return (
        <AdminLogin
          onSuccess={handleAdminLoginSuccess}
          onCancel={() => {
            setIsAdminRoute(false);
            window.history.pushState({}, '', '/');
          }}
        />
      );
    }
    return <AdminDashboard onLogout={handleAdminLogout} />;
  }

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

  // Filtragem de produtos por categoria e busca
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
    <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-[#28242A] font-sans">
      
      {/* Barra de Avisos Superior */}
      <AnnouncementBar />

      {/* Cabeçalho com link para o Painel do Lojista */}
      <Header onOpenAdmin={handleOpenAdmin} />

      {/* Apresentação Principal (Hero) */}
      <Hero />

      {/* Diferenciais */}
      <Diferenciais />

      {/* Combos da Semana */}
      <Promotions products={products} />

      {/* Seção do Cardápio com 3 colunas no desktop */}
      <section id="cardapio" className="py-14 sm:py-18 bg-white border-t border-[#ECE8F0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#28242A] font-['DM_Sans'] tracking-tight">
              Nosso cardápio
            </h2>
            <p className="text-sm text-[#726C74] mt-1.5">
              Escolha seu açaí, personalize os adicionais e confirme seu pedido online.
            </p>
          </div>

          {loadError && (
            <div className="max-w-lg mx-auto mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 stroke-[1.8]" />
                <span>{loadError}</span>
              </div>
              <button
                onClick={loadCatalog}
                className="p-1 hover:bg-amber-100 rounded-lg text-amber-800 transition-colors cursor-pointer"
                title="Tentar novamente"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryCounts={categoryCounts}
          />

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#F3EDF6] border-t-[#69318A] rounded-full animate-spin"></div>
              <p className="text-xs text-[#726C74]">Carregando cardápio...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-3 bg-[#FCFAF7] p-8 rounded-2xl border border-[#ECE8F0]">
              <h3 className="text-base font-bold text-[#28242A] font-['DM_Sans']">Nenhum item encontrado</h3>
              <p className="text-xs text-[#726C74]">
                Não encontramos produtos correspondentes a "{searchQuery}".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-[#69318A] text-white text-xs font-medium rounded-xl hover:bg-[#572185] transition-all cursor-pointer shadow-xs"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Localização e Atendimento */}
      <ContactSection />

      {/* Rodapé */}
      <Footer onOpenAdmin={handleOpenAdmin} />

      {/* Modais e Drawers */}
      {selectedProductForModal && (
        <ProductModal
          product={selectedProductForModal}
          onClose={closeProductModal}
        />
      )}

      <CartDrawer />
      <FloatingCartBar />
      <CheckoutModal />
      <PaymentResultModal />
      
      {/* Modal de Acompanhamento em Tempo Real do Cliente */}
      {trackingOrderNumber && (
        <OrderTrackingModal
          orderNumber={trackingOrderNumber}
          isOpen={!!trackingOrderNumber}
          onClose={() => setTrackingOrderNumber(null)}
        />
      )}

      <ToastNotification />

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
