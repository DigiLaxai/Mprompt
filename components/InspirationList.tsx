
import React from 'react';
import { WandIcon } from './icons/WandIcon';

interface InspirationListProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export const InspirationList: React.FC<InspirationListProps> = ({ prompts, onSelect }) => {
  return (
    <div className="space-y-6 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-300 text-center">
        Choose a Creative Direction
      </h2>
      <div className="space-y-3">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelect(prompt)}
            className="w-full text-left bg-slate-700/50 hover:bg-slate-700 p-4 rounded-lg transition-colors duration-200 group"
          >
            <p className="text-slate-300 group-hover:text-yellow-400 transition-colors">
              {prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
