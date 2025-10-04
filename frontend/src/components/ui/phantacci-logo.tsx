import React from 'react';
import ElectricSpikeIcon from './electric-spike-icon';

interface PhantacciLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animate?: boolean;
  className?: string;
  variant?: 'default' | 'vertical' | 'minimal';
}

const PhantacciLogo: React.FC<PhantacciLogoProps> = ({ 
  size = 'md',
  showText = true,
  animate = true,
  className = "",
  variant = 'default'
}) => {
  const sizeConfig = {
    sm: { icon: 16, text: 'text-sm', spacing: 'gap-1' },
    md: { icon: 20, text: 'text-base', spacing: 'gap-2' },
    lg: { icon: 24, text: 'text-lg', spacing: 'gap-2' },
    xl: { icon: 32, text: 'text-xl', spacing: 'gap-3' }
  };

  const config = sizeConfig[size];

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center ${className}`}>
        <ElectricSpikeIcon size={config.icon} animate={animate} />
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <ElectricSpikeIcon size={config.icon} animate={animate} />
        {showText && (
          <div className="mt-1">
            <span className={`font-bold text-gradient ${config.text}`}>
              Phantacci
            </span>
            <div className={`${config.text === 'text-xl' ? 'text-xs' : 'text-[10px]'} text-muted-foreground uppercase tracking-wider`}>
              HUB
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${config.spacing} ${className}`}>
      <ElectricSpikeIcon size={config.icon} animate={animate} />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-gradient leading-none ${config.text}`}>
            Phantacci
          </span>
          <span className={`${config.text === 'text-xl' ? 'text-xs' : 'text-[10px]'} text-muted-foreground uppercase tracking-wider leading-none`}>
            HUB
          </span>
        </div>
      )}
    </div>
  );
};

export default PhantacciLogo;
