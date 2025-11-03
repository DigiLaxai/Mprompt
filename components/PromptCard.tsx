
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
      className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-yellow-500 hover:bg-slate-700/50 cursor-pointer transition-all duration-200 group"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      aria-label={`Select prompt: ${title}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-yellow-400">{icon}</div>
        <h3 className="font-semibold text-slate-200">{title}</h3>
      </div>
      <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
        {prompt}
      </p>
    </div>
  );
};
