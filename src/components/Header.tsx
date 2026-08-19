import React, { useState, useEffect } from 'react';
import { STORE_CONFIG } from '../config/storeConfig';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../utils/formatters';
import { 
  ShoppingBag, 
  Menu as MenuIcon, 
  X, 
  FileSpreadsheet
} from 'lucide-react';

interface HeaderProps {
  onOpenSheetsGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSheetsGuide }) => {
  const { itemCount, subtotal, setIsCartOpen } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Início', href: '#inicio' },
    { label: 'Cardápio', href: '#cardapio' },
    { label: 'Combos & Ofertas', href: '#promocoes' },
    { label: 'Diferenciais', href: '#diferenciais' },
    { label: 'Avaliações', href: '#avaliacoes' },
    { label: 'Localização', href: '#contato' },
  ];

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-purple-950/5 border-b border-purple-100 py-3' 
        : 'bg-white border-b border-purple-50 py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Marca */}
          <a href="#inicio" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#3D0C5A] via-[#6B21A8] to-[#EC4899] flex items-center justify-center shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform">
              <span className="text-2xl" role="img" aria-label="Açaí">🍧</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#2B0938] font-['Outfit']">
                  {STORE_CONFIG.storeName.split(' ')[0]}
                </span>
                <span className="font-bold text-lg sm:text-xl text-[#9333EA] font-['Outfit']">
                  {STORE_CONFIG.storeName.split(' ').slice(1).join(' ')}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-purple-600 font-medium tracking-wide">
                Açaiteria Artesanal & Delivery
              </p>
            </div>
          </a>

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-1 bg-purple-50/70 p-1.5 rounded-full border border-purple-100">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:text-purple-900 hover:bg-white rounded-full transition-all duration-200 cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Ações / WhatsApp / Carrinho */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Botão Guia do Lojista / Planilha (Discreto) */}
            <button
              onClick={onOpenSheetsGuide}
              title="Gerenciar Cardápio / Google Sheets"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-100/80 rounded-xl transition-all border border-purple-200/60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">Admin Cardápio</span>
            </button>

            {/* Botão WhatsApp Direto */}
            <a
              href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre o cardápio.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>WhatsApp</span>
            </a>

            {/* Botão Sacola / Carrinho */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-[#3D0C5A] hover:bg-[#2B0938] text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-md shadow-purple-950/20 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              aria-label="Abrir carrinho de compras"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-purple-200 group-hover:scale-110 transition-transform" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#EC4899] text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {itemCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] text-purple-200 uppercase tracking-wider font-semibold">Minha Sacola</span>
                <span className="text-xs font-bold text-white">
                  {itemCount === 0 ? 'R$ 0,00' : formatCurrency(subtotal)}
                </span>
              </div>
            </button>

            {/* Menu Mobile Hambúrguer */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-purple-900 hover:bg-purple-50 rounded-xl transition-colors"
              aria-label="Abrir menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>

          </div>

        </div>

        {/* Menu Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-purple-100 pb-2 space-y-1.5 animate-fadeIn">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-800 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                <span className="text-purple-300">›</span>
              </button>
            ))}
            
            <div className="pt-2 border-t border-purple-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSheetsGuide();
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-xl flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>Instruções do Cardápio (Google Sheets)</span>
              </button>

              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre o cardápio.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-all"
              >
                Falar com a loja no WhatsApp ({STORE_CONFIG.whatsappFormatted})
              </a>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
