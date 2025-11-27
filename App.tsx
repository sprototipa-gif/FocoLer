
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Mic, Play, RotateCcw, Award, BarChart2, CheckCircle, Wand2, MicOff, AlertCircle, ArrowLeft, Download, Clock, PieChart, Activity, Eye, Edit, Volume2, StopCircle, ChevronRight, X, Lock, Key, Crown, Zap, Brain, Layout, Sparkles, CheckSquare, UserCheck, MessageSquare, Star, Smile, Heart, Accessibility, Type, Sun, Minus, Settings, HelpCircle, Loader2 } from 'lucide-react';
import { Button, Card } from './components/UI';
import { LIBRARY, LEVELS, PREMIUM_CODE } from './constants';
import { DifficultyLevel, ReadingResult, AccessibilitySettings, GeminiAnalysisResponse } from './types';
import { generateStory, analyzeReadingAudio } from './services/geminiService';

// --- Utils ---
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g., "data:audio/webm;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function App() {
  // Views & States
  const [view, setView] = useState<'home' | 'text_selection' | 'reading' | 'processing' | 'results' | 'custom_text'>('home');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumInput, setShowPremiumInput] = useState(false);
  const [premiumInput, setPremiumInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>('medio');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customTextInput, setCustomTextInput] = useState('');
  
  // Accessibility State
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    font: 'default',
    highContrast: false,
    readingRuler: false
  });

  // Reading Session
  const [currentTextOriginal, setCurrentTextOriginal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [resultData, setResultData] = useState<ReadingResult | null>(null);
  
  // Refs for Audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Init
  useEffect(() => {
    const savedTier = localStorage.getItem('focoler_tier');
    if (savedTier === 'premium') setIsPremium(true);
  }, []);

  // Accessibility Effects
  useEffect(() => {
    const root = document.documentElement;
    if (accessibility.font === 'dyslexic') root.classList.add('font-dyslexic');
    else root.classList.remove('font-dyslexic');
    
    if (accessibility.highContrast) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');
  }, [accessibility]);

  // Actions
  const handlePremiumUnlock = () => {
    if (premiumInput === PREMIUM_CODE) {
      localStorage.setItem('focoler_tier', 'premium');
      setIsPremium(true);
      setShowPremiumInput(false);
    }
  }

  const startReadingSession = (text: string) => {
    setCurrentTextOriginal(text);
    setView('reading');
    setIsRecording(false);
    audioChunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Precisamos de acesso ao microfone para avaliar a leitura.");
    }
  };

  const stopRecordingAndAnalyze = async () => {
    if (!mediaRecorderRef.current) return;

    setIsRecording(false);
    
    mediaRecorderRef.current.onstop = async () => {
      setView('processing');
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      try {
        const base64Audio = await blobToBase64(audioBlob);
        
        // Call Gemini API
        const analysis = await analyzeReadingAudio(base64Audio, currentTextOriginal);
        
        processResults(analysis);
        
      } catch (error) {
        console.error("Processing error", error);
        alert("Ocorreu um erro ao processar o áudio. Tente novamente.");
        setView('reading');
      } finally {
        // Stop all tracks to release microphone
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      }
    };

    mediaRecorderRef.current.stop();
  };

  const processResults = (analysis: GeminiAnalysisResponse) => {
    // 1. Calculate Metrics
    const totalWords = analysis.total_words_reference;
    const correctWords = analysis.total_words_read_correctly;
    const duration = analysis.duration_seconds > 0 ? analysis.duration_seconds : 1;

    // Fórmula padrão: (Total de Palavras Corretas) * (60 / Duração em Segundos)
    const ppm = Math.round(correctWords * (60 / duration));
    
    // (Total de Palavras Corretas / Total de Palavras do Texto) * 100
    const accuracy = Math.round((correctWords / totalWords) * 100);

    // 2. Classification Logic
    let profileKey = 'PRE_LEITOR'; // Default Red
    
    if (accuracy > 90) {
      if (ppm > 80) {
        profileKey = 'FLUENTE'; // Green
      } else if (ppm >= 60) {
        profileKey = 'INICIANTE'; // Yellow
      } else {
        profileKey = 'PRE_LEITOR'; // Red (Low speed despite high accuracy)
      }
    } else {
      profileKey = 'PRE_LEITOR'; // Red (Low accuracy)
    }

    const profile = LEVELS[profileKey];

    const result: ReadingResult = {
      ppm,
      accuracy,
      time: Math.round(duration),
      totalWords,
      correctWords,
      profile,
      date: new Date().toLocaleDateString('pt-BR'),
      analysis
    };

    setResultData(result);
    setView('results');
  };

  // --- Render Functions ---

  const renderHome = () => (
    <div className="space-y-8 animate-fade-in w-full pt-6 relative px-4 pb-20 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-violet-600 tracking-tight">Fluência Leitora</h1>
          <p className="text-slate-500 font-medium">Ferramenta de apoio ao desenvolvimento da leitura</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 text-violet-500">
            <HelpCircle className="w-6 h-6" />
          </button>
          <button onClick={() => setShowAccessibilityMenu(!showAccessibilityMenu)} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50">
            <Settings className="w-6 h-6 text-slate-400" />
          </button>
        </div>
      </div>
      
      {renderAccessibilityMenu()}

      {/* Level Selector */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400"></div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center mb-4">Nível de Leitura</span>
        <div className="flex gap-3 justify-center w-full">
          {[
            { id: 'facil', label: 'Fácil', color: 'bg-emerald-500' },
            { id: 'medio', label: 'Médio', color: 'bg-sky-500' },
            { id: 'dificil', label: 'Difícil', color: 'bg-violet-500' }
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevel(lvl.id as DifficultyLevel)}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold capitalize transition-all duration-300 relative overflow-hidden ${
                selectedLevel === lvl.id 
                ? `${lvl.color} text-white shadow-lg transform scale-105` 
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
        
        {!isPremium && (
          <button 
            onClick={() => setShowPremiumInput(true)}
            className="w-full mt-4 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
          >
            <Crown className="w-3 h-3" /> Desbloquear Versão Premium
          </button>
        )}
      </div>

      {/* Library Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(LIBRARY)
          .filter(([k]) => {
            if (k === 'Nivelamento') return false;
            if (k === 'Simulado' && !isPremium) return false;
            return true;
          })
          .map(([name, data]) => (
          <div key={name} onClick={() => { setSelectedCategory(name); setView('text_selection'); }}
            className={`group p-5 cursor-pointer bg-white rounded-3xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-4 relative overflow-hidden ${name === "Simulado" ? 'border-teal-100' : 'border-slate-50'}`}>
            <div className={`w-14 h-14 rounded-2xl ${data.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm flex-shrink-0`}>
              {data.icon}
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-display font-bold text-slate-700 text-lg leading-tight mb-1">{name}</h3>
              <p className="text-xs text-slate-400 font-medium">{data.texts[selectedLevel].length} histórias</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderTextSelection = () => {
    if (!selectedCategory || !LIBRARY[selectedCategory]) return null;
    const allTexts = LIBRARY[selectedCategory].texts[selectedLevel];
    const texts = isPremium ? allTexts : allTexts.slice(0, 1);

    return (
      <div className="space-y-6 animate-fade-in pt-4 w-full px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('home')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h2 className="font-display font-bold text-slate-800 text-xl">{selectedCategory}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Nível {selectedLevel}</p>
          </div>
        </div>
        <div className="grid gap-4 pb-24">
          {texts.map((text, index) => (
            <div key={index} onClick={() => startReadingSession(text)} className="group bg-white p-6 rounded-3xl border border-slate-100 cursor-pointer hover:border-violet-200 hover:shadow-lg transition-all active:scale-[0.98] relative overflow-hidden">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                  {index + 1}
                </div>
                <p className="text-slate-600 text-base line-clamp-3 leading-relaxed font-medium">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReading = () => (
    <div className="h-full flex flex-col pt-4 animate-fade-in w-full px-4 max-w-2xl mx-auto relative">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setView('home')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100"><ArrowLeft className="w-6 h-6" /></button>
        {isRecording && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full animate-pulse">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="font-bold text-sm">Gravando...</span>
          </div>
        )}
      </div>

      {/* Reading Card */}
      <div className="flex-1 bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6 overflow-y-auto relative">
        {/* Static Text - No Karaoke */}
        <p className="text-2xl md:text-3xl leading-loose font-medium text-slate-800 text-justify">
          {currentTextOriginal}
        </p>
      </div>

      {/* Controls */}
      <div className="pb-8">
        {!isRecording ? (
          <Button onClick={startRecording} variant="primary" className="w-full py-5 rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-violet-200 text-lg">
            <Mic className="w-6 h-6" /> Começar Leitura
          </Button>
        ) : (
          <Button onClick={stopRecordingAndAnalyze} variant="danger" className="w-full py-5 rounded-2xl text-lg">
            <StopCircle className="w-6 h-6" /> Concluir Leitura
          </Button>
        )}
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white px-6 text-center animate-fade-in">
      <div className="w-24 h-24 bg-violet-50 rounded-full flex items-center justify-center mb-6 relative">
        <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
        <Sparkles className="w-6 h-6 text-amber-400 absolute top-0 right-0 animate-bounce" />
      </div>
      <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">Analisando sua leitura...</h2>
      <p className="text-slate-500 max-w-xs">Nossa inteligência artificial está verificando cada palavra para gerar seu relatório.</p>
    </div>
  );

  const renderResults = () => {
    if (!resultData) return null;

    // Profile Color mapping
    const profileColors = {
      'FLUENTE': 'text-emerald-600 bg-emerald-100',
      'INICIANTE': 'text-amber-600 bg-amber-100',
      'PRE_LEITOR': 'text-red-500 bg-red-100',
      'EM_DESENVOLVIMENTO': 'text-red-500 bg-red-100' // Mapping default red
    };
    
    // Map profile description based on logic result
    const profileLabel = resultData.profile.label; // e.g. "Leitor Fluente"

    return (
      <div className="pt-6 animate-fade-in pb-10 w-full px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('home')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100"><ArrowLeft className="w-6 h-6" /></button>
          <h2 className="font-display font-bold text-2xl text-slate-800">Resultado</h2>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Precisão</span>
            <span className={`font-display text-4xl font-extrabold ${resultData.accuracy > 90 ? 'text-emerald-500' : 'text-slate-700'}`}>{resultData.accuracy}%</span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Velocidade</span>
            <span className="font-display text-4xl font-extrabold text-violet-600">{resultData.ppm} <span className="text-sm font-bold text-slate-400">PPM</span></span>
          </div>
        </div>

        {/* Classification Banner */}
        <div className={`p-6 rounded-3xl mb-8 flex items-center justify-between ${resultData.profile.bg}`}>
          <div>
            <p className="text-xs font-bold opacity-70 uppercase mb-1">Nível Identificado</p>
            <h3 className={`font-display font-bold text-2xl ${resultData.profile.color.split(' ')[0]}`}>{profileLabel}</h3>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/50 ${resultData.profile.color.split(' ')[0]}`}>
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Heatmap */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 pl-2"><Eye className="w-4 h-4 text-violet-500" /> Mapa de Calor da Leitura</h3>
          <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm text-lg leading-loose font-medium text-slate-700 text-justify">
            {resultData.analysis.words.map((w, i) => {
              let bgClass = "bg-transparent";
              if (w.status === 'correct') bgClass = "bg-[#d4edda]"; // Green
              else if (w.status === 'approximate') bgClass = "bg-[#fff3cd]"; // Yellow
              else if (w.status === 'wrong' || w.status === 'skipped') bgClass = "bg-[#f8d7da]"; // Red

              return (
                <span key={i} className={`mr-1 px-1 rounded ${bgClass}`}>
                  {w.word}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <Button onClick={() => setView('home')} variant="primary" className="w-full py-4 rounded-2xl bg-violet-600 shadow-violet-200">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  };

  const renderAccessibilityMenu = () => (
    <div className={`fixed right-4 top-20 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 w-64 z-50 transform transition-all duration-300 origin-top-right ${showAccessibilityMenu ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
      <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Accessibility className="w-4 h-4 text-violet-500"/> Acessibilidade</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Fonte Dislexia</span>
          <button onClick={() => setAccessibility(p => ({...p, font: p.font === 'default' ? 'dyslexic' : 'default'}))} className={`w-12 h-6 rounded-full flex items-center transition-colors ${accessibility.font === 'dyslexic' ? 'bg-violet-500 justify-end' : 'bg-slate-200 justify-start'}`}>
            <div className="w-5 h-5 bg-white rounded-full shadow-sm m-0.5"></div>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Alto Contraste</span>
          <button onClick={() => setAccessibility(p => ({...p, highContrast: !p.highContrast}))} className={`w-12 h-6 rounded-full flex items-center transition-colors ${accessibility.highContrast ? 'bg-violet-500 justify-end' : 'bg-slate-200 justify-start'}`}>
            <div className="w-5 h-5 bg-white rounded-full shadow-sm m-0.5"></div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderHelpModal = () => (
    showHelp && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto">
          <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          
          <h3 className="font-display font-bold text-2xl text-slate-800 mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" /> Como Funciona
          </h3>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-slate-700">Escolha o Texto</h4>
                <p className="text-sm text-slate-500 mt-1">Selecione o nível (Fácil, Médio, Difícil) e uma história.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-slate-700">Inicie a Leitura</h4>
                <p className="text-sm text-slate-500 mt-1">Clique em "Começar Leitura". Leia em voz alta no seu ritmo natural. O texto ficará parado na tela.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-slate-700">Finalize e Veja o Resultado</h4>
                <p className="text-sm text-slate-500 mt-1">Ao terminar, clique em "Concluir". Nossa IA analisará sua leitura e mostrará onde você acertou (Verde), quase acertou (Amarelo) ou precisa praticar (Vermelho).</p>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowHelp(false)} className="w-full mt-8 py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none">Entendi</Button>
        </div>
      </div>
    )
  );

  // Premium Input Modal
  const renderPremiumModal = () => (
    showPremiumInput && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
        <Card className="p-8 w-full max-w-sm space-y-6 relative bg-white rounded-3xl shadow-2xl">
          <button onClick={() => setShowPremiumInput(false)} className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Crown className="w-8 h-8 text-amber-500 fill-amber-500" />
            </div>
            <h3 className="font-display font-bold text-2xl text-slate-800">Seja Premium</h3>
            <div className="w-full space-y-4 mt-4">
              <input 
                type="text" 
                value={premiumInput}
                onChange={(e) => setPremiumInput(e.target.value)}
                placeholder="Digite o código"
                className="w-full px-5 py-3 border-2 border-slate-100 bg-slate-50 rounded-xl outline-none font-bold text-center text-lg focus:border-amber-400"
              />
              <Button onClick={handlePremiumUnlock} className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl shadow-lg">Confirmar</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-sky-50 font-sans text-slate-800 selection:bg-violet-200 pb-safe transition-colors duration-300">
      <div className="w-full max-w-lg mx-auto min-h-screen relative">
        <div className="h-full overflow-y-auto pb-safe">
          {view === 'home' && renderHome()}
          {view === 'text_selection' && renderTextSelection()}
          {view === 'reading' && renderReading()}
          {view === 'processing' && renderProcessing()}
          {view === 'results' && renderResults()}
        </div>
      </div>
      {renderHelpModal()}
      {renderPremiumModal()}
    </div>
  );
}
