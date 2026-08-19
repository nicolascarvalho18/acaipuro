import React from 'react';
import { Sparkles, Layers, Truck, MessageSquareCheck } from 'lucide-react';

export const Diferenciais: React.FC = () => {
  const benefits = [
    {
      icon: Sparkles,
      title: 'Açaí de qualidade',
      description: 'Preparado na hora e servido do jeito que você escolher.',
    },
    {
      icon: Layers,
      title: 'Monte como quiser',
      description: 'Frutas, cremes, chocolates e acompanhamentos variados.',
    },
    {
      icon: Truck,
      title: 'Entrega bem cuidada',
      description: 'Seu pedido chega em embalagem adequada e pronto para aproveitar.',
    },
    {
      icon: MessageSquareCheck,
      title: 'Pedido sem complicação',
      description: 'Escolha seus produtos e finalize diretamente pelo WhatsApp.',
    },
  ];

  return (
    <section id="sobre" className="py-14 sm:py-16 bg-white border-y border-[#ECE8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#28242A] font-['DM_Sans'] tracking-tight">
            Por que pedir com a gente?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="bg-[#FCFAF7] p-6 sm:p-7 rounded-2xl border border-[#ECE8F0] flex flex-col justify-start hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-white text-[#69318A] border border-[#ECE8F0] flex items-center justify-center mb-4 shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
                <h3 className="text-base font-bold text-[#28242A] mb-1.5 font-['DM_Sans']">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#726C74] leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
