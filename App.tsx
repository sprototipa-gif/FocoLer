import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Mic, Play, RotateCcw, Award, BarChart2, CheckCircle, Wand2, MicOff, AlertCircle, ArrowLeft, Download, Clock, PieChart, Activity, Eye, Share2, Calculator, Edit, UserCog, Volume2, StopCircle } from 'lucide-react';
import { Button, Card } from './components/UI';
import { LIBRARY, LEVELS } from './constants';
import { DifficultyLevel, IWindow, ReadingResult, WordObject, WordStatus } from './types';
import { generateStory } from './services/geminiService';

// --- Algoritmo de Levenshtein para comparação difusa ---
const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,   // insertion
            matrix[i - 1][j] + 1    // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  if (longer.length === 0) {
    return 1.0;
  }
  return (longer.length - getLevenshteinDistance(s1, s2)) / longer.length;
};

// Utility to clean words for comparison
const cleanWord = (word: string): string => {
  return word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
};

// --- Função de Avaliação de Fluência ---
const calculateFluencyScore = (
  total_palavras_lidas: number,
  total_palavras_corretas: number,
  tempo_leitura_segundos: number,
  prosodia_nivel: number = 3, // Padrão 'Bom' (1-4)
  acertos_compreensao: number = 5, // Padrão 100%
  total_questoes_compreensao: number = 5
) => {
  // 1. Precisão (0-100)
  const precisao = total_palavras_lidas > 0 
    ? (total_palavras_corretas / total_palavras_lidas) * 100 
    : 0;

  // 2. Velocidade (PPM)
  // Nota: Para a nota de 0-100, precisamos normalizar o PPM.
  // Vamos assumir que ~110 PPM é o "100%" para esta faixa etária para não estourar a nota.
  const ppm = tempo_leitura_segundos > 0 
    ? (total_palavras_corretas / tempo_leitura_segundos) * 60 
    : 0;
  
  const velocidadeScore = Math.min((ppm / 110) * 100, 100);

  // 3. Prosódia (Transformar escala 1-4 em 0-100)
  const prosodiaScore = (prosodia_nivel / 4) * 100;

  // 4. Compreensão (0-100)
  const compreensaoScore = total_questoes_compreensao > 0 
    ? (acertos_compreensao / total_questoes_compreensao) * 100 
    : 0;

  // Média Ponderada
  // Precisão: 30%, Velocidade: 30%, Prosódia: 20%, Compreensão: 20%
  const notaFinal = (
    (precisao * 0.30) +
    (velocidadeScore * 0.30) +
    (prosodiaScore * 0.20) +
    (compreensaoScore * 0.20)
  );

  // Classificação
  let classificacao = "";
  if (notaFinal >= 75) {
    classificacao = "Avançado";
  } else if (notaFinal >= 50) {
    classificacao = "Adequado";
  } else {
    classificacao = "Abaixo do esperado";
  }

  return {
    nota: Math.round(notaFinal),
    classificacao
  };
};

