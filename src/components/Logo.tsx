import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light' | 'icon';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'dark', className = '' }) => {
  const isLight = variant === 'light';

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className || "w-9 h-9"}
        aria-label="Açaí Puro Sabor Ícone"
      >
        {/* Tigela / Bowl */}
        <path
          d="M6 22C6 34.15 15.85 44 28 44C38.2 44 46.7 37 49.3 27.5C49.8 25.7 48.4 24 46.5 24H9.5C7.6 24 6.2 25.7 6.7 27.5"
          stroke={isLight ? "#FFFFFF" : "#572185"}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Superfície do Açaí */}
        <path
          d="M10 24C14 21 20 20 28 20C36 20 42 21 46 24"
          stroke={isLight ? "#EEE8F4" : "#2F173B"}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Folha Orgânica estilizada */}
        <path
          d="M28 6C28 6 36 8 38 16C33 18 26 15 24 10C23 7.5 25.5 6 28 6Z"
          fill={isLight ? "#EEE8F4" : "#572185"}
        />
        <path
          d="M24 10C28 12 33 13 38 16"
          stroke={isLight ? "#2F173B" : "#FFFFFF"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Símbolo Vetorial Original de Tigela + Folha */}
      <div className="shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 52 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-9 sm:w-11 sm:h-10"
          aria-hidden="true"
        >
          {/* Folha / Fruta superior */}
          <path
            d="M30 4C30 4 39 6.5 41 15C35 17 28 14 26 8.5C25 6 27.5 4 30 4Z"
            fill={isLight ? "#D8C7E8" : "#572185"}
          />
          <path
            d="M26 8.5C30 11 35 12 41 15"
            stroke={isLight ? "#2F173B" : "#FFFFFF"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Tigela de Açaí */}
          <path
            d="M5 22C6.5 34.5 17 44 30 44C43 44 53.5 34.5 55 22"
            stroke={isLight ? "#FFFFFF" : "#572185"}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          {/* Linha da borda do açaí */}
          <path
            d="M3 22C10 18 20 17 30 17C40 17 50 18 57 22"
            stroke={isLight ? "#D8C7E8" : "#2F173B"}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Detalhe de textura da tigela */}
          <path
            d="M16 32C20 36 25 38 30 38C35 38 40 36 44 32"
            stroke={isLight ? "rgba(255,255,255,0.4)" : "#EEE8F4"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Tipografia da Marca */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span 
            className={`font-extrabold text-xl sm:text-2xl tracking-tight font-['DM_Sans'] ${
              isLight ? 'text-[#D8C7E8]' : 'text-[#572185]'
            }`}
          >
            Açaí
          </span>
          <span 
            className={`font-bold text-xl sm:text-2xl tracking-tight font-['DM_Sans'] ${
              isLight ? 'text-white' : 'text-[#2F173B]'
            }`}
          >
            Puro Sabor
          </span>
        </div>
        <span 
          className={`text-[11px] font-medium tracking-wider uppercase mt-1 ${
            isLight ? 'text-white/60' : 'text-[#716B76]'
          }`}
        >
          Açaí artesanal
        </span>
      </div>
    </div>
  );
};
