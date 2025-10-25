import React from 'react';
import { HistoryItem } from '../utils/history';
import { CloseIcon } from './icons/CloseIcon';
import { ImageIcon } from './icons/ImageIcon';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onClear: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, history, onLoad, onClear }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-20 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside className={`fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl z-30 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-yellow-400">History</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close history">
              <CloseIcon className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          
          {history.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <p className="text-slate-500">Your generated images will appear here.</p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-700/50 border border-transparent hover:border-yellow-500/30 transition-all flex items-start gap-4"
                  onClick={() => onLoad(item)}
                >
                  <div className="w-16 h-16 flex-shrink-0 bg-slate-700 rounded-md flex items-center justify-center">
                    {item.uploadedImage ? (
                      <img 
                        src={`data:${item.uploadedImage.mimeType};base64,${item.uploadedImage.data}`}
                        alt="Uploaded thumbnail"
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm text-slate-200 truncate font-medium">{item.basePrompt}</p>
                    <p className="text-xs text-slate-500 mt-1">Style: {item.selectedStyle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="p-4 border-t border-slate-700">
                <button 
                    onClick={onClear} 
                    className="w-full bg-red-800/50 text-red-300 hover:bg-red-800 hover:text-red-200 py-2 rounded-lg transition-colors"
                >
                    Clear History
                </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};