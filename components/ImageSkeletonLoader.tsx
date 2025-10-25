
import React from 'react';

interface ImageSkeletonLoaderProps {
  hasOriginalImage: boolean;
}

const SkeletonBox: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-slate-700 rounded ${className || ''}`}></div>
);


export const ImageSkeletonLoader: React.FC<ImageSkeletonLoaderProps> = ({ hasOriginalImage }) => {
  return (
    <div className="space-y-6 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-300">3. Generating Your Image...</h2>
      
      <div className="animate-pulse">
        <div className={`grid grid-cols-1 ${hasOriginalImage ? 'md:grid-cols-2' : ''} gap-6 items-start`}>
          {hasOriginalImage && (
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-1/4 mx-auto" />
              <SkeletonBox className="w-full aspect-square" />
            </div>
          )}
          <div className={`space-y-2 ${!hasOriginalImage ? 'md:col-span-2' : ''}`}>
             {hasOriginalImage && <SkeletonBox className="h-4 w-1/4 mx-auto" />}
             <SkeletonBox className="w-full aspect-square" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
            <SkeletonBox className="h-4 w-20" />
            <SkeletonBox className="h-10" />
        </div>

        <div className="mt-6">
            <SkeletonBox className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
};
