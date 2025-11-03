
import React from 'react';
import { HistoryIcon } from './icons/HistoryIcon';
import { SignOutIcon } from './icons/SignOutIcon';

interface HeaderProps {
    onHistoryClick: () => void;
    authenticatedEmail: string | null;
    onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHistoryClick, authenticatedEmail, onSignOut }) => {
  return (
    <header className="bg-orange-100 sticky top-0 z-10 border-b border-orange-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="text-violet-500">Prompt</span>
            <span className="text-gray-800">Craft Studio</span>
          </h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {authenticatedEmail && (
              <span className="text-sm text-gray-500 hidden md:block" aria-label="Current user">
                  {authenticatedEmail}
              </span>
            )}
            <button
              onClick={onHistoryClick}
              className="p-2 rounded-full text-gray-500 hover:bg-orange-200 hover:text-gray-800 transition-colors"
              aria-label="View history"
              disabled={!authenticatedEmail}
            >
              <HistoryIcon className="w-6 h-6" />
            </button>
             {authenticatedEmail && (
              <button
                  onClick={onSignOut}
                  className="p-2 rounded-full text-gray-500 hover:bg-orange-200 hover:text-gray-800 transition-colors"
                  aria-label="Sign out"
              >
                  <SignOutIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
