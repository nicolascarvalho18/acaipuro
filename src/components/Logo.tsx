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
        viewBox="0 0 44 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className || "w-9 h-9"}
        aria-label="Açaí Puro Sabor Ícone"
      >
        {/* Folha minimalista */}
        <path
          d="M26 3C26 3 34 5 36 12C31 14 24 11 22 7C21.5 5 23.5 3 26 3Z"
          fill={isLight ? "#F3EDF6" : "#7B9365"}
        />
        {/* Tigela com traço contínuo */}
        <path
          d="M4 18C5.5 29.5 14.5 37 24 37C33.5 37 42.5 29.5 44 18"
          stroke={isLight ? "#FFFFFF" : "#69318A"}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M2 18C8 15 16 14 24 14C32 14 40 15 46 18"
          stroke={isLight ? "#F3EDF6" : "#49245B"}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Símbolo Vetorial Minimalista */}
      <div className="shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 46 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 sm:w-11 sm:h-11"
          aria-hidden="true"
        >
          {/* Folha / Fruta com toque de verde natural ou lilás */}
          <path
            d="M27 3C27 3 35 5 37 13C32 15 25 12 23 7.5C22.5 5.5 24.5 3 27 3Z"
            fill={isLight ? "#F3EDF6" : "#7B9365"}
          />
          {/* Linha central da folha */}
          <path
            d="M23 7.5C27 9.5 31 11 37 13"
            stroke={isLight ? "#49245B" : "#FFFFFF"}
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Tigela elegante de Açaí */}
          <path
            d="M5 19C6.5 31 16 39 26 39C36 39 45.5 31 47 19"
            stroke={isLight ? "#FFFFFF" : "#69318A"}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Borda superior do Açaí */}
          <path
            d="M3 19C9.5 15.5 18 14.5 26 14.5C34 14.5 42.5 15.5 49 19"
            stroke={isLight ? "#F3EDF6" : "#49245B"}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Tipografia da Marca com excelente hierarquia */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span 
            className={`font-extrabold text-xl sm:text-[22px] tracking-tight font-['DM_Sans'] ${
              isLight ? 'text-[#F3EDF6]' : 'text-[#69318A]'
            }`}
          >
            Açaí
          </span>
          <span 
            className={`font-bold text-xl sm:text-[22px] tracking-tight font-['DM_Sans'] ${
              isLight ? 'text-white' : 'text-[#49245B]'
            }`}
          >
            Puro Sabor
          </span>
        </div>
        <span 
          className={`text-[11px] font-semibold tracking-wider uppercase mt-1 ${
            isLight ? 'text-[#D4C7DC]' : 'text-[#726C74]'
          }`}
        >
          Açaí artesanal
        </span>
      </div>
    </div>
  );
};
