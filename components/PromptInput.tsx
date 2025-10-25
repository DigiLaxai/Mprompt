
import React, { useRef } from 'react';
import { ImageIcon } from './icons/ImageIcon';
import { XIcon } from './icons/XIcon';
import { WandIcon } from './icons/WandIcon';

interface PromptInputProps {
  image: { data: string; mimeType: string; } | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreatePrompt: () => void;
  isAnalyzingImage: boolean;
  hasPrompt: boolean;
  onImageRemove: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ 
  image, 
  onImageChange, 
  onCreatePrompt, 
  isAnalyzingImage,
  hasPrompt,
  onImageRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUploadClick = () => {
    if (isAnalyzingImage) return;
    fileInputRef.current?.click();
  };
  
  if (hasPrompt) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
      
      {!image ? (
        <>
          <h2 className="text-xl font-semibold mb-4 text-center text-slate-300">Start Your Creation</h2>
          <div 
            onClick={handleImageUploadClick}
            className={`relative block w-full border-2 border-dashed border-slate-600 rounded-lg p-12 text-center transition-colors ${isAnalyzingImage ? 'cursor-not-allowed opacity-50' : 'hover:border-yellow-500 cursor-pointer'}`}
          >
            <ImageIcon className="mx-auto h-12 w-12 text-slate-500" />
            <span className="mt-2 block text-sm font-semibold text-slate-400">
              Upload an Image
            </span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={onImageChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onClick={(e) => (e.currentTarget.value = '')}
              disabled={isAnalyzingImage}
            />
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4 text-center text-slate-300">Create from Image</h2>
          <div className="relative w-full sm:w-48 mx-auto">
            <img 
              src={`data:${image.mimeType};base64,${image.data}`} 
              alt="Uploaded preview" 
              className="w-full h-auto object-cover rounded-lg shadow-md"
            />
            <button 
              onClick={onImageRemove}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition-transform transform hover:scale-110"
              aria-label="Remove image"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          {!hasPrompt && (
            <button
              onClick={onCreatePrompt}
              disabled={isAnalyzingImage}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-300"
            >
              {isAnalyzingImage ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Image...
                </>
              ) : (
                <>
                  <WandIcon className="w-5 h-5" />
                  Create Prompt from Image
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
