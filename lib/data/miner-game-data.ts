import { elementsData, ElementData } from './elements-data';

export type MinerQuestionCategory = 'classification' | 'properties' | 'real-world' | 'semi-conductors';
export interface MinerQuestionItem {
  id: string; // usually the symbol, but can be unique
  name: string;
  type: 'metal' | 'nonmetal' | 'metalloid' | 'alloy';
  isCorrect: boolean;
}

export interface MinerQuestion {
  id: string;
  category: MinerQuestionCategory;
  text: string;
  items: MinerQuestionItem[]; // The choices presented on screen
  correctAnswerId: string; // The ID of the correct item
}

// Map general category to our game's simplified 3 types
export function getSimplifiedType(category: string): 'metal' | 'nonmetal' | 'metalloid' {
  if (['nonmetal', 'noble-gas', 'halogen'].includes(category)) return 'nonmetal';
  if (category === 'metalloid') return 'metalloid';
  return 'metal'; // alkali, alkaline-earth, transition, etc.
}

const alloys = [
  { symbol: 'BRASS', name: 'Brass', type: 'alloy' as const },
  { symbol: 'BRONZE', name: 'Bronze', type: 'alloy' as const },
];

const specificQuestions = [
  // METALS
  { text: 'Which element is the most malleable?', answerName: 'Gold', answerSymbol: 'Au', category: 'properties' },
  { text: 'Which element is the most brittle metal?', answerName: 'Zinc', answerSymbol: 'Zn', category: 'properties' },
  { text: 'Which metal prevents rusting of iron (galvanizing)?', answerName: 'Zinc', answerSymbol: 'Zn', category: 'real-world' },
  { text: 'Which metal is required for strong bones and teeth?', answerName: 'Calcium', answerSymbol: 'Ca', category: 'real-world' },
  { text: 'Which metal is the most electrically conductive?', answerName: 'Silver', answerSymbol: 'Ag', category: 'properties' },
  { text: 'Which is the lightest structural metal?', answerName: 'Magnesium', answerSymbol: 'Mg', category: 'properties' },
  { text: 'Which is the hardest natural metal?', answerName: 'Tungsten', answerSymbol: 'W', category: 'properties' },
  { text: 'Which metal has the lowest melting point (liquid near room temp)?', answerName: 'Gallium', answerSymbol: 'Ga', category: 'properties' },
  // NON-METALS
  { text: 'Which non-metal is commonly used in water purification?', answerName: 'Chlorine', answerSymbol: 'Cl', category: 'real-world' },
  { text: 'Which noble gas is used in bright lighting signs?', answerName: 'Argon', answerSymbol: 'Ar', category: 'real-world' },
  { text: 'Which is a radioactive non-metal gas?', answerName: 'Radon', answerSymbol: 'Rn', category: 'properties' },
  { text: 'Which non-metal forms a purple solid at room temperature?', answerName: 'Iodine', answerSymbol: 'I', category: 'properties' },
  // METALLOIDS
  { text: 'Which metalloid is widely used to make insecticides?', answerName: 'Antimony', answerSymbol: 'Sb', category: 'real-world' },
  { text: 'Which metalloid is extremely common in computer chips?', answerName: 'Silicon', answerSymbol: 'Si', category: 'real-world' },
  // SEMI-CONDUCTORS
  { text: 'Which of these is a known semi-conductor?', answerName: 'Germanium', answerSymbol: 'Ge', category: 'semi-conductors' },
  { text: 'Which of these is a known semi-conductor?', answerName: 'Boron', answerSymbol: 'B', category: 'semi-conductors' }
];

function getRandomDistractors(correctSymbol: string, count: number, difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'): MinerQuestionItem[] {
  // Pool logic base on difficulty: beginner = common elements, expert = all + obscure
  let pool = [...elementsData];
  if (difficulty === 'beginner') {
    pool = pool.filter(el => el.atomic_number <= 36); // first 4 periods
  }
  
  // Exclude correct answer
  pool = pool.filter(el => el.symbol !== correctSymbol);
  
  // Shuffle and pick
  const shuffled = pool.sort(() => 0.5 - Math.random());
  const selected: MinerQuestionItem[] = shuffled.slice(0, count).map(el => ({
    id: el.symbol,
    name: el.name,
    type: getSimplifiedType(el.category),
    isCorrect: false
  }));

  // Occasional alloy distractors in advanced/expert
  if (difficulty !== 'beginner' && Math.random() > 0.5) {
    const alloy = alloys[Math.floor(Math.random() * alloys.length)];
    if (selected.length > 0 && selected.findIndex(s => s.id === alloy.symbol) === -1) {
      selected[selected.length - 1] = {
        id: alloy.symbol,
        name: alloy.name,
        type: alloy.type,
        isCorrect: false
      };
    }
  }

  return selected;
}

export function generateMinerQuestions(difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert', count: number = 10): MinerQuestion[] {
  const result: MinerQuestion[] = [];
  const itemCount = difficulty === 'expert' ? 8 : (difficulty === 'advanced' ? 7 : difficulty === 'intermediate' ? 6 : 5);
  
  // For diversity, ensure a mix of generated classification questions and specific questions
  const specificPool = [...specificQuestions].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < count; i++) {
    const isSpecific = Math.random() > 0.4 && specificPool.length > 0;
    
    if (isSpecific) {
      const q = specificPool.pop()!;
      // Find element to get correct type
      const elData = elementsData.find(e => e.symbol === q.answerSymbol);
      const correctAnswerItem: MinerQuestionItem = {
        id: q.answerSymbol,
        name: q.answerName,
        type: elData ? getSimplifiedType(elData.category) : 'metal',
        isCorrect: true
      };
      
      const distractors = getRandomDistractors(q.answerSymbol, itemCount - 1, difficulty);
      const items = [...distractors, correctAnswerItem].sort(() => 0.5 - Math.random());
      
      result.push({
        id: `q_spec_${i}_${Date.now()}`,
        category: q.category as MinerQuestionCategory,
        text: q.text,
        items,
        correctAnswerId: correctAnswerItem.id
      });
    } else {
      // Classification question: "Which of these is a [Type]?"
      const targetType = ['metal', 'nonmetal', 'metalloid'][Math.floor(Math.random() * 3)] as 'metal' | 'nonmetal' | 'metalloid';
      let pool = [...elementsData];
      if (difficulty === 'beginner') pool = pool.filter(el => el.atomic_number <= 36);
      
      const correctPool = pool.filter(el => getSimplifiedType(el.category) === targetType);
      const distractorPool = pool.filter(el => getSimplifiedType(el.category) !== targetType);
      
      const correctEl = correctPool[Math.floor(Math.random() * correctPool.length)];
      const distractors = distractorPool.sort(() => 0.5 - Math.random()).slice(0, itemCount - 1).map(el => ({
        id: el.symbol,
        name: el.name,
        type: getSimplifiedType(el.category),
        isCorrect: false
      }));
      
      const correctAnswerItem: MinerQuestionItem = {
        id: correctEl.symbol,
        name: correctEl.name,
        type: targetType,
        isCorrect: true
      };
      
      const items = [...distractors, correctAnswerItem].sort(() => 0.5 - Math.random());
      
      result.push({
        id: `q_class_${i}_${Date.now()}`,
        category: 'classification',
        text: `Which of these elements is classified as a ${targetType}?`,
        items,
        correctAnswerId: correctAnswerItem.id
      });
    }
  }
  
  return result;
}
