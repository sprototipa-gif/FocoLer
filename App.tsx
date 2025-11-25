import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Mic, Play, RotateCcw, Award, BarChart2, CheckCircle, Wand2, MicOff, AlertCircle, ArrowLeft, Download, Clock, PieChart, Activity, Eye, Edit, UserCog, Volume2, StopCircle, UserPlus, Users, Trash2, ChevronRight, X, LogIn } from 'lucide-react';
import { Button, Card } from './components/UI';
import { LIBRARY, LEVELS } from './constants';
import { DifficultyLevel, IWindow, ReadingResult, WordObject, ReadingLog, Student, HeatmapItem } from './types';
import { generateStory } from './services/geminiService';
import * as storageService from './services/storageService';

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

const cleanWord = (word: string): string => {
  return word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
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
  const ppm = tempo_leitura_segundos > 0 ? (total_palavras_corretas / tempo_leitura_segundos) * 60 : 0;
  const velocidadeScore = Math.min((ppm / 110) * 100, 100);
  const prosodiaScore = (prosodia_nivel / 4) * 100;
  const compreensaoScore = total_questoes_compreensao > 0 ? (acertos_compreensao / total_questoes_compreensao) * 100 : 0;
  const notaFinal = ((precisao * 0.30) + (velocidadeScore * 0.30) + (prosodiaScore * 0.20) + (compreensaoScore * 0.20));
  
  let classificacao = "";
  if (notaFinal >= 75) classificacao = "Avançado";
  else if (notaFinal >= 50) classificacao = "Adequado";
  else classificacao = "Abaixo do esperado";

  return { nota: Math.round(notaFinal), classificacao, ppm };
};

