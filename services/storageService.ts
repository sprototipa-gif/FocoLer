import { Student, ReadingLog, DifficultyLevel } from '../types';

const STUDENTS_KEY = 'focoler_students';
const READINGS_KEY = 'focoler_readings';

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Student Services ---

export const getStudents = (): Student[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STUDENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveStudent = (name: string): Student => {
  const students = getStudents();
  const newStudent: Student = {
    id: generateId(),
    name,
    level: 'facil', // Default start
    createdAt: Date.now(),
  };
  students.push(newStudent);
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  return newStudent;
};

export const deleteStudent = (id: string) => {
  const students = getStudents();
  const filtered = students.filter(s => s.id !== id);
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(filtered));
  
  // Also delete associated readings
  const readings = getReadings();
  const filteredReadings = readings.filter(r => r.studentId !== id);
  localStorage.setItem(READINGS_KEY, JSON.stringify(filteredReadings));
};

export const updateStudentLevel = (id: string, level: DifficultyLevel) => {
  const students = getStudents();
  const index = students.findIndex(s => s.id === id);
  if (index !== -1) {
    students[index].level = level;
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  }
};

// --- Reading Services ---

export const getReadings = (): ReadingLog[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(READINGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getStudentReadings = (studentId: string): ReadingLog[] => {
  const all = getReadings();
  return all.filter(r => r.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp);
};

export const saveReading = (log: Omit<ReadingLog, 'id'>) => {
  const readings = getReadings();
  const newLog: ReadingLog = { ...log, id: generateId() };
  readings.push(newLog);
  localStorage.setItem(READINGS_KEY, JSON.stringify(readings));

  // Auto-update level logic based on Fluency (Basic Heuristic)
  // If student gets "Avançado" on current level consistently, maybe bump up?
  // For now, simply keeping the logic manual or based on the last Leveling Test is safer.
};

// --- Stats Helpers ---

export const getStudentStats = (studentId: string) => {
  const logs = getStudentReadings(studentId);
  if (logs.length === 0) return null;

  const avgPPM = Math.round(logs.reduce((acc, curr) => acc + curr.ppm, 0) / logs.length);
  const avgAccuracy = Math.round(logs.reduce((acc, curr) => acc + curr.accuracy, 0) / logs.length);
  const bestPPM = Math.max(...logs.map(l => l.ppm));
  const totalReadings = logs.length;

  return { avgPPM, avgAccuracy, bestPPM, totalReadings };
};