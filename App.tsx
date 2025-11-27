
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Mic, Play, RotateCcw, Award, MicOff, ArrowLeft, Loader2, Sparkles, Settings, HelpCircle, X, CheckCircle, Lock, Crown } from 'lucide-react';
import { Button, Card } from './components/UI';
import { LIBRARY, PREMIUM_CODE } from './constants';
import { DifficultyLevel, ReadingResult, AccessibilitySettings, AnalysisResult } from './types';
import { analyzeReading } from './services/geminiService';

export default function App() {
  // Views & States
  const [showLanding, setShowLanding] = useState(true);
  const [view, setView] = useState<'home' | 'text_selection' | 'reading' | 'results' | 'custom_text'>('home');
  
  // Premium
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumInput, setShowPremiumInput] = useState(false);
  const [premiumInput, setPremiumInput] = useState('');
  const [premiumError, setPremiumError] = useState(false);

  // Content Selection
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>('medio');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customTextInput, setCustomTextInput] = useState('');
  
  // Reading & Recording State
  const [currentTextOriginal, setCurrentTextOriginal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resultData, setResultData] = useState<ReadingResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Accessibility State
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    font: 'default',
    highContrast: false,
    readingRuler: false
  });

  // Refs for Audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Effects ---
  useEffect(() => {
    const savedTier = localStorage.getItem('focoler_tier');
    if (savedTier === 'premium') setIsPremium(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (accessibility.font === 'dyslexic') root.classList.add('font-dyslexic');
    else root.classList.remove('font-dyslexic');
    
    if (accessibility.highContrast) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');
  }, [accessibility]);

  // --- Logic ---

  const handlePremiumUnlock = () => {
    if (premiumInput === PREMIUM_CODE) {
      localStorage.setItem('focoler_tier', 'premium');
      setIsPremium(true);
      setShowPremiumInput(false);
      setPremiumError(false);
    } else {
      setPremiumError(true);
    }
  };

  const startReading = (text: string) => {
    setCurrentTextOriginal(text);
    setView('reading');
    setIsRecording(false);
    setAnalyzing(false);
  };

  const startRecordingAudio = async () => {
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

  const stopRecordingAndAnalyze = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    setIsRecording(false);
    setAnalyzing(true);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      // Stop all tracks
      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      
      try {
        const analysis = await analyzeReading(audioBlob, currentTextOriginal);
        processAnalysis(analysis);
      } catch (error) {
        console.error(error);
        alert("Ocorreu um erro ao analisar o áudio. Tente novamente.");
        setAnalyzing(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const processAnalysis = (data: AnalysisResult) => {
    // Metric Calculations based on Gemini Data
    
    // 1. Calculate counts
    const correctCount = data.words.filter(w => w.status === 'correct').length;
    const approximateCount = data.words.filter(w => w.status === 'approximate').length;
    const totalCorrect = correctCount + approximateCount;
    
    // 2. Metrics
    const duration = data.duration_seconds > 0 ? data.duration_seconds : 1;
    const ppm = Math.round(totalCorrect * (60 / duration));
    const accuracy = Math.round((totalCorrect / data.total_words_reference) * 100);

    // 3. Classification
    let classification = 'Em Desenvolvimento';
    let classificationColor = 'bg-red-100 text-red-700';

    if (accuracy > 90) {
      if (ppm > 80) {
        classification = 'Fluente';
        classificationColor = 'bg-emerald-100 text-emerald-700';
      } else if (ppm >= 60) {
        classification = 'Leitor Iniciante';
        classificationColor = 'bg-amber-100 text-amber-700';
      }
    }

    const result: ReadingResult = {
      ppm,
      accuracy,
      time: Math.round(duration),
      totalWords: data.total_words_reference,
      correctWords: totalCorrect,
      classification,
      classificationColor,
      date: new Date().toLocaleDateString('pt-BR'),
      heatmap: data.words
    };

    setResultData(result);
    setAnalyzing(false);
    setView('results');
  };

  // --- Views ---

  const renderLandingPage = () => (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-violet-600 rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-violet-200 mb-6">
        <BookOpen className="w-10 h-10 text-white" />
      </div>
      <h1 className="font-display text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
        Fluência Leitora
      </h1>
      <p className="text-lg text-slate-600 max-w-md mb-8">
        Ferramenta de apoio ao desenvolvimento da leitura. Avalie precisão e velocidade com Inteligência Artificial.
      </p>
      
      <div className="space-y-4 w-full max-w-xs">
        <Button onClick={() => setShowLanding(false)} className="w-full py-4 text-lg bg-violet-600 hover:bg-violet-700 shadow-xl rounded-full">
          Acessar Aplicação
        </Button>
        <button onClick={() => setShowHelp(true)} className="text-violet-600 font-bold text-sm hover:underline">
          Como funciona?
        </button>
      </div>

      <div className="mt-12 text-left bg-white p-6 rounded-3xl border border-slate-100 max-w-lg w-full">
        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500"/> Passo a Passo
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-500">
          <li>Escolha um texto adequado ao nível.</li>
          <li>Clique em gravar e leia em voz alta.</li>
          <li>A IA analisa sua leitura automaticamente.</li>
          <li>Receba feedback visual e métricas.</li>
        </ol>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-8 animate-fade-in w-full pt-6 px-2 pb-20">
      <div className="flex justify-between items-center px-2">
        <h1 className="font-display font-extrabold text-2xl text-violet-600 tracking-tight">FocoLer</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 bg-white rounded-full border hover:bg-slate-50"><HelpCircle className="w-5 h-5 text-slate-400"/></button>
          <button onClick={() => setShowAccessibilityMenu(!showAccessibilityMenu)} className="p-2 bg-white rounded-full border hover:bg-slate-50"><Settings className="w-5 h-5 text-slate-400"/></button>
        </div>
      </div>
      
      {renderAccessibilityMenu()}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center mb-4">Nível de Leitura</span>
        <div className="flex gap-2 justify-center w-full">
          {[{id:'facil', l:'Fácil'}, {id:'medio', l:'Médio'}, {id:'dificil', l:'Difícil'}].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevel(lvl.id as DifficultyLevel)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${selectedLevel === lvl.id ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              {lvl.l}
            </button>
          ))}
        </div>
        {!isPremium && (
          <button onClick={() => setShowPremiumInput(true)} className="w-full mt-4 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-100">
            <Crown className="w-3 h-3" /> Desbloquear Premium
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(LIBRARY).filter(([k]) => k !== 'Simulado' || isPremium).map(([name, data]) => (
          <div key={name} onClick={() => { setSelectedCategory(name); setView('text_selection'); }}
            className={`cursor-pointer bg-white p-5 rounded-3xl border-2 hover:border-violet-200 transition-all flex flex-col items-center text-center ${name === 'Simulado' ? 'border-teal-100' : 'border-slate-50'}`}>
            <div className={`w-12 h-12 rounded-2xl ${data.color} flex items-center justify-center mb-3`}>{data.icon}</div>
            <h3 className="font-bold text-slate-700 text-sm">{name}</h3>
          </div>
        ))}
        {isPremium && (
          <div onClick={() => setView('custom_text')} className="cursor-pointer bg-white p-5 rounded-3xl border-2 border-dashed border-slate-200 hover:border-violet-200 transition-all flex flex-col items-center text-center justify-center">
             <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Settings className="w-6 h-6 text-slate-400"/></div>
             <h3 className="font-bold text-slate-500 text-sm">Texto Próprio</h3>
          </div>
        )}
      </div>
    </div>
  );

  const renderReading = () => (
    <div className="h-full flex flex-col pt-4 animate-fade-in w-full px-2 relative">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => { if(isRecording) return; setView('home'); }} className="p-2 bg-white rounded-xl text-slate-500 shadow-sm border"><ArrowLeft className="w-5 h-5" /></button>
        <div className="font-display font-bold text-slate-700">Leitura</div>
        <div className="w-9"></div> 
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6 overflow-y-auto relative">
        {analyzing && (
          <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-violet-600 animate-spin mb-4" />
            <p className="font-bold text-slate-700">Analisando leitura...</p>
            <p className="text-xs text-slate-400">Isso pode levar alguns segundos.</p>
          </div>
        )}
        
        <p className="text-2xl md:text-3xl leading-relaxed font-medium text-slate-800 text-justify">
          {currentTextOriginal}
        </p>
      </div>

      <div className="pb-6">
        {!isRecording ? (
          <Button onClick={startRecordingAudio} variant="primary" className="w-full py-5 rounded-2xl text-lg shadow-violet-200 bg-violet-600 hover:bg-violet-700">
            <Mic className="w-6 h-6" /> Começar Leitura
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center items-center gap-2 animate-pulse text-red-500 font-bold">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div> Gravando...
            </div>
            <Button onClick={stopRecordingAndAnalyze} variant="success" className="w-full py-5 rounded-2xl text-lg bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200">
              <CheckCircle className="w-6 h-6" /> Concluir Leitura
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderResults = () => {
    if (!resultData) return null;
    
    return (
      <div className="pt-4 text-center space-y-6 animate-fade-in pb-10 w-full px-2">
        <div className={`p-6 rounded-3xl ${resultData.classificationColor} shadow-sm`}>
           <div className="text-sm uppercase font-bold tracking-widest opacity-70 mb-2">Classificação</div>
           <div className="font-display text-3xl font-extrabold">{resultData.classification}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <div className="font-display text-4xl font-bold text-violet-600">{resultData.accuracy}%</div>
            <div className="text-xs uppercase font-bold text-slate-400 mt-1">Precisão</div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <div className="font-display text-4xl font-bold text-sky-500">{resultData.ppm}</div>
            <div className="text-xs uppercase font-bold text-slate-400 mt-1">PPM</div>
          </div>
        </div>

        <div className="text-left bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500"/> Análise Detalhada
          </h3>
          <div className="text-lg leading-loose text-slate-800">
            {resultData.heatmap.map((item, idx) => {
              let bg = "transparent";
              if (item.status === 'correct') bg = "#d4edda"; // Green
              else if (item.status === 'approximate') bg = "#fff3cd"; // Yellow
              else if (item.status === 'wrong' || item.status === 'skipped') bg = "#f8d7da"; // Red
              
              return (
                <span key={idx} style={{ backgroundColor: bg }} className="px-1 rounded mx-0.5 inline-block">
                  {item.word}
                </span>
              );
            })}
          </div>
          <div className="flex gap-4 mt-6 text-xs text-slate-500 justify-center">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#d4edda]"></div> Correto</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#fff3cd]"></div> Aproximado</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#f8d7da]"></div> Atenção</div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={() => setView('home')} variant="secondary" className="flex-1 py-4 rounded-2xl border-slate-200 text-slate-600">Voltar</Button>
          <Button onClick={() => startReading(currentTextOriginal)} variant="primary" className="flex-1 py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-violet-200">Ler Novamente</Button>
        </div>
      </div>
    );
  };

  const renderTextSelection = () => {
    if (!selectedCategory || !LIBRARY[selectedCategory]) return null;
    const allTexts = LIBRARY[selectedCategory].texts[selectedLevel];
    const texts = isPremium ? allTexts : allTexts.slice(0, 1);

    return (
      <div className="space-y-6 animate-fade-in pt-4 w-full px-2">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('home')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h2 className="font-display font-bold text-slate-800 text-xl">{selectedCategory}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Nível {selectedLevel}</p>
          </div>
        </div>
        {!isPremium && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-sm flex items-start gap-3 border border-amber-100">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="font-medium">Modo Demonstração: Apenas 1 texto liberado.</span>
          </div>
        )}
        <div className="grid gap-4 pb-24">
          {texts.map((text, index) => (
            <div key={index} onClick={() => startReading(text)} className="group bg-white p-6 rounded-3xl border border-slate-100 cursor-pointer hover:border-violet-200 hover:shadow-lg transition-all active:scale-[0.98]">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 group-hover:text-violet-600">
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

  const renderAccessibilityMenu = () => (
    <div className={`fixed right-4 bottom-4 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 w-64 z-50 transform transition-all duration-300 origin-bottom-right ${showAccessibilityMenu ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
      <h3 className="font-bold text-slate-700 mb-3">Acessibilidade</h3>
      <div className="space-y-2">
        <button onClick={() => setAccessibility(p => ({...p, font: p.font === 'default' ? 'dyslexic' : 'default'}))} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm">Fonte Dislexia</button>
        <button onClick={() => setAccessibility(p => ({...p, highContrast: !p.highContrast}))} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm">Alto Contraste</button>
      </div>
    </div>
  );

  const renderHelpModal = () => (
    showHelp && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative animate-fade-in">
          <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-6 h-6"/></button>
          <h3 className="font-display font-bold text-xl mb-4">Como Usar</h3>
          <div className="space-y-4 text-slate-600 text-sm">
            <p>1. <strong>Escolha o Texto:</strong> Selecione o nível e o texto que deseja praticar.</p>
            <p>2. <strong>Prepare-se:</strong> Fique em um lugar silencioso.</p>
            <p>3. <strong>Inicie a Leitura:</strong> Clique em "Começar Leitura" e leia o texto no seu ritmo.</p>
            <p>4. <strong>Finalize:</strong> Clique em "Concluir" quando terminar.</p>
            <p>5. <strong>Resultado:</strong> Aguarde a análise da IA para ver suas métricas.</p>
          </div>
          <Button onClick={() => setShowHelp(false)} className="w-full mt-6 bg-violet-100 text-violet-700 hover:bg-violet-200 shadow-none">Entendi</Button>
        </div>
      </div>
    )
  );

  if (showLanding) return renderLandingPage();

  return (
    <div className="min-h-screen bg-sky-50 font-sans text-slate-800 selection:bg-violet-200 pb-safe transition-colors duration-300">
      <div className="w-full max-w-lg mx-auto min-h-screen relative">
        {renderHelpModal()}
        {/* Premium Modal */}
        {showPremiumInput && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
            <Card className="p-8 w-full max-w-sm space-y-4 relative bg-white rounded-3xl">
              <button onClick={() => setShowPremiumInput(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5"/></button>
              <h3 className="font-bold text-xl text-center">Código Premium</h3>
              <input type="text" value={premiumInput} onChange={(e) => setPremiumInput(e.target.value)} placeholder="Digite o código" className="w-full px-4 py-3 border rounded-xl text-center"/>
              {premiumError && <p className="text-red-500 text-xs text-center">Código inválido</p>}
              <Button onClick={handlePremiumUnlock} className="w-full bg-amber-500 text-white">Desbloquear</Button>
            </Card>
          </div>
        )}

        <div className="h-full p-4 overflow-y-auto pb-safe">
          {view === 'home' && renderHome()}
          {view === 'text_selection' && renderTextSelection()}
          {view === 'custom_text' && (
            <div className="pt-4">
               <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setView('home')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="font-display font-bold text-slate-800 text-xl">Texto Próprio</h2>
              </div>
              <textarea 
                className="w-full h-64 border-2 border-slate-200 rounded-3xl p-6 text-lg focus:border-violet-400 outline-none mb-4" 
                placeholder="Cole seu texto aqui..."
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
              />
              <Button disabled={!customTextInput.trim()} onClick={() => startReading(customTextInput)} className="w-full py-4 bg-violet-600 text-white rounded-2xl shadow-lg">Iniciar</Button>
            </div>
          )}
          {view === 'reading' && renderReading()}
          {view === 'results' && renderResults()}
        </div>
      </div>
    </div>
  );
}
