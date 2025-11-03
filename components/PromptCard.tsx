
import React from 'react';

interface PromptCardProps {
  prompt: string;
  onSelect: () => void;
  title: string;
  icon: React.ReactNode;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onSelect, title, icon }) => {
  return (
    <div 
      className="bg-white p-4 rounded-lg border border-gray-200 hover:border-violet-500 hover:bg-violet-50 cursor-pointer transition-all duration-200 group"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      aria-label={`Select prompt: ${title}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-violet-500">{icon}</div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
        {prompt}
      </p>
    </div>
  );
};