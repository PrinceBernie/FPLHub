import React from 'react';

interface ElectricSpikeIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

const ElectricSpikeIcon: React.FC<ElectricSpikeIconProps> = ({ 
  size = 24, 
  className = "",
  animate = true 
}) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Subtle Glow Effect */}
      {animate && (
        <div 
          className="absolute inset-0 rounded-sm bg-primary/20 blur-sm animate-pulse"
          style={{ 
            width: size * 1.3, 
            height: size * 1.3,
            left: -(size * 0.15),
            top: -(size * 0.15)
          }}
        />
      )}
      
      {/* Simple Zig-Zag Icon */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        {/* Simple zig-zag lightning bolt */}
        <path
          d="M13 2L4 14H10L11 22L20 10H14L13 2Z"
          fill="currentColor"
          className="text-primary"
        />
      </svg>
    </div>
  );
};

export default ElectricSpikeIcon;
