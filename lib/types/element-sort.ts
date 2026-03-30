import { DifficultyLevel } from './game-difficulty';

export type { DifficultyLevel };

export type SortCategory =
  | 'alkali'
  | 'alkaline-earth'
  | 'transition'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas';

export interface Vial {
  id: string;
  elements: SortCategory[];
  capacity: number;
}

export interface ElementSortSettings {
  level: DifficultyLevel;
  vials: number;
  capacity: number;
  categories: number;
  mode: 'relaxed' | 'timed';
  timeLimit?: number;
  undoLimit: number | null;
  scoringMultiplier: number;
}

export interface GameState {
  vials: Vial[];
  selectedVialId: string | null;
  moves: number;
  timeLeft?: number;
  undoStack: UndoSnapshot[];
  isGameWon: boolean;
  completedVials: Set<string>;
}

export interface UndoSnapshot {
  vials: Vial[];
  selectedVialId: string | null;
  moves: number;
}

export interface GameScore {
  baseScore: number;
  timeBonus: number;
  moveBonus: number;
  perfectBonus: number;
  totalScore: number;
}

export const elementSortDifficulty: Record<DifficultyLevel, ElementSortSettings> = {
  beginner: {
    level: 'beginner',
    vials: 5,
    capacity: 4,
    categories: 3,
    mode: 'relaxed',
    undoLimit: null,
    scoringMultiplier: 1.0,
  },
  intermediate: {
    level: 'intermediate',
    vials: 6,
    capacity: 4,
    categories: 4,
    mode: 'relaxed',
    undoLimit: null,
    scoringMultiplier: 1.5,
  },
  advanced: {
    level: 'advanced',
    vials: 7,
    capacity: 5,
    categories: 5,
    mode: 'timed',
    timeLimit: 240,
    undoLimit: 3,
    scoringMultiplier: 2.0,
  },
  expert: {
    level: 'expert',
    vials: 8,
    capacity: 6,
    categories: 6,
    mode: 'timed',
    timeLimit: 300,
    undoLimit: 1,
    scoringMultiplier: 3.0,
  },
};

export const categoryColors: Record<SortCategory, { primary: string; secondary: string }> = {
  'alkali': { primary: '#ef4444', secondary: '#dc2626' },
  'alkaline-earth': { primary: '#f97316', secondary: '#ea580c' },
  'transition': { primary: '#eab308', secondary: '#ca8a04' },
  'post-transition': { primary: '#22c55e', secondary: '#16a34a' },
  'metalloid': { primary: '#3b82f6', secondary: '#2563eb' },
  'nonmetal': { primary: '#a855f7', secondary: '#9333ea' },
  'halogen': { primary: '#64748b', secondary: '#475569' },
  'noble-gas': { primary: '#94a3b8', secondary: '#64748b' },
};

export const categoryLabels: Record<SortCategory, string> = {
  'alkali': 'Alkali Metal',
  'alkaline-earth': 'Alkaline Earth',
  'transition': 'Transition Metal',
  'post-transition': 'Post-Transition',
  'metalloid': 'Metalloid',
  'nonmetal': 'Nonmetal',
  'halogen': 'Halogen',
  'noble-gas': 'Noble Gas',
};

export const categorySymbols: Record<SortCategory, string[]> = {
  'alkali': ['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'],
  'alkaline-earth': ['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra'],
  'transition': ['Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn'],
  'post-transition': ['Al', 'Ga', 'In', 'Sn', 'Tl', 'Pb', 'Bi'],
  'metalloid': ['B', 'Si', 'Ge', 'As', 'Sb', 'Te', 'Po'],
  'nonmetal': ['H', 'C', 'N', 'O', 'P', 'S', 'Se'],
  'halogen': ['F', 'Cl', 'Br', 'I', 'At'],
  'noble-gas': ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'],
};

export const categoryMainSymbol: Record<SortCategory, string> = {
  'alkali': 'Li',
  'alkaline-earth': 'Be',
  'transition': 'Fe',
  'post-transition': 'Al',
  'metalloid': 'Si',
  'nonmetal': 'C',
  'halogen': 'Cl',
  'noble-gas': 'He',
};
