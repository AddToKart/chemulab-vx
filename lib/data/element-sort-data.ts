import {
  SortCategory,
  Vial,
  ElementSortSettings,
  GameScore,
} from '@/lib/types/element-sort';

const allCategories: SortCategory[] = [
  'alkali',
  'alkaline-earth',
  'transition',
  'post-transition',
  'metalloid',
  'nonmetal',
  'halogen',
  'noble-gas',
];

export function generateLevel(settings: ElementSortSettings): Vial[] {
  const { capacity, categories } = settings;

  const vials = categories + 1;

  const selectedCategories = shuffleArray([...allCategories]).slice(0, categories);
  const elements: SortCategory[] = [];

  selectedCategories.forEach((category) => {
    for (let i = 0; i < capacity; i++) {
      elements.push(category);
    }
  });

  const shuffled = shuffleArray(elements);

  const vialArray: Vial[] = [];
  let index = 0;

  for (let i = 0; i < vials; i++) {
    const elementsInVial: SortCategory[] = [];

    if (i < categories) {
      for (let j = 0; j < capacity; j++) {
        elementsInVial.push(shuffled[index]);
        index++;
      }
    }

    vialArray.push({
      id: `vial-${i}`,
      elements: elementsInVial,
      capacity,
    });
  }

  return vialArray;
}

export function isValidMove(sourceVial: Vial, targetVial: Vial): boolean {
  if (sourceVial.elements.length === 0) return false;
  if (targetVial.elements.length >= targetVial.capacity) return false;

  const sourceTop = sourceVial.elements[sourceVial.elements.length - 1];

  if (targetVial.elements.length === 0) return true;

  const targetTop = targetVial.elements[targetVial.elements.length - 1];
  return sourceTop === targetTop;
}

export function getMoveableCount(sourceVial: Vial): number {
  if (sourceVial.elements.length === 0) return 0;

  const topElement = sourceVial.elements[sourceVial.elements.length - 1];
  let count = 0;

  for (let i = sourceVial.elements.length - 1; i >= 0; i--) {
    if (sourceVial.elements[i] === topElement) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

export function executeMove(
  vials: Vial[],
  sourceId: string,
  targetId: string
): Vial[] {
  const sourceIndex = vials.findIndex((v) => v.id === sourceId);
  const targetIndex = vials.findIndex((v) => v.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) return vials;

  const sourceVial = vials[sourceIndex];
  const targetVial = vials[targetIndex];

  if (!isValidMove(sourceVial, targetVial)) return vials;

  const moveableCount = getMoveableCount(sourceVial);
  const availableSpace = targetVial.capacity - targetVial.elements.length;
  const actualMoveCount = Math.min(moveableCount, availableSpace);
  const elementsToMove = sourceVial.elements.slice(-actualMoveCount);
  const newSourceElements = sourceVial.elements.slice(0, sourceVial.elements.length - actualMoveCount);
  const newTargetElements = [...targetVial.elements, ...elementsToMove];

  const newVials = vials.map((vial, index) => {
    if (index === sourceIndex) {
      return { ...vial, elements: newSourceElements };
    }
    if (index === targetIndex) {
      return { ...vial, elements: newTargetElements };
    }
    return vial;
  });

  return newVials;
}

export function checkWinCondition(vials: Vial[]): boolean {
  return vials.every((vial) => {
    if (vial.elements.length === 0) return true;
    if (vial.elements.length !== vial.capacity) return false;
    return vial.elements.every((el) => el === vial.elements[0]);
  });
}

export function calculateScore(
  settings: ElementSortSettings,
  moves: number,
  timeLeft?: number
): GameScore {
  const baseScore = 1000;
  const timeBonus = timeLeft ? timeLeft * 10 : 0;
  const moveBonus = Math.max(0, (50 - moves)) * 10;
  const perfectBonus = moves <= settings.capacity * settings.categories ? 500 : 0;

  const rawScore = baseScore + timeBonus + moveBonus + perfectBonus;
  const totalScore = Math.round(rawScore * settings.scoringMultiplier);

  return {
    baseScore,
    timeBonus,
    moveBonus,
    perfectBonus,
    totalScore,
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
