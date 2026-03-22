export type ElementCategory =
  | 'nonmetal'
  | 'noble-gas'
  | 'alkali'
  | 'alkaline-earth'
  | 'metalloid'
  | 'halogen'
  | 'post-transition'
  | 'transition'
  | 'lanthanide'
  | 'actinide'
  | 'unknown';

export interface ElementData {
  atomic_number: number;
  symbol: string;
  name: string;
  atomic_mass: number;
  category: ElementCategory;
  imageUrl?: string;
}

const getElementImageSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const elementsData: ElementData[] = [
  { atomic_number: 1, symbol: 'H', name: 'Hydrogen', atomic_mass: 1.008, category: 'nonmetal' },
  { atomic_number: 2, symbol: 'He', name: 'Helium', atomic_mass: 4.003, category: 'noble-gas' },
  { atomic_number: 3, symbol: 'Li', name: 'Lithium', atomic_mass: 6.941, category: 'alkali' },
  { atomic_number: 4, symbol: 'Be', name: 'Beryllium', atomic_mass: 9.012, category: 'alkaline-earth' },
  { atomic_number: 5, symbol: 'B', name: 'Boron', atomic_mass: 10.812, category: 'metalloid' },
  { atomic_number: 6, symbol: 'C', name: 'Carbon', atomic_mass: 12.011, category: 'nonmetal' },
  { atomic_number: 7, symbol: 'N', name: 'Nitrogen', atomic_mass: 14.007, category: 'nonmetal' },
  { atomic_number: 8, symbol: 'O', name: 'Oxygen', atomic_mass: 15.999, category: 'nonmetal' },
  { atomic_number: 9, symbol: 'F', name: 'Fluorine', atomic_mass: 18.998, category: 'halogen' },
  { atomic_number: 10, symbol: 'Ne', name: 'Neon', atomic_mass: 20.18, category: 'noble-gas' },
  { atomic_number: 11, symbol: 'Na', name: 'Sodium', atomic_mass: 22.99, category: 'alkali' },
  { atomic_number: 12, symbol: 'Mg', name: 'Magnesium', atomic_mass: 24.305, category: 'alkaline-earth' },
  { atomic_number: 13, symbol: 'Al', name: 'Aluminium', atomic_mass: 26.982, category: 'post-transition' },
  { atomic_number: 14, symbol: 'Si', name: 'Silicon', atomic_mass: 28.086, category: 'metalloid' },
  { atomic_number: 15, symbol: 'P', name: 'Phosphorus', atomic_mass: 30.974, category: 'nonmetal' },
  { atomic_number: 16, symbol: 'S', name: 'Sulfur', atomic_mass: 32.067, category: 'nonmetal' },
  { atomic_number: 17, symbol: 'Cl', name: 'Chlorine', atomic_mass: 35.453, category: 'halogen' },
  { atomic_number: 18, symbol: 'Ar', name: 'Argon', atomic_mass: 39.948, category: 'noble-gas' },
  { atomic_number: 19, symbol: 'K', name: 'Potassium', atomic_mass: 39.098, category: 'alkali' },
  { atomic_number: 20, symbol: 'Ca', name: 'Calcium', atomic_mass: 40.078, category: 'alkaline-earth' },
  { atomic_number: 21, symbol: 'Sc', name: 'Scandium', atomic_mass: 44.956, category: 'transition' },
  { atomic_number: 22, symbol: 'Ti', name: 'Titanium', atomic_mass: 47.867, category: 'transition' },
  { atomic_number: 23, symbol: 'V', name: 'Vanadium', atomic_mass: 50.944, category: 'transition' },
  { atomic_number: 24, symbol: 'Cr', name: 'Chromium', atomic_mass: 51.996, category: 'transition' },
  { atomic_number: 25, symbol: 'Mn', name: 'Manganese', atomic_mass: 54.938, category: 'transition' },
  { atomic_number: 26, symbol: 'Fe', name: 'Iron', atomic_mass: 55.845, category: 'transition' },
  { atomic_number: 27, symbol: 'Co', name: 'Cobalt', atomic_mass: 58.933, category: 'transition' },
  { atomic_number: 28, symbol: 'Ni', name: 'Nickel', atomic_mass: 58.693, category: 'transition' },
  { atomic_number: 29, symbol: 'Cu', name: 'Copper', atomic_mass: 63.546, category: 'transition' },
  { atomic_number: 30, symbol: 'Zn', name: 'Zinc', atomic_mass: 65.39, category: 'transition' },
  { atomic_number: 31, symbol: 'Ga', name: 'Gallium', atomic_mass: 69.723, category: 'post-transition' },
  { atomic_number: 32, symbol: 'Ge', name: 'Germanium', atomic_mass: 72.61, category: 'metalloid' },
  { atomic_number: 33, symbol: 'As', name: 'Arsenic', atomic_mass: 74.922, category: 'metalloid' },
  { atomic_number: 34, symbol: 'Se', name: 'Selenium', atomic_mass: 78.96, category: 'nonmetal' },
  { atomic_number: 35, symbol: 'Br', name: 'Bromine', atomic_mass: 79.904, category: 'halogen' },
  { atomic_number: 36, symbol: 'Kr', name: 'Krypton', atomic_mass: 83.8, category: 'noble-gas' },
  { atomic_number: 37, symbol: 'Rb', name: 'Rubidium', atomic_mass: 85.468, category: 'alkali' },
  { atomic_number: 38, symbol: 'Sr', name: 'Strontium', atomic_mass: 87.62, category: 'alkaline-earth' },
  { atomic_number: 39, symbol: 'Y', name: 'Yttrium', atomic_mass: 88.906, category: 'transition' },
  { atomic_number: 40, symbol: 'Zr', name: 'Zirconium', atomic_mass: 91.224, category: 'transition' },
  { atomic_number: 41, symbol: 'Nb', name: 'Niobium', atomic_mass: 92.906, category: 'transition' },
  { atomic_number: 42, symbol: 'Mo', name: 'Molybdenum', atomic_mass: 95.94, category: 'transition' },
  { atomic_number: 43, symbol: 'Tc', name: 'Technetium', atomic_mass: 98.0, category: 'transition' },
  { atomic_number: 44, symbol: 'Ru', name: 'Ruthenium', atomic_mass: 101.07, category: 'transition' },
  { atomic_number: 45, symbol: 'Rh', name: 'Rhodium', atomic_mass: 102.906, category: 'transition' },
  { atomic_number: 46, symbol: 'Pd', name: 'Palladium', atomic_mass: 106.42, category: 'transition' },
  { atomic_number: 47, symbol: 'Ag', name: 'Silver', atomic_mass: 107.868, category: 'transition' },
  { atomic_number: 48, symbol: 'Cd', name: 'Cadmium', atomic_mass: 112.412, category: 'transition' },
  { atomic_number: 49, symbol: 'In', name: 'Indium', atomic_mass: 114.818, category: 'post-transition' },
  { atomic_number: 50, symbol: 'Sn', name: 'Tin', atomic_mass: 118.711, category: 'post-transition' },
  { atomic_number: 51, symbol: 'Sb', name: 'Antimony', atomic_mass: 121.76, category: 'metalloid' },
  { atomic_number: 52, symbol: 'Te', name: 'Tellurium', atomic_mass: 127.6, category: 'metalloid' },
  { atomic_number: 53, symbol: 'I', name: 'Iodine', atomic_mass: 126.904, category: 'halogen' },
  { atomic_number: 54, symbol: 'Xe', name: 'Xenon', atomic_mass: 131.29, category: 'noble-gas' },
  { atomic_number: 55, symbol: 'Cs', name: 'Caesium', atomic_mass: 132.905, category: 'alkali' },
  { atomic_number: 56, symbol: 'Ba', name: 'Barium', atomic_mass: 137.328, category: 'alkaline-earth' },
  { atomic_number: 57, symbol: 'La', name: 'Lanthanum', atomic_mass: 138.906, category: 'lanthanide' },
  { atomic_number: 58, symbol: 'Ce', name: 'Cerium', atomic_mass: 140.116, category: 'lanthanide' },
  { atomic_number: 59, symbol: 'Pr', name: 'Praseodymium', atomic_mass: 140.908, category: 'lanthanide' },
  { atomic_number: 60, symbol: 'Nd', name: 'Neodymium', atomic_mass: 144.24, category: 'lanthanide' },
  { atomic_number: 61, symbol: 'Pm', name: 'Promethium', atomic_mass: 145.0, category: 'lanthanide' },
  { atomic_number: 62, symbol: 'Sm', name: 'Samarium', atomic_mass: 150.36, category: 'lanthanide' },
  { atomic_number: 63, symbol: 'Eu', name: 'Europium', atomic_mass: 151.964, category: 'lanthanide' },
  { atomic_number: 64, symbol: 'Gd', name: 'Gadolinium', atomic_mass: 157.25, category: 'lanthanide' },
  { atomic_number: 65, symbol: 'Tb', name: 'Terbium', atomic_mass: 158.925, category: 'lanthanide' },
  { atomic_number: 66, symbol: 'Dy', name: 'Dysprosium', atomic_mass: 162.5, category: 'lanthanide' },
  { atomic_number: 67, symbol: 'Ho', name: 'Holmium', atomic_mass: 164.93, category: 'lanthanide' },
  { atomic_number: 68, symbol: 'Er', name: 'Erbium', atomic_mass: 167.26, category: 'lanthanide' },
  { atomic_number: 69, symbol: 'Tm', name: 'Thulium', atomic_mass: 168.934, category: 'lanthanide' },
  { atomic_number: 70, symbol: 'Yb', name: 'Ytterbium', atomic_mass: 173.04, category: 'lanthanide' },
  { atomic_number: 71, symbol: 'Lu', name: 'Lutetium', atomic_mass: 174.967, category: 'lanthanide' },
  { atomic_number: 72, symbol: 'Hf', name: 'Hafnium', atomic_mass: 178.49, category: 'transition' },
  { atomic_number: 73, symbol: 'Ta', name: 'Tantalum', atomic_mass: 180.948, category: 'transition' },
  { atomic_number: 74, symbol: 'W', name: 'Tungsten', atomic_mass: 183.84, category: 'transition' },
  { atomic_number: 75, symbol: 'Re', name: 'Rhenium', atomic_mass: 186.207, category: 'transition' },
  { atomic_number: 76, symbol: 'Os', name: 'Osmium', atomic_mass: 190.23, category: 'transition' },
  { atomic_number: 77, symbol: 'Ir', name: 'Iridium', atomic_mass: 192.217, category: 'transition' },
  { atomic_number: 78, symbol: 'Pt', name: 'Platinum', atomic_mass: 195.078, category: 'transition' },
  { atomic_number: 79, symbol: 'Au', name: 'Gold', atomic_mass: 196.967, category: 'transition' },
  { atomic_number: 80, symbol: 'Hg', name: 'Mercury', atomic_mass: 200.59, category: 'transition' },
  { atomic_number: 81, symbol: 'Tl', name: 'Thallium', atomic_mass: 204.383, category: 'post-transition' },
  { atomic_number: 82, symbol: 'Pb', name: 'Lead', atomic_mass: 207.2, category: 'post-transition' },
  { atomic_number: 83, symbol: 'Bi', name: 'Bismuth', atomic_mass: 208.98, category: 'post-transition' },
  { atomic_number: 84, symbol: 'Po', name: 'Polonium', atomic_mass: 209.0, category: 'metalloid' },
  { atomic_number: 85, symbol: 'At', name: 'Astatine', atomic_mass: 210.0, category: 'halogen' },
  { atomic_number: 86, symbol: 'Rn', name: 'Radon', atomic_mass: 222.0, category: 'noble-gas' },
  { atomic_number: 87, symbol: 'Fr', name: 'Francium', atomic_mass: 223.0, category: 'alkali' },
  { atomic_number: 88, symbol: 'Ra', name: 'Radium', atomic_mass: 226.0, category: 'alkaline-earth' },
  { atomic_number: 89, symbol: 'Ac', name: 'Actinium', atomic_mass: 227.0, category: 'actinide' },
  { atomic_number: 90, symbol: 'Th', name: 'Thorium', atomic_mass: 232.038, category: 'actinide' },
  { atomic_number: 91, symbol: 'Pa', name: 'Protactinium', atomic_mass: 231.036, category: 'actinide' },
  { atomic_number: 92, symbol: 'U', name: 'Uranium', atomic_mass: 238.029, category: 'actinide' },
  { atomic_number: 93, symbol: 'Np', name: 'Neptunium', atomic_mass: 237.0, category: 'actinide' },
  { atomic_number: 94, symbol: 'Pu', name: 'Plutonium', atomic_mass: 244.0, category: 'actinide' },
  { atomic_number: 95, symbol: 'Am', name: 'Americium', atomic_mass: 243.0, category: 'actinide' },
  { atomic_number: 96, symbol: 'Cm', name: 'Curium', atomic_mass: 247.0, category: 'actinide' },
  { atomic_number: 97, symbol: 'Bk', name: 'Berkelium', atomic_mass: 247.0, category: 'actinide' },
  { atomic_number: 98, symbol: 'Cf', name: 'Californium', atomic_mass: 251.0, category: 'actinide' },
  { atomic_number: 99, symbol: 'Es', name: 'Einsteinium', atomic_mass: 252.0, category: 'actinide' },
  { atomic_number: 100, symbol: 'Fm', name: 'Fermium', atomic_mass: 257.0, category: 'actinide' },
  { atomic_number: 101, symbol: 'Md', name: 'Mendelevium', atomic_mass: 258.0, category: 'actinide' },
  { atomic_number: 102, symbol: 'No', name: 'Nobelium', atomic_mass: 259.0, category: 'actinide' },
  { atomic_number: 103, symbol: 'Lr', name: 'Lawrencium', atomic_mass: 262.0, category: 'actinide' },
  { atomic_number: 104, symbol: 'Rf', name: 'Rutherfordium', atomic_mass: 267.0, category: 'transition' },
  { atomic_number: 105, symbol: 'Db', name: 'Dubnium', atomic_mass: 268.0, category: 'transition' },
  { atomic_number: 106, symbol: 'Sg', name: 'Seaborgium', atomic_mass: 269.0, category: 'transition' },
  { atomic_number: 107, symbol: 'Bh', name: 'Bohrium', atomic_mass: 270.0, category: 'transition' },
  { atomic_number: 108, symbol: 'Hs', name: 'Hassium', atomic_mass: 269.0, category: 'transition' },
  { atomic_number: 109, symbol: 'Mt', name: 'Meitnerium', atomic_mass: 278.0, category: 'transition' },
  { atomic_number: 110, symbol: 'Ds', name: 'Darmstadtium', atomic_mass: 281.0, category: 'transition' },
  { atomic_number: 111, symbol: 'Rg', name: 'Roentgenium', atomic_mass: 281.0, category: 'transition' },
  { atomic_number: 112, symbol: 'Cn', name: 'Copernicium', atomic_mass: 285.0, category: 'transition' },
  { atomic_number: 113, symbol: 'Nh', name: 'Nihonium', atomic_mass: 284.0, category: 'post-transition' },
  { atomic_number: 114, symbol: 'Fl', name: 'Flerovium', atomic_mass: 289.0, category: 'post-transition' },
  { atomic_number: 115, symbol: 'Mc', name: 'Moscovium', atomic_mass: 288.0, category: 'post-transition' },
  { atomic_number: 116, symbol: 'Lv', name: 'Livermorium', atomic_mass: 293.0, category: 'post-transition' },
  { atomic_number: 117, symbol: 'Ts', name: 'Tennessine', atomic_mass: 292.0, category: 'unknown' },
  { atomic_number: 118, symbol: 'Og', name: 'Oganesson', atomic_mass: 294.0, category: 'noble-gas' },
].map((element) => ({
  ...element,
  imageUrl: `https://images-of-elements.com/s/${getElementImageSlug(element.name)}.jpg`,
}));

