import React from 'react';
import { HistoryIcon } from './icons/HistoryIcon';

interface HeaderProps {
    onHistoryClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHistoryClick }) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="text-yellow-400">Prompt</span>
            <span className="text-slate-300">Craft Studio</span>
          </h1>
          <button
            onClick={onHistoryClick}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="View history"
          >
            <HistoryIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};