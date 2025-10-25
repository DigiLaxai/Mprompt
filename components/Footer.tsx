
import React from 'react';
import { WandIcon } from './icons/WandIcon';
import { Spinner } from './Spinner';

interface FooterProps {
  onGetRandomPrompt: () => void;
  isLoading: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onGetRandomPrompt, isLoading }) => {
  return (
    <footer className="bg-slate-900/80 backdrop-blur-sm sticky bottom-0 z-10 border-t border-slate-800 py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <button
          onClick={onGetRandomPrompt}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-slate-700 text-slate-200 font-bold py-2 px-5 rounded-lg hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
        >
          {isLoading ? (
            <>
              <Spinner small />
              Getting Prompt...
            </>
          ) : (
            <>
              <WandIcon className="w-5 h-5" />
              Get a Random Prompt
            </>
          )}
        </button>
      </div>
    </footer>
  );
};
