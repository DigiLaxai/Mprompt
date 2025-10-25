
import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

interface GeneratedImageViewProps {
  imageData: string;
  prompt: string;
  originalImage: { data: string; mimeType: string; } | null;
  onDownload: () => void;
}

export const GeneratedImageView: React.FC<GeneratedImageViewProps> = ({ imageData, prompt, originalImage, onDownload }) => {
  return (
    <div className="space-y-6 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-300">3. Your Generated Image</h2>
      
      <div className={`grid grid-cols-1 ${originalImage ? 'md:grid-cols-2' : ''} gap-6 items-start`}>
        {originalImage && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400 text-center">Original</h3>
            <img
              src={`data:${originalImage.mimeType};base64,${originalImage.data}`}
              alt="Original input"
              className="w-full h-auto rounded-lg border-2 border-slate-700"
            />
          </div>
        )}
        <div className={`space-y-2 ${!originalImage ? 'md:col-span-2' : ''}`}>
           {originalImage && <h3 className="text-sm font-semibold text-slate-400 text-center">Generated</h3>}
          <img
            src={`data:image/png;base64,${imageData}`}
            alt={prompt}
            className="w-full h-auto rounded-lg border-2 border-slate-700"
          />
        </div>
      </div>

       <p className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-md">
         <strong className="text-slate-300">Prompt:</strong> {prompt}
       </p>

      <button onClick={onDownload}
        className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 transition-all"
      >
        <DownloadIcon className="w-5 h-5" /> Download Image
      </button>
    </div>
  );
};
