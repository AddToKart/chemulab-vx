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

// ─── Result type for attemptCombination ─────────────────────────────────────
export type CombinationResult =
  | { kind: 'success';  product: LabElement }
  | { kind: 'invalid';  reason: string }
  | { kind: 'none' };

// ─── Invalid combinations (sorted element symbol keys) ───────────────────────
// These are explicitly known non-reactions shown with an educational message.
export const invalidCombinations: Record<string, string> = {
  // ── Noble gases — full outer shell, won't bond ──
  'H+He':  "Helium is a noble gas — it refuses to bond with anything!",
  'He+N':  "Helium is chemically inert — no reaction possible here.",
  'He+O':  "Helium has a full outer shell and won't react with oxygen.",
  'He+Ne': "Two noble gases? Neither of them reacts with each other!",
  'Ar+H':  "Argon is a noble gas — it's completely unreactive.",
  'Ar+O':  "Argon won't form oxides — it's too stable and inert.",
  'H+Kr':  "Krypton barely reacts under normal lab conditions.",
  'Ne+O':  "Neon is an inert noble gas — no reaction with oxygen.",
  // ── Same element — no new compound ──
  'H+H':   "You need two different elements to form a compound!",
  'O+O':   "Oxygen + Oxygen just gives you more oxygen — no new compound.",
  'N+N':   "Two nitrogen atoms won't create a new compound here.",
  'C+C':   "Carbon + Carbon doesn't form a new compound in this lab.",
  // ── Noble/unreactive metals ──
  'Au+H':  "Gold is highly unreactive — it won't combine with hydrogen.",
  'Au+N':  "Gold doesn't react with nitrogen under normal conditions.",
  'Au+O':  "Gold resists oxidation — that's why it stays shiny forever!",
  'H+Pt':  "Platinum is a noble metal and won't react this way.",
  'Ag+H':  "Silver won't react with hydrogen under normal lab conditions.",
};

// ─── Allowed combinations (sorted element symbol keys) ───────────────────────
// 🧪 Hydrogen Compounds (Hydrides / Acids)
// 🌬️ Oxides (Element + Oxygen)
// 🔩 Sulfides (Element + Sulfur)
export const combinations: Record<string, LabElement> = {
  // ── Hydrogen Compounds ──
  'H+O':   { symbol: 'H₂O',  name: 'Water',              color: '#B3E0FF', type: 'compound' },
  'H₂O+O': { symbol: 'H₂O₂', name: 'Hydrogen Peroxide',  color: '#E6F3FF', type: 'compound' },
  'H+N':   { symbol: 'NH₃',  name: 'Ammonia',             color: '#CC99FF', type: 'compound' },
  'C+H':   { symbol: 'CH₄',  name: 'Methane',             color: '#D3D3D3', type: 'compound' },
  'Cl+H':  { symbol: 'HCl',  name: 'Hydrogen Chloride',   color: '#90EE90', type: 'compound' },
  'F+H':   { symbol: 'HF',   name: 'Hydrogen Fluoride',   color: '#CCFF99', type: 'compound' },
  'Br+H':  { symbol: 'HBr',  name: 'Hydrogen Bromide',    color: '#BC8F8F', type: 'compound' },
  'H+I':   { symbol: 'HI',   name: 'Hydrogen Iodide',     color: '#9370DB', type: 'compound' },
  'H+S':   { symbol: 'H₂S',  name: 'Hydrogen Sulfide',    color: '#FFFF99', type: 'compound' },
  // ── Oxides ──
  'C+O':   { symbol: 'CO₂',  name: 'Carbon Dioxide',      color: '#A9A9A9', type: 'compound' },
  'CO+O':  { symbol: 'CO',   name: 'Carbon Monoxide',      color: '#8A8A8A', type: 'compound' },
  'O+S':   { symbol: 'SO₂',  name: 'Sulfur Dioxide',       color: '#FFDB4D', type: 'compound' },
  'O+SO₂': { symbol: 'SO₃',  name: 'Sulfur Trioxide',      color: '#FFE480', type: 'compound' },
  'N+O':   { symbol: 'NO',   name: 'Nitric Oxide',         color: '#E6B3B3', type: 'compound' },
  'NO+O':  { symbol: 'NO₂',  name: 'Nitrogen Dioxide',     color: '#FF9999', type: 'compound' },
  'Ca+O':  { symbol: 'CaO',  name: 'Calcium Oxide',        color: '#A0A0A0', type: 'compound' },
  'Mg+O':  { symbol: 'MgO',  name: 'Magnesium Oxide',      color: '#B8B8B8', type: 'compound' },
  'Fe+O':  { symbol: 'Fe₂O₃', name: 'Iron(III) Oxide',    color: '#CD853F', type: 'compound' },
  'Al+O':  { symbol: 'Al₂O₃', name: 'Aluminum Oxide',     color: '#BFC7C9', type: 'compound' },
  'O+Si':  { symbol: 'SiO₂', name: 'Silicon Dioxide',      color: '#F5C242', type: 'compound' },
  // ── Sulfides ──
  'Fe+S':  { symbol: 'FeS',  name: 'Iron(II) Sulfide',     color: '#4B3621', type: 'compound' },
  'S+Zn':  { symbol: 'ZnS',  name: 'Zinc Sulfide',         color: '#E0E0E0', type: 'compound' },
  'Cu+S':  { symbol: 'CuS',  name: 'Copper(II) Sulfide',   color: '#3A3F44', type: 'compound' },
  'Pb+S':  { symbol: 'PbS',  name: 'Lead(II) Sulfide',     color: '#2F4F4F', type: 'compound' },
};

/**
 * Attempt a combination of two elements.
 * Returns one of three outcomes:
 *  - 'success'  → a valid compound was created
 *  - 'invalid'  → the pair is a known non-reaction (with an educational reason)
 *  - 'none'     → no data for this pair at all
 */
export function attemptCombination(el1: LabElement, el2: LabElement): CombinationResult {
  const key = [el1.symbol, el2.symbol].sort().join('+');
  const reason = invalidCombinations[key];
  if (reason) return { kind: 'invalid', reason };
  const product = combinations[key];
  if (product) return { kind: 'success', product };
  return { kind: 'none' };
}
