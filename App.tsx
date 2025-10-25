
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { Spinner } from './components/Spinner';
import { 
  generatePromptFromImage, 
  generateInspirationFromImage,
  generateImage, 
  StructuredPrompt as FullStructuredPrompt,
} from './services/geminiService';
import { ErrorBanner } from './components/ErrorBanner';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { WandIcon } from './components/icons/WandIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { HistorySidebar } from './components/HistorySidebar';
import { getHistory, addToHistory, clearHistory, HistoryItem } from './utils/history';
import { ApiKeyModal } from './components/ApiKeyModal';
import { KeyIcon } from './components/icons/KeyIcon';
import { InspirationList } from './components/InspirationList';

const ART_STYLES = ['Photorealistic', 'Illustration', 'Anime', 'Oil Painting', 'Pixel Art', 'None'];

type StructuredPrompt = Omit<FullStructuredPrompt, 'style'>;

const getStyleSuffix = (style: string): string => {
  if (!style || style === 'None') return '';
  return `, in the style of ${style.toLowerCase()}`;
};

const constructPromptFromObject = (p: StructuredPrompt | null, style: string): string => {
  if (!p) return '';
  const stylePart = getStyleSuffix(style);
  return [
    p.subject,
    p.setting,
    p.composition,
    p.lighting,
    `using a ${p.colors} color palette`,
    `evoking a ${p.mood} mood`,
    stylePart
  ].filter(Boolean).join(', ').replace(/, ,/g, ',').trim();
};

const PromptField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
}> = ({ label, value, onChange, area }) => {
  const InputComponent = area ? 'textarea' : 'input';
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-400 mb-1">{label}</label>
      <InputComponent
        type="text"
        rows={area ? 3 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow"
      />
    </div>
  );
};


