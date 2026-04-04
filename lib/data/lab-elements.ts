/**
 * Lab element data for the ChemistryCraft module.
 * Each element has a symbol, name, background color (for the card), and element type.
 */

export interface LabElement {
  symbol: string;
  name: string;
  color: string;
  type: string;
}

export const initialElements: LabElement[] = [
  { symbol: 'H', name: 'Hydrogen', color: '#E6E6E6', type: 'nonmetal' },
  { symbol: 'He', name: 'Helium', color: '#FFE5CC', type: 'noble-gas' },
  { symbol: 'Li', name: 'Lithium', color: '#CC99FF', type: 'alkali-metal' },
  { symbol: 'Be', name: 'Beryllium', color: '#C0C0C0', type: 'alkaline-earth' },
  { symbol: 'B', name: 'Boron', color: '#FFB266', type: 'metalloid' },
  { symbol: 'C', name: 'Carbon', color: '#666666', type: 'nonmetal' },
  { symbol: 'N', name: 'Nitrogen', color: '#99CCFF', type: 'nonmetal' },
  { symbol: 'O', name: 'Oxygen', color: '#FF9999', type: 'nonmetal' },
  { symbol: 'F', name: 'Fluorine', color: '#CCFF99', type: 'nonmetal' },
  { symbol: 'Ne', name: 'Neon', color: '#FF99CC', type: 'noble-gas' },
  { symbol: 'Na', name: 'Sodium', color: '#FFB366', type: 'alkali-metal' },
  { symbol: 'Mg', name: 'Magnesium', color: '#B8B8B8', type: 'alkaline-earth' },
  { symbol: 'Al', name: 'Aluminum', color: '#BFC7C9', type: 'post-transition' },
  { symbol: 'Si', name: 'Silicon', color: '#F5C242', type: 'metalloid' },
  { symbol: 'P', name: 'Phosphorus', color: '#FF9966', type: 'nonmetal' },
  { symbol: 'S', name: 'Sulfur', color: '#FFFF00', type: 'nonmetal' },
  { symbol: 'Cl', name: 'Chlorine', color: '#90EE90', type: 'nonmetal' },
  { symbol: 'Ar', name: 'Argon', color: '#FF99CC', type: 'noble-gas' },
  { symbol: 'K', name: 'Potassium', color: '#FF99CC', type: 'alkali-metal' },
  { symbol: 'Ca', name: 'Calcium', color: '#A0A0A0', type: 'alkaline-earth' },
  { symbol: 'Sc', name: 'Scandium', color: '#E6E6FA', type: 'transition' },
  { symbol: 'Ti', name: 'Titanium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'V', name: 'Vanadium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Cr', name: 'Chromium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Mn', name: 'Manganese', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Fe', name: 'Iron', color: '#FFB366', type: 'transition' },
  { symbol: 'Co', name: 'Cobalt', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Ni', name: 'Nickel', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Cu', name: 'Copper', color: '#FFA07A', type: 'transition' },
  { symbol: 'Zn', name: 'Zinc', color: '#98FB98', type: 'transition' },
  { symbol: 'Ga', name: 'Gallium', color: '#BCA8D1', type: 'post-transition' },
  { symbol: 'Ge', name: 'Germanium', color: '#668F8F', type: 'metalloid' },
  { symbol: 'As', name: 'Arsenic', color: '#BD96CA', type: 'metalloid' },
  { symbol: 'Se', name: 'Selenium', color: '#FFA07A', type: 'nonmetal' },
  { symbol: 'Br', name: 'Bromine', color: '#BC8F8F', type: 'nonmetal' },
  { symbol: 'Kr', name: 'Krypton', color: '#FF99CC', type: 'noble-gas' },
  { symbol: 'Rb', name: 'Rubidium', color: '#FF80B2', type: 'alkali-metal' },
  { symbol: 'Sr', name: 'Strontium', color: '#989898', type: 'alkaline-earth' },
  { symbol: 'Y', name: 'Yttrium', color: '#E6E6FA', type: 'transition' },
  { symbol: 'Zr', name: 'Zirconium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Nb', name: 'Niobium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Mo', name: 'Molybdenum', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Tc', name: 'Technetium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Ru', name: 'Ruthenium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Rh', name: 'Rhodium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Pd', name: 'Palladium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Ag', name: 'Silver', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Cd', name: 'Cadmium', color: '#FFB6C1', type: 'transition' },
  { symbol: 'In', name: 'Indium', color: '#A3A3A3', type: 'post-transition' },
  { symbol: 'Sn', name: 'Tin', color: '#668F8F', type: 'post-transition' },
  { symbol: 'Sb', name: 'Antimony', color: '#9370DB', type: 'metalloid' },
  { symbol: 'Te', name: 'Tellurium', color: '#DEB887', type: 'metalloid' },
  { symbol: 'I', name: 'Iodine', color: '#9370DB', type: 'nonmetal' },
  { symbol: 'Xe', name: 'Xenon', color: '#FF99CC', type: 'noble-gas' },
  { symbol: 'Cs', name: 'Caesium', color: '#FF6699', type: 'alkali-metal' },
  { symbol: 'Ba', name: 'Barium', color: '#808080', type: 'alkaline-earth' },
  { symbol: 'La', name: 'Lanthanum', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Ce', name: 'Cerium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Pr', name: 'Praseodymium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Nd', name: 'Neodymium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Pm', name: 'Promethium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Sm', name: 'Samarium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Eu', name: 'Europium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Gd', name: 'Gadolinium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Tb', name: 'Terbium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Dy', name: 'Dysprosium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Ho', name: 'Holmium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Er', name: 'Erbium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Tm', name: 'Thulium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Yb', name: 'Ytterbium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Lu', name: 'Lutetium', color: '#E6E6FA', type: 'lanthanide' },
  { symbol: 'Hf', name: 'Hafnium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Ta', name: 'Tantalum', color: '#C0C0C0', type: 'transition' },
  { symbol: 'W', name: 'Tungsten', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Re', name: 'Rhenium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Os', name: 'Osmium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Ir', name: 'Iridium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Pt', name: 'Platinum', color: '#E5E4E2', type: 'transition' },
  { symbol: 'Au', name: 'Gold', color: '#FFD700', type: 'transition' },
  { symbol: 'Hg', name: 'Mercury', color: '#B8B8B8', type: 'transition' },
  { symbol: 'Tl', name: 'Thallium', color: '#A3A3A3', type: 'post-transition' },
  { symbol: 'Pb', name: 'Lead', color: '#575961', type: 'post-transition' },
  { symbol: 'Bi', name: 'Bismuth', color: '#9370DB', type: 'post-transition' },
  { symbol: 'Po', name: 'Polonium', color: '#FF9999', type: 'metalloid' },
  { symbol: 'At', name: 'Astatine', color: '#CCFF99', type: 'metalloid' },
  { symbol: 'Rn', name: 'Radon', color: '#FF99CC', type: 'noble-gas' },
  { symbol: 'Fr', name: 'Francium', color: '#FF4D4D', type: 'alkali-metal' },
  { symbol: 'Ra', name: 'Radium', color: '#707070', type: 'alkaline-earth' },
  { symbol: 'Ac', name: 'Actinium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Th', name: 'Thorium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Pa', name: 'Protactinium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'U', name: 'Uranium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Np', name: 'Neptunium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Pu', name: 'Plutonium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Am', name: 'Americium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Cm', name: 'Curium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Bk', name: 'Berkelium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Cf', name: 'Californium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Es', name: 'Einsteinium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Fm', name: 'Fermium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Md', name: 'Mendelevium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'No', name: 'Nobelium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Lr', name: 'Lawrencium', color: '#C0C0C0', type: 'actinide' },
  { symbol: 'Rf', name: 'Rutherfordium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Db', name: 'Dubnium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Sg', name: 'Seaborgium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Bh', name: 'Bohrium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Hs', name: 'Hassium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Mt', name: 'Meitnerium', color: '#C0C0C0', type: 'unknown' },
  { symbol: 'Ds', name: 'Darmstadtium', color: '#C0C0C0', type: 'unknown' },
  { symbol: 'Rg', name: 'Roentgenium', color: '#C0C0C0', type: 'unknown' },
  { symbol: 'Cn', name: 'Copernicium', color: '#C0C0C0', type: 'transition' },
  { symbol: 'Nh', name: 'Nihonium', color: '#C0C0C0', type: 'unknown' },
  { symbol: 'Fl', name: 'Flerovium', color: '#C0C0C0', type: 'post-transition' },
  { symbol: 'Mc', name: 'Moscovium', color: '#C0C0C0', type: 'unknown' },
  { symbol: 'Lv', name: 'Livermorium', color: '#C0C0C0', type: 'unknown' },
  { symbol: 'Ts', name: 'Tennessine', color: '#C0C0C0', type: 'unknown' },
  { symbol: 'Og', name: 'Oganesson', color: '#FF99CC', type: 'noble-gas' },
];

export interface Recipe {
  reactants: Record<string, number>;
  product: LabElement;
  reactionType: string;
}

export type CombinationResult =
  | { kind: 'success'; product: LabElement; reactionType: string }
  | { kind: 'invalid_missing'; message: string }
  | { kind: 'invalid_extra'; message: string }
  | { kind: 'invalid_unknown'; message: string };

export type RecipeAttemptResult =
  | { kind: 'success'; product: LabElement; reactionType: string }
  | { kind: 'invalid_missing'; message: string }
  | { kind: 'invalid_extra'; message: string }
  | { kind: 'wrong_product'; message: string; actualProduct: LabElement }
  | { kind: 'invalid_unknown'; message: string };

export const recipes: Recipe[] = [
  { reactants: { H: 2, O: 1 }, product: { symbol: 'H₂O', name: 'Water', color: '#B3E0FF', type: 'compound' }, reactionType: 'Synthesis' },
  { reactants: { H: 2, O: 2 }, product: { symbol: 'H₂O₂', name: 'Hydrogen Peroxide', color: '#E6F3FF', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { N: 1, H: 3 }, product: { symbol: 'NH₃', name: 'Ammonia', color: '#CC99FF', type: 'compound' }, reactionType: 'Synthesis' },
  { reactants: { C: 1, H: 4 }, product: { symbol: 'CH₄', name: 'Methane', color: '#D3D3D3', type: 'compound' }, reactionType: 'Organic Synthesis' },
  { reactants: { H: 1, Cl: 1 }, product: { symbol: 'HCl', name: 'Hydrogen Chloride', color: '#90EE90', type: 'compound' }, reactionType: 'Acid Formation' },
  { reactants: { H: 1, F: 1 }, product: { symbol: 'HF', name: 'Hydrogen Fluoride', color: '#CCFF99', type: 'compound' }, reactionType: 'Acid Formation' },
  { reactants: { H: 1, Br: 1 }, product: { symbol: 'HBr', name: 'Hydrogen Bromide', color: '#BC8F8F', type: 'compound' }, reactionType: 'Acid Formation' },
  { reactants: { H: 1, I: 1 }, product: { symbol: 'HI', name: 'Hydrogen Iodide', color: '#9370DB', type: 'compound' }, reactionType: 'Acid Formation' },
  { reactants: { H: 2, S: 1 }, product: { symbol: 'H₂S', name: 'Hydrogen Sulfide', color: '#FFFF99', type: 'compound' }, reactionType: 'Synthesis' },
  { reactants: { C: 1, O: 2 }, product: { symbol: 'CO₂', name: 'Carbon Dioxide', color: '#A9A9A9', type: 'compound' }, reactionType: 'Combustion' },
  { reactants: { C: 1, O: 1 }, product: { symbol: 'CO', name: 'Carbon Monoxide', color: '#8A8A8A', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { S: 1, O: 2 }, product: { symbol: 'SO₂', name: 'Sulfur Dioxide', color: '#FFDB4D', type: 'compound' }, reactionType: 'Combustion' },
  { reactants: { S: 1, O: 3 }, product: { symbol: 'SO₃', name: 'Sulfur Trioxide', color: '#FFE480', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { N: 1, O: 1 }, product: { symbol: 'NO', name: 'Nitric Oxide', color: '#E6B3B3', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { N: 1, O: 2 }, product: { symbol: 'NO₂', name: 'Nitrogen Dioxide', color: '#FF9999', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { Ca: 1, O: 1 }, product: { symbol: 'CaO', name: 'Calcium Oxide', color: '#A0A0A0', type: 'compound' }, reactionType: 'Synthesis' },
  { reactants: { Mg: 1, O: 1 }, product: { symbol: 'MgO', name: 'Magnesium Oxide', color: '#B8B8B8', type: 'compound' }, reactionType: 'Synthesis' },
  { reactants: { Fe: 2, O: 3 }, product: { symbol: 'Fe₂O₃', name: 'Iron(III) Oxide', color: '#CD853F', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { Al: 2, O: 3 }, product: { symbol: 'Al₂O₃', name: 'Aluminum Oxide', color: '#BFC7C9', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { Si: 1, O: 2 }, product: { symbol: 'SiO₂', name: 'Silicon Dioxide', color: '#F5C242', type: 'compound' }, reactionType: 'Oxidation' },
  { reactants: { Fe: 1, S: 1 }, product: { symbol: 'FeS', name: 'Iron(II) Sulfide', color: '#4B3621', type: 'compound' }, reactionType: 'Binary Compound Formation' },
  { reactants: { Zn: 1, S: 1 }, product: { symbol: 'ZnS', name: 'Zinc Sulfide', color: '#E0E0E0', type: 'compound' }, reactionType: 'Binary Compound Formation' },
  { reactants: { Cu: 1, S: 1 }, product: { symbol: 'CuS', name: 'Copper(II) Sulfide', color: '#3A3F44', type: 'compound' }, reactionType: 'Binary Compound Formation' },
  { reactants: { Pb: 1, S: 1 }, product: { symbol: 'PbS', name: 'Lead(II) Sulfide', color: '#2F4F4F', type: 'compound' }, reactionType: 'Binary Compound Formation' },
  { reactants: { Na: 1, Cl: 1 }, product: { symbol: 'NaCl', name: 'Table Salt', color: '#F0F0F0', type: 'compound' }, reactionType: 'Binary Compound Formation' },
  { reactants: { Na: 1, H: 1, C: 1, O: 3 }, product: { symbol: 'NaHCO₃', name: 'Baking Soda', color: '#FAFAFA', type: 'compound' }, reactionType: 'Synthesis' },
  { reactants: { O: 3 }, product: { symbol: 'O₃', name: 'Ozone', color: '#ADD8E6', type: 'compound' }, reactionType: 'Allotrope Formation' },
  { reactants: { C: 6, H: 12, O: 6 }, product: { symbol: 'C₆H₁₂O₆', name: 'Glucose (Sugar)', color: '#FFE4B5', type: 'compound' }, reactionType: 'Organic Synthesis' },
];

function countElements(elements: LabElement[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const el of elements) {
    counts[el.symbol] = (counts[el.symbol] || 0) + 1;
  }
  return counts;
}

function countsMatch(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function isSubset(subset: Record<string, number>, superset: Record<string, number>): boolean {
  return Object.keys(subset).every(
    (k) => superset[k] !== undefined && subset[k] <= superset[k],
  );
}

function hasAllRequiredReactants(
  input: Record<string, number>,
  recipe: Record<string, number>,
): boolean {
  return Object.keys(recipe).every((key) => (input[key] || 0) >= recipe[key]);
}

function formatMissingReactants(
  counts: Record<string, number>,
  recipe: Recipe,
): string {
  return Object.entries(recipe.reactants)
    .filter(([sym, need]) => (counts[sym] || 0) < need)
    .map(([sym, need]) => `${need - (counts[sym] || 0)}× ${sym}`)
    .join(', ');
}

export function getReactantCount(elements: LabElement[]): Record<string, number> {
  return countElements(elements);
}

export function getRecipeTotalReactants(recipe: Recipe): number {
  return Object.values(recipe.reactants).reduce((sum, count) => sum + count, 0);
}

export function attemptRecipeCombination(
  elements: LabElement[],
  recipe: Recipe,
): RecipeAttemptResult {
  if (elements.length === 0) {
    return {
      kind: 'invalid_unknown',
      message: 'Add ingredients to the chamber first.',
    };
  }

  const counts = countElements(elements);
  if (countsMatch(counts, recipe.reactants)) {
    return {
      kind: 'success',
      product: recipe.product,
      reactionType: recipe.reactionType,
    };
  }

  if (isSubset(counts, recipe.reactants)) {
    return {
      kind: 'invalid_missing',
      message: `Missing ${formatMissingReactants(counts, recipe)} to make ${recipe.product.name}.`,
    };
  }

  if (hasAllRequiredReactants(counts, recipe.reactants)) {
    return {
      kind: 'invalid_extra',
      message: `This chamber has extra ingredients, so it cannot make ${recipe.product.name} exactly.`,
    };
  }

  const result = attemptCombination(elements);
  if (result.kind === 'success') {
    return {
      kind: 'wrong_product',
      actualProduct: result.product,
      message: `That combination makes ${result.product.name}, not ${recipe.product.name}.`,
    };
  }

  return {
    kind: 'invalid_unknown',
    message: `That mixture does not make ${recipe.product.name}.`,
  };
}

export function attemptCombination(elements: LabElement[]): CombinationResult {
  if (elements.length === 0) {
    return { kind: 'invalid_unknown', message: 'Add elements to the reaction chamber first.' };
  }

  const counts = countElements(elements);

  for (const recipe of recipes) {
    if (countsMatch(counts, recipe.reactants)) {
      return {
        kind: 'success',
        product: recipe.product,
        reactionType: recipe.reactionType,
      };
    }
  }

  for (const recipe of recipes) {
    if (isSubset(counts, recipe.reactants)) {
      return {
        kind: 'invalid_missing',
        message: `Close, but this reaction is missing ${formatMissingReactants(counts, recipe)} to make ${recipe.product.name}.`,
      };
    }
  }

  for (const recipe of recipes) {
    if (hasAllRequiredReactants(counts, recipe.reactants)) {
      return {
        kind: 'invalid_extra',
        message: `This mix has extra reactants, so it cannot form ${recipe.product.name} exactly.`,
      };
    }
  }

  return {
    kind: 'invalid_unknown',
    message: 'No known reaction matches this combination.',
  };
}
