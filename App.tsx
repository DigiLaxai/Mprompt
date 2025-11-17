
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { Spinner } from './components/Spinner';
import { Footer } from './components/Footer';
import { HistorySidebar } from './components/HistorySidebar';
import { analyzeImageForPrompt, generateImageFromPrompt, setGeminiApiKey } from './services/geminiService';
import { ErrorBanner } from './components/ErrorBanner';
import { HistoryItem, getHistory, saveHistory } from './utils/history';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { WandIcon } from './components/icons/WandIcon';
import { GeneratedImageModal } from './components/GeneratedImageModal';
import { XIcon } from './components/icons/XIcon';
import { Tooltip } from './components/Tooltip';
import { UserFocusIcon } from './components/icons/UserFocusIcon';

// FIX: Define AIStudio interface and use it for window.aistudio to resolve
// conflicting global declarations. The error message indicates that
// window.aistudio is expected to be of type AIStudio.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // FIX: Made `aistudio` optional to resolve the declaration conflict. The property is checked for existence before use, indicating it may be undefined.
    aistudio?: AIStudio;
  }
}

type Stage = 'INPUT' | 'EDIT';
type Image = { data: string; mimeType: string; };

const ART_STYLES = ['Photorealistic', 'Illustration', 'Anime', 'Oil Painting', 'Pixel Art', 'None'];
const CAMERA_FRAMING_OPTIONS = ['Full Shot', 'Medium Shot', 'Close-up', 'Extreme Close-up', 'None'];
const LIGHTING_OPTIONS = ['Cinematic Lighting', 'Golden Hour', 'Studio Lighting', 'Backlit', 'None'];

const getStyleSuffix = (style: string): string => {
  if (!style || style === 'None') return '';
  return `, in the style of ${style.toLowerCase()}`;
};

const getFramingSuffix = (framing: string): string => {
  if (!framing || framing === 'None') return '';
  return `, ${framing.toLowerCase()}`;
};

