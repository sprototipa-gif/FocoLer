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
}

// Web Speech API Types
export interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}