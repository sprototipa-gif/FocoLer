import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Mic, Play, RotateCcw, Award, BarChart2, CheckCircle, Wand2, MicOff, AlertCircle, ArrowLeft, Download, Clock, PieChart, Activity, Eye, Edit, Volume2, StopCircle, ChevronRight, X, Lock, Key, Crown, Zap, Brain, Layout, Sparkles, CheckSquare, UserCheck, MessageSquare } from 'lucide-react';
import { Button, Card } from './components/UI';
import { LIBRARY, LEVELS, PREMIUM_CODE } from './constants';
import { DifficultyLevel, IWindow, ReadingResult, WordObject, HeatmapItem } from './types';
import { generateStory } from './services/geminiService';

// --- Algoritmos Auxiliares ---

const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
};

const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  if (longer.length === 0) return 1.0;
  return (longer.length - getLevenshteinDistance(s1, s2)) / longer.length;
};

// Enhanced cleaning: Removes accents (NFD), punctuation, hyphens and lowercases.
const cleanWord = (word: string): string => {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/-/g, "") // Remove hyphens (beija-flor -> beijaflor)
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
    .trim();
};

// Dynamic Threshold based on word length
const getMatchThreshold = (wordLength: number): number => {
  if (wordLength <= 2) return 0.90; // Strict for very short words
  if (wordLength <= 4) return 0.80; // Moderate
  return 0.65; // Tolerant for longer words
};

const calculateFluencyScore = (
  total_palavras_lidas: number,
  total_palavras_corretas: number,
  tempo_leitura_segundos: number,
  prosodia_nivel: number = 3,
  acertos_compreensao: number = 5,
  total_questoes_compreensao: number = 5
) => {
  const precisao = total_palavras_lidas > 0 ? (total_palavras_corretas / total_palavras_lidas) * 100 : 0;
  const ppm = tempo_leitura_segundos > 0 ? (total_palavras_lidas / tempo_leitura_segundos) * 60 : 0;
  const velocidadeScore = Math.min((ppm / 110) * 100, 100);
  const prosodiaScore = (prosodia_nivel / 4) * 100;
  const compreensaoScore = total_questoes_compreensao > 0 ? (acertos_compreensao / total_questoes_compreensao) * 100 : 0;
  const notaFinal = ((precisao * 0.30) + (velocidadeScore * 0.30) + (prosodiaScore * 0.20) + (compreensaoScore * 0.20));
  
  let classificacao = "";
  if (notaFinal >= 75) classificacao = "Avançado";
  else if (notaFinal >= 50) classificacao = "Adequado";
  else classificacao = "Abaixo do esperado";

  return { nota: Math.round(notaFinal), classificacao, ppm: Math.round(ppm) };
};