const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [structuredPrompt, setStructuredPrompt] = useState<StructuredPrompt | null>(null);
  const [inspirationPrompts, setInspirationPrompts] = useState<string[] | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  
  const [isGeneratingFromImage, setIsGeneratingFromImage] = useState(false);
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
        setApiKey(storedKey);
    } else {
        setIsSettingsOpen(true);
    }
    setHistory(getHistory());
  }, []);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini-api-key', newKey);
    setIsSettingsOpen(false);
    if (error?.toLowerCase().includes('api key')) {
        setError(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        setPrompt('');
        setStructuredPrompt(null);
        setInspirationPrompts(null);
        setGeneratedImageData(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePromptFromImage = useCallback(async () => {
    if (!uploadedImage) return;
    if (!apiKey) {
      setError("Please set your Gemini API key in the settings.");
      setIsSettingsOpen(true);
      return;
    }

    setIsGeneratingFromImage(true);
    setPrompt('');
    setStructuredPrompt(null);
    setInspirationPrompts(null);
    setError(null);
    try {
      const generated = await generatePromptFromImage(apiKey, uploadedImage);
      const { style, ...rest } = generated;
      const newStyle = style && ART_STYLES.includes(style) ? style : ART_STYLES[0];
      
      setStructuredPrompt(rest);
      setSelectedStyle(newStyle);
      setPrompt(constructPromptFromObject(rest, newStyle));
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsGeneratingFromImage(false);
    }
  }, [uploadedImage, apiKey]);
  
  const handleGetInspiration = useCallback(async () => {
    if (!uploadedImage) return;
    if (!apiKey) {
      setError("Please set your Gemini API key in the settings.");
      setIsSettingsOpen(true);
      return;
    }
  
    setIsGeneratingInspiration(true);
    setPrompt('');
    setStructuredPrompt(null);
    setInspirationPrompts(null);
    setError(null);
    try {
      const prompts = await generateInspirationFromImage(apiKey, uploadedImage);
      setInspirationPrompts(prompts);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while getting inspiration.');
    } finally {
      setIsGeneratingInspiration(false);
    }
  }, [uploadedImage, apiKey]);

  const handleSelectInspiration = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    setInspirationPrompts(null);
    setStructuredPrompt(null); // Switch to manual mode
  };

  const handleGenerateImage = useCallback(async () => {
    if (!prompt.trim()) return;
     if (!apiKey) {
      setError("Please set your Gemini API key in the settings.");
      setIsSettingsOpen(true);
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImageData(null);
    setError(null);
    try {
      const imageData = await generateImage(apiKey, prompt, uploadedImage);
      setGeneratedImageData(imageData);
      const newHistory = addToHistory({ prompt, imageData });
      setHistory(newHistory);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [prompt, uploadedImage, apiKey]);

  const handleStructuredPromptChange = (field: keyof StructuredPrompt, value: string) => {
    if (!structuredPrompt) return;
    const newStructuredPrompt = { ...structuredPrompt, [field]: value };
    setStructuredPrompt(newStructuredPrompt);
    setPrompt(constructPromptFromObject(newStructuredPrompt, selectedStyle));
  };

  const handleStyleChange = (newStyle: string) => {
    if (structuredPrompt) {
        setPrompt(constructPromptFromObject(structuredPrompt, newStyle));
    } else {
        const oldSuffix = getStyleSuffix(selectedStyle);
        const newSuffix = getStyleSuffix(newStyle);
        let currentBase = prompt;
        if (oldSuffix && prompt.endsWith(oldSuffix)) {
            currentBase = prompt.slice(0, prompt.length - oldSuffix.length);
        }
        setPrompt(currentBase + newSuffix);
    }
    setSelectedStyle(newStyle);
  };
  
  const handleFullReset = () => {
    setUploadedImage(null);
    setPrompt('');
    setStructuredPrompt(null);
    setInspirationPrompts(null);
    setSelectedStyle(ART_STYLES[0]);
    setError(null);
    setGeneratedImageData(null);
  }

  const handleCopy = useCallback(() => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  }, [prompt]);

  const handleDownload = () => {
    if (!generatedImageData) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImageData}`;
    const filename = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 50) || 'generated-image';
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setGeneratedImageData(item.imageData);
    setStructuredPrompt(null);
    setInspirationPrompts(null);
    setUploadedImage(null);
    setError(null);
    setIsHistoryOpen(false);
  };
  
  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };
  
  const isLoading = isGeneratingFromImage || isGeneratingInspiration || isGeneratingImage;

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans flex flex-col">
      <Header onHistoryClick={() => setIsHistoryOpen(true)} onSettingsClick={() => setIsSettingsOpen(true)} />
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveApiKey}
        currentApiKey={apiKey}
      />
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          {!apiKey && (
            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <KeyIcon className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm font-medium">Please set your Gemini API key to use the app.</p>
              </div>
              <button onClick={() => setIsSettingsOpen(true)} className="bg-yellow-500 text-slate-900 font-bold py-1.5 px-3 rounded-md hover:bg-yellow-400 text-sm whitespace-nowrap">
                Open Settings
              </button>
            </div>
          )}
          <div className="space-y-8">
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            
            <PromptInput 
              image={uploadedImage} 
              onImageChange={handleImageChange} 
              onCreatePrompt={handleCreatePromptFromImage} 
              onGetInspiration={handleGetInspiration}
              isAnalyzingImage={isGeneratingFromImage}
              isGeneratingInspiration={isGeneratingInspiration}
              showPromptingTools={!!prompt || !!inspirationPrompts}
              onImageRemove={handleFullReset} 
            />
            
            {(isGeneratingFromImage || isGeneratingInspiration) && <Spinner />}
            
            {inspirationPrompts && (
              <InspirationList 
                prompts={inspirationPrompts} 
                onSelect={handleSelectInspiration}
              />
            )}


            {prompt && !inspirationPrompts && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                  <label className="block text-lg font-semibold text-slate-300 mb-4">
                    1. Refine Your Prompt
                  </label>

                  {structuredPrompt && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="md:col-span-2">
                        <PromptField label="Subject" value={structuredPrompt.subject} onChange={v => handleStructuredPromptChange('subject', v)} area />
                      </div>
                      <div>
                        <PromptField label="Setting" value={structuredPrompt.setting} onChange={v => handleStructuredPromptChange('setting', v)} />
                      </div>
                      <div>
                        <PromptField label="Composition" value={structuredPrompt.composition} onChange={v => handleStructuredPromptChange('composition', v)} />
                      </div>
                      <div>
                        <PromptField label="Lighting" value={structuredPrompt.lighting} onChange={v => handleStructuredPromptChange('lighting', v)} />
                      </div>
                      <div>
                        <PromptField label="Color Palette" value={structuredPrompt.colors} onChange={v => handleStructuredPromptChange('colors', v)} />
                      </div>
                      <div className="md:col-span-2">
                        <PromptField label="Mood" value={structuredPrompt.mood} onChange={v => handleStructuredPromptChange('mood', v)} />
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-400 mb-2">
                      Artistic Style
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {ART_STYLES.map(style => (
                        <button key={style} onClick={() => handleStyleChange(style)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                            selectedStyle === style ? 'bg-yellow-500 text-slate-900 shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >{style}</button>
                      ))}
                      {selectedStyle && !ART_STYLES.includes(selectedStyle) && (
                        <button onClick={() => handleStyleChange(selectedStyle)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold bg-yellow-500 text-slate-900 shadow-md`}
                        >{selectedStyle} (AI)</button>
                      )}
                    </div>
                  </div>

                  <label htmlFor="prompt-editor" className="block text-sm font-semibold text-slate-400 mb-2">
                    Combined Prompt
                  </label>
                  <textarea id="prompt-editor" rows={5}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-shadow resize-y"
                    value={prompt} 
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (structuredPrompt) {
                        setStructuredPrompt(null);
                      }
                    }}
                  />
                  {structuredPrompt && <p className="text-xs text-slate-500 mt-1">Edit the fields above or start typing here to switch to manual mode.</p>}
                </div>

                <div className="flex flex-col sm:flex-row-reverse gap-4">
                  <button onClick={handleGenerateImage} disabled={isGeneratingImage || !prompt.trim()}
                    className="w-full sm:flex-grow flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
                  >
                    {isGeneratingImage ? <><Spinner small /> Generating...</> : <><WandIcon className="w-5 h-5" /> Generate Image</>}
                  </button>
                  <button onClick={handleCopy} disabled={!prompt.trim()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    {isCopied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {isGeneratingImage && <Spinner />}

            {generatedImageData && (
              <div className="space-y-6 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
                <h2 className="text-lg font-semibold text-slate-300">3. Your Generated Image</h2>
                <img src={`data:image/png;base64,${generatedImageData}`} alt="Generated by AI"
                  className="w-full h-auto rounded-lg border-2 border-slate-700"
                />
                <button onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 transition-all"
                >
                  <DownloadIcon className="w-5 h-5" /> Download Image
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
