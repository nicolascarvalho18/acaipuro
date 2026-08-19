import React, { useState } from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { useCart } from '../contexts/CartContext';
import { ShoppingBag, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const { itemCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 70;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#ECE8F0] transition-all">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        
        {/* Logo profissional da açaiteria, sem emoji */}
        <a href="#inicio" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#542381] flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a9 9 0 0 1 9 9v1a9 9 0 0 1-9 9 9 9 0 0 1-9-9v-1a9 9 0 0 1 9-9z"></path>
              <path d="M12 7v5l3 3"></path>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-[#26222A] tracking-tight font-['DM_Sans'] leading-none">
              {STORE_CONFIG.storeName}
            </span>
            <span className="text-[11px] text-[#716B76] font-normal mt-0.5">
              Açaí artesanal
            </span>
          </div>
        </a>

        {/* Navegação: Cardápio, Combos e Sobre */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#716B76]">
          <button
            onClick={() => handleScroll('cardapio')}
            className="hover:text-[#542381] transition-colors cursor-pointer"
          >
            Cardápio
          </button>
          <button
            onClick={() => handleScroll('promocoes')}
            className="hover:text-[#542381] transition-colors cursor-pointer"
          >
            Combos
          </button>
          <button
            onClick={() => handleScroll('sobre')}
            className="hover:text-[#542381] transition-colors cursor-pointer"
          >
            Sobre
          </button>
        </nav>

        {/* Direita: Botão WhatsApp + Ícone do carrinho */}
        <div className="flex items-center gap-3">
          
          <a
            href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center px-4 h-10 rounded-xl bg-[#542381] hover:bg-[#431868] text-white text-xs font-semibold tracking-wide transition-all"
          >
            Pedir pelo WhatsApp
          </a>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 text-[#26222A] hover:text-[#542381] hover:bg-[#FBFAFC] rounded-xl transition-colors cursor-pointer"
            aria-label="Ver sacola de compras"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#542381] text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#26222A] hover:bg-[#FBFAFC] rounded-xl transition-colors"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#ECE8F0] px-4 py-4 space-y-3">
          <button
            onClick={() => handleScroll('cardapio')}
            className="block w-full text-left py-2 text-sm font-medium text-[#26222A] hover:text-[#542381]"
          >
            Cardápio
          </button>
          <button
            onClick={() => handleScroll('promocoes')}
            className="block w-full text-left py-2 text-sm font-medium text-[#26222A] hover:text-[#542381]"
          >
            Combos
          </button>
          <button
            onClick={() => handleScroll('sobre')}
            className="block w-full text-left py-2 text-sm font-medium text-[#26222A] hover:text-[#542381]"
          >
            Sobre
          </button>
          <div className="pt-2 border-t border-[#ECE8F0]">
            <a
              href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-xl bg-[#542381] text-white text-xs font-semibold"
            >
              Pedir pelo WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
