/**
 * MetricColorBar.tsx
 * Reusable color bar component - green center, red edges
 */

import React from 'react';

interface MetricColorBarProps {
  value: number; // 0-1 (e.g., 0.45 = 45%)
  label: string;
  score: number; // 0-10 
  optimalMin?: number; // Default 0.4 (40%)
  optimalMax?: number; // Default 0.6 (60%)
  formatValue?: (value: number) => string; // Custom formatter
  explanation?: string;
}

export const MetricColorBar: React.FC<MetricColorBarProps> = ({
  value,
  label,
  score,
  optimalMin = 0.4,
  optimalMax = 0.6,
  formatValue,
  explanation
}) => {
  const percent = value * 100;
  const displayValue = formatValue ? formatValue(value) : `${Math.round(percent)}%`;
  
  // Calculate color based on position
  const getColor = (): string => {
    // Green zone (optimal)
    if (value >= optimalMin && value <= optimalMax) {
      return '#10b981'; // Green
    }
    
    // Yellow zone (acceptable)
    if ((value >= optimalMin - 0.1 && value < optimalMin) || 
        (value > optimalMax && value <= optimalMax + 0.1)) {
      return '#f59e0b'; // Yellow/amber
    }
    
    // Red zone (needs work)
    return '#ef4444'; // Red
  };
  
  // Calculate gradient background for the bar
  const getBarGradient = (): string => {
    const red = '#ef4444';
    const yellow = '#f59e0b';
    const green = '#10b981';
    
    const optimalMinPercent = optimalMin * 100;
    const optimalMaxPercent = optimalMax * 100;
    
    // Gradient: red → yellow → green → yellow → red
    return `linear-gradient(to right, 
      ${red} 0%, 
      ${yellow} ${optimalMinPercent - 10}%, 
      ${green} ${optimalMinPercent}%, 
      ${green} ${optimalMaxPercent}%, 
      ${yellow} ${optimalMaxPercent + 10}%, 
      ${red} 100%)`;
  };
  
  const color = getColor();
  
  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{displayValue}</span>
          <div 
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ 
              backgroundColor: `${color}20`,
              color: color,
              border: `1px solid ${color}40`
            }}
          >
            {score}/10
          </div>
        </div>
      </div>
      
      {/* Color bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-white/5">
        {/* Gradient background */}
        <div 
          className="absolute inset-0"
          style={{ background: getBarGradient() }}
        />
        
        {/* Position indicator */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-300"
          style={{ 
            left: `${percent}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Triangle pointer on top */}
          <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '6px solid white',
            }}
          />
        </div>
      </div>
      
      {/* Explanation */}
      {explanation && (
        <p className="text-gray-400 text-sm mt-2 italic">
          {explanation}
        </p>
      )}
    </div>
  );
};

export default MetricColorBar;
