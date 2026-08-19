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
        className={className || "w-10 h-10 object-contain"}
      />
    );
  }

  if (variant === 'light') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/logo-light.png"
          alt="Açaí Puro Sabor • Açaí Artesanal"
          className="w-[150px] sm:w-[190px] md:w-[210px] h-auto object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Açaí Puro Sabor • Açaí Artesanal"
        className="w-[145px] sm:w-[185px] md:w-[210px] h-auto object-contain"
        loading="eager"
      />
    </div>
  );
};
