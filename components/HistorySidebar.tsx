
import React from 'react';
import { HistoryItem } from '../utils/history';
import { CloseIcon } from './icons/CloseIcon';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  history,
  onSelect,
  onClear,
}) => {
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your entire generation history? This cannot be undone.')) {
        onClear();
    }
  }

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900/95 backdrop-blur-lg border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-labelledby="history-title"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
            <h2 id="history-title" className="text-xl font-semibold text-slate-200">
              Generation History
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              aria-label="Close history"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </header>

          {history.length > 0 ? (
            <>
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="w-full text-left bg-slate-800/50 hover:bg-slate-700/50 p-3 rounded-lg flex items-center gap-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <img
                      src={`data:image/png;base64,${item.imageData}`}
                      alt="Generated image thumbnail"
                      className="w-20 h-20 object-cover rounded-md bg-slate-700 flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="overflow-hidden">
                      <p className="text-sm text-slate-300 font-medium truncate">
                        {item.prompt}
                      </p>
                      <span className="text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-slate-800 flex-shrink-0">
                  <button
                      onClick={handleClear}
                      className="w-full text-center bg-red-800/50 text-red-300 hover:bg-red-700/50 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                      Clear History
                  </button>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
              <p className="text-slate-400">No history yet.</p>
              <p className="text-sm text-slate-500">
                Generated images will appear here.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
