/**
 * Lab element data for the ChemistryCraft module.
 * Each element has a symbol, name, background color (for the card), and element type.
 * This mirrors the original `initialElements` array from chemistry_craft.js.
 */

export interface LabElement {
  symbol: string;
  name: string;
  color: string;
  type: string;
}

export const initialElements: LabElement[] = [
  // Period 1
  { symbol: 'H', name: 'Hydrogen', color: '#E6E6E6', type: 'nonmetal' },
  { symbol: 'He', name: 'Helium', color: '#FFE5CC', type: 'noble-gas' },
  // Period 2
  { symbol: 'Li', name: 'Lithium', color: '#CC99FF', type: 'alkali-metal' },
  { symbol: 'Be', name: 'Beryllium', color: '#C0C0C0', type: 'alkaline-earth' },
  { symbol: 'B', name: 'Boron', color: '#FFB266', type: 'metalloid' },
  { symbol: 'C', name: 'Carbon', color: '#666666', type: 'nonmetal' },
  { symbol: 'N', name: 'Nitrogen', color: '#99CCFF', type: 'nonmetal' },
  { symbol: 'O', name: 'Oxygen', color: '#FF9999', type: 'nonmetal' },
  { symbol: 'F', name: 'Fluorine', color: '#CCFF99', type: 'nonmetal' },
  { symbol: 'Ne', name: 'Neon', color: '#FF99CC', type: 'noble-gas' },
  // Period 3
  { symbol: 'Na', name: 'Sodium', color: '#FFB366', type: 'alkali-metal' },
  { symbol: 'Mg', name: 'Magnesium', color: '#B8B8B8', type: 'alkaline-earth' },
  { symbol: 'Al', name: 'Aluminum', color: '#BFC7C9', type: 'post-transition' },
  { symbol: 'Si', name: 'Silicon', color: '#F5C242', type: 'metalloid' },
  { symbol: 'P', name: 'Phosphorus', color: '#FF9966', type: 'nonmetal' },
  { symbol: 'S', name: 'Sulfur', color: '#FFFF00', type: 'nonmetal' },
  { symbol: 'Cl', name: 'Chlorine', color: '#90EE90', type: 'nonmetal' },
  { symbol: 'Ar', name: 'Argon', color: '#FF99CC', type: 'noble-gas' },
  // Period 4
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
  // Period 5
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
  // Period 6 (including lanthanides)
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
  // Period 7 (including actinides)
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

// ─── Recipe-based combination system ─────────────────────────────────────────

export interface Recipe {
  /** Map of element symbols → required count, e.g. { H: 2, O: 1 } for water */
  reactants: Record<string, number>;
  product: LabElement;
}

export type CombinationResult =
  | { kind: 'success'; product: LabElement }
  | { kind: 'partial'; hint: string }
  | { kind: 'none' };

// ─── All recipes (stoichiometrically accurate) ───────────────────────────────

export const recipes: Recipe[] = [
  // ── Hydrogen Compounds ──
  { reactants: { H: 2, O: 1 },  product: { symbol: 'H₂O',   name: 'Water',              color: '#B3E0FF', type: 'compound' } },
  { reactants: { H: 2, O: 2 },  product: { symbol: 'H₂O₂',  name: 'Hydrogen Peroxide',  color: '#E6F3FF', type: 'compound' } },
  { reactants: { N: 1, H: 3 },  product: { symbol: 'NH₃',   name: 'Ammonia',             color: '#CC99FF', type: 'compound' } },
  { reactants: { C: 1, H: 4 },  product: { symbol: 'CH₄',   name: 'Methane',             color: '#D3D3D3', type: 'compound' } },
  { reactants: { H: 1, Cl: 1 }, product: { symbol: 'HCl',   name: 'Hydrogen Chloride',   color: '#90EE90', type: 'compound' } },
  { reactants: { H: 1, F: 1 },  product: { symbol: 'HF',    name: 'Hydrogen Fluoride',   color: '#CCFF99', type: 'compound' } },
  { reactants: { H: 1, Br: 1 }, product: { symbol: 'HBr',   name: 'Hydrogen Bromide',    color: '#BC8F8F', type: 'compound' } },
  { reactants: { H: 1, I: 1 },  product: { symbol: 'HI',    name: 'Hydrogen Iodide',     color: '#9370DB', type: 'compound' } },
  { reactants: { H: 2, S: 1 },  product: { symbol: 'H₂S',   name: 'Hydrogen Sulfide',    color: '#FFFF99', type: 'compound' } },

  // ── Oxides ──
  { reactants: { C: 1, O: 2 },  product: { symbol: 'CO₂',   name: 'Carbon Dioxide',      color: '#A9A9A9', type: 'compound' } },
  { reactants: { C: 1, O: 1 },  product: { symbol: 'CO',    name: 'Carbon Monoxide',      color: '#8A8A8A', type: 'compound' } },
  { reactants: { S: 1, O: 2 },  product: { symbol: 'SO₂',   name: 'Sulfur Dioxide',       color: '#FFDB4D', type: 'compound' } },
  { reactants: { S: 1, O: 3 },  product: { symbol: 'SO₃',   name: 'Sulfur Trioxide',      color: '#FFE480', type: 'compound' } },
  { reactants: { N: 1, O: 1 },  product: { symbol: 'NO',    name: 'Nitric Oxide',         color: '#E6B3B3', type: 'compound' } },
  { reactants: { N: 1, O: 2 },  product: { symbol: 'NO₂',   name: 'Nitrogen Dioxide',     color: '#FF9999', type: 'compound' } },
  { reactants: { Ca: 1, O: 1 }, product: { symbol: 'CaO',   name: 'Calcium Oxide',        color: '#A0A0A0', type: 'compound' } },
  { reactants: { Mg: 1, O: 1 }, product: { symbol: 'MgO',   name: 'Magnesium Oxide',      color: '#B8B8B8', type: 'compound' } },
  { reactants: { Fe: 2, O: 3 }, product: { symbol: 'Fe₂O₃', name: 'Iron(III) Oxide',      color: '#CD853F', type: 'compound' } },
  { reactants: { Al: 2, O: 3 }, product: { symbol: 'Al₂O₃', name: 'Aluminum Oxide',       color: '#BFC7C9', type: 'compound' } },
  { reactants: { Si: 1, O: 2 }, product: { symbol: 'SiO₂',  name: 'Silicon Dioxide',      color: '#F5C242', type: 'compound' } },

  // ── Sulfides ──
  { reactants: { Fe: 1, S: 1 }, product: { symbol: 'FeS',   name: 'Iron(II) Sulfide',     color: '#4B3621', type: 'compound' } },
  { reactants: { Zn: 1, S: 1 }, product: { symbol: 'ZnS',   name: 'Zinc Sulfide',         color: '#E0E0E0', type: 'compound' } },
  { reactants: { Cu: 1, S: 1 }, product: { symbol: 'CuS',   name: 'Copper(II) Sulfide',   color: '#3A3F44', type: 'compound' } },
  { reactants: { Pb: 1, S: 1 }, product: { symbol: 'PbS',   name: 'Lead(II) Sulfide',     color: '#2F4F4F', type: 'compound' } },

  // ── Salts ──
  { reactants: { Na: 1, Cl: 1 }, product: { symbol: 'NaCl',      name: 'Table Salt',      color: '#F0F0F0', type: 'compound' } },

  // ── Everyday Compounds ──
  { reactants: { Na: 1, H: 1, C: 1, O: 3 }, product: { symbol: 'NaHCO₃', name: 'Baking Soda', color: '#FAFAFA', type: 'compound' } },

  // ── Allotropes ──
  { reactants: { O: 3 },        product: { symbol: 'O₃',         name: 'Ozone',           color: '#ADD8E6', type: 'compound' } },

  // ── Organic ──
  { reactants: { C: 6, H: 12, O: 6 }, product: { symbol: 'C₆H₁₂O₆', name: 'Glucose (Sugar)', color: '#FFE4B5', type: 'compound' } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Count occurrences of each element symbol in the array. */
function countElements(elements: LabElement[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const el of elements) {
    counts[el.symbol] = (counts[el.symbol] || 0) + 1;
  }
  return counts;
}

/** Check if two count maps are exactly equal. */
function countsMatch(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

/** Check if `subset` is a strict subset of `superset` (same keys, all values ≤). */
function isSubset(subset: Record<string, number>, superset: Record<string, number>): boolean {
  return Object.keys(subset).every(
    (k) => superset[k] !== undefined && subset[k] <= superset[k],
  );
}

/**
 * Attempt a combination given an array of elements (may contain duplicates).
 * Returns:
 *  - 'success'  → exact recipe match, compound created
 *  - 'partial'  → the input is a subset of a known recipe (hint shown)
 *  - 'none'     → no recipe matches at all
 */
export function attemptCombination(elements: LabElement[]): CombinationResult {
  if (elements.length === 0) return { kind: 'none' };

  const counts = countElements(elements);

  // Exact match
  for (const recipe of recipes) {
    if (countsMatch(counts, recipe.reactants)) {
      return { kind: 'success', product: recipe.product };
    }
  }

  // Partial match — the user has a subset of a valid recipe
  for (const recipe of recipes) {
    if (isSubset(counts, recipe.reactants)) {
      const missing = Object.entries(recipe.reactants)
        .filter(([sym, need]) => (counts[sym] || 0) < need)
        .map(([sym, need]) => {
          const have = counts[sym] || 0;
          return `${need - have}× ${sym}`;
        });
      return {
        kind: 'partial',
        hint: `Close! You still need ${missing.join(', ')} to make ${recipe.product.name}.`,
      };
    }
  }

  return { kind: 'none' };
}

