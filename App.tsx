import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Mic, Play, RotateCcw, Award, BarChart2, CheckCircle, Wand2, MicOff, AlertCircle, ArrowLeft, Download, Clock, PieChart, Activity, Eye, Edit, Volume2, StopCircle, ChevronRight, X, Lock, Key, Crown, Zap, Brain, Layout, Sparkles, CheckSquare, UserCheck, MessageSquare, Star, Smile, Heart } from 'lucide-react';
import { Button, Card } from './components/UI';
import { LIBRARY, LEVELS, PREMIUM_CODE } from './constants';
import { DifficultyLevel, IWindow, ReadingResult, WordObject, HeatmapItem } from './types';
import { generateStory } from './services/geminiService';

// --- Algoritmos Auxiliares Ajustados (Fine Tuning) ---

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

// Mapa fonético para reduções comuns no PT-BR
const phoneticMap: { [key: string]: string } = {
  "ta": "esta",
  "tava": "estava",
  "pra": "para",
  "pro": "para o",
  "na": "em a",
  "no": "em o",
  "ce": "voce",
  "eh": "e",
  "um": "o", // Confusão comum em áudio
  "uma": "a"
};

const cleanWord = (word: string): string => {
  // Remove pontuação mas mantém a estrutura básica
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, "") // Remove caracteres especiais e hífens
    .trim();
};

