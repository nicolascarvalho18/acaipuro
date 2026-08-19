import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Truck, 
  MessageSquareCheck, 
  ShieldCheck, 
  Heart 
} from 'lucide-react';

export const Diferenciais: React.FC = () => {
  const benefits = [
    {
      icon: Sparkles,
      iconBg: 'bg-purple-100 text-purple-700',
      title: 'Açaí Cremoso & 100% Puro',
      description: 'Polpa especial do Pará com textura aveludada, sem cristais de gelo e sem xaropes artificiais.',
      tag: 'Qualidade Premium'
    },
    {
      icon: Layers,
      iconBg: 'bg-pink-100 text-pink-700',
      title: '+30 Adicionais de Primeira',
      description: 'Frutas frescas fatiadas no dia, Nutella legítima, Leite Ninho, chocolates nobres e caldas caseiras.',
      tag: 'Variedade Total'
    },
    {
      icon: Truck,
      iconBg: 'bg-emerald-100 text-emerald-700',
      title: 'Entrega Rápida & Térmica',
      description: 'Embalagem térmica selada que mantém a consistência perfeita do açaí até a sua porta.',
      tag: 'Chega Geladinho'
    },
    {
      icon: MessageSquareCheck,
      iconBg: 'bg-amber-100 text-amber-700',
      title: 'Pedido Fácil no WhatsApp',
      description: 'Escolha seus itens, adicione à sacola e envie direto pro nosso WhatsApp em menos de 1 minuto.',
      tag: 'Sem Burocracia'
    },
  ];

  return (
    <section id="diferenciais" className="py-14 bg-white border-y border-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            Por que escolher nossa açaiteria?
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2B0938] tracking-tight font-['Outfit']">
            A melhor experiência de açaí <br /> da primeira à última colherada
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-3">
            Cuidado artesanal em cada detalhe para você saborear o puro sabor da Amazônia.
          </p>
        </div>

        {/* Grid de Diferenciais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="bg-gradient-to-b from-[#FAF5FF] to-white p-6 rounded-3xl border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white text-purple-900 border border-purple-100 shadow-xs">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-['Outfit']">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-purple-100/60 flex items-center gap-1.5 text-xs font-semibold text-purple-700 group-hover:text-purple-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Garantia de Satisfação</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
