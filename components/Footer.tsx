import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full text-center py-6 mt-12 border-t border-slate-800">
      <p className="text-sm text-slate-500">
        © {currentYear}{' '}
        <a 
          href="https://getpromptsis.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-yellow-400 transition-colors"
        >
          getpromptsis.com
        </a>
        . All Rights Reserved.
      </p>
    </footer>
  );
};