const getMatchThreshold = (wordLength: number): number => {
  // Tolerância maior (número menor) significa mais fácil de aceitar
  if (wordLength <= 2) return 0.85; // Ajustado de 0.90 para aceitar melhor "e", "a", "o"
  if (wordLength <= 4) return 0.75; // Ajustado de 0.80
  return 0.60; // Ajustado de 0.65 para palavras longas
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
  // Views & States
  const [showLanding, setShowLanding] = useState(true);
  const [view, setView] = useState<'home' | 'text_selection' | 'reading' | 'results' | 'generating' | 'custom_text'>('home');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumInput, setShowPremiumInput] = useState(false);
  const [premiumInput, setPremiumInput] = useState('');
  const [premiumError, setPremiumError] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>('medio');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customTextInput, setCustomTextInput] = useState('');
  
  // Reading Session
  const [currentTextOriginal, setCurrentTextOriginal] = useState('');
  const [wordsArray, setWordsArray] = useState<WordObject[]>([]); 
  const [currentWordIndex, setCurrentWordIndex] = useState(0); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [resultData, setResultData] = useState<ReadingResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const wordsRef = useRef<WordObject[]>([]);
  const indexRef = useRef(0);
  const runningRef = useRef(false);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  // Init
  useEffect(() => {
    const savedTier = localStorage.getItem('focoler_tier');
    if (savedTier === 'premium') setIsPremium(true);
  }, []);

  useEffect(() => { wordsRef.current = wordsArray; }, [wordsArray]);
  useEffect(() => { indexRef.current = currentWordIndex; }, [currentWordIndex]);
  useEffect(() => { runningRef.current = isTimerRunning; }, [isTimerRunning]);

  useEffect(() => {
    if (activeWordRef.current && isTimerRunning) {
      activeWordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentWordIndex, isTimerRunning]);

  // --- MOTOR DE RECONHECIMENTO DE VOZ OTIMIZADO ---
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
          
          // Pegamos o resultado mais recente (seja interim ou final)
          const latestResult = results[results.length - 1];
          if (!latestResult || !latestResult[0]) return;

          const transcript = latestResult[0].transcript.toLowerCase();
          
          // Limpeza do transcript: divide por espaços
          const spokenWordsRaw = transcript.split(/\s+/).filter((w: string) => w.length > 0);
          
          // Janela deslizante: olha apenas as últimas N palavras faladas para evitar processar o início repetidamente
          // Aumentado para 15 para captar frases rápidas
          const PROCESS_WINDOW = 15; 
          const batch = spokenWordsRaw.slice(-PROCESS_WINDOW).map((w: string) => cleanWord(w));
          
          let currentIndex = indexRef.current;
          const allWords = wordsRef.current;
          let changesMade = false;
          let newWordsArray = [...allWords];

          // Função auxiliar para verificar match
          const checkMatch = (spoken: string, target: string): boolean => {
            if (!spoken || !target) return false;
            
            // Check direto
            const threshold = getMatchThreshold(target.length);
            if (getSimilarity(spoken, target) >= threshold) return true;
            
            // Check fonético
            if (phoneticMap[spoken] === target) return true;
            
            // Check contido (para casos como 'guarda-chuva' vs 'guarda')
            if (target.includes(spoken) && spoken.length > 3) return true;

            return false;
          };

          // Loop através das palavras faladas no batch
          for (let i = 0; i < batch.length; i++) {
            const spoken = batch[i];
            if (currentIndex >= allWords.length) break;

            const targetWord = allWords[currentIndex].clean;

            // 1. Tenta match direto na palavra atual
            if (checkMatch(spoken, targetWord)) {
              if (newWordsArray[currentIndex].status === 'pending') {
                newWordsArray[currentIndex] = { ...newWordsArray[currentIndex], status: 'correct' };
                currentIndex++;
                changesMade = true;
                continue; // Passa para próxima palavra falada
              }
            }

            // 2. Tenta match combinando duas palavras faladas (ex: "guarda" + "chuva" = "guardachuva")
            if (i + 1 < batch.length) {
              const combinedSpoken = spoken + batch[i+1];
              if (checkMatch(combinedSpoken, targetWord)) {
                 if (newWordsArray[currentIndex].status === 'pending') {
                    newWordsArray[currentIndex] = { ...newWordsArray[currentIndex], status: 'correct' };
                    currentIndex++;
                    changesMade = true;
                    i++; // Pula a próxima palavra falada pois já foi usada
                    continue; 
                 }
              }
            }

            // 3. Lógica de Pulo (Lookahead) com ÂNCORA DUPLA
            // Só pulamos se encontrarmos uma palavra futura E a palavra seguinte a ela também der match
            const LOOKAHEAD_LIMIT = 8; 
            
            let bestSkipIndex = -1;
            
            for (let offset = 1; offset <= LOOKAHEAD_LIMIT; offset++) {
               const targetIdx = currentIndex + offset;
               if (targetIdx >= allWords.length) break;
               
               const tWord = allWords[targetIdx].clean;
               
               // Verifica se a palavra falada atual bate com esta palavra futura
               if (checkMatch(spoken, tWord)) {
                 let confirmedAnchor = false;
                 
                 // VERIFICAÇÃO DE ÂNCORA:
                 // Olha se a PRÓXIMA palavra falada bate com a PRÓXIMA palavra do texto
                 const nextSpoken = i + 1 < batch.length ? batch[i + 1] : null;
                 
                 if (targetIdx + 1 < allWords.length) {
                    const nextTWord = allWords[targetIdx + 1].clean;
                    
                    // Se tivermos uma próxima palavra falada, verificamos
                    if (nextSpoken && checkMatch(nextSpoken, nextTWord)) {
                        confirmedAnchor = true;
                    }
                 } else {
                    // Se for a última palavra do texto, aceita sem âncora dupla se a similaridade for muito alta
                    if (getSimilarity(spoken, tWord) > 0.9) confirmedAnchor = true;
                 }

                 // Se a palavra for muito longa e única, aceita sem âncora dupla (ex: "hipopotamo")
                 if (!confirmedAnchor && tWord.length >= 7 && getSimilarity(spoken, tWord) > 0.9) {
                    confirmedAnchor = true;
                 }

                 if (confirmedAnchor) {
                    bestSkipIndex = targetIdx;
                    break; // Encontrou um pulo válido, para de procurar
                 }
               }
            }

            // Se confirmamos um pulo válido
            if (bestSkipIndex !== -1) {
               // Marca as intermediárias como 'skipped'
               for (let k = currentIndex; k < bestSkipIndex; k++) {
                  if (newWordsArray[k].status === 'pending') {
                      newWordsArray[k] = { ...newWordsArray[k], status: 'skipped' };
                  }
               }
               // Marca a encontrada como 'correct'
               if (newWordsArray[bestSkipIndex].status === 'pending') {
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
            // Reinicia automaticamente se ainda estiver rodando (fix para Chrome que para após um tempo)
            if (runningRef.current) {
                try { recognition.start(); } catch (e) {
                    // Ignora erro se já estiver rodando
                } 
            }
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => setTimeElapsed(p => p + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  useEffect(() => {
    if (wordsArray.length > 0 && currentWordIndex >= wordsArray.length && isTimerRunning) finishReading();
  }, [currentWordIndex, wordsArray, isTimerRunning]);

  // Actions
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
    const words: WordObject[] = text.trim().split(/\s+/).map(w => ({ original: w, clean: cleanWord(w), status: 'pending' }));
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
            console.log("Recognition already started or error:", e);
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
    const { nota, classificacao, ppm } = calculateFluencyScore(processedWords > 0 ? processedWords : validWords, validWords, timeElapsed);
    let profile = LEVELS.PRE_LEITOR;
    if (ppm >= LEVELS.FLUENTE.minPPM) profile = LEVELS.FLUENTE;
    else if (ppm >= LEVELS.INICIANTE.minPPM) profile = LEVELS.INICIANTE;
    const heatmap: HeatmapItem[] = wordsArray.map(w => ({ word: w.original, status: w.status }));
    const result: ReadingResult = {
      ppm, time: timeElapsed, words: validWords, totalWords: wordsArray.length,
      profile, date: new Date().toLocaleDateString('pt-BR'), fluencyScore: nota, classification: classificacao, heatmap
    };
    setResultData(result);
    setView('results');
  };

  // --- Styled Components Logic ---

  const renderLandingPage = () => (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 font-sans text-slate-800 selection:bg-violet-200 flex flex-col">
      {/* Navbar Simple */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-violet-200">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-violet-800 tracking-tight">FocoLer</span>
        </div>
        <Button onClick={() => setShowLanding(false)} variant="secondary" className="px-6 py-2 rounded-full border-violet-200 text-violet-700 hover:bg-violet-50 text-sm">
          Entrar
        </Button>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 relative overflow-hidden pb-12">
        {/* Background Blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-float" style={{ animationDelay: '4s' }}></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-violet-100 shadow-md shadow-violet-100/50 animate-fade-in">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">Inteligência Artificial Educacional</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-extrabold text-slate-800 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Transforme a leitura <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">numa aventura.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            A ferramenta definitiva para avaliar e desenvolver a fluência leitora de forma lúdica, simples e precisa.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button 
              onClick={() => setShowLanding(false)} 
              className="w-full md:w-auto text-lg px-12 py-5 rounded-full shadow-violet-300 shadow-xl bg-violet-600 hover:bg-violet-700 text-white transform hover:-translate-y-1 transition-all flex items-center gap-3"
            >
              <Play className="w-5 h-5 fill-white" /> Começar Agora
            </Button>
            <p className="text-xs text-slate-400 font-medium">Não requer cadastro • Grátis para testar</p>
          </div>
        </div>
      </div>

      {/* Cards Section */}
      <div className="bg-white py-20 px-6 rounded-t-[3rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.05)] relative z-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-sky-50 p-8 rounded-3xl border border-sky-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-sky-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                <Mic className="w-7 h-7 text-sky-700" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-800 mb-3">Reconhecimento de Voz</h3>
              <p className="text-slate-600 leading-relaxed">Nossa tecnologia ouve a criança ler e identifica acertos e dificuldades em tempo real, respeitando o ritmo infantil.</p>
            </div>
            <div className="bg-violet-50 p-8 rounded-3xl border border-violet-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-violet-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                <Activity className="w-7 h-7 text-violet-700" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-800 mb-3">Feedback Visual</h3>
              <p className="text-slate-600 leading-relaxed">Mapas de calor coloridos mostram exatamente onde a leitura fluiu e onde precisa de mais atenção.</p>
            </div>
            <div className="bg-amber-50 p-8 rounded-3xl border border-amber-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-amber-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                <Smile className="w-7 h-7 text-amber-700" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-800 mb-3">100% Lúdico</h3>
              <p className="text-slate-600 leading-relaxed">Design amigável e histórias envolventes que transformam o momento da avaliação em brincadeira.</p>
            </div>
          </div>

          {/* Guide */}
          <div className="mt-24">
            <h2 className="font-display font-bold text-3xl text-center text-slate-800 mb-12">Como Funciona?</h2>
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
              {/* Connector Line (Desktop) */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 transform -translate-y-1/2 rounded-full"></div>
              
              {[
                {step: 1, title: "Escolha o Nível", icon: <BarChart2 className="w-5 h-5 text-white"/>, color: "bg-sky-500"},
                {step: 2, title: "Selecione a História", icon: <BookOpen className="w-5 h-5 text-white"/>, color: "bg-violet-500"},
                {step: 3, title: "Leia em Voz Alta", icon: <Mic className="w-5 h-5 text-white"/>, color: "bg-fuchsia-500"},
                {step: 4, title: "Veja o Resultado", icon: <Award className="w-5 h-5 text-white"/>, color: "bg-emerald-500"},
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center bg-white p-4">
                  <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center shadow-lg shadow-slate-200 mb-4 z-10 border-4 border-white`}>
                    {item.icon}
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900 py-8 text-center">
        <p className="text-slate-500 text-sm font-medium">© 2025 FocoLer Educacional • Feito com <Heart className="w-3 h-3 inline text-red-500 fill-red-500"/> para a educação.</p>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-8 animate-fade-in w-full pt-6 relative px-2">
      <div className="text-center relative">
          <h1 className="font-display font-extrabold text-4xl text-violet-600 tracking-tight drop-shadow-sm">FocoLer</h1>
          <p className="text-slate-500 font-medium mt-1">Treinador de Fluência Leitora</p>
          {isPremium && <div className="absolute top-0 right-0 flex flex-col items-center animate-pulse-soft"><Crown className="w-6 h-6 text-amber-400 fill-amber-400" /><span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">PRO</span></div>}
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400"></div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center mb-4">Selecione o Nível de Leitura</span>
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
                ? `${lvl.color} text-white shadow-lg shadow-${lvl.color.split('-')[1]}-200 transform scale-105` 
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

      {/* Premium Input Dialog */}
      {showPremiumInput && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <Card className="p-8 w-full max-w-sm space-y-6 relative bg-white rounded-3xl shadow-2xl">
            <button onClick={() => { setShowPremiumInput(false); setPremiumError(false); }} className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Crown className="w-8 h-8 text-amber-500 fill-amber-500" />
              </div>
              <h3 className="font-display font-bold text-2xl text-slate-800">Seja Premium</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">Libere o simulado oficial, teste de nivelamento e editor de textos.</p>
              
              <div className="w-full space-y-4 mt-4">
                <input 
                  type="text" 
                  value={premiumInput}
                  onChange={(e) => { setPremiumInput(e.target.value); setPremiumError(false); }}
                  placeholder="Digite o código de acesso"
                  className={`w-full px-5 py-3 border-2 rounded-xl outline-none font-bold text-center text-lg transition-all ${premiumError ? 'border-red-300 bg-red-50 text-red-500' : 'border-slate-100 bg-slate-50 focus:border-amber-400 focus:bg-white'}`}
                />
                {premiumError && <p className="text-red-500 text-xs font-bold bg-red-50 py-1 px-3 rounded-full inline-block">Código incorreto</p>}
                <Button onClick={handlePremiumUnlock} className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-amber-200 rounded-xl shadow-lg">Confirmar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Leveling CTA */}
      {isPremium && (
        <div onClick={() => { setSelectedCategory('Nivelamento'); startReading(LIBRARY['Nivelamento'].texts[selectedLevel][0]); }} 
          className="group relative p-6 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-3xl text-white cursor-pointer shadow-xl shadow-fuchsia-200 transition-all hover:scale-[1.02] overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:rotate-12 transition-transform duration-500">
              <Award className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner"><Award className="w-8 h-8 text-white" /></div>
            <div>
              <h3 className="font-display font-bold text-xl mb-1">Teste de Nivelamento</h3>
              <p className="text-sm text-fuchsia-100 font-medium">Descubra o nível ideal com uma leitura rápida.</p>
            </div>
            <div className="ml-auto bg-white/20 p-2 rounded-full"><ChevronRight className="w-5 h-5 text-white"/></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pb-20">
        {Object.entries(LIBRARY)
          .filter(([k]) => {
            if (k === 'Nivelamento') return false;
            if (k === 'Simulado' && !isPremium) return false;
            return true;
          })
          .map(([name, data]) => (
          <div key={name} onClick={() => { setSelectedCategory(name); setView('text_selection'); }}
            className={`group p-5 cursor-pointer bg-white rounded-3xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col items-center text-center relative overflow-hidden ${name === "Simulado" ? 'border-teal-100' : 'border-slate-50'}`}>
            {name === "Simulado" && <div className="absolute top-0 right-0 bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-1 rounded-bl-xl">NOVO</div>}
            <div className={`w-14 h-14 rounded-2xl ${data.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
              {data.icon}
            </div>
            <h3 className="font-display font-bold text-slate-700 text-sm leading-tight mb-1">{name}</h3>
            <p className="text-xs text-slate-400 font-medium">{data.texts[selectedLevel].length} histórias</p>
          </div>
        ))}
      </div>

      {isPremium && (
        <div className="fixed bottom-6 left-0 right-0 px-6 max-w-lg mx-auto pointer-events-none">
          <Button variant="secondary" className="w-full py-4 rounded-2xl shadow-xl shadow-slate-200 pointer-events-auto bg-white/90 backdrop-blur-md border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => { setCustomTextInput(''); setView('custom_text'); }}>
            <Edit className="w-5 h-5" /> Colar Texto Próprio
          </Button>
        </div>
      )}
    </div>
  );

  const renderResults = () => {
    if (!resultData) return null;
    const isSimulado = selectedCategory === "Simulado";
    
    const totalProcessed = wordsArray.filter(w => w.status !== 'pending').length || 1;
    const correctCount = wordsArray.filter(w => w.status === 'correct').length;
    const correctPct = Math.round((correctCount / totalProcessed) * 100);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (correctPct / 100) * circumference;

    return (
      <div className="pt-4 text-center space-y-6 animate-fade-in pb-10 w-full px-2">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
           <div className="text-left">
              <h2 className="font-display font-bold text-xl text-slate-800">Resultado</h2>
              <p className="text-xs text-slate-400 font-medium">{resultData.date}</p>
           </div>
           <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm ${resultData.profile.bg} ${resultData.profile.color}`}>
              {resultData.profile.label}
           </div>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-8 rounded-3xl shadow-xl shadow-violet-200 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10 blur-xl"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500 opacity-20 rounded-full transform -translate-x-10 translate-y-10 blur-xl"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
             <div className="text-xs font-bold opacity-80 uppercase tracking-widest mb-2">Classificação Final</div>
             <div className="font-display text-4xl font-extrabold tracking-tight mb-2">{resultData.classification}</div>
             <div className="flex gap-1">
               {[1,2,3,4,5].map(s => <Star key={s} className={`w-5 h-5 ${s <= (resultData.fluencyScore / 20) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />)}
             </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center relative">
            <div className="relative w-24 h-24 mb-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle cx="50%" cy="50%" r={radius} stroke="#8b5cf6" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="font-display text-2xl font-bold text-slate-700">{correctPct}%</span>
              </div>
            </div>
            <span className="text-xs uppercase font-bold text-slate-400">Precisão</span>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center space-y-4">
             <div className="text-center">
               <div className="font-display text-4xl font-bold text-sky-500">{resultData.ppm}</div>
               <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Palavras / Min</div>
             </div>
             <div className="w-full h-px bg-slate-100"></div>
             <div className="text-center">
               <div className="font-display text-xl font-bold text-slate-600">{resultData.time}s</div>
               <div className="text-[10px] uppercase font-bold text-slate-400">Tempo Total</div>
             </div>
          </div>
        </div>

        {isSimulado && (
          <div className={`p-4 rounded-2xl text-left border-l-4 ${resultData.ppm >= 57 ? 'bg-emerald-50 border-emerald-400' : 'bg-orange-50 border-orange-400'}`}>
             <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-700"><Activity className="w-4 h-4" /> Meta do Simulado</div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${resultData.ppm >= 57 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{resultData.ppm >= 57 ? 'ATINGIDA' : 'ABAIXO'}</span>
             </div>
             <div className="text-xs text-slate-500 pl-6">Referência: 60 palavras em ~63s (57 PPM)</div>
          </div>
        )}

        <div className="text-left space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 pl-2"><Eye className="w-4 h-4 text-violet-500" /> Mapa de Calor da Leitura</h3>
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm max-h-80 overflow-y-auto leading-loose text-lg font-medium text-slate-400">
              {wordsArray.map((w, i) => {
                let colorClass = "";
                if (w.status === 'correct') colorClass = "bg-emerald-100 text-emerald-800 border-b-2 border-emerald-200";
                else if (w.status === 'near') colorClass = "bg-amber-100 text-amber-800 border-b-2 border-amber-200";
                else if (w.status === 'skipped') colorClass = "bg-red-50 text-red-800 border-b-2 border-red-100 opacity-60 decoration-red-300";
                else return <span key={i} className="opacity-30 mr-2">{w.original}</span>;
                
                return <span key={i} className={`mr-2 px-2 py-0.5 rounded-md ${colorClass} inline-block transition-all hover:scale-110 cursor-default`}>{w.original}</span>
              })}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={() => setView('home')} variant="secondary" className="flex-1 py-4 rounded-2xl border-slate-200 text-slate-600">Voltar</Button>
          <Button onClick={() => startReading(currentTextOriginal)} variant="primary" className="flex-1 py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-violet-200">Ler Novamente</Button>
        </div>
      </div>
    );
  };

  const renderCustomText = () => (
    <div className="h-full flex flex-col animate-fade-in pt-4 w-full px-2">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setView('home')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="font-display font-bold text-slate-800 text-xl">Texto Personalizado</h2>
      </div>
      <div className="flex-1 bg-white border-2 border-slate-100 rounded-3xl p-6 mb-6 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-50 transition-all shadow-sm">
        <textarea 
          className="w-full h-full resize-none outline-none text-lg text-slate-600 font-medium placeholder:text-slate-300 leading-relaxed" 
          placeholder="Cole aqui o texto que deseja avaliar. Pode ser de um livro, site ou material didático..." 
          value={customTextInput} 
          onChange={(e) => setCustomTextInput(e.target.value)} 
        />
      </div>
      <Button disabled={!customTextInput.trim()} onClick={() => { setSelectedCategory("Texto Personalizado"); startReading(customTextInput); }} className="w-full py-5 text-lg rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-violet-200">Iniciar Leitura</Button>
    </div>
  );

  const renderTextSelection = () => {
    if (!selectedCategory || !LIBRARY[selectedCategory]) return null;
    const allTexts = LIBRARY[selectedCategory].texts[selectedLevel];
    const texts = isPremium ? allTexts : allTexts.slice(0, 1);

    return (
      <div className="space-y-6 animate-fade-in pt-4 w-full px-2">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('home')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h2 className="font-display font-bold text-slate-800 text-xl">{selectedCategory}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Nível {selectedLevel}</p>
          </div>
        </div>
        {!isPremium && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-sm flex items-start gap-3 border border-amber-100">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="font-medium leading-tight">Modo Demonstração: Apenas 1 texto liberado. <span className="underline cursor-pointer font-bold hover:text-amber-600" onClick={() => { setView('home'); setShowPremiumInput(true); }}>Seja Premium</span> para acesso total.</span>
          </div>
        )}
        <div className="grid gap-4 pb-24">
          {texts.map((text, index) => (
            <div key={index} onClick={() => startReading(text)} className="group bg-white p-6 rounded-3xl border border-slate-100 cursor-pointer hover:border-violet-200 hover:shadow-lg transition-all active:scale-[0.98] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-violet-50 transition-colors"></div>
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

  const renderReading = () => {
    const isSimulado = selectedCategory === "Simulado";
    const isOverTime = isSimulado && timeElapsed > 63;
    
    return (
      <div className="h-full flex flex-col pt-4 animate-fade-in w-full px-2">
        <div className="flex justify-between items-center mb-6 sticky top-0 z-20 py-2 bg-gradient-to-b from-sky-50 to-sky-50/0">
          <button onClick={() => { stopListening(); setView('home'); }} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100"><ArrowLeft className="w-6 h-6" /></button>
          
          <div className={`px-5 py-2 rounded-full font-mono font-bold text-xl flex items-center gap-3 shadow-sm border ${isOverTime ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-white text-slate-600 border-slate-100'}`}>
            <Clock className={`w-5 h-5 ${isOverTime ? 'text-red-500' : 'text-slate-400'}`} /> 
            {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
          </div>
          
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100">
            {isListening ? <Mic className="w-6 h-6 text-red-500 animate-pulse" /> : <MicOff className="w-6 h-6 text-slate-300" />}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 p-6 md:p-10 mb-6 overflow-y-auto relative scroll-smooth">
          {!isTimerRunning && timeElapsed === 0 && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-center p-8 rounded-[2.5rem]">
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mb-6 animate-pulse-soft">
                <BookOpen className="w-10 h-10 text-violet-600" />
              </div>
              <h3 className="font-display font-bold text-2xl text-slate-800 mb-2">Hora da Leitura!</h3>
              <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">Leia o texto em voz alta com calma e clareza. Vamos começar?</p>
              
              <div className="flex flex-col gap-4 w-full max-w-xs">
                <Button onClick={toggleTTS} variant="secondary" className="w-full py-4 rounded-2xl border-violet-100 text-violet-600 hover:bg-violet-50">{isSpeaking ? 'Parar Áudio' : 'Ouvir Exemplo'}</Button>
                <Button onClick={startListening} variant="primary" className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-violet-200 text-lg">Começar Agora</Button>
              </div>
            </div>
          )}
          
          <div className={`text-2xl md:text-4xl leading-[2] md:leading-[2] font-medium text-slate-300 transition-all duration-500 ${!isTimerRunning && timeElapsed === 0 ? 'blur-sm opacity-50' : 'opacity-100'}`}>
            {wordsArray.map((item, index) => {
              let statusClass = "mr-2.5 px-1 py-0.5 rounded-lg inline-block transition-all duration-300";
              const isCurrent = index === currentWordIndex;
              
              if (isCurrent) {
                statusClass += " bg-violet-600 text-white font-bold transform scale-110 shadow-lg shadow-violet-200 z-10 relative";
              }
              else if (item.status === 'correct') {
                statusClass += " bg-emerald-100 text-emerald-800";
              }
              else if (item.status === 'near') {
                statusClass += " bg-amber-100 text-amber-800";
              }
              else if (item.status === 'skipped') {
                statusClass += " bg-red-50 text-red-300 decoration-red-300 line-through decoration-2";
              }
              else if (item.status === 'pending') {
                statusClass += " text-slate-700";
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
        </div>
        {isTimerRunning && (
          <Button onClick={finishReading} variant="success" className="w-full py-5 text-xl rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 mb-6">
            <CheckCircle className="w-6 h-6" /> Terminei a Leitura
          </Button>
        )}
      </div>
    );
  };

  if (showLanding) return renderLandingPage();

  return (
    <div className="min-h-screen bg-sky-50 font-sans text-slate-800 selection:bg-violet-200 pb-safe">
      <div className="w-full max-w-lg mx-auto min-h-screen relative">
        <div className="h-full p-4 overflow-y-auto pb-safe">
          {view === 'home' && renderHome()}
          {view === 'text_selection' && renderTextSelection()}
          {view === 'custom_text' && renderCustomText()}
          {view === 'reading' && renderReading()}
          {view === 'results' && renderResults()}
          {view === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full pt-40 animate-fade-in">
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center animate-spin mb-6"><Wand2 className="w-10 h-10 text-violet-600"/></div>
              <h2 className="font-display font-bold text-xl text-slate-700">Criando sua história mágica...</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}