const getLightingSuffix = (lighting: string): string => {
  if (!lighting || lighting === 'None') return '';
  return `, ${lighting.toLowerCase()}`;
};

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [isStudioEnv, setIsStudioEnv] = useState(false);
  const [userApiKeyInput, setUserApiKeyInput] = useState('');

  const [uploadedImage, setUploadedImage] = useState<Image | null>(null);
  const [stage, setStage] = useState<Stage>('INPUT');
  
  const [characterDescription, setCharacterDescription] = useState('');
  const [basePrompt, setBasePrompt] = useState(''); // This now holds the scene description
  const [finalPrompt, setFinalPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  const [selectedFraming, setSelectedFraming] = useState(CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1]);
  const [selectedLighting, setSelectedLighting] = useState(LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1]);

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Image[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [numberOfImages, setNumberOfImages] = useState(1);
  
  useEffect(() => {
    const fullBase = characterDescription ? `${characterDescription}. ${basePrompt}` : basePrompt;
    setFinalPrompt(fullBase + getStyleSuffix(selectedStyle) + getFramingSuffix(selectedFraming) + getLightingSuffix(selectedLighting));
  }, [basePrompt, characterDescription, selectedStyle, selectedFraming, selectedLighting]);
  
  useEffect(() => {
    setHistory(getHistory());
    const checkKey = async () => {
        if (process.env.API_KEY) {
            setApiKeyReady(true);
            return;
        }
        const sessionKey = sessionStorage.getItem('user-api-key');
        if (sessionKey) {
            setGeminiApiKey(sessionKey);
            setApiKeyReady(true);
            return;
        }
        if (window.aistudio) {
            setIsStudioEnv(true);
            setApiKeyReady(await window.aistudio.hasSelectedApiKey());
        } else {
            setIsStudioEnv(false);
        }
    };
    checkKey();
  }, []);
  
  const handleSelectKey = async () => {
    setError(null);
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setApiKeyReady(true);
    } else {
        setError("API key management is not available in this environment.");
    }
  };

  const handleUserKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userApiKeyInput.trim()) {
        setGeminiApiKey(userApiKeyInput.trim());
        sessionStorage.setItem('user-api-key', userApiKeyInput.trim());
        setApiKeyReady(true);
    } else {
        setError("Please enter a valid API key.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        handleStartOver(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    handleStartOver();
  };

  const handleAuthError = (err: any) => {
    const message = err.message || 'An unexpected error occurred.';
    const isAuthError = message.includes('API key not valid') ||
                        message.includes('API_KEY_INVALID') ||
                        message.includes('Requested entity was not found');
    
    if (isAuthError) {
      setError('Your API key seems to be invalid. Please provide a valid key.');
      sessionStorage.removeItem('user-api-key');
      setApiKeyReady(false);
    } else {
      setError(message);
    }
  };
  
  const handleCreatePrompt = useCallback(async () => {
    if (!uploadedImage) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);
    setBasePrompt('');
    setCharacterDescription('');

    try {
      const { characterDescription, sceneDescription } = await analyzeImageForPrompt(uploadedImage);
      
      setCharacterDescription(characterDescription);
      setBasePrompt(sceneDescription);

      const defaultStyle = ART_STYLES[0];
      const defaultFraming = CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1];
      const defaultLighting = LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1];
        
      setSelectedStyle(defaultStyle);
      setSelectedFraming(defaultFraming);
      setSelectedLighting(defaultLighting);
        
      setStage('EDIT');

      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        uploadedImage: uploadedImage!,
        basePrompt: sceneDescription,
        characterDescription: characterDescription,
        selectedStyle: defaultStyle,
        selectedFraming: defaultFraming,
        selectedLighting: defaultLighting,
      };
      const updatedHistory = [newHistoryItem, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      saveHistory(updatedHistory);

    } catch (err: any) {
      handleAuthError(err);
      setStage('INPUT');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImage, history]);

  const updateHistoryWithOptions = useCallback((options: Partial<HistoryItem>) => {
    const latestHistoryItem = history[0];
    if (latestHistoryItem && latestHistoryItem.uploadedImage?.data === uploadedImage?.data) {
        const updatedItem = { 
            ...latestHistoryItem, 
            characterDescription,
            basePrompt,
            ...options 
        };
        const updatedHistory = [updatedItem, ...history.slice(1)];
        setHistory(updatedHistory);
        saveHistory(updatedHistory);
    }
  }, [history, uploadedImage, characterDescription, basePrompt]);

  const handleStyleChange = (newStyle: string) => {
    setSelectedStyle(newStyle);
    updateHistoryWithOptions({ selectedStyle: newStyle });
  };

  const handleFramingChange = (newFraming: string) => {
    setSelectedFraming(newFraming);
    updateHistoryWithOptions({ selectedFraming: newFraming });
  };

  const handleLightingChange = (newLighting: string) => {
    setSelectedLighting(newLighting);
    updateHistoryWithOptions({ selectedLighting: newLighting });
  };
  
  const handleCharacterDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDescription = e.target.value;
      setCharacterDescription(newDescription);
      updateHistoryWithOptions({ characterDescription: newDescription });
  };
  
  const handleBasePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newBasePrompt = e.target.value;
      setBasePrompt(newBasePrompt);
      updateHistoryWithOptions({ basePrompt: newBasePrompt });
  };

  const handleStartOver = (keepImage = false) => {
    if (!keepImage) {
      setUploadedImage(null);
    }
    setBasePrompt('');
    setFinalPrompt('');
    setCharacterDescription('');
    setSelectedStyle(ART_STYLES[0]);
    setSelectedFraming(CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1]);
    setSelectedLighting(LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1]);
    setStage('INPUT');
    setGeneratedImages(null);
    setError(null);
  };

  const loadFromHistory = (item: HistoryItem) => {
    const framing = item.selectedFraming || CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1];
    const lighting = item.selectedLighting || LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1];

    setUploadedImage(item.uploadedImage);
    setCharacterDescription(item.characterDescription || '');
    setBasePrompt(item.basePrompt);
    setSelectedStyle(item.selectedStyle);
    setSelectedFraming(framing);
    setSelectedLighting(lighting);
    setGeneratedImages(item.generatedImages || null);
    setStage('EDIT');
    setIsHistoryOpen(false);
    setError(null);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        setHistory([]);
        saveHistory([]);
    }
  };

  const handleCopy = useCallback(() => {
    if (!finalPrompt) return;
    navigator.clipboard.writeText(finalPrompt).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  }, [finalPrompt]);

  const handleGenerateImage = useCallback(async () => {
    if (!finalPrompt.trim()) return;

    if (!uploadedImage) {
      setError('An uploaded image is required to generate a new image.');
      return;
    }

    setIsGeneratingImage(true);
    setError(null);
    try {
      const images = await generateImageFromPrompt(finalPrompt, uploadedImage, numberOfImages);
      setGeneratedImages(images);
      setIsModalOpen(true);
      updateHistoryWithOptions({ generatedImages: images });
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [finalPrompt, uploadedImage, numberOfImages, updateHistoryWithOptions]);

  const handleClearError = () => setError(null);
  
  if (!apiKeyReady) {
    return (
        <div className="bg-gray-100 min-h-screen flex items-center justify-center font-sans">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md mx-4 animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">API Key Required</h1>
                
                {isStudioEnv ? (
                    <>
                        <p className="text-gray-600 mb-6">
                            This application requires a Google AI API key to function. Please select your key to continue.
                        </p>
                        <button
                            onClick={handleSelectKey}
                            className="w-full bg-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600 transition-colors duration-300"
                        >
                            Select Your API Key
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-gray-600 mb-6">
                            Please enter your Google AI API key to continue. Your key is only stored for this session.
                        </p>
                        <form onSubmit={handleUserKeySubmit} className="space-y-4">
                            <input
                                type="password"
                                value={userApiKeyInput}
                                onChange={(e) => setUserApiKeyInput(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                placeholder="Enter your API Key"
                                aria-label="API Key Input"
                            />
                            <button
                                type="submit"
                                className="w-full bg-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600 transition-colors duration-300"
                            >
                                Continue
                            </button>
                        </form>
                    </>
                )}

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 block text-sm text-gray-500 hover:text-violet-600 transition-colors"
                >
                  Don't have a key? Get one from Google AI Studio
                </a>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans flex flex-col">
      <Header 
        onHistoryClick={() => setIsHistoryOpen(true)}
      />
      
      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onLoad={loadFromHistory}
        onClear={handleClearHistory}
      />

      <GeneratedImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imagesData={generatedImages}
        prompt={finalPrompt}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          {error && (
            <ErrorBanner message={error} onDismiss={handleClearError} />
          )}
          
          {stage === 'INPUT' && (
            <div className="animate-fade-in">
              <PromptInput
                image={uploadedImage}
                onImageChange={handleImageChange}
                onImageRemove={handleImageRemove}
                onCreatePrompt={handleCreatePrompt}
                isLoading={isLoading}
              />
              {isLoading && (
                 <div className="text-center p-8 bg-white rounded-xl shadow-lg mt-6">
                   <Spinner />
                   <p className="text-gray-600 mt-4 font-semibold animate-pulse">Analyzing image to build your prompt...</p>
                 </div>
              )}
            </div>
          )}

          {stage === 'EDIT' && uploadedImage && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-600">1. Your Image</h2>
                   <button onClick={() => handleStartOver(true)} className="text-sm text-violet-500 hover:text-violet-600 font-semibold">
                    Reset Prompt
                  </button>
                </div>
                <div className="relative w-full max-w-sm mx-auto">
                  <img 
                    src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} 
                    alt="Uploaded content" 
                    className="rounded-xl shadow-lg border-2 border-gray-200 w-full"
                  />
                   <button 
                    onClick={()=>handleStartOver()}
                    className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-500 text-white rounded-full p-2 shadow-lg transition-transform transform hover:scale-110"
                    aria-label="Start over"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <UserFocusIcon className="w-6 h-6 text-violet-500" />
                  <label htmlFor="character-description-editor" className="block text-lg font-semibold text-gray-700">
                    2. Character Description
                  </label>
                  <Tooltip text="This description helps create consistent images of your character. Edit it to change their appearance." />
                </div>
                 <textarea
                  id="character-description-editor"
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow resize-y"
                  value={characterDescription}
                  onChange={handleCharacterDescriptionChange}
                  placeholder="Describe the character..."
                />
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label htmlFor="prompt-editor" className="block text-lg font-semibold text-gray-700 mb-3">
                  3. Scene & Action
                </label>
                <textarea
                  id="prompt-editor"
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow resize-y"
                  value={basePrompt}
                  onChange={handleBasePromptChange}
                  placeholder="Describe the scene, setting, and what the character is doing..."
                />
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  4. Choose an Artistic Style
                </label>
                <div className="flex flex-wrap gap-3">
                  {ART_STYLES.map(style => (
                    <button
                      key={style}
                      onClick={() => handleStyleChange(style)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedStyle === style
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  5. Choose Camera Framing
                </label>
                <div className="flex flex-wrap gap-3">
                  {CAMERA_FRAMING_OPTIONS.map(framing => (
                    <button
                      key={framing}
                      onClick={() => handleFramingChange(framing)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedFraming === framing
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {framing}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  6. Choose Lighting
                </label>
                <div className="flex flex-wrap gap-3">
                  {LIGHTING_OPTIONS.map(lighting => (
                    <button
                      key={lighting}
                      onClick={() => handleLightingChange(lighting)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                        selectedLighting === lighting
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {lighting}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 md:sticky bottom-4 z-5">
                 <label className="block text-lg font-semibold text-gray-700 mb-3">
                  7. Generate Your Image
                </label>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Number of Images</label>
                  <div className="flex items-center gap-2">
                      {[1, 2, 3, 4].map(num => (
                          <button
                              key={num}
                              onClick={() => setNumberOfImages(num)}
                              className={`w-10 h-10 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center justify-center ${
                                  numberOfImages === num
                                  ? 'bg-violet-500 text-white shadow-md'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                          >
                              {num}
                          </button>
                      ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleCopy}
                    disabled={!finalPrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gray-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-all duration-300 ease-in-out"
                  >
                    {isCopied ? <><CheckIcon className="w-5 h-5" /> Copied Full Prompt!</> : <><CopyIcon className="w-5 h-5" /> Copy Full Prompt</>}
                  </button>
                  <button
                    onClick={handleGenerateImage}
                    disabled={!finalPrompt.trim() || isGeneratingImage}
                    className="w-full flex items-center justify-center gap-2 bg-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-all duration-300 ease-in-out"
                  >
                    {isGeneratingImage ? (
                      <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...</>
                    ) : (
                      <><WandIcon className="w-5 h-5" /> Generate Image{numberOfImages > 1 ? 's' : ''}</>
                    )}
                  </button>
                </div>
                <div className="mt-4">
                    <p className="text-xs text-gray-500 font-mono bg-gray-100 p-3 rounded-md border border-gray-200 break-words">{finalPrompt || 'Your final prompt will appear here.'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
