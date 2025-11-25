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

export interface ReadingResult {
  ppm: number;
  time: number;
  words: number;
  totalWords: number;
  profile: ReadingProfile;
  date: string;
  fluencyScore: number;
  classification: string;
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