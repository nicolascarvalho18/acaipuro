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
    <header className="sticky top-0 z-40 bg-white border-b border-[#F0EBF5] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        
        {/* À esquerda: Logo */}
        <a href="#inicio" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#572185] flex items-center justify-center text-white text-base">
            🍧
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-[#24152D] tracking-tight font-['DM_Sans'] leading-none">
              {STORE_CONFIG.storeName}
            </span>
            <span className="text-[11px] text-[#6B6471] font-normal mt-0.5">
              Açaí artesanal
            </span>
          </div>
        </a>

        {/* Ao centro: Links Cardápio, Combos, Sobre */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B6471]">
          <button
            onClick={() => handleScroll('cardapio')}
            className="hover:text-[#572185] transition-colors cursor-pointer"
          >
            Cardápio
          </button>
          <button
            onClick={() => handleScroll('promocoes')}
            className="hover:text-[#572185] transition-colors cursor-pointer"
          >
            Combos
          </button>
          <button
            onClick={() => handleScroll('sobre')}
            className="hover:text-[#572185] transition-colors cursor-pointer"
          >
            Sobre
          </button>
        </nav>

        {/* À direita: Botão WhatsApp + Ícone discreto do carrinho */}
        <div className="flex items-center gap-3">
          
          {/* Botão Pedir pelo WhatsApp */}
          <a
            href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center px-4 h-10 rounded-xl bg-[#572185] hover:bg-[#431868] text-white text-xs font-semibold tracking-wide transition-all shadow-xs"
          >
            Pedir pelo WhatsApp
          </a>

          {/* Ícone discreto do carrinho */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 text-[#24152D] hover:text-[#572185] hover:bg-[#F4EFF8] rounded-xl transition-colors cursor-pointer"
            aria-label="Ver sacola de compras"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#572185] text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          {/* Menu Mobile Hambúrguer */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#24152D] hover:bg-[#F4EFF8] rounded-xl transition-colors"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

      </div>

      {/* Menu Mobile Retrátil */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#F0EBF5] px-4 py-4 space-y-3">
          <button
            onClick={() => handleScroll('cardapio')}
            className="block w-full text-left py-2 text-sm font-medium text-[#24152D] hover:text-[#572185]"
          >
            Cardápio
          </button>
          <button
            onClick={() => handleScroll('promocoes')}
            className="block w-full text-left py-2 text-sm font-medium text-[#24152D] hover:text-[#572185]"
          >
            Combos
          </button>
          <button
            onClick={() => handleScroll('sobre')}
            className="block w-full text-left py-2 text-sm font-medium text-[#24152D] hover:text-[#572185]"
          >
            Sobre
          </button>
          <div className="pt-2 border-t border-[#F0EBF5]">
            <a
              href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-xl bg-[#572185] text-white text-xs font-semibold"
            >
              Pedir pelo WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