export default function App() {
  // Views
  const [showLanding, setShowLanding] = useState(true);
  const [view, setView] = useState<'home' | 'text_selection' | 'reading' | 'results' | 'generating' | 'custom_text'>('home');
  
  // Access Control & Tiers
  const [isPremium, setIsPremium] = useState(false);
  
  // Premium Upgrade UI
  const [showPremiumInput, setShowPremiumInput] = useState(false);
  const [premiumInput, setPremiumInput] = useState('');
  const [premiumError, setPremiumError] = useState(false);

  // Reading Config
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>('medio');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customTextInput, setCustomTextInput] = useState('');

  // Reading Session
  const [currentTextOriginal, setCurrentTextOriginal] = useState('');
  const [wordsArray, setWordsArray] = useState<WordObject[]>([]); 
  const [currentWordIndex, setCurrentWordIndex] = useState(0); 
  
  // Controls
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [resultData, setResultData] = useState<ReadingResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // REFS
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const wordsRef = useRef<WordObject[]>([]);
  const indexRef = useRef(0);
  const runningRef = useRef(false);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  // Check Premium on Mount
  useEffect(() => {
    const savedTier = localStorage.getItem('focoler_tier'); // 'standard' | 'premium'
    if (savedTier === 'premium') {
      setIsPremium(true);
    }
  }, []);

  // Sync Refs
  useEffect(() => { wordsRef.current = wordsArray; }, [wordsArray]);
  useEffect(() => { indexRef.current = currentWordIndex; }, [currentWordIndex]);
  useEffect(() => { runningRef.current = isTimerRunning; }, [isTimerRunning]);

  // Auto Scroll
  useEffect(() => {
    if (activeWordRef.current && isTimerRunning) {
      activeWordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentWordIndex, isTimerRunning]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          if (!runningRef.current) return;
          
          const results = event.results;
          const lastResult = results[results.length - 1];
          const transcript = lastResult[0].transcript.toLowerCase();
          
          // Split transcript into individual cleaned words
          const spokenWordsRaw = transcript.split(/\s+/);
          const spokenWords = spokenWordsRaw
            .map((w: string) => cleanWord(w))
            .filter((w: string) => w.length > 0);
            
          if (spokenWords.length === 0) return;

          // --- ROBUST SEQUENTIAL ALIGNMENT & DOUBLE ANCHOR LOGIC ---
          
          const PROCESS_WINDOW = 12; // Look at last 12 spoken words
          const batch = spokenWords.slice(-PROCESS_WINDOW); 
          
          let currentIndex = indexRef.current;
          const allWords = wordsRef.current;
          const LOOKAHEAD_LIMIT = 8; 

          let changesMade = false;
          let newWordsArray = [...allWords];

          // Iterate through recent spoken words
          for (let i = 0; i < batch.length; i++) {
            const spoken = batch[i];
            if (currentIndex >= allWords.length) break;

            const targetWordClean = allWords[currentIndex].clean;
            const targetLength = targetWordClean.length;

            // 1. Check EXACT Match at Current Index
            const simCurrent = getSimilarity(spoken, targetWordClean);
            const thresholdCurrent = getMatchThreshold(targetLength);

            if (simCurrent >= thresholdCurrent) {
              if (newWordsArray[currentIndex].status === 'pending') {
                // Immutable update
                newWordsArray[currentIndex] = {
                  ...newWordsArray[currentIndex],
                  status: simCurrent > 0.9 ? 'correct' : 'near'
                };
                currentIndex++;
                changesMade = true;
                continue;
              }
            }

            // 1.5 Check Compound Word Match (Spoken "beija" + "flor" = Target "beijaflor")
            if (i + 1 < batch.length) {
              const combinedSpoken = spoken + batch[i+1];
              const simCombined = getSimilarity(combinedSpoken, targetWordClean);
              if (simCombined >= thresholdCurrent) {
                 if (newWordsArray[currentIndex].status === 'pending') {
                    // Immutable update
                    newWordsArray[currentIndex] = {
                      ...newWordsArray[currentIndex],
                      status: simCombined > 0.9 ? 'correct' : 'near'
                    };
                    currentIndex++;
                    changesMade = true;
                    // Skip next spoken word in loop logic effectively by letting loop continue
                    continue; 
                 }
              }
            }

            // 2. ANCHOR SEARCH (Skip Logic)
            let bestSkipIndex = -1;
            
            for (let offset = 1; offset <= LOOKAHEAD_LIMIT; offset++) {
               const targetIdx = currentIndex + offset;
               if (targetIdx >= allWords.length) break;

               const tWord = allWords[targetIdx].clean;
               const sim = getSimilarity(spoken, tWord);
               const thresh = getMatchThreshold(tWord.length);

               if (sim >= thresh) {
                 let confirmed = false;
                 
                 // Condition A: Two-Word Sequence (Strongest)
                 const nextSpoken = i + 1 < batch.length ? batch[i + 1] : null;
                 if (nextSpoken && targetIdx + 1 < allWords.length) {
                    const nextTWord = allWords[targetIdx + 1].clean;
                    const nextSim = getSimilarity(nextSpoken, nextTWord);
                    if (nextSim >= getMatchThreshold(nextTWord.length)) {
                       confirmed = true;
                    }
                 }

                 // Condition B: Very Strong Match on a Long Word (>5 chars)
                 if (!confirmed && tWord.length >= 5 && sim > 0.85) {
                    confirmed = true;
                 }

                 if (confirmed) {
                    bestSkipIndex = targetIdx;
                    break; 
                 }
               }
            }

            if (bestSkipIndex !== -1) {
               // Mark intermediate words as skipped
               for (let k = currentIndex; k < bestSkipIndex; k++) {
                  if (newWordsArray[k].status === 'pending') {
                     // Immutable update
                     newWordsArray[k] = { ...newWordsArray[k], status: 'skipped' };
                  }
               }
               // Mark the anchor word as read
               if (newWordsArray[bestSkipIndex].status === 'pending') {
                  // Immutable update
                  newWordsArray[bestSkipIndex] = { ...newWordsArray[bestSkipIndex], status: 'correct' }; 
               }
               currentIndex = bestSkipIndex + 1;
               changesMade = true;
            }
          }

          if (changesMade) {
             setWordsArray(newWordsArray);
             setCurrentWordIndex(currentIndex);
          }
        };

        recognition.onend = () => {
          if (runningRef.current) {
             try { 
               recognition.start(); 
             } catch (e) {
               // Silent catch
             }
          }
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => setTimeElapsed(p => p + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  // Auto-finish
  useEffect(() => {
    if (wordsArray.length > 0 && currentWordIndex >= wordsArray.length && isTimerRunning) {
      finishReading();
    }
  }, [currentWordIndex, wordsArray, isTimerRunning]);

  // --- Actions ---

  const handlePremiumUnlock = () => {
    if (premiumInput === PREMIUM_CODE) {
      localStorage.setItem('focoler_tier', 'premium');
      setIsPremium(true);
      setShowPremiumInput(false);
      setPremiumError(false);
    } else {
      setPremiumError(true);
    }
  }

  const startReading = (text: string) => {
    stopTTS();
    setCurrentTextOriginal(text);
    // Clean target words
    const words: WordObject[] = text.trim().split(/\s+/).map(w => ({
      original: w,
      clean: cleanWord(w),
      status: 'pending'
    }));
    setWordsArray(words);
    setCurrentWordIndex(0);
    setTimeElapsed(0);
    wordsRef.current = words;
    indexRef.current = 0;
    setIsTimerRunning(false);
    setIsListening(false);
    setView('reading');
  };

  const startListening = () => {
    stopTTS();
    setIsTimerRunning(true);
    setIsListening(true);
    runningRef.current = true;
    if (recognitionRef.current) {
      try { 
        recognitionRef.current.start(); 
      } catch (e) {
        console.error("Mic error:", e);
      }
    }
  };

  const stopListening = () => {
    setIsTimerRunning(false);
    setIsListening(false);
    runningRef.current = false;
    stopTTS();
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleTTS = () => {
    if (isSpeaking) stopTTS();
    else {
      const utterance = new SpeechSynthesisUtterance(currentTextOriginal);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const finishReading = () => {
    stopListening();
    const correctWords = wordsArray.filter(w => w.status === 'correct').length;
    const nearWords = wordsArray.filter(w => w.status === 'near').length;
    const validWords = correctWords + nearWords;
    const processedWords = wordsArray.filter(w => w.status !== 'pending').length;
    
    // PPM uses total processed words (speed)
    const { nota, classificacao, ppm } = calculateFluencyScore(
      processedWords > 0 ? processedWords : validWords, 
      validWords, 
      timeElapsed
    );

    let profile = LEVELS.PRE_LEITOR;
    if (ppm >= LEVELS.FLUENTE.minPPM) profile = LEVELS.FLUENTE;
    else if (ppm >= LEVELS.INICIANTE.minPPM) profile = LEVELS.INICIANTE;

    const heatmap: HeatmapItem[] = wordsArray.map(w => ({
      word: w.original,
      status: w.status
    }));

    const result: ReadingResult = {
      ppm,
      time: timeElapsed,
      words: validWords,
      totalWords: wordsArray.length,
      profile,
      date: new Date().toLocaleDateString('pt-BR'),
      fluencyScore: nota,
      classification: classificacao,
      heatmap
    };

    setResultData(result);
    setView('results');
  };

  // --- Views ---

  const renderLandingPage = () => (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 flex flex-col">
      {/* Hero Section */}
      <div className="bg-white pb-12 pt-8 px-6 rounded-b-[3rem] shadow-xl border-b border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full opacity-50 blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-50 rounded-full opacity-50 blur-2xl transform -translate-x-10 translate-y-10"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full mb-6 border border-indigo-100 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-500" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Inteligência Artificial</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Foco<span className="text-indigo-600">Ler</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto leading-relaxed">
            A ferramenta definitiva para avaliação e desenvolvimento da <strong className="text-indigo-600">fluência leitora</strong>. Tecnologia avançada para transformar a educação.
          </p>
          <Button 
            onClick={() => setShowLanding(false)} 
            className="w-full md:w-auto text-lg px-10 py-4 shadow-indigo-300 shadow-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transform hover:-translate-y-1 transition-all"
          >
            Acessar Aplicação
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        <Card className="p-6 border-transparent shadow-md hover:shadow-xl transition-all duration-300 bg-white group">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Mic className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Reconhecimento de Voz</h3>
          <p className="text-sm text-slate-500 leading-relaxed">Algoritmo de alta precisão calibrado para a fala infantil, detectando ritmo e precisão palavra por palavra.</p>
        </Card>

        <Card className="p-6 border-transparent shadow-md hover:shadow-xl transition-all duration-300 bg-white group">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Métricas em Tempo Real</h3>
          <p className="text-sm text-slate-500 leading-relaxed">Calcula automaticamente PPM (Palavras Por Minuto) e precisão, gerando mapas de calor instantâneos.</p>
        </Card>

        <Card className="p-6 border-transparent shadow-md hover:shadow-xl transition-all duration-300 bg-white group">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Layout className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Simplicidade Total</h3>
          <p className="text-sm text-slate-500 leading-relaxed">Interface limpa e amigável. Funciona direto no navegador, sem necessidade de instalações complexas.</p>
        </Card>
      </div>

      {/* Guide Section */}
      <div className="bg-white py-12 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-8 flex items-center justify-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            Guia Rápido para Educadores e Pais
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-600 font-bold rounded-full flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Selecione o Nível</h4>
                <p className="text-sm text-slate-500">Escolha entre Fácil, Médio ou Difícil conforme a idade da criança.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-600 font-bold rounded-full flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Escolha uma História</h4>
                <p className="text-sm text-slate-500">Navegue pelas categorias e deixe a criança escolher um tema interessante.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-600 font-bold rounded-full flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Leitura em Voz Alta</h4>
                <p className="text-sm text-slate-500">Clique em "Começar Leitura". A criança deve ler o texto em voz alta de forma natural.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-600 font-bold rounded-full flex items-center justify-center flex-shrink-0">4</div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Análise de Resultado</h4>
                <p className="text-sm text-slate-500">Ao final, veja a velocidade (PPM), precisão e as palavras que precisam de atenção.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pb-8 pt-8 bg-slate-50">
        <p className="text-slate-400 text-xs font-medium">© 2025 FocoLer Educacional</p>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-6 animate-fade-in w-full pt-4 relative">
      <div className="text-center relative">
          <h1 className="font-extrabold text-3xl text-indigo-600 tracking-tight">FocoLer</h1>
          <p className="text-sm text-slate-400 font-medium">Treinador de Fluência Leitora</p>
          {isPremium && <div className="absolute top-0 right-2 md:right-10 flex flex-col items-center"><Crown className="w-6 h-6 text-amber-400 fill-amber-400" /><span className="text-[10px] font-bold text-amber-500 uppercase">Premium</span></div>}
      </div>

      <div className="flex flex-col gap-2 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nível de Leitura</span>
        <div className="flex gap-2 justify-center w-full">
          {['facil', 'medio', 'dificil'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl as DifficultyLevel)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                selectedLevel === lvl 
                ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
        
        {/* Premium Upgrade Button below level selector */}
        {!isPremium && (
          <button 
            onClick={() => setShowPremiumInput(true)}
            className="text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:underline mt-2 flex items-center gap-1"
          >
            <Crown className="w-3 h-3" /> Acessar versão Premium
          </button>
        )}
      </div>

      {/* Premium Input Dialog */}
      {showPremiumInput && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 animate-fade-in">
          <Card className="p-6 w-full max-w-sm space-y-4 relative">
            <button onClick={() => { setShowPremiumInput(false); setPremiumError(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <Crown className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Desbloquear Premium</h3>
              <p className="text-xs text-slate-500 text-center mb-4">Insira o código premium para liberar Simulados, Nivelamento e todos os textos.</p>
              
              <div className="w-full space-y-3">
                <input 
                  type="text" 
                  value={premiumInput}
                  onChange={(e) => { setPremiumInput(e.target.value); setPremiumError(false); }}
                  placeholder="Código Premium"
                  className={`w-full px-4 py-2 border rounded-lg outline-none ${premiumError ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-amber-400'}`}
                />
                {premiumError && <p className="text-red-500 text-xs font-bold text-center">Código incorreto.</p>}
                <Button onClick={handlePremiumUnlock} className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200">Confirmar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Leveling CTA - Only for Premium */}
      {isPremium && (
        <Card onClick={() => { setSelectedCategory('Nivelamento'); startReading(LIBRARY['Nivelamento'].texts[selectedLevel][0]); }} 
          className="p-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white cursor-pointer hover:shadow-lg transition-all active:scale-95 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2">
              <Award className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm"><Award className="w-6 h-6 text-white" /></div>
            <div>
              <h3 className="font-bold text-lg">Teste de Nivelamento</h3>
              <p className="text-xs text-white/90">Faça uma leitura de calibração</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(LIBRARY)
          .filter(([k]) => {
            // Remove 'Nivelamento' from standard list (it has its own big card)
            if (k === 'Nivelamento') return false;
            // Remove 'Simulado' if not premium
            if (k === 'Simulado' && !isPremium) return false;
            return true;
          })
          .map(([name, data]) => (
          <Card key={name} onClick={() => { setSelectedCategory(name); setView('text_selection'); }}
            className={`p-4 cursor-pointer hover:border-indigo-200 transition-all active:scale-95 border-2 ${name === "Simulado" ? 'border-teal-100 bg-teal-50' : 'border-slate-100'}`}>
            <div className={`w-10 h-10 rounded-full ${data.color} flex items-center justify-center mb-3`}>
              {data.icon}
            </div>
            <h3 className="font-bold text-slate-700 text-sm leading-tight">{name}</h3>
            <p className="text-xs text-slate-400 mt-1">{data.texts[selectedLevel].length} textos</p>
          </Card>
        ))}
      </div>

      {isPremium && (
        <Button variant="secondary" className="w-full py-3 text-sm" onClick={() => { setCustomTextInput(''); setView('custom_text'); }}>
          <Edit className="w-4 h-4" /> Colar Texto Próprio
        </Button>
      )}
    </div>
  );

  const renderResults = () => {
    if (!resultData) return null;
    const isSimulado = selectedCategory === "Simulado";
    
    // Percentages
    const totalProcessed = wordsArray.filter(w => w.status !== 'pending').length || 1;
    const correctCount = wordsArray.filter(w => w.status === 'correct').length;
    const correctPct = Math.round((correctCount / totalProcessed) * 100);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (correctPct / 100) * circumference;

    return (
      <div className="pt-2 text-center space-y-6 animate-fade-in pb-10 w-full">
        <div className="flex items-center justify-between">
           <div className="text-left">
              <h2 className="text-xl font-extrabold text-slate-800">Resultado</h2>
              <p className="text-xs text-slate-500 uppercase font-bold">{resultData.date}</p>
           </div>
           <div className={`px-3 py-1 rounded-lg text-xs font-bold ${resultData.profile.bg} ${resultData.profile.color}`}>
              {resultData.profile.label}
           </div>
        </div>

        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
           <div className="relative z-10 flex flex-col items-center text-center">
             <div className="text-sm font-medium opacity-90 uppercase tracking-widest mb-3">Classificação</div>
             <div className="text-3xl font-black tracking-tight mb-1 leading-tight">{resultData.classification}</div>
           </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 flex flex-col items-center justify-center relative overflow-hidden bg-white">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
                <circle cx="50%" cy="50%" r={radius} stroke="#10b981" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-lg font-bold text-slate-700">{correctPct}%</span>
              </div>
            </div>
            <span className="text-[10px] mt-2 uppercase font-bold text-slate-400">Precisão</span>
          </Card>

          <Card className="p-4 flex flex-col justify-center space-y-2 bg-indigo-50 border-indigo-100">
             <div className="text-center">
               <div className="text-3xl font-bold text-indigo-600">{resultData.ppm}</div>
               <div className="text-[10px] uppercase font-bold text-indigo-400">PPM</div>
             </div>
             <div className="w-full h-px bg-indigo-200"></div>
             <div className="text-center">
               <div className="text-xl font-bold text-slate-600">{resultData.time}s</div>
               <div className="text-[10px] uppercase font-bold text-slate-400">Tempo</div>
             </div>
          </Card>
        </div>

        {isSimulado && (
          <Card className="bg-teal-50 border-teal-200 p-4 text-left">
             <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-teal-600" /><h3 className="font-bold text-teal-800 text-sm">Meta Simulado</h3></div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${resultData.ppm >= 57 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{resultData.ppm >= 57 ? 'ATINGIDA' : 'ABAIXO'}</span>
             </div>
             <div className="text-xs text-slate-500">Ref: 60 palavras em ~63s (57 PPM)</div>
          </Card>
        )}

        <div className="text-left space-y-2">
          <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><Eye className="w-4 h-4" /> Mapa de Calor</h3>
          <Card className="p-4 bg-slate-50 border-slate-200 max-h-80 overflow-y-auto">
            <p className="leading-loose text-lg font-medium text-slate-400">
              {wordsArray.map((w, i) => {
                let colorClass = "";
                // Heatmap background logic
                if (w.status === 'correct') colorClass = "bg-emerald-200 text-emerald-900 border-b-2 border-emerald-300";
                else if (w.status === 'near') colorClass = "bg-yellow-200 text-yellow-900 border-b-2 border-yellow-300";
                else if (w.status === 'skipped') colorClass = "bg-red-100 text-red-900 border-b-2 border-red-200 opacity-70 line-through decoration-red-400";
                else return <span key={i} className="opacity-40 mr-1.5">{w.original}</span>;
                
                return <span key={i} className={`mr-1.5 px-1 rounded ${colorClass} inline-block`}>{w.original}</span>
              })}
            </p>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setView('home')} variant="secondary" className="flex-1">Menu</Button>
          <Button onClick={() => startReading(currentTextOriginal)} variant="primary" className="flex-1">Ler Novamente</Button>
        </div>
      </div>
    );
  };

  const renderCustomText = () => (
    <div className="h-full flex flex-col animate-fade-in pt-4 w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="font-bold text-slate-800 text-lg">Texto Personalizado</h2>
      </div>
      <div className="flex-1 bg-white border-2 border-slate-200 rounded-2xl p-4 mb-4 focus-within:border-indigo-500">
        <textarea 
          className="w-full h-full resize-none outline-none text-lg text-slate-700" 
          placeholder="Cole aqui textos diversos, trechos de livros ou materiais de aula para avaliar a fluência..." 
          value={customTextInput} 
          onChange={(e) => setCustomTextInput(e.target.value)} 
        />
      </div>
      <Button disabled={!customTextInput.trim()} onClick={() => { setSelectedCategory("Texto Personalizado"); startReading(customTextInput); }} className="w-full py-4">Iniciar</Button>
    </div>
  );

  const renderTextSelection = () => {
    if (!selectedCategory || !LIBRARY[selectedCategory]) return null;
    const allTexts = LIBRARY[selectedCategory].texts[selectedLevel];
    // Freemium logic: Show only 1 text if not premium
    const texts = isPremium ? allTexts : allTexts.slice(0, 1);

    return (
      <div className="space-y-6 animate-fade-in pt-4 w-full">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setView('home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
          <div><h2 className="font-bold text-slate-800">{selectedCategory}</h2></div>
        </div>
        {!isPremium && (
          <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs flex items-center gap-2 border border-amber-100">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Modo Demonstração: Apenas 1 texto disponível. <span className="underline cursor-pointer font-bold" onClick={() => { setView('home'); setShowPremiumInput(true); }}>Seja Premium</span> para liberar tudo.</span>
          </div>
        )}
        <div className="grid gap-3 pb-8">
          {texts.map((text, index) => (
            <Card key={index} onClick={() => startReading(text)} className="p-4 cursor-pointer hover:border-indigo-300 transition-all active:scale-[0.99]">
              <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderReading = () => {
    const isSimulado = selectedCategory === "Simulado";
    const isOverTime = isSimulado && timeElapsed > 63;
    
    return (
      <div className="h-full flex flex-col pt-4 animate-fade-in w-full">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-20 py-2">
          <button onClick={() => { stopListening(); setView('home'); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
          <div className={`px-4 py-1.5 rounded-full font-mono font-bold text-lg flex items-center gap-2 ${isOverTime ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
            <Clock className="w-4 h-4" /> {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
          </div>
          <div className="w-10 flex justify-center">{isListening ? <Mic className="w-6 h-6 text-red-500 animate-pulse" /> : <MicOff className="w-6 h-6 text-slate-300" />}</div>
        </div>

        <Card className="flex-1 p-6 md:p-8 mb-6 overflow-y-auto relative border-2 border-indigo-50 scroll-smooth">
          {!isTimerRunning && timeElapsed === 0 && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-center p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Vamos ler?</h3>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button onClick={toggleTTS} variant="secondary" className="w-full">{isSpeaking ? 'Parar Áudio' : 'Ouvir Texto'}</Button>
                <Button onClick={startListening} variant="primary" className="w-full">Começar Leitura</Button>
              </div>
            </div>
          )}
          <div className={`text-xl md:text-3xl leading-loose font-medium transition-all duration-500 ${!isTimerRunning && timeElapsed === 0 ? 'blur-sm opacity-50' : 'opacity-100'}`}>
            {wordsArray.map((item, index) => {
              // Reading Mode UI - Background highlights for clarity
              let statusClass = "mr-2 mb-3 px-2 py-1 rounded-lg inline-block text-slate-400 transition-colors duration-300";
              const isCurrent = index === currentWordIndex;
              
              if (isCurrent) {
                statusClass = "mr-2 mb-3 px-2 py-1 rounded-lg inline-block bg-indigo-600 text-white font-bold transform scale-105 shadow-md";
              }
              else if (item.status === 'correct') {
                statusClass = "mr-2 mb-3 px-2 py-1 rounded-lg inline-block bg-emerald-200 text-emerald-900";
              }
              else if (item.status === 'near') {
                statusClass = "mr-2 mb-3 px-2 py-1 rounded-lg inline-block bg-yellow-200 text-yellow-900";
              }
              else if (item.status === 'skipped') {
                statusClass = "mr-2 mb-3 px-2 py-1 rounded-lg inline-block bg-red-100 text-red-900 opacity-50";
              }
              else if (item.status === 'pending') {
                statusClass = "mr-2 mb-3 px-2 py-1 rounded-lg inline-block text-slate-800";
              }

              return (
                <span 
                  key={index} 
                  ref={isCurrent ? activeWordRef : null}
                  className={statusClass}
                >
                  {item.original}
                </span>
              );
            })}
          </div>
        </Card>
        {isTimerRunning && <Button onClick={finishReading} variant="success" className="w-full py-4">Terminei</Button>}
      </div>
    );
  };

  if (showLanding) {
    return renderLandingPage();
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      <div className="w-full max-w-lg mx-auto min-h-screen bg-white shadow-2xl overflow-hidden relative border-x border-slate-100">
        <div className="h-full p-4 md:p-6 overflow-y-auto pb-24 scrollbar-hide">
          {view === 'home' && renderHome()}
          {view === 'text_selection' && renderTextSelection()}
          {view === 'custom_text' && renderCustomText()}
          {view === 'reading' && renderReading()}
          {view === 'results' && renderResults()}
          {view === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full pt-20"><Wand2 className="w-12 h-12 text-purple-500 animate-spin mb-4"/><h2 className="font-bold">Criando história...</h2></div>
          )}
        </div>
      </div>
    </div>
  );
}