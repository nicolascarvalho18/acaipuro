import React from 'react';
import { TESTIMONIALS } from '../data/mockProducts';
import { Star, CheckCircle2, Quote } from 'lucide-react';

export const Testimonials: React.FC = () => {
  return (
    <section id="avaliacoes" className="py-16 bg-[#FAF5FF] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Star className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            Amado por Nossos Clientes
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2B0938] tracking-tight font-['Outfit']">
            Quem experimenta, se apaixona! 💜
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Veja o que dizem as pessoas que pedem e recomendam nosso açaí todos os dias.
          </p>
        </div>

        {/* Grid de Depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
            >
              <Quote className="w-8 h-8 text-purple-100 absolute top-4 right-4 group-hover:text-purple-200 transition-colors" />

              <div>
                {/* Estrelas */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Comentário */}
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed italic mb-4">
                  "{item.comment}"
                </p>
              </div>

              {/* Autor */}
              <div className="pt-4 border-t border-purple-50 flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-100"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold text-gray-900">{item.name}</h4>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-[10px] text-gray-500">{item.role}</p>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Nota de transparência configurável */}
        <p className="text-[11px] text-center text-gray-400 mt-8">
          * Depoimentos demonstrativos de clientes parceiros. Sujeitos a atualização no painel de configurações.
        </p>

      </div>
    </section>
  );
};
