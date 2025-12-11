
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
import { DocumentIcon } from './components/icons/DocumentIcon'; 
import { SparklesIcon } from './components/icons/SparklesIcon';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
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
  const [basePrompt, setBasePrompt] = useState(''); 
  const [finalPrompt, setFinalPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]);
  const [selectedFraming, setSelectedFraming] = useState(CAMERA_FRAMING_OPTIONS[CAMERA_FRAMING_OPTIONS.length - 1]);
  const [selectedLighting, setSelectedLighting] = useState(LIGHTING_OPTIONS[LIGHTING_OPTIONS.length - 1]);
  const [preserveFace, setPreserveFace] = useState(true);

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
      setPreserveFace(true);
      setNumberOfImages(1);
        
      setStage('EDIT');

      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        uploadedImage: uploadedImage!,
        basePrompt: sceneDescription,
        characterDescription: characterDescription,
        selectedStyle: defaultStyle,
        selectedFraming: defaultFraming,
        selectedLighting: defaultLighting,
        preserveFace: true,
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
            preserveFace,
            ...options 
        };
        const updatedHistory = [updatedItem, ...history.slice(1)];
        setHistory(updatedHistory);
        saveHistory(updatedHistory);
    }
  }, [history, uploadedImage, characterDescription, basePrompt, preserveFace]);

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
    setPreserveFace(true);
    setNumberOfImages(1);
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
    setPreserveFace(item.preserveFace ?? true);
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

  const handleGenerateImage = useCallback(async () => {
    if (!finalPrompt.trim()) return;

    if (!uploadedImage) {
      setError('An uploaded image is required to generate a new image.');
      return;
    }

    setIsGeneratingImage(true);
    setError(null);
    try {
      // Construct the style suffix
      const styleSuffix = getStyleSuffix(selectedStyle) + getFramingSuffix(selectedFraming) + getLightingSuffix(selectedLighting);

      // Pass components separately for better control in generation
      const images = await generateImageFromPrompt(
        {
          character: characterDescription,
          scene: basePrompt,
          style: styleSuffix
        },
        uploadedImage, 
        numberOfImages,
        preserveFace
      );
      setGeneratedImages(images);
      setIsModalOpen(true);
      updateHistoryWithOptions({ generatedImages: images });
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [finalPrompt, uploadedImage, numberOfImages, characterDescription, basePrompt, selectedStyle, selectedFraming, selectedLighting, preserveFace, updateHistoryWithOptions]);

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
            </div>
        </div>
    );
  }

  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans flex flex-col">
      <Header onHistoryClick={() => setIsHistoryOpen(true)} />
      
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 flex-grow">
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

              {/* Character Identity Editor */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <UserFocusIcon className="w-6 h-6 text-violet-500" />
                    <label htmlFor="character-description-editor" className="block text-lg font-semibold text-gray-700">
                      2. Character Identity
                    </label>
                    <Tooltip text={preserveFace ? "We will use your original photo to keep the face consistent." : "We will generate a completely new face based on this description."} />
                  </div>
                  
                  {/* Preserve Face Toggle */}
                   <label className="flex items-center gap-2 cursor-pointer bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors select-none">
                      <div className="relative inline-flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={preserveFace}
                              onChange={(e) => {
                                  const newValue = e.target.checked;
                                  setPreserveFace(newValue);
                                  updateHistoryWithOptions({ preserveFace: newValue });
                              }}
                          />
                          <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                          <span className="ml-2 text-sm font-medium text-gray-700">Preserve Face</span>
                      </div>
                  </label>
                </div>
                 <textarea
                  id="character-description-editor"
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow resize-y"
                  value={characterDescription}
                  onChange={handleCharacterDescriptionChange}
                  placeholder="Describe the character's physical traits..."
                />
              </div>

              {/* Scene and Action Editor */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <SparklesIcon className="w-6 h-6 text-violet-500" />
                  <label htmlFor="scene-description-editor" className="block text-lg font-semibold text-gray-700">
                    3. Scene, Clothing & Action
                  </label>
                  <Tooltip text="Describe the NEW outfit, background, and what the character is doing. The AI will prioritize this over the original image." />
                </div>
                 <textarea
                  id="scene-description-editor"
                  rows={4}
                  maxLength={2000}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow resize-y"
                  value={basePrompt}
                  onChange={handleBasePromptChange}
                  placeholder="E.g., Wearing a futuristic space suit, standing on Mars, red dust everywhere..."
                />
              </div>

              {/* Style Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Art Style</label>
                    <select 
                        value={selectedStyle} 
                        onChange={(e) => {
                            setSelectedStyle(e.target.value);
                            updateHistoryWithOptions({ selectedStyle: e.target.value });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 bg-white text-gray-900"
                    >
                        {ART_STYLES.map(s => <option key={s} value={s} className="bg-white text-gray-900">{s}</option>)}
                    </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Framing</label>
                    <select 
                        value={selectedFraming} 
                        onChange={(e) => {
                            setSelectedFraming(e.target.value);
                            updateHistoryWithOptions({ selectedFraming: e.target.value });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 bg-white text-gray-900"
                    >
                        {CAMERA_FRAMING_OPTIONS.map(s => <option key={s} value={s} className="bg-white text-gray-900">{s}</option>)}
                    </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lighting</label>
                    <select 
                        value={selectedLighting} 
                        onChange={(e) => {
                            setSelectedLighting(e.target.value);
                            updateHistoryWithOptions({ selectedLighting: e.target.value });
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 bg-white text-gray-900"
                    >
                        {LIGHTING_OPTIONS.map(s => <option key={s} value={s} className="bg-white text-gray-900">{s}</option>)}
                    </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Images</label>
                    <select 
                        value={numberOfImages} 
                        onChange={(e) => setNumberOfImages(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 bg-white text-gray-900"
                    >
                        {[1, 2, 3, 4].map(num => <option key={num} value={num} className="bg-white text-gray-900">{num}</option>)}
                    </select>
                </div>
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="w-full bg-violet-600 text-white text-lg font-bold py-4 px-6 rounded-xl hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
              >
                {isGeneratingImage ? (
                  <>
                    <Spinner />
                    <span className="ml-2">Generating Image...</span>
                  </>
                ) : (
                  <>
                    <WandIcon className="w-6 h-6" />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
