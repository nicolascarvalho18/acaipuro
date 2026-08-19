import React, { useState } from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { useCart } from '../contexts/CartContext';
import { Logo } from './Logo';
import { ShoppingBag, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const { itemCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#ECE8F0] transition-all">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo Refinada com boa presença */}
        <a href="#inicio" className="flex items-center group cursor-pointer">
          <Logo variant="dark" />
        </a>

        {/* Navegação Central com espaçamento generoso */}
        <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-[#726C74]">
          <button
            onClick={() => handleScroll('cardapio')}
            className="hover:text-[#69318A] transition-colors cursor-pointer py-1"
          >
            Cardápio
          </button>
          <button
            onClick={() => handleScroll('promocoes')}
            className="hover:text-[#69318A] transition-colors cursor-pointer py-1"
          >
            Combos
          </button>
          <button
            onClick={() => handleScroll('sobre')}
            className="hover:text-[#69318A] transition-colors cursor-pointer py-1"
          >
            Sobre
          </button>
        </nav>

        {/* Ações à Direita */}
        <div className="flex items-center gap-3.5">
          
          <a
            href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center px-5 h-11 rounded-xl bg-[#69318A] hover:bg-[#572185] text-white text-xs font-semibold tracking-wide transition-all shadow-xs"
          >
            Pedir pelo WhatsApp
          </a>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 text-[#28242A] hover:text-[#69318A] hover:bg-[#F3EDF6] rounded-xl transition-colors cursor-pointer"
            aria-label="Ver sacola de compras"
          >
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            {itemCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#69318A] text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#28242A] hover:bg-[#F3EDF6] rounded-xl transition-colors"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 stroke-[1.8]" /> : <Menu className="w-5 h-5 stroke-[1.8]" />}
          </button>

        </div>

      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#ECE8F0] px-4 py-4 space-y-3">
          <button
            onClick={() => handleScroll('cardapio')}
            className="block w-full text-left py-2 text-sm font-medium text-[#28242A] hover:text-[#69318A]"
          >
            Cardápio
          </button>
          <button
            onClick={() => handleScroll('promocoes')}
            className="block w-full text-left py-2 text-sm font-medium text-[#28242A] hover:text-[#69318A]"
          >
            Combos
          </button>
          <button
            onClick={() => handleScroll('sobre')}
            className="block w-full text-left py-2 text-sm font-medium text-[#28242A] hover:text-[#69318A]"
          >
            Sobre
          </button>
          <div className="pt-2 border-t border-[#ECE8F0]">
            <a
              href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-xl bg-[#69318A] text-white text-xs font-semibold"
            >
              Pedir pelo WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
