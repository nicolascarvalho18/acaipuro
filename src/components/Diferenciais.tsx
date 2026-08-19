import React from 'react';
import { Sparkles, Layers, Truck, MessageSquareCheck } from 'lucide-react';

export const Diferenciais: React.FC = () => {
  const benefits = [
    {
      icon: Sparkles,
      title: 'Açaí 100% Puro',
      description: 'Polpa selecionada do Pará, batida na consistência cremosa ideal sem adição de xaropes artificiais.',
    },
    {
      icon: Layers,
      title: 'Acompanhamentos Selecionados',
      description: 'Frutas frescas do dia, cremes artesanais e mais de 30 opções para montar do seu jeito.',
    },
    {
      icon: Truck,
      title: 'Entrega Rápida e Térmica',
      description: 'Embalagem lacrada que preserva a temperatura e consistência do açaí até o seu endereço.',
    },
    {
      icon: MessageSquareCheck,
      title: 'Pedido Direto no WhatsApp',
      description: 'Sem necessidade de cadastro ou aplicativos pesados. Tudo resolvido em poucos toques.',
    },
  ];

  return (
    <section id="sobre" className="py-16 bg-white border-y border-[#F0EBF5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#6B6471] uppercase tracking-wide mb-2">
            Nossos Diferenciais
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#24152D] font-['DM_Sans'] tracking-tight">
            Qualidade em cada detalhe
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="bg-[#FCFAFD] p-6 rounded-2xl border border-[#F0EBF5] flex flex-col justify-start"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F4EFF8] text-[#572185] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#24152D] mb-2 font-['DM_Sans']">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6B6471] leading-relaxed">
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
