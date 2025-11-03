import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-orange-100 w-full text-center py-6 mt-12 border-t border-orange-200">
      <p className="text-sm text-gray-500">
        © {currentYear}{' '}
        <a 
          href="https://getpromptsis.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-violet-500 transition-colors"
        >
          getpromptsis.com
        </a>
        . All Rights Reserved.
      </p>
    </footer>
  );
};