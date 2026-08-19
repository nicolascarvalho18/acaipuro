import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light' | 'icon';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'dark', className = '' }) => {
  if (variant === 'icon') {
    return (
      <img
        src="/logo.png"
        alt="Açaí Puro Sabor"
        className={className || "w-9 h-9 object-contain"}
      />
    );
  }

  if (variant === 'light') {
    return (
      <div className={`inline-flex items-center bg-white px-3.5 py-2 rounded-xl shadow-xs ${className}`}>
        <img
          src="/logo.png"
          alt="Açaí Puro Sabor • Açaí Artesanal"
          className="h-10 sm:h-11 w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Açaí Puro Sabor • Açaí Artesanal"
        className="h-12 sm:h-14 w-auto object-contain"
        loading="eager"
      />
    </div>
  );
};
