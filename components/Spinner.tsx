
import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};