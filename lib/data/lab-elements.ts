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

/** Hardcoded combinations lookup table (alphabetically sorted keys) */
export const combinations: Record<string, LabElement> = {
  'H+O': { symbol: 'H2O', name: 'Water', color: '#B3E0FF', type: 'compound' },
  'H2O+O': { symbol: 'H2O2', name: 'Hydrogen Peroxide', color: '#E6F3FF', type: 'compound' },
  'C+O': { symbol: 'CO', name: 'Carbon Monoxide', color: '#8A8A8A', type: 'compound' },
  'CO+O': { symbol: 'CO2', name: 'Carbon Dioxide', color: '#A9A9A9', type: 'compound' },
  'H+N': { symbol: 'NH3', name: 'Ammonia', color: '#CC99FF', type: 'compound' },
  'N+O': { symbol: 'NO', name: 'Nitric Oxide', color: '#E6B3B3', type: 'compound' },
  'NO+O': { symbol: 'NO2', name: 'Nitrogen Dioxide', color: '#FF9999', type: 'compound' },
  'H+S': { symbol: 'H2S', name: 'Hydrogen Sulfide', color: '#FFFF99', type: 'compound' },
  'O+S': { symbol: 'SO2', name: 'Sulfur Dioxide', color: '#FFDB4D', type: 'compound' },
  'O+SO2': { symbol: 'SO3', name: 'Sulfur Trioxide', color: '#FFE480', type: 'compound' },
  'O+P': { symbol: 'P2O5', name: 'Phosphorus Pentoxide', color: '#FFB366', type: 'compound' },
  'F+H': { symbol: 'HF', name: 'Hydrofluoric Acid', color: '#CCFF99', type: 'compound' },
  'Cl+H': { symbol: 'HCl', name: 'Hydrochloric Acid', color: '#90EE90', type: 'compound' },
  'Br+H': { symbol: 'HBr', name: 'Hydrobromic Acid', color: '#BC8F8F', type: 'compound' },
  'H+I': { symbol: 'HI', name: 'Hydroiodic Acid', color: '#9370DB', type: 'compound' },
  'Na+O': { symbol: 'Na2O', name: 'Sodium Oxide', color: '#FFB366', type: 'compound' },
  'K+O': { symbol: 'K2O', name: 'Potassium Oxide', color: '#FF99CC', type: 'compound' },
  'O+Si': { symbol: 'SiO2', name: 'Silicon Dioxide', color: '#F5C242', type: 'compound' },
  'Al+O': { symbol: 'Al2O3', name: 'Aluminum Oxide', color: '#BFC7C9', type: 'compound' },
  'Ca+O': { symbol: 'CaO', name: 'Calcium Oxide', color: '#A0A0A0', type: 'compound' },
  'Mg+O': { symbol: 'MgO', name: 'Magnesium Oxide', color: '#B8B8B8', type: 'compound' },
  'Fe+O': { symbol: 'Fe2O3', name: 'Iron(III) Oxide', color: '#CD853F', type: 'compound' },
  'Fe+S': { symbol: 'FeS', name: 'Iron(II) Sulfide', color: '#4B3621', type: 'compound' },
  'S+Zn': { symbol: 'ZnS', name: 'Zinc Sulfide', color: '#E0E0E0', type: 'compound' },
  'Cu+S': { symbol: 'CuS', name: 'Copper(II) Sulfide', color: '#3A3F44', type: 'compound' },
  'Pb+S': { symbol: 'PbS', name: 'Lead(II) Sulfide', color: '#2F4F4F', type: 'compound' },
  'H2O+Na': { symbol: 'NaOH', name: 'Sodium Hydroxide', color: '#FFB366', type: 'compound' },
  'H2O+K': { symbol: 'KOH', name: 'Potassium Hydroxide', color: '#FF99CC', type: 'compound' },
  'Cl+Na': { symbol: 'NaCl', name: 'Sodium Chloride', color: '#FFFFFF', type: 'compound' },
  'C+H': { symbol: 'CH4', name: 'Methane', color: '#D3D3D3', type: 'compound' },
};

/** Chemical category map for dynamic combination generation */
const chemicalCategories: Record<string, string> = {
  H: 'nonmetal', He: 'noble-gas', Li: 'alkali-metal', Be: 'alkaline-earth',
  B: 'metalloid', C: 'nonmetal', N: 'nonmetal', O: 'nonmetal', F: 'halogen',
  Ne: 'noble-gas', Na: 'alkali-metal', Mg: 'alkaline-earth', Al: 'post-transition',
  Si: 'metalloid', P: 'nonmetal', S: 'nonmetal', Cl: 'halogen', Ar: 'noble-gas',
  K: 'alkali-metal', Ca: 'alkaline-earth', Sc: 'transition', Ti: 'transition',
  V: 'transition', Cr: 'transition', Mn: 'transition', Fe: 'transition',
  Co: 'transition', Ni: 'transition', Cu: 'transition', Zn: 'transition',
  Ga: 'post-transition', Ge: 'metalloid', As: 'metalloid', Se: 'nonmetal',
  Br: 'halogen', Kr: 'noble-gas', Ag: 'transition', Au: 'transition',
  Pt: 'transition', Hg: 'transition', Pb: 'post-transition', Sn: 'post-transition',
};

/** Blend two hex colors by averaging their channels */
function blendColors(c1: string, c2: string): string {
  const parseHex = (c: string) => parseInt(c?.startsWith('#') ? c.slice(1) : 'cccccc', 16);
  const r = (c: string) => (parseHex(c) >> 16) & 0xff;
  const g = (c: string) => (parseHex(c) >> 8) & 0xff;
  const b = (c: string) => parseHex(c) & 0xff;
  const mix = (v1: number, v2: number) => Math.round((v1 + v2) / 2).toString(16).padStart(2, '0');
  return `#${mix(r(c1), r(c2))}${mix(g(c1), g(c2))}${mix(b(c1), b(c2))}`;
}

/** Generate a dynamic combination for any two elements that don't have a hardcoded entry */
export function generateDynamicCombination(el1: LabElement, el2: LabElement): LabElement {
  const cat1 = chemicalCategories[el1.symbol] || el1.type || 'unknown';
  const cat2 = chemicalCategories[el2.symbol] || el2.type || 'unknown';

  const isMetal = (cat: string) =>
    (cat.includes('metal') && cat !== 'nonmetal') ||
    cat.includes('transition') ||
    cat.includes('lanthanide') ||
    cat.includes('actinide') ||
    cat.includes('earth');

  const metal1 = isMetal(cat1);
  const metal2 = isMetal(cat2);
  const color = blendColors(el1.color, el2.color);

  let name: string;
  let symbol: string;
  let type: string;

  if (cat1 === 'noble-gas' || cat2 === 'noble-gas') {
    name = `${el1.name}-${el2.name} Mixture`;
    symbol = `${el1.symbol}${el2.symbol}`;
    type = 'mixture';
  } else if (metal1 && metal2) {
    name = `${el1.name}-${el2.name} Alloy`;
    symbol = `${el1.symbol}${el2.symbol}`;
    type = 'alloy';
  } else if ((metal1 && !metal2) || (metal2 && !metal1)) {
    const metal = metal1 ? el1 : el2;
    const nonMetal = metal1 ? el2 : el1;
    const suffixMap: Record<string, string> = {
      Oxygen: 'Oxide', Chlorine: 'Chloride', Fluorine: 'Fluoride', Bromine: 'Bromide',
      Iodine: 'Iodide', Sulfur: 'Sulfide', Nitrogen: 'Nitride', Carbon: 'Carbide',
      Phosphorus: 'Phosphide', Hydrogen: 'Hydride',
    };
    const suffix = suffixMap[nonMetal.name] || nonMetal.name + 'ide';
    name = `${metal.name} ${suffix}`;
    symbol = `${metal.symbol}${nonMetal.symbol}`;
    type = 'compound';
  } else {
    name = `${el1.name} ${el2.name} Compound`;
    symbol = `${el1.symbol}${el2.symbol}`;
    type = 'compound';
  }

  return { symbol, name, color, type };
}

/**
 * Attempt a combination of two elements.
 * First tries the hardcoded lookup table, then falls back to dynamic generation.
 */
export function attemptCombination(el1: LabElement, el2: LabElement): LabElement {
  const symbols = [el1.symbol, el2.symbol].sort();
  const key = symbols.join('+');
  return combinations[key] ?? generateDynamicCombination(el1, el2);
}