export default function App() {
  const [view, setView] = useState<'home' | 'text_selection' | 'reading' | 'results' | 'generating' | 'custom_text'>('home');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>('medio');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Custom Text State
  const [customTextInput, setCustomTextInput] = useState('');

  // Reading State
  const [currentTextOriginal, setCurrentTextOriginal] = useState('');
  const [wordsArray, setWordsArray] = useState<WordObject[]>([]); 
  const [currentWordIndex, setCurrentWordIndex] = useState(0); 
  
  // Control State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [resultData, setResultData] = useState<ReadingResult | null>(null);
  const [history, setHistory] = useState<ReadingResult[]>([]);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // REFS: Vital for performance and avoiding stale closures in the speech callback
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const wordsRef = useRef<WordObject[]>([]);
  const indexRef = useRef(0);
  const runningRef = useRef(false);

  // Sync state to refs
  useEffect(() => { wordsRef.current = wordsArray; }, [wordsArray]);
  useEffect(() => { indexRef.current = currentWordIndex; }, [currentWordIndex]);
  useEffect(() => { runningRef.current = isTimerRunning; }, [isTimerRunning]);

  // Initialize Speech Recognition (ONCE)
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

        // Optimized Result Handler
        recognition.onresult = (event: any) => {
          // Check ref directly to avoid closure issues
          if (!runningRef.current) return;

          const results = event.results;
          // Get the latest result
          const lastResult = results[results.length - 1];
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          
          // Split the *latest segment* into words. 
          const spokenWords = transcript.split(' ').map((w: string) => cleanWord(w)).filter((w: string) => w.length > 0);
          
          if (spokenWords.length === 0) return;

          // Optimization: Only look at the last word spoken to compare against target
          const lastSpoken = spokenWords[spokenWords.length - 1];
          
          const currentIndex = indexRef.current;
          const currentWords = wordsRef.current;
          
          if (currentIndex >= currentWords.length) return;

          const currentTarget = currentWords[currentIndex];
          const nextTarget = currentWords[currentIndex + 1];

          // Calculate similarities
          const simCurrent = getSimilarity(lastSpoken, currentTarget.clean);
          const simNext = nextTarget ? getSimilarity(lastSpoken, nextTarget.clean) : 0;

          // Thresholds
          const EXACT_MATCH = 0.95;
          const NEAR_MATCH = 0.65; // Slightly stricter to avoid false positives on noise

          // Logic 1: Match Current
          if (simCurrent >= NEAR_MATCH) {
             const status = simCurrent >= EXACT_MATCH ? 'correct' : 'near';
             
             // Update State
             setWordsArray(prev => {
               const newArr = [...prev];
               if (newArr[currentIndex]) newArr[currentIndex].status = status;
               return newArr;
             });
             setCurrentWordIndex(prev => prev + 1);
          } 
          // Logic 2: Match Next (Skipped)
          else if (nextTarget && simNext >= NEAR_MATCH) {
             const statusNext = simNext >= EXACT_MATCH ? 'correct' : 'near';
             
             setWordsArray(prev => {
               const newArr = [...prev];
               if (newArr[currentIndex]) newArr[currentIndex].status = 'skipped';
               if (newArr[currentIndex + 1]) newArr[currentIndex + 1].status = statusNext;
               return newArr;
             });
             setCurrentWordIndex(prev => prev + 2);
          }
        };

        recognition.onend = () => {
          // Auto-restart if we are supposed to be running
          if (runningRef.current) {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, []); // Empty dependency array ensures this only runs ONCE

  // Timer Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Auto-finish check
  useEffect(() => {
    if (wordsArray.length > 0 && currentWordIndex >= wordsArray.length && isTimerRunning) {
      finishReading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordIndex, wordsArray, isTimerRunning]);

  // Clean up TTS on unmount or view change
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, []);

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleTTS = () => {
    if (isSpeaking) {
      stopTTS();
    } else {
      const utterance = new SpeechSynthesisUtterance(currentTextOriginal);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9; // Slightly slower for better comprehension
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const startReading = (text: string) => {
    stopTTS(); // Ensure no audio is playing
    setCurrentTextOriginal(text);
    const words: WordObject[] = text.split(' ').map(w => ({
      original: w,
      clean: cleanWord(w),
      status: 'pending'
    }));
    
    // Reset states
    setWordsArray(words);
    setCurrentWordIndex(0);
    setTimeElapsed(0);
    setView('reading');
    
    // Reset Refs manually to ensure sync before next render cycle
    wordsRef.current = words;
    indexRef.current = 0;
    
    setIsTimerRunning(false);
    setIsListening(false);
  };

  const startListening = () => {
    stopTTS(); // Stop TTS if student starts reading
    setIsTimerRunning(true);
    setIsListening(true);
    runningRef.current = true;
    
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) { 
        console.log("Mic already on or error");
      }
    }
  };

  const stopListening = () => {
    setIsTimerRunning(false);
    setIsListening(false);
    runningRef.current = false;
    stopTTS();
    
    if (recognitionRef.current) { recognitionRef.current.stop(); }
  };

  const handleGenerateStory = async () => {
    setView('generating');
    try {
      const newText = await generateStory(selectedLevel);
      startReading(newText);
    } catch (error) {
      alert("Houve um erro ao gerar a história. Tente novamente.");
      setView('home');
    }
  };

  const finishReading = () => {
    stopListening();
    const minutes = timeElapsed / 60;
    
    const correctWords = wordsArray.filter(w => w.status === 'correct').length;
    const nearWords = wordsArray.filter(w => w.status === 'near').length;
    const validWords = correctWords + nearWords;
    const processedWords = wordsArray.filter(w => w.status !== 'pending').length;

    const ppm = Math.round(validWords / (minutes > 0 ? minutes : 0.1)); 
    
    // Calcular Nota de Fluência
    const { nota, classificacao } = calculateFluencyScore(
      processedWords > 0 ? processedWords : validWords, // Total lido
      validWords, // Total correto
      timeElapsed,
      3, // Prosódia Padrão (Bom)
      5, // Compreensão Padrão (5/5)
      5
    );

    let profile = LEVELS.PRE_LEITOR;
    if (ppm >= LEVELS.FLUENTE.minPPM) profile = LEVELS.FLUENTE;
    else if (ppm >= LEVELS.INICIANTE.minPPM) profile = LEVELS.INICIANTE;

    const result: ReadingResult = {
      ppm,
      time: timeElapsed,
      words: validWords,
      totalWords: wordsArray.length,
      profile,
      date: new Date().toLocaleDateString('pt-BR'),
      fluencyScore: nota,
      classification: classificacao
    };

    setResultData(result);
    setHistory([result, ...history]);
    setView('results');
  };

  const downloadReport = () => {
    if (!resultData) return;
    const isCAEd = selectedCategory === "Avaliação CAEd 2025";

    const reportContent = `
RELATÓRIO DE FLUÊNCIA DE LEITURA - FOCOLER
------------------------------------------
Data: ${resultData.date}
Categoria: ${selectedCategory || 'Geral'}
Nível: ${selectedLevel}
Perfil: ${resultData.profile.label}

AVALIAÇÃO GERAL
--------------------------------
Classificação: ${resultData.classification}
(Nota técnica: ${resultData.fluencyScore})

ESTATÍSTICAS TÉCNICAS
--------------------------------
PPM: ${resultData.ppm}
Tempo: ${resultData.time}s
Palavras Corretas: ${resultData.words}/${resultData.totalWords}

${isCAEd ? `
REFERÊNCIA CAEd 2025
--------------------------------
Meta Tempo: 63s
Meta PPM: ~57
Status: ${resultData.time <= 63 ? 'DENTRO DA META' : 'ACIMA DA META'}
` : ''}

DETALHES DA LEITURA
---------------------------------------
${wordsArray.map(w => {
  let status = 'LIDO';
  if (w.status === 'skipped') status = 'PULOU';
  if (w.status === 'near') status = 'APROX';
  if (w.status === 'pending') status = '-';
  return `${w.original}: ${status}`;
}).join('\n')}
    `.trim();

    const element = document.createElement("a");
    const file = new Blob([reportContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `relatorio_focoler.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- Views ---

  const renderHome = () => (
    <div className="space-y-6 max-w-md mx-auto pt-4 pb-12 animate-fade-in w-full">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Foco<span className="text-indigo-600">Ler</span></h1>
        <p className="text-sm text-slate-500">Foco na leitura fluente</p>
      </div>

      <div className="flex flex-col gap-2 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-full">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nível de Leitura</span>
        <div className="flex gap-2 justify-center w-full">
          {(['facil', 'medio', 'dificil'] as DifficultyLevel[]).map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`flex-1 py-3 rounded-lg text-sm font-bold capitalize transition-all touch-manipulation ${
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

      <div className="space-y-3 w-full">
        <div className="flex justify-between items-end px-2">
          <h2 className="font-bold text-slate-700 text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Temas
          </h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(LIBRARY).map(([name, data]) => (
            <Card 
              key={name} 
              onClick={() => {
                setSelectedCategory(name);
                setView('text_selection');
              }}
              className={`p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all active:scale-95 group border-2 ${name === "Avaliação CAEd 2025" ? 'border-teal-100 bg-teal-50' : 'border-slate-100'}`}
            >
              <div className={`w-10 h-10 rounded-full ${data.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                {data.icon}
              </div>
              <h3 className="font-bold text-slate-700 text-sm leading-tight">{name}</h3>
              <p className="text-xs text-slate-400 mt-1">{data.texts[selectedLevel].length} textos</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-50 text-slate-400">Ferramentas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Button 
          variant="secondary" 
          className="w-full text-base py-3"
          onClick={() => {
            setCustomTextInput('');
            setView('custom_text');
          }}
        >
          <UserCog className="w-5 h-5" />
          Área do Professor (Texto Próprio)
        </Button>

        <Button 
          variant="magic" 
          className="w-full text-base shadow-xl py-3"
          onClick={handleGenerateStory}
        >
          <Wand2 className="w-5 h-5" />
          Criar História IA
        </Button>
      </div>

      {history.length > 0 && (
        <div className="pt-4 px-2 w-full">
          <div className="flex justify-between items-center mb-3">
             <h3 className="font-bold text-slate-700">Últimas</h3>
             <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map((h, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${h.profile.bg.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-600">{h.profile.label}</span>
                    <span className="text-xs text-slate-400">{h.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-800 text-sm">{h.ppm} PPM</span>
                  <span className="text-[10px] text-indigo-500 font-bold">{h.classification}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCustomText = () => (
    <div className="h-full flex flex-col animate-fade-in pt-4 w-full">
      <div className="flex items-center gap-3 mb-6 sticky top-0 bg-white z-20 py-2">
        <button 
          onClick={() => setView('home')} 
          className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
           <h2 className="font-bold text-slate-800 text-lg">Área do Professor</h2>
           <p className="text-xs text-slate-400">Insira um texto personalizado para avaliação</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm focus-within:border-indigo-500 transition-colors">
          <textarea
            className="w-full h-full resize-none outline-none text-slate-700 text-lg leading-relaxed placeholder:text-slate-300"
            placeholder="Cole ou digite o texto aqui..."
            value={customTextInput}
            onChange={(e) => setCustomTextInput(e.target.value)}
          />
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Dica: Utilize textos adequados ao nível da turma. O sistema irá segmentar as palavras automaticamente para o acompanhamento.
          </p>
        </div>

        <Button 
          disabled={!customTextInput.trim()}
          onClick={() => {
            setSelectedCategory("Texto Personalizado");
            startReading(customTextInput);
          }} 
          className="w-full py-4 text-lg mb-6"
        >
          <Edit className="w-5 h-5" />
          Iniciar Avaliação
        </Button>
      </div>
    </div>
  );

  const renderTextSelection = () => {
    if (!selectedCategory || !LIBRARY[selectedCategory]) return null;
    const categoryData = LIBRARY[selectedCategory];
    const texts = categoryData.texts[selectedLevel];

    return (
      <div className="space-y-6 animate-fade-in pt-4 w-full">
        <div className="flex items-center gap-3 mb-2 sticky top-0 bg-white/95 backdrop-blur-sm z-20 py-2 border-b border-slate-100">
          <button 
            onClick={() => setView('home')} 
            className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl ${categoryData.color} shadow-sm`}>
               {React.cloneElement(categoryData.icon as React.ReactElement<any>, { className: "w-5 h-5" })}
             </div>
             <div>
                <h2 className="font-bold text-slate-800 leading-tight text-sm md:text-base">{selectedCategory}</h2>
                <p className="text-xs text-slate-400 font-medium">Nível <span className="capitalize">{selectedLevel}</span></p>
             </div>
          </div>
        </div>

        <div className="grid gap-3 pb-8">
          {texts.map((text, index) => (
            <Card 
              key={index}
              onClick={() => startReading(text)}
              className="p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99] group"
            >
              <div className="flex gap-4 items-start">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 text-slate-400 font-bold flex items-center justify-center text-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mt-0.5">
                   {index + 1}
                 </div>
                 <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                   {text}
                 </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in pt-20">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg relative z-10">
          <Wand2 className="w-10 h-10 text-purple-600 animate-[spin_3s_linear_infinite]" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Criando sua aventura...</h2>
      </div>
    </div>
  );

  const renderReading = () => {
    const isCAEd = selectedCategory === "Avaliação CAEd 2025";
    const isOverTime = isCAEd && timeElapsed > 63;
    const isWarningTime = isCAEd && timeElapsed > 60 && timeElapsed <= 63;

    return (
      <div className="h-full flex flex-col pt-4 animate-fade-in w-full">
        {/* Header Fixo na Leitura */}
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-20 py-2">
          <button onClick={() => { stopListening(); setView('home'); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className={`px-4 py-1.5 rounded-full font-mono font-bold text-lg transition-all duration-300 flex items-center gap-2
            ${isOverTime ? 'bg-red-100 text-red-700 animate-pulse' : 
              isWarningTime ? 'bg-yellow-100 text-yellow-700' :
              isTimerRunning ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-slate-100 text-slate-600'}`}>
            <Clock className="w-4 h-4" />
            {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
          </div>

          <div className="w-10 flex justify-center">
            {isListening ? <Mic className="w-6 h-6 text-red-500 animate-pulse" /> : <MicOff className="w-6 h-6 text-slate-300" />}
          </div>
        </div>

        {isCAEd && isTimerRunning && (
          <div className="text-center text-xs text-slate-400 mb-2">
            Meta: 63 segundos.
          </div>
        )}

        <Card className="flex-1 p-4 md:p-8 mb-6 overflow-y-auto relative border-2 border-indigo-50 scroll-smooth">
          {!isTimerRunning && timeElapsed === 0 && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-center p-6 rounded-2xl animate-fade-in">
              <div className="bg-indigo-100 p-4 rounded-full mb-4 animate-float">
                <Mic className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Vamos ler juntos?</h3>
              <p className="text-slate-500 mb-6 max-w-xs text-sm md:text-base">
                Vou te ouvir e marcar as palavras. Permita o uso do microfone.
              </p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button onClick={toggleTTS} variant="secondary" className="w-full text-lg py-3">
                  {isSpeaking ? (
                    <> <StopCircle className="w-5 h-5 animate-pulse text-red-500" /> Parar Áudio </>
                  ) : (
                    <> <Volume2 className="w-5 h-5" /> Ouvir Texto </>
                  )}
                </Button>

                <Button onClick={startListening} variant="primary" className="w-full text-lg py-4">
                  <Play className="w-5 h-5" /> Começar
                </Button>
              </div>
            </div>
          )}
          
          <div className={`text-xl md:text-2xl leading-loose font-medium transition-all duration-500 ${!isTimerRunning && timeElapsed === 0 ? 'blur-sm opacity-50' : 'opacity-100'}`}>
            {wordsArray.map((item, index) => {
              const baseClass = "mr-1.5 mb-2 px-1.5 py-0.5 rounded-md transition-colors duration-200 inline-block";
              
              let statusClass = `${baseClass} text-slate-400 bg-transparent`; 
              
              if (index === currentWordIndex) {
                 statusClass = `${baseClass} bg-indigo-600 text-white font-bold shadow-sm`;
              } else if (item.status === 'correct') {
                 statusClass = `${baseClass} bg-emerald-200 text-emerald-900`;
              } else if (item.status === 'near') {
                 statusClass = `${baseClass} bg-yellow-200 text-yellow-900`;
              } else if (item.status === 'skipped') {
                 statusClass = `${baseClass} bg-red-100 text-red-900 opacity-60`;
              } else if (item.status === 'pending') {
                 statusClass = `${baseClass} text-slate-800`;
              }

              return (
                <span key={index} className={statusClass}>
                  {item.original}
                </span>
              );
            })}
          </div>
        </Card>

        <div className="pb-8 space-y-3">
          {isTimerRunning && (
             <div className="space-y-4 animate-fade-in">
              <div className="flex justify-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-wide opacity-70">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Perfeito</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div>Quase</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>Pulou</div>
              </div>
              <Button onClick={finishReading} variant="success" className="w-full text-xl py-4 active:scale-95 touch-manipulation">
                <CheckCircle className="w-6 h-6" />
                Terminei
              </Button>
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!resultData) return null;
    const isCAEd = selectedCategory === "Avaliação CAEd 2025";
    
    const correctCount = wordsArray.filter(w => w.status === 'correct').length;
    const nearCount = wordsArray.filter(w => w.status === 'near').length;
    const skippedCount = wordsArray.filter(w => w.status === 'skipped').length;
    const totalProcessed = correctCount + nearCount + skippedCount;
    
    const correctPct = totalProcessed ? Math.round((correctCount / totalProcessed) * 100) : 0;
    const nearPct = totalProcessed ? Math.round((nearCount / totalProcessed) * 100) : 0;
    const skippedPct = totalProcessed ? Math.round((skippedCount / totalProcessed) * 100) : 0;

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (correctPct / 100) * circumference;

    return (
      <div className="pt-2 text-center space-y-6 animate-fade-in pb-10 w-full">
        
        <div className="flex items-center justify-between">
           <div className="text-left">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Relatório</h2>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{new Date().toLocaleDateString()}</p>
           </div>
           <div className={`px-3 py-1 rounded-lg text-xs md:text-sm font-bold ${resultData.profile.bg} ${resultData.profile.color}`}>
              {resultData.profile.label}
           </div>
        </div>

        {/* Novo Card de Avaliação Final */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
           <div className="relative z-10 flex flex-col items-center text-center">
             <div className="text-sm font-medium opacity-90 uppercase tracking-widest mb-3">Classificação Final</div>
             <div className="text-3xl md:text-4xl font-black tracking-tight mb-1 leading-tight">
               {resultData.classification}
             </div>
           </div>
        </Card>

        {/* Grids responsivos */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Card className="p-3 md:p-4 flex flex-col items-center justify-center relative overflow-hidden bg-white aspect-square md:aspect-auto">
            <div className="relative w-20 h-20 md:w-24 md:h-24">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
                <circle cx="50%" cy="50%" r={radius} stroke="#10b981" strokeWidth="8" fill="none" 
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-lg md:text-xl font-bold text-slate-700">{correctPct}%</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase">Precisão</span>
              </div>
            </div>
          </Card>

          <Card className="p-3 md:p-4 flex flex-col justify-center space-y-2 bg-indigo-50 border-indigo-100 aspect-square md:aspect-auto">
             <div className="text-center">
               <div className="text-2xl md:text-3xl font-bold text-indigo-600">{resultData.ppm}</div>
               <div className="text-[10px] uppercase font-bold text-indigo-400">PPM</div>
             </div>
             <div className="w-full h-px bg-indigo-200"></div>
             <div className="text-center">
               <div className="text-lg md:text-xl font-bold text-slate-600">{resultData.time}s</div>
               <div className="text-[10px] uppercase font-bold text-slate-400">Tempo</div>
             </div>
          </Card>
        </div>

        <div className="space-y-2">
           <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
             <span>Precisão Detalhada</span>
             <span>{totalProcessed} Palavras</span>
           </div>
           <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
             <div style={{ width: `${correctPct}%` }} className="bg-emerald-500 transition-all duration-1000"></div>
             <div style={{ width: `${nearPct}%` }} className="bg-yellow-400 transition-all duration-1000"></div>
             <div style={{ width: `${skippedPct}%` }} className="bg-red-400 transition-all duration-1000"></div>
           </div>
           <div className="flex justify-between text-[10px] font-medium text-slate-400">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {correctCount}</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> {nearCount}</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> {skippedCount}</span>
           </div>
        </div>

        {isCAEd && (
          <Card className="bg-teal-50 border-teal-200 p-4 text-left">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                   <Activity className="w-4 h-4 text-teal-600" />
                   <h3 className="font-bold text-teal-800 text-sm">Meta CAEd 2025</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${resultData.ppm >= 57 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {resultData.ppm >= 57 ? 'ATINGIDA' : 'ABAIXO'}
                </span>
             </div>
             
             <div className="relative pt-4 pb-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-orange-400 to-green-500" style={{ width: '100%' }}></div>
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-black" style={{ left: '57%' }}></div>
                <div className="absolute -top-1 text-[9px] font-bold text-slate-600" style={{ left: '55%' }}>57</div>

                <div className="absolute top-2 w-3 h-3 bg-teal-600 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 transition-all duration-1000" 
                     style={{ left: `${Math.min(resultData.ppm, 100)}%` }}></div>
             </div>
          </Card>
        )}

        <div className="text-left space-y-2">
          <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
             <Eye className="w-4 h-4" /> Mapa de Calor
          </h3>
          <Card className="p-3 bg-slate-50 border-slate-200 max-h-60 overflow-y-auto">
            <p className="leading-relaxed text-base text-slate-400">
              {wordsArray.map((w, i) => {
                let colorClass = "";
                if (w.status === 'correct') colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                else if (w.status === 'near') colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
                else if (w.status === 'skipped') colorClass = "bg-red-100 text-red-800 border-red-200 decoration-red-400";
                else return <span key={i} className="opacity-40 mr-1">{w.original}</span>;

                return (
                  <span key={i} className={`mr-1 px-1 py-0.5 rounded border ${colorClass} inline-block mb-1 text-sm`}>
                    {w.original}
                  </span>
                )
              })}
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex gap-3">
            <Button onClick={() => setView('home')} variant="secondary" className="flex-1 py-3 text-sm">
              Menu
            </Button>
            <Button onClick={downloadReport} variant="secondary" className="flex-1 py-3 text-sm">
               <Download className="w-4 h-4" /> Baixar
            </Button>
          </div>
          <Button onClick={() => startReading(currentTextOriginal)} variant="primary" className="w-full py-4 text-lg">
              <RotateCcw className="w-5 h-5" /> Ler Novamente
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      <div className="w-full max-w-lg mx-auto min-h-screen bg-white shadow-2xl overflow-hidden relative border-x border-slate-100">
        <div className="h-full p-4 md:p-6 overflow-y-auto pb-24 scrollbar-hide">
          {view === 'home' && renderHome()}
          {view === 'text_selection' && renderTextSelection()}
          {view === 'generating' && renderGenerating()}
          {view === 'custom_text' && renderCustomText()}
          {view === 'reading' && renderReading()}
          {view === 'results' && renderResults()}
        </div>
      </div>
    </div>
  );
}