/** Grid positions for elements in the main 18-column grid. */
export const mainGridPositions: Record<number, { row: number; col: number }> = {
  // Period 1
  1: { row: 1, col: 1 }, 2: { row: 1, col: 18 },
  // Period 2
  3: { row: 2, col: 1 }, 4: { row: 2, col: 2 },
  5: { row: 2, col: 13 }, 6: { row: 2, col: 14 }, 7: { row: 2, col: 15 },
  8: { row: 2, col: 16 }, 9: { row: 2, col: 17 }, 10: { row: 2, col: 18 },
  // Period 3
  11: { row: 3, col: 1 }, 12: { row: 3, col: 2 },
  13: { row: 3, col: 13 }, 14: { row: 3, col: 14 }, 15: { row: 3, col: 15 },
  16: { row: 3, col: 16 }, 17: { row: 3, col: 17 }, 18: { row: 3, col: 18 },
  // Period 4
  19: { row: 4, col: 1 }, 20: { row: 4, col: 2 },
  21: { row: 4, col: 3 }, 22: { row: 4, col: 4 }, 23: { row: 4, col: 5 },
  24: { row: 4, col: 6 }, 25: { row: 4, col: 7 }, 26: { row: 4, col: 8 },
  27: { row: 4, col: 9 }, 28: { row: 4, col: 10 }, 29: { row: 4, col: 11 },
  30: { row: 4, col: 12 }, 31: { row: 4, col: 13 }, 32: { row: 4, col: 14 },
  33: { row: 4, col: 15 }, 34: { row: 4, col: 16 }, 35: { row: 4, col: 17 },
  36: { row: 4, col: 18 },
  // Period 5
  37: { row: 5, col: 1 }, 38: { row: 5, col: 2 },
  39: { row: 5, col: 3 }, 40: { row: 5, col: 4 }, 41: { row: 5, col: 5 },
  42: { row: 5, col: 6 }, 43: { row: 5, col: 7 }, 44: { row: 5, col: 8 },
  45: { row: 5, col: 9 }, 46: { row: 5, col: 10 }, 47: { row: 5, col: 11 },
  48: { row: 5, col: 12 }, 49: { row: 5, col: 13 }, 50: { row: 5, col: 14 },
  51: { row: 5, col: 15 }, 52: { row: 5, col: 16 }, 53: { row: 5, col: 17 },
  54: { row: 5, col: 18 },
  // Period 6 (La in main grid, Ce-Lu in f-block)
  55: { row: 6, col: 1 }, 56: { row: 6, col: 2 },
  57: { row: 6, col: 3 },
  72: { row: 6, col: 4 }, 73: { row: 6, col: 5 }, 74: { row: 6, col: 6 },
  75: { row: 6, col: 7 }, 76: { row: 6, col: 8 }, 77: { row: 6, col: 9 },
  78: { row: 6, col: 10 }, 79: { row: 6, col: 11 }, 80: { row: 6, col: 12 },
  81: { row: 6, col: 13 }, 82: { row: 6, col: 14 }, 83: { row: 6, col: 15 },
  84: { row: 6, col: 16 }, 85: { row: 6, col: 17 }, 86: { row: 6, col: 18 },
  // Period 7 (Ac in main grid, Th-Lr in f-block)
  87: { row: 7, col: 1 }, 88: { row: 7, col: 2 },
  89: { row: 7, col: 3 },
  104: { row: 7, col: 4 }, 105: { row: 7, col: 5 }, 106: { row: 7, col: 6 },
  107: { row: 7, col: 7 }, 108: { row: 7, col: 8 }, 109: { row: 7, col: 9 },
  110: { row: 7, col: 10 }, 111: { row: 7, col: 11 }, 112: { row: 7, col: 12 },
  113: { row: 7, col: 13 }, 114: { row: 7, col: 14 }, 115: { row: 7, col: 15 },
  116: { row: 7, col: 16 }, 117: { row: 7, col: 17 }, 118: { row: 7, col: 18 },
};

