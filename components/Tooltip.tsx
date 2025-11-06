
import React, { useState } from 'react';
import { InfoIcon } from './icons/InfoIcon';

interface TooltipProps {
  text: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative flex items-center">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-600"
        aria-label="More info"
      >
        <InfoIcon className="w-4 h-4" />
      </button>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 z-10 shadow-lg animate-fade-in">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};
