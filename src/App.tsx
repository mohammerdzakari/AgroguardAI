import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Video, VideoOff, Sprout, 
  Activity, AlertCircle, CheckCircle2, 
  Loader2, MessageSquare, Info, X,
  RefreshCw, Search, Database as DbIcon,
  ChevronRight, ChevronDown, Leaf
} from 'lucide-react';
import { SYSTEM_INSTRUCTION, ConnectionStatus, LiveMessage, SEARCH_DISEASE_TOOL } from './constants';
import { AudioProcessor, AudioPlayer } from './services/audioUtils';
import { diseaseDb, Disease } from './services/diseaseService';

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Disease Database UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Disease[]>([]);
  const [isDbOpen, setIsDbOpen] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const addMessage = useCallback((role: 'user' | 'model', text: string) => {
    setMessages(prev => [...prev.slice(-10), { role, text, timestamp: Date.now() }]);
  }, []);

  const handleDiseaseSearch = (query: string) => {
    const results = diseaseDb.search(query);
    setSearchResults(results);
    if (results.length > 0 && !isDbOpen) setIsDbOpen(true);
  };

  const stopAll = useCallback(() => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    audioProcessorRef.current?.stop();
    audioPlayerRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    sessionRef.current?.close();
    
    setStatus('disconnected');
    setIsVideoEnabled(false);
  }, []);

  const startConnection = async () => {
    try {
      setStatus('connecting');
      setError(null);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Initialize Audio
      audioProcessorRef.current = new AudioProcessor();
      audioPlayerRef.current = new AudioPlayer();

      // Initialize Video
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          tools: [{ functionDeclarations: [SEARCH_DISEASE_TOOL] }],
          generationConfig: {
            temperature: 0.7,
          }
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            audioProcessorRef.current?.start((base64Data) => {
              if (!isMuted) {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=44100' }
                });
              }
            });

            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current && isVideoEnabled) {
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (context) {
                  canvas.width = 320;
                  canvas.height = 240;
                  context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                  const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                  session.sendRealtimeInput({
                    media: { data: base64Data, mimeType: 'image/jpeg' }
                  });
                }
              }
            }, 1000);
          },
          onmessage: async (message: any) => {
            // Handle Tool Calls
            if (message.toolCall) {
              const responses = message.toolCall.functionCalls.map((call: any) => {
                if (call.name === 'search_disease_database') {
                  const results = diseaseDb.search(call.args.query);
                  // Also update UI
                  setSearchResults(results);
                  setIsDbOpen(true);
                  return {
                    name: call.name,
                    id: call.id,
                    response: { result: results }
                  };
                }
                return null;
              }).filter(Boolean);

              if (responses.length > 0) {
                session.sendToolResponse({ functionResponses: responses });
              }
            }

            // Handle audio output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              audioPlayerRef.current?.playChunk(audioData);
            }

            // Handle transcription
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              addMessage('model', text);
            }

            if (message.serverContent?.interrupted) {
              audioPlayerRef.current?.stop();
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection lost. Please try again.");
            stopAll();
          },
          onclose: () => {
            stopAll();
          }
        }
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error("Failed to start:", err);
      setError(err.message || "Could not access camera or microphone.");
      setStatus('disconnected');
    }
  };

  const toggleMute = () => setIsMuted(prev => !prev);
  const toggleVideo = () => {
    setIsVideoEnabled(prev => !prev);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoEnabled);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <Sprout className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-none">AgroGuardAI</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mt-1">Expert Agronomy Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDbOpen(!isDbOpen)}
            className={`p-2 rounded-xl transition-all ${isDbOpen ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
          >
            <DbIcon size={20} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-emerald-500 animate-pulse' : 
              status === 'connecting' ? 'bg-amber-500 animate-bounce' : 'bg-zinc-600'
            }`} />
            <span className="text-xs font-medium text-zinc-400 capitalize">{status}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)]">
        
        {/* Left Column: Viewfinder & DB (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
          {/* Viewfinder Section */}
          <section className="relative group rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl flex-1">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoEnabled ? 'opacity-100' : 'opacity-0'}`}
            />
            
            <AnimatePresence>
              {!isVideoEnabled && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900"
                >
                  <VideoOff size={48} className="text-zinc-700 mb-4" />
                  <p className="text-zinc-500 text-sm font-medium">Camera is disabled</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
              <div className="flex justify-between items-start">
                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  <Activity size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Live Analysis</span>
                </div>
              </div>

              {/* Viewfinder Corners */}
              <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-emerald-500/50 rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-emerald-500/50 rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-emerald-500/50 rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-emerald-500/50 rounded-br-lg" />
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </section>

          {/* Disease Database Panel (Integrated) */}
          <AnimatePresence>
            {isDbOpen && (
              <motion.section 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[400px]"
              >
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                      type="text"
                      placeholder="Search disease database..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleDiseaseSearch(e.target.value);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <button onClick={() => setIsDbOpen(false)} className="text-zinc-500 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-zinc-500 text-sm">
                      {searchQuery ? 'No diseases found matching your query.' : 'Search for a crop or symptom to see details.'}
                    </div>
                  ) : (
                    searchResults.map(disease => (
                      <div 
                        key={disease.id}
                        onClick={() => setSelectedDisease(selectedDisease?.id === disease.id ? null : disease)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          selectedDisease?.id === disease.id 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-emerald-400 text-sm">{disease.name}</h3>
                          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">{disease.crop}</span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{disease.symptoms}</p>
                        
                        {selectedDisease?.id === disease.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 pt-3 border-t border-white/5 mt-3"
                          >
                            <div>
                              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Cause</h4>
                              <p className="text-xs text-zinc-300">{disease.causes}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                <h4 className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold mb-1">Organic</h4>
                                <p className="text-[11px] text-emerald-100/70">{disease.organic_treatment}</p>
                              </div>
                              <div className="bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                                <h4 className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-1">Chemical</h4>
                                <p className="text-[11px] text-blue-100/70">{disease.chemical_treatment}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Chat & Info (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
          {/* Status/Error Card */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-200">{error}</p>
                <button 
                  onClick={startConnection}
                  className="mt-2 text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Try Again
                </button>
              </div>
              <button onClick={() => setError(null)} className="text-red-500/50 hover:text-red-500">
                <X size={16} />
              </button>
            </motion.div>
          )}

          {/* Messages/Transcript */}
          <div className="flex-1 bg-zinc-900/50 border border-white/5 rounded-3xl p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare size={24} />
                </div>
                <p className="text-sm font-medium">Your conversation will appear here.</p>
                <p className="text-xs mt-1">Start the session and talk to AgroGuardAI about your crops.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <motion.div 
                  key={msg.timestamp + i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-zinc-600 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-start gap-3">
            <Info className="text-emerald-500 shrink-0" size={18} />
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              <span className="font-bold text-emerald-400">Pro Tip:</span> Point your camera at specific leaves or pests for a more accurate diagnosis.
            </p>
          </div>
        </div>
      </main>

      {/* Controls Bar */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-2xl">
          <button 
            onClick={toggleMute}
            disabled={status !== 'connected'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            } disabled:opacity-20`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button 
            onClick={toggleVideo}
            disabled={status !== 'connected'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              !isVideoEnabled ? 'bg-zinc-800 text-zinc-500' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            } disabled:opacity-20`}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {status === 'disconnected' ? (
            <button 
              onClick={startConnection}
              className="px-6 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            >
              <Activity size={18} />
              Start Session
            </button>
          ) : (
            <button 
              onClick={stopAll}
              className="px-6 h-12 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <X size={18} />
              End Session
            </button>
          )}
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
