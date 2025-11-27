
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
  color: string;
  bg: string;
  description: string;
  minPPM?: number;
  maxPPM?: number;
}

export interface WordAnalysis {
  word: string;
  status: 'correct' | 'approximate' | 'wrong' | 'skipped';
  timestamp_start?: number;
  timestamp_end?: number;
}

export interface GeminiAnalysisResponse {
  total_words_reference: number;
  total_words_read_correctly: number;
  duration_seconds: number;
  transcription: string;
  words: WordAnalysis[];
}

export interface ReadingResult {
  ppm: number;
  accuracy: number;
  time: number;
  totalWords: number;
  correctWords: number;
  profile: ReadingProfile;
  date: string;
  analysis: GeminiAnalysisResponse;
}

export interface AccessibilitySettings {
  font: 'default' | 'dyslexic';
  highContrast: boolean;
  readingRuler: boolean;
}

// Storage Types
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
  level: DifficultyLevel;
}