export default function App() {
  // Views - Defaulting to 'home' to restore immediate access
  const [view, setView] = useState<'student_select' | 'teacher_dashboard' | 'home' | 'text_selection' | 'reading' | 'results' | 'generating' | 'custom_text' | 'report_detail'>('home');
  
  // Data & State
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [selectedReportStudent, setSelectedReportStudent] = useState<Student | null>(null);
  
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
  
  // Inputs
  const [newStudentName, setNewStudentName] = useState('');

  // REFS
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const wordsRef = useRef<WordObject[]>([]);
  const indexRef = useRef(0);
  const runningRef = useRef(false);

  // Load Students on Mount
  useEffect(() => {
    setStudents(storageService.getStudents());
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
          const lastResult = results[results.length - 1];
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          const spokenWords = transcript.split(' ').map((w: string) => cleanWord(w)).filter((w: string) => w.length > 0);
          if (spokenWords.length === 0) return;

          // Sliding Window Logic
          const batch = spokenWords.slice(-3); // Look at last 3 words
          const currentIndex = indexRef.current;
          const currentWords = wordsRef.current;
          
          let bestMatchIndex = -1;
          let highestSim = 0;

          // Check up to 4 words ahead
          for (let i = 0; i < 4; i++) {
            const targetIdx = currentIndex + i;
            if (targetIdx >= currentWords.length) break;
            
            // Check against our batch
            for (const spoken of batch) {
              const sim = getSimilarity(spoken, currentWords[targetIdx].clean);
              if (sim > highestSim) {
                highestSim = sim;
                bestMatchIndex = targetIdx;
              }
            }
          }

          if (highestSim >= 0.65) {
            const status = highestSim >= 0.9 ? 'correct' : 'near';
            
            setWordsArray(prev => {
              const newArr = [...prev];
              // Mark jumped words
              for (let k = currentIndex; k < bestMatchIndex; k++) {
                if (newArr[k].status === 'pending') newArr[k].status = 'skipped';
              }
              // Mark match
              newArr[bestMatchIndex].status = status;
              return newArr;
            });
            setCurrentWordIndex(bestMatchIndex + 1);
          }
        };

        recognition.onend = () => {
          if (runningRef.current) try { recognition.start(); } catch (e) {}
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

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent = storageService.saveStudent(newStudentName);
    setStudents([...students, newStudent]);
    setNewStudentName('');
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este aluno e todo o seu histórico?')) {
      storageService.deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      if (selectedReportStudent?.id === id) {
        setSelectedReportStudent(null);
        setView('teacher_dashboard');
      }
      if (currentStudent?.id === id) {
        setCurrentStudent(null);
        setView('student_select');
      }
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
    if (recognitionRef.current) try { recognitionRef.current.start(); } catch (e) {}
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
    const minutes = timeElapsed / 60;
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

    // Only save if there's a logged-in student
    if (currentStudent) {
      storageService.saveReading({
        studentId: currentStudent.id,
        date: result.date,
        timestamp: Date.now(),
        category: selectedCategory || 'Geral',
        level: selectedLevel,
        ppm,
        accuracy: Math.round((validWords / (processedWords || 1)) * 100),
        time: timeElapsed,
        totalWords: wordsArray.length,
        correctWords: validWords,
        fluencyScore: nota,
        classification: classificacao,
        heatmap
      });
      
      // Leveling Logic Update
      if (selectedCategory === 'Nivelamento') {
        storageService.updateStudentLevel(currentStudent.id, 
          ppm >= 90 ? 'dificil' : ppm >= 60 ? 'medio' : 'facil'
        );
        // Refresh local student
        setCurrentStudent(prev => prev ? ({...prev, level: ppm >= 90 ? 'dificil' : ppm >= 60 ? 'medio' : 'facil' }) : null);
      }
    }

    setView('results');
  };

  // --- Views ---

  const renderStudentSelect = () => (
    <div className="flex flex-col items-center justify-center min-h-full p-4 animate-fade-in">
      <div className="flex items-center w-full mb-4">
         <button onClick={() => setView('home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tighter mb-2">Quem é você?</h1>
        <p className="text-slate-500">Selecione seu perfil</p>
      </div>

      <div className="w-full max-w-md grid gap-3 mb-8 max-h-[50vh] overflow-y-auto pr-2">
        {students.map(student => (
          <Card key={student.id} onClick={() => {
            setCurrentStudent(student);
            setSelectedLevel(student.level);
            setView('home');
          }} className="p-4 flex items-center justify-between hover:border-indigo-300 cursor-pointer transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{student.name}</h3>
                <p className="text-xs text-slate-400 capitalize">Nível: {student.level}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
          </Card>
        ))}
        
        {students.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
            Nenhum aluno encontrado.<br/>Peça ao professor para cadastrar.
          </div>
        )}
      </div>

      <Button onClick={() => setView('teacher_dashboard')} variant="secondary" className="w-full max-w-xs">
        <UserCog className="w-5 h-5" /> Área do Professor
      </Button>
    </div>
  );

  const renderTeacherDashboard = () => (
    <div className="flex flex-col h-full pt-4 animate-fade-in w-full">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 py-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-xl text-slate-800">Gestão de Turma</h2>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
          {students.length} Alunos
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          placeholder="Nome do novo aluno"
          value={newStudentName}
          onChange={(e) => setNewStudentName(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
        />
        <Button onClick={handleAddStudent} disabled={!newStudentName.trim()} variant="primary">
          <UserPlus className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {students.length === 0 ? (
            <div className="text-center text-slate-400 mt-10 p-6 bg-slate-50 rounded-xl">
                Adicione seus alunos para acompanhar o progresso.
            </div>
        ) : (
            students.map(student => {
            const stats = storageService.getStudentStats(student.id);
            return (
                <Card key={student.id} onClick={() => {
                setSelectedReportStudent(student);
                setView('report_detail');
                }} className="p-4 cursor-pointer hover:border-indigo-300 transition-all">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-500">
                        {student.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">{student.name}</h3>
                        <div className="flex gap-2 text-xs mt-1">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded capitalize">{student.level}</span>
                        {stats && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{stats.avgPPM} PPM (Méd)</span>}
                        </div>
                    </div>
                    </div>
                    <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                    <Trash2 className="w-5 h-5" />
                    </button>
                </div>
                </Card>
            );
            })
        )}
      </div>
    </div>
  );

  const renderReportDetail = () => {
    if (!selectedReportStudent) return null;
    const stats = storageService.getStudentStats(selectedReportStudent.id);
    const readings = storageService.getStudentReadings(selectedReportStudent.id);

    return (
      <div className="flex flex-col h-full pt-4 animate-fade-in w-full">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 py-2">
          <button onClick={() => setView('teacher_dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-lg text-slate-800">{selectedReportStudent.name}</h2>
          <button onClick={() => handleDeleteStudent(selectedReportStudent.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">
            Excluir Aluno
          </button>
        </div>

        {!stats ? (
          <div className="text-center text-slate-400 mt-10">Nenhuma leitura registrada.</div>
        ) : (
          <div className="space-y-6 pb-10">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.avgPPM}</div>
                <div className="text-xs font-bold text-indigo-400 uppercase">Média PPM</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.avgAccuracy}%</div>
                <div className="text-xs font-bold text-emerald-400 uppercase">Precisão</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-600 text-sm uppercase">Histórico de Leituras</h3>
              {readings.map(log => (
                <Card key={log.id} className="p-4 border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400">{log.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      log.classification === 'Avançado' ? 'bg-green-100 text-green-700' :
                      log.classification === 'Adequado' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{log.classification}</span>
                  </div>
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm line-clamp-1">{log.category}</h4>
                      <div className="text-xs text-slate-500">PPM: <b>{log.ppm}</b> • Precisão: <b>{log.accuracy}%</b></div>
                    </div>
                  </div>
                  
                  {/* Mini Heatmap */}
                  {log.heatmap && (
                    <div className="bg-slate-50 p-2 rounded-lg text-xs leading-relaxed text-slate-400">
                      {log.heatmap.map((w, i) => {
                        let color = "";
                        if (w.status === 'correct') color = "text-emerald-600 bg-emerald-50";
                        else if (w.status === 'near') color = "text-yellow-600 bg-yellow-50";
                        else if (w.status === 'skipped') color = "text-red-400 bg-red-50 decoration-line-through";
                        return <span key={i} className={`mr-1 px-0.5 rounded ${color}`}>{w.word}</span>
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Standard Views (Home, Reading, etc) - Adapted for Student Context
  const renderHome = () => (
    <div className="space-y-6 animate-fade-in w-full pt-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {currentStudent ? (
            <>
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-200">
                {currentStudent.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-slate-800 leading-tight">Olá, {currentStudent.name}</h2>
                <p className="text-xs text-slate-500">Nível: <span className="capitalize">{currentStudent.level}</span></p>
              </div>
            </>
          ) : (
            <div>
              <h1 className="font-extrabold text-2xl text-indigo-600 tracking-tight">FocoLer</h1>
              <p className="text-xs text-slate-400 font-medium">Treinador de Fluência</p>
            </div>
          )}
        </div>
        {currentStudent ? (
          <button onClick={() => { setCurrentStudent(null); setView('student_select'); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
            Trocar
          </button>
        ) : (
          <button onClick={() => setView('student_select')} className="text-xs font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg flex items-center gap-2 shadow-indigo-200 shadow-md hover:bg-indigo-700 transition-all">
            <LogIn className="w-3 h-3" /> Entrar
          </button>
        )}
      </div>

      {/* Leveling CTA - Only show if student is logged in or hide/show generic */}
      <Card onClick={() => { setSelectedCategory('Nivelamento'); setSelectedLevel('medio'); startReading(LIBRARY['Nivelamento'].texts['medio'][0]); }} 
        className="p-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white cursor-pointer hover:shadow-lg transition-all active:scale-95 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2">
            <Award className="w-24 h-24" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm"><Award className="w-6 h-6 text-white" /></div>
          <div>
            <h3 className="font-bold text-lg">Teste de Nivelamento</h3>
            <p className="text-xs text-white/90">Descubra seu nível ideal de leitura</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(LIBRARY).filter(([k]) => k !== 'Nivelamento').map(([name, data]) => (
          <Card key={name} onClick={() => { setSelectedCategory(name); setView('text_selection'); }}
            className={`p-4 cursor-pointer hover:border-indigo-200 transition-all active:scale-95 border-2 ${name === "Avaliação CAEd 2025" ? 'border-teal-100 bg-teal-50' : 'border-slate-100'}`}>
            <div className={`w-10 h-10 rounded-full ${data.color} flex items-center justify-center mb-3`}>
              {data.icon}
            </div>
            <h3 className="font-bold text-slate-700 text-sm leading-tight">{name}</h3>
            <p className="text-xs text-slate-400 mt-1">{data.texts[selectedLevel].length} textos</p>
          </Card>
        ))}
      </div>

      <Button variant="secondary" className="w-full py-3 text-sm" onClick={() => { setCustomTextInput(''); setView('custom_text'); }}>
        <Edit className="w-4 h-4" /> Colar Texto (Professor)
      </Button>
    </div>
  );

  const renderResults = () => {
    if (!resultData) return null;
    const isCAEd = selectedCategory === "Avaliação CAEd 2025";
    
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

        {isCAEd && (
          <Card className="bg-teal-50 border-teal-200 p-4 text-left">
             <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-teal-600" /><h3 className="font-bold text-teal-800 text-sm">Meta CAEd</h3></div>
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
                else if (w.status === 'skipped') colorClass = "bg-red-100 text-red-800 border-red-200 decoration-red-400";
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

  // Simplified other renders for brevity, they follow the same pattern as previous steps
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
    const isCAEd = selectedCategory === "Avaliação CAEd 2025";
    const isOverTime = isCAEd && timeElapsed > 63;
    
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
              else if (item.status === 'skipped') statusClass += " bg-red-100 text-red-900 opacity-60";
              else if (item.status === 'pending') statusClass = "mr-1.5 mb-2 px-1.5 py-0.5 rounded-md inline-block text-slate-800";
              return <span key={index} className={statusClass}>{item.original}</span>;
            })}
          </div>
        </Card>
        {isTimerRunning && <Button onClick={finishReading} variant="success" className="w-full py-4">Terminei</Button>}
      </div>
    );
  };

  // Router
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      <div className="w-full max-w-lg mx-auto min-h-screen bg-white shadow-2xl overflow-hidden relative border-x border-slate-100">
        <div className="h-full p-4 md:p-6 overflow-y-auto pb-24 scrollbar-hide">
          {view === 'student_select' && renderStudentSelect()}
          {view === 'teacher_dashboard' && renderTeacherDashboard()}
          {view === 'report_detail' && renderReportDetail()}
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