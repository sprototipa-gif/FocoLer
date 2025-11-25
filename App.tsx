import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Mic, Play, RotateCcw, Award, BarChart2, CheckCircle, Wand2, MicOff, AlertCircle, ArrowLeft, Download, Clock, PieChart, Activity, Eye, Edit, Volume2, StopCircle, ChevronRight, X, Lock, Key } from 'lucide-react';
import { Button, Card } from './components/UI';
import { LIBRARY, LEVELS, ACCESS_CODE } from './constants';
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

// Enhanced cleaning: Removes accents (NFD), punctuation, and lowercases.
const cleanWord = (word: string): string => {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
    .trim();
};

// Dynamic Threshold based on word length to avoid false positives on short words
const getMatchThreshold = (wordLength: number): number => {
  if (wordLength <= 3) return 0.95; // Strict for 'o', 'a', 'de', etc.
  if (wordLength <= 5) return 0.80; // Moderate
  return 0.65; // Lenient for long words (kids stutter/slur)
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
  const [view, setView] = useState<'home' | 'text_selection' | 'reading' | 'results' | 'generating' | 'custom_text'>('home');
  
  // Access Control
  const [isLocked, setIsLocked] = useState(true);
  const [accessInput, setAccessInput] = useState('');
  const [accessError, setAccessError] = useState(false);

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

  // Check Access on Mount
  useEffect(() => {
    const savedAccess = localStorage.getItem('focoler_access');
    if (savedAccess === ACCESS_CODE) {
      setIsLocked(false);
    }
  }, []);

  // Sync Refs
  useEffect(() => { wordsRef.current = wordsArray; }, [wordsArray]);
  useEffect(() => { indexRef.current = currentWordIndex; }, [currentWordIndex]);
  useEffect(() => { runningRef.current = isTimerRunning; }, [isTimerRunning]);

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
          // Get the latest transcript segment
          const lastResult = results[results.length - 1];
          const transcript = lastResult[0].transcript.toLowerCase();
          
          // Clean and split spoken words
          const spokenWordsRaw = transcript.split(/\s+/);
          const spokenWords = spokenWordsRaw
            .map((w: string) => cleanWord(w))
            .filter((w: string) => w.length > 0);
            
          if (spokenWords.length === 0) return;

          // --- MASTER ADJUSTMENT: Anchored Search with Safety Check ---
          
          // Look at a larger batch of spoken words to catch rapid reading (pace)
          const BATCH_SIZE = 6; 
          const batch = spokenWords.slice(-BATCH_SIZE); 
          
          let currentIndex = indexRef.current;
          const allWords = wordsRef.current;
          
          // How far ahead we search. Increased to 8 to handle fast pacing.
          const LOOKAHEAD = 8; 

          let changesMade = false;
          let newWordsArray = [...allWords];

          // Iterate through recent spoken words
          for (const spoken of batch) {
            if (currentIndex >= allWords.length) break;

            let bestMatch = { index: -1, score: 0, status: 'pending' as any };

            // Search for this spoken word in the upcoming text window
            for (let i = 0; i < LOOKAHEAD; i++) {
               const targetIdx = currentIndex + i;
               if (targetIdx >= allWords.length) break;
               
               const targetWordClean = allWords[targetIdx].clean;
               const sim = getSimilarity(spoken, targetWordClean);
               const threshold = getMatchThreshold(targetWordClean.length);
               
               if (sim >= threshold) {
                 // Found a potential match. 
                 // If it's a better score or same score but closer, take it.
                 if (sim > bestMatch.score) {
                   bestMatch = { index: targetIdx, score: sim, status: sim >= 0.9 ? 'correct' : 'near' };
                 }
                 // If perfect match found immediately, break inner loop for efficiency
                 if (sim === 1.0 && i === 0) break; 
               }
            }

            if (bestMatch.index !== -1) {
               // MATCH FOUND
               
               // Case 1: It is the immediate next word (Ideal pace)
               if (bestMatch.index === currentIndex) {
                  if (newWordsArray[currentIndex].status === 'pending') {
                    newWordsArray[currentIndex].status = bestMatch.status;
                    currentIndex++;
                    changesMade = true;
                  }
               } 
               // Case 2: The student skipped ahead (Fast pace or error)
               else {
                  // SAFETY CHECK: Only skip if confidence is very high to prevent red-marking correct reading
                  // Must be a near-perfect match OR a long unique word
                  const targetLen = allWords[bestMatch.index].clean.length;
                  const isSafeToSkip = bestMatch.score >= 0.95 || (targetLen >= 5 && bestMatch.score >= 0.85);
                  
                  if (isSafeToSkip) {
                     // Mark intermediate words as skipped
                     for (let k = currentIndex; k < bestMatch.index; k++) {
                        if (newWordsArray[k].status === 'pending') {
                           newWordsArray[k].status = 'skipped';
                        }
                     }
                     // Mark the found word
                     if (newWordsArray[bestMatch.index].status === 'pending') {
                        newWordsArray[bestMatch.index].status = bestMatch.status;
                     }
                     currentIndex = bestMatch.index + 1;
                     changesMade = true;
                  }
               }
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
               // console.log("Reconnection attempt failed", e);
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

  const unlockApp = () => {
    if (accessInput === ACCESS_CODE) {
      localStorage.setItem('focoler_access', ACCESS_CODE);
      setIsLocked(false);
      setAccessError(false);
    } else {
      setAccessError(true);
    }
  };

  const startReading = (text: string) => {
    stopTTS();
    setCurrentTextOriginal(text);
    const words: WordObject[] = text.split(' ').map(w => ({
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
        // Fallback if already started
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
    
    const { nota, classificacao, ppm } = calculateFluencyScore(
      processedWords > 0 ? processedWords : validWords, 
      validWords, 
      timeElapsed
    );

    let profile = LEVELS.PRE_LEITOR;
    if (ppm >= LEVELS.FLUENTE.minPPM) profile = LEVELS.FLUENTE;
    else if (ppm >= LEVELS.INICIANTE.minPPM) profile = LEVELS.INICIANTE;

    // Heatmap Generation
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

  const renderGatekeeper = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Card className="p-8 w-full max-w-sm text-center space-y-6 shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Acesso Restrito</h1>
          <p className="text-slate-500 text-sm">Digite seu código de acesso para continuar.</p>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <Key className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            <input 
              type="text" 
              value={accessInput}
              onChange={(e) => { setAccessInput(e.target.value); setAccessError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && unlockApp()}
              className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl outline-none transition-colors ${accessError ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 focus:border-indigo-500'}`}
              placeholder="Código de acesso"
            />
          </div>
          {accessError && <p className="text-red-500 text-xs font-bold">Código inválido. Tente novamente.</p>}
          <Button onClick={unlockApp} className="w-full py-3 text-lg">Entrar</Button>
        </div>
      </Card>
      <p className="mt-8 text-slate-400 text-xs font-medium">FocoLer © 2025</p>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-6 animate-fade-in w-full pt-4">
      <div className="text-center">
          <h1 className="font-extrabold text-3xl text-indigo-600 tracking-tight">FocoLer</h1>
          <p className="text-sm text-slate-400 font-medium">Treinador de Fluência Leitora</p>
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
      </div>

      {/* Leveling CTA - Simplified */}
      <Card onClick={() => { setSelectedCategory('Nivelamento'); startReading(LIBRARY['Nivelamento'].texts['medio'][0]); }} 
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

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(LIBRARY).filter(([k]) => k !== 'Nivelamento').map(([name, data]) => (
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

      <Button variant="secondary" className="w-full py-3 text-sm" onClick={() => { setCustomTextInput(''); setView('custom_text'); }}>
        <Edit className="w-4 h-4" /> Colar Texto Próprio
      </Button>
    </div>
  );

  const renderResults = () => {
    if (!resultData) return null;
    const isSimulado = selectedCategory === "Simulado";
    
    // Only count Processed words for calculating percentages shown in the ring
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
          <Card className="p-3 bg-slate-50 border-slate-200 max-h-60 overflow-y-auto">
            <p className="leading-relaxed text-base text-slate-400">
              {wordsArray.map((w, i) => {
                let colorClass = "";
                if (w.status === 'correct') colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                else if (w.status === 'near') colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
                else if (w.status === 'skipped') colorClass = "bg-red-50 text-red-900 border-red-100 opacity-60";
                else return <span key={i} className="opacity-40 mr-1">{w.original}</span>;
                return <span key={i} className={`mr-1 px-1 py-0.5 rounded border ${colorClass} inline-block mb-1 text-sm`}>{w.original}</span>
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
        <textarea className="w-full h-full resize-none outline-none text-lg text-slate-700" placeholder="Cole o texto aqui..." value={customTextInput} onChange={(e) => setCustomTextInput(e.target.value)} />
      </div>
      <Button disabled={!customTextInput.trim()} onClick={() => { setSelectedCategory("Texto Personalizado"); startReading(customTextInput); }} className="w-full py-4">Iniciar</Button>
    </div>
  );

  const renderTextSelection = () => {
    if (!selectedCategory || !LIBRARY[selectedCategory]) return null;
    const texts = LIBRARY[selectedCategory].texts[selectedLevel];
    return (
      <div className="space-y-6 animate-fade-in pt-4 w-full">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setView('home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
          <div><h2 className="font-bold text-slate-800">{selectedCategory}</h2></div>
        </div>
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

        <Card className="flex-1 p-6 md:p-8 mb-6 overflow-y-auto relative border-2 border-indigo-50">
          {!isTimerRunning && timeElapsed === 0 && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-center p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Vamos ler?</h3>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button onClick={toggleTTS} variant="secondary" className="w-full">{isSpeaking ? 'Parar Áudio' : 'Ouvir Texto'}</Button>
                <Button onClick={startListening} variant="primary" className="w-full">Começar Leitura</Button>
              </div>
            </div>
          )}
          <div className={`text-xl md:text-2xl leading-loose font-medium transition-all duration-500 ${!isTimerRunning && timeElapsed === 0 ? 'blur-sm opacity-50' : 'opacity-100'}`}>
            {wordsArray.map((item, index) => {
              let statusClass = "mr-1.5 mb-2 px-1.5 py-0.5 rounded-md inline-block text-slate-400";
              if (index === currentWordIndex) statusClass += " bg-indigo-600 text-white font-bold shadow-sm";
              else if (item.status === 'correct') statusClass += " bg-emerald-200 text-emerald-900";
              else if (item.status === 'near') statusClass += " bg-yellow-200 text-yellow-900";
              else if (item.status === 'skipped') statusClass += " bg-red-50 text-red-900 opacity-60";
              else if (item.status === 'pending') statusClass = "mr-1.5 mb-2 px-1.5 py-0.5 rounded-md inline-block text-slate-800";
              return <span key={index} className={statusClass}>{item.original}</span>;
            })}
          </div>
        </Card>
        {isTimerRunning && <Button onClick={finishReading} variant="success" className="w-full py-4">Terminei</Button>}
      </div>
    );
  };

  if (isLocked) {
    return renderGatekeeper();
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