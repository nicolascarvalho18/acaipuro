import React from 'react';
import { TESTIMONIALS } from '../data/mockProducts';
import { Star } from 'lucide-react';

export const Testimonials: React.FC = () => {
  if (!TESTIMONIALS || TESTIMONIALS.length === 0) return null;

  return (
    <section id="avaliacoes" className="py-14 sm:py-18 bg-[#FBFAFC] border-t border-[#ECE8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#26222A] font-['DM_Sans'] tracking-tight">
            Quem pede, recomenda
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-[#ECE8F0] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#542381] text-[#542381]" />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-[#716B76] leading-relaxed mb-4">
                  "{item.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-[#ECE8F0] flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-semibold text-[#26222A]">{item.name}</h4>
                  <p className="text-[11px] text-[#716B76]">{item.role}</p>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
