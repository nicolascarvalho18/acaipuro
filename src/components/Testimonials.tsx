import React from 'react';
import { TESTIMONIALS } from '../data/mockProducts';
import { Star } from 'lucide-react';

export const Testimonials: React.FC = () => {
  return (
    <section id="avaliacoes" className="py-16 bg-[#FCFAFD] border-t border-[#F0EBF5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#6B6471] uppercase tracking-wide mb-1">
            Opinião dos Clientes
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#24152D] font-['DM_Sans'] tracking-tight">
            O que nossos clientes dizem
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-[#F0EBF5] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#572185] text-[#572185]" />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-[#6B6471] leading-relaxed mb-4">
                  "{item.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-[#F0EBF5] flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-semibold text-[#24152D]">{item.name}</h4>
                  <p className="text-[11px] text-[#6B6471]">{item.role}</p>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
