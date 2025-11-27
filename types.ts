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
  minPPM?: number;
  maxPPM?: number;
  color: string;
  bg: string;
  description: string;
}

export interface AnalysisWord {
  word: string;
  status: 'correct' | 'approximate' | 'wrong' | 'skipped';
  timestamp_start?: number;
  timestamp_end?: number;
}

export interface AnalysisResult {
  total_words_reference: number;
  total_words_read_correctly: number;
  duration_seconds: number;
  transcription: string;
  words: AnalysisWord[];
}

export interface ReadingResult {
  ppm: number;
  accuracy: number;
  time: number;
  totalWords: number;
  correctWords: number;
  classification: string;
  classificationColor: string; // Tailwind classes
  date: string;
  heatmap: AnalysisWord[];
}

export interface AccessibilitySettings {
  font: 'default' | 'dyslexic';
  highContrast: boolean;
  readingRuler: boolean;
}

export interface Student {
  id: string;
  name: string;
  level: DifficultyLevel;
  createdAt: number;
}

export interface ReadingLog {
  id: string;
  studentId: string;
  timestamp: number;
  ppm: number;
  accuracy: number;
  textTitle?: string;
  classification?: string;
}