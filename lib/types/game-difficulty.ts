export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface BaseDifficultySettings {
  level: DifficultyLevel;
  timeLimit?: number; // seconds
  scoringMultiplier: number; // applies to ALL points including bonuses
}

export interface ElementMatchSettings extends BaseDifficultySettings {
  lives: number;
  options: number;
  maxAtomicNumber: number;
  questionTypes: ('symbol-to-name' | 'name-to-symbol' | 'atomic-number' | 'category')[];
  timePerQuestion?: number;
}

export interface ReactionQuizSettings extends BaseDifficultySettings {
  lives: number;
  options: number;
  reactionCount: number;
  displayMode: 'formula' | 'name' | 'toggle';
  questionTypes: ('products' | 'reactants' | 'name-reaction')[];
  timePerQuestion?: number;
}

export interface WhackAMoleSettings extends BaseDifficultySettings {
  duration: number;
  moleInterval: number;
  molesPerPop: [number, number];
  heavyMetalPoints: number;
  safeElementPoints: number;
  holeCount: number;
  heavyMetals: string[];
}

export interface PeriodicPuzzleSettings extends BaseDifficultySettings {
  periods: number;
  elementCount: number;
  showHints: boolean;
  interactionMode: 'click' | 'drag' | 'both';
  timeLimit?: number;
}

export interface MinerGameSettings extends BaseDifficultySettings {
  itemCount: number;
  timePerQuestion?: number;
  wrongAnswerPenalty: number;
  elementPool: 'common' | 'all';
}

// Difficulty configurations for each game
export const elementMatchDifficulty: Record<DifficultyLevel, ElementMatchSettings> = {
  beginner: {
    level: 'beginner',
    lives: 5,
    options: 3,
    maxAtomicNumber: 30,
    questionTypes: ['symbol-to-name'],
    scoringMultiplier: 1.0,
  },
  intermediate: {
    level: 'intermediate',
    lives: 3,
    options: 4,
    maxAtomicNumber: 80,
    questionTypes: ['symbol-to-name', 'name-to-symbol'],
    scoringMultiplier: 1.5,
  },
  advanced: {
    level: 'advanced',
    lives: 2,
    options: 4,
    maxAtomicNumber: 118,
    questionTypes: ['symbol-to-name', 'name-to-symbol', 'atomic-number'],
    scoringMultiplier: 2.0,
    timePerQuestion: 45,
  },
  expert: {
    level: 'expert',
    lives: 1,
    options: 5,
    maxAtomicNumber: 118,
    questionTypes: ['symbol-to-name', 'name-to-symbol', 'atomic-number', 'category'],
    scoringMultiplier: 3.0,
    timePerQuestion: 30,
  },
};

export const reactionQuizDifficulty: Record<DifficultyLevel, ReactionQuizSettings> = {
  beginner: {
    level: 'beginner',
    lives: 5,
    options: 3,
    reactionCount: 5,
    displayMode: 'formula',
    questionTypes: ['products'],
    scoringMultiplier: 1.0,
  },
  intermediate: {
    level: 'intermediate',
    lives: 3,
    options: 4,
    reactionCount: 20,
    displayMode: 'toggle',
    questionTypes: ['products'],
    scoringMultiplier: 1.5,
  },
  advanced: {
    level: 'advanced',
    lives: 2,
    options: 4,
    reactionCount: 20,
    displayMode: 'name',
    questionTypes: ['products', 'reactants', 'name-reaction'],
    scoringMultiplier: 2.0,
    timePerQuestion: 35,
  },
  expert: {
    level: 'expert',
    lives: 1,
    options: 5,
    reactionCount: 20,
    displayMode: 'name',
    questionTypes: ['products', 'reactants', 'name-reaction'],
    scoringMultiplier: 3.0,
    timePerQuestion: 25,
  },
};

export const whackAMoleDifficulty: Record<DifficultyLevel, WhackAMoleSettings> = {
  beginner: {
    level: 'beginner',
    duration: 45,
    moleInterval: 1800,
    molesPerPop: [2, 3],
    heavyMetalPoints: 15,
    safeElementPoints: 5,
    holeCount: 12,
    heavyMetals: ['Pb', 'Hg', 'Cd', 'As', 'Cr'],
    scoringMultiplier: 1.0,
  },
  intermediate: {
    level: 'intermediate',
    duration: 30,
    moleInterval: 1200,
    molesPerPop: [3, 5],
    heavyMetalPoints: 10,
    safeElementPoints: -5,
    holeCount: 16,
    heavyMetals: ['Pb', 'Hg', 'Cd', 'As', 'Tl', 'Cr', 'U', 'Pu', 'Ra', 'Po'],
    scoringMultiplier: 1.5,
  },
  advanced: {
    level: 'advanced',
    duration: 25,
    moleInterval: 900,
    molesPerPop: [4, 6],
    heavyMetalPoints: 15,
    safeElementPoints: -8,
    holeCount: 16,
    heavyMetals: ['Pb', 'Hg', 'Cd', 'As', 'Tl', 'Cr', 'U', 'Pu', 'Ra', 'Po'],
    scoringMultiplier: 2.0,
  },
  expert: {
    level: 'expert',
    duration: 20,
    moleInterval: 700,
    molesPerPop: [5, 7],
    heavyMetalPoints: 20,
    safeElementPoints: -10,
    holeCount: 20,
    heavyMetals: ['Pb', 'Hg', 'Cd', 'As', 'Tl', 'Cr', 'U', 'Pu', 'Ra', 'Po', 'Be', 'Ba'],
    scoringMultiplier: 3.0,
  },
};

export const periodicPuzzleDifficulty: Record<DifficultyLevel, PeriodicPuzzleSettings> = {
  beginner: {
    level: 'beginner',
    periods: 2,
    elementCount: 10,
    showHints: true,
    interactionMode: 'click',
    scoringMultiplier: 1.0,
  },
  intermediate: {
    level: 'intermediate',
    periods: 4,
    elementCount: 30,
    showHints: true,
    interactionMode: 'both',
    scoringMultiplier: 1.5,
  },
  advanced: {
    level: 'advanced',
    periods: 4,
    elementCount: 36,
    showHints: false,
    interactionMode: 'drag',
    timeLimit: 300,
    scoringMultiplier: 2.0,
  },
  expert: {
    level: 'expert',
    periods: 7,
    elementCount: 118,
    showHints: true,
    interactionMode: 'drag',
    timeLimit: 900,
    scoringMultiplier: 3.0,
  },
};

export const minerGameDifficulty: Record<DifficultyLevel, MinerGameSettings> = {
  beginner: {
    level: 'beginner',
    itemCount: 5,
    wrongAnswerPenalty: 0,
    elementPool: 'common',
    scoringMultiplier: 1.0,
  },
  intermediate: {
    level: 'intermediate',
    itemCount: 6,
    timePerQuestion: 15,
    wrongAnswerPenalty: -5,
    elementPool: 'all',
    scoringMultiplier: 1.5,
  },
  advanced: {
    level: 'advanced',
    itemCount: 7,
    timePerQuestion: 10,
    wrongAnswerPenalty: -5,
    elementPool: 'all',
    scoringMultiplier: 2.0,
  },
  expert: {
    level: 'expert',
    itemCount: 8,
    timePerQuestion: 8,
    wrongAnswerPenalty: -5,
    elementPool: 'all',
    scoringMultiplier: 3.0,
  },
};
