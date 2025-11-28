import { ReactNode } from 'react';

export type DifficultyLevel = 'facil' | 'medio' | 'dificil';

export interface CategoryData {
  icon: ReactNode;
  color: string;
  texts: {
    [key in DifficultyLevel]: string[];
  };
}

export interface LibraryData {
  [key: string]: CategoryData;
}

export interface ReadingProfile {
  label: string;
  minPPM: number;
  color: string;
  bg: string;
}

export interface HeatmapItem {
  word: string;
  status: 'correct' | 'near' | 'skipped' | 'pending';
}

export interface ReadingLog {
  id: string;
  studentId: string;
  date: string;
  timestamp: number;
  category: string;
  level: DifficultyLevel;
  ppm: number;
  accuracy: number;
  time: number;
  totalWords: number;
  correctWords: number;
  fluencyScore: number;
  classification: string;
  heatmap: HeatmapItem[];
}

export interface Student {
  id: string;
  name: string;
  level: DifficultyLevel; // Nível recomendado
  createdAt: number;
}

export interface ReadingResult {
  ppm: number;
  time: number;
  words: number;
  totalWords: number;
  profile: ReadingProfile;
  date: string;
  fluencyScore: number;
  classification: string;
  heatmap?: HeatmapItem[]; // Optional for UI passing
}

export type WordStatus = 'pending' | 'correct' | 'near' | 'skipped';

export interface WordObject {
  original: string;
  clean: string;
  status: WordStatus;
  isCue?: boolean;       // For Theater names/emotions (Legacy/Optional)
  isLineBreak?: boolean; // For Pyramid structure
}

// Web Speech API Types
export interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

// --- Fluency Ladder Types ---

export type LadderStepType = 'list' | 'pyramid' | 'text' | 'theater';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOption: number; // 0-indexed
}

export interface LadderStep {
  id: string;
  title: string;
  type: LadderStepType;
  content: string;
  description: string;
  quiz?: QuizQuestion[];
}

export interface LadderTheme {
  id: string;
  title: string;
  icon: ReactNode;
  color: string;
  bg: string;
  steps: LadderStep[];
  premium: boolean;
}

export interface LadderData {
  [key: string]: LadderTheme;
}