/** Lanthanide f-block atomic numbers (Ce through Lu) */
export const lanthanideFBlock = [58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

/** Actinide f-block atomic numbers (Th through Lr) */
export const actinideFBlock = [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103];

/** Reactions data for quiz and lab */
export const reactionsData = [
  { id: 1, reactants: '2H\u2082 + O\u2082', products: '2H\u2082O', name: 'Combustion of Hydrogen' },
  { id: 2, reactants: 'C + O\u2082', products: 'CO\u2082', name: 'Combustion of Carbon' },
  { id: 3, reactants: '2Mg + O\u2082', products: '2MgO', name: 'Combustion of Magnesium' },
  { id: 4, reactants: 'CH\u2084 + 2O\u2082', products: 'CO\u2082 + 2H\u2082O', name: 'Combustion of Methane' },
  { id: 5, reactants: '2Na + Cl\u2082', products: '2NaCl', name: 'Formation of Sodium Chloride' },
  { id: 6, reactants: 'Fe + S', products: 'FeS', name: 'Formation of Iron Sulfide' },
  { id: 7, reactants: 'CaCO\u2083', products: 'CaO + CO\u2082', name: 'Decomposition of Calcium Carbonate' },
  { id: 8, reactants: '2H\u2082O\u2082', products: '2H\u2082O + O\u2082', name: 'Decomposition of Hydrogen Peroxide' },
  { id: 9, reactants: '2KClO\u2083', products: '2KCl + 3O\u2082', name: 'Decomposition of Potassium Chlorate' },
  { id: 10, reactants: 'Zn + 2HCl', products: 'ZnCl\u2082 + H\u2082', name: 'Zinc and Hydrochloric Acid' },
  { id: 11, reactants: 'NaOH + HCl', products: 'NaCl + H\u2082O', name: 'Neutralization Reaction' },
  { id: 12, reactants: 'CuSO\u2084 + Fe', products: 'FeSO\u2084 + Cu', name: 'Copper Sulfate and Iron' },
  { id: 13, reactants: 'AgNO\u2083 + NaCl', products: 'AgCl + NaNO\u2083', name: 'Silver Chloride Precipitation' },
  { id: 14, reactants: 'Pb(NO\u2083)\u2082 + 2KI', products: 'PbI\u2082 + 2KNO\u2083', name: 'Lead Iodide Precipitation' },
  { id: 15, reactants: 'N\u2082 + 3H\u2082', products: '2NH\u2083', name: 'Haber Process' },
  { id: 16, reactants: '2K + 2H\u2082O', products: '2KOH + H\u2082', name: 'Potassium and Water' },
  { id: 17, reactants: 'Ca + 2H\u2082O', products: 'Ca(OH)\u2082 + H\u2082', name: 'Calcium and Water' },
  { id: 18, reactants: '2Al + Fe\u2082O\u2083', products: 'Al\u2082O\u2083 + 2Fe', name: 'Thermite Reaction' },
  { id: 19, reactants: 'C\u2086H\u2081\u2082O\u2086 + 6O\u2082', products: '6CO\u2082 + 6H\u2082O', name: 'Cellular Respiration' },
  { id: 20, reactants: '2H\u2082O', products: '2H\u2082 + O\u2082', name: 'Electrolysis of Water' },
];
