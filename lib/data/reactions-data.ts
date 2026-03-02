export interface Reaction {
  id: number;
  reactants: string;
  products: string;
  name: string;
}

export const reactionsData: Reaction[] = [
  { id: 1, reactants: '2H\u2082 + O\u2082', products: '2H\u2082O', name: 'Combustion of Hydrogen' },
  { id: 2, reactants: 'C + O\u2082', products: 'CO\u2082', name: 'Combustion of Carbon' },
  { id: 3, reactants: '2Na + Cl\u2082', products: '2NaCl', name: 'Formation of Sodium Chloride' },
  { id: 4, reactants: 'Fe + S', products: 'FeS', name: 'Formation of Iron Sulfide' },
  { id: 5, reactants: '2Mg + O\u2082', products: '2MgO', name: 'Combustion of Magnesium' },
  { id: 6, reactants: 'CaCO\u2083', products: 'CaO + CO\u2082', name: 'Thermal Decomposition of Calcium Carbonate' },
  { id: 7, reactants: 'Zn + 2HCl', products: 'ZnCl\u2082 + H\u2082', name: 'Zinc and Hydrochloric Acid' },
  { id: 8, reactants: '2H\u2082O\u2082', products: '2H\u2082O + O\u2082', name: 'Decomposition of Hydrogen Peroxide' },
  { id: 9, reactants: 'CH\u2084 + 2O\u2082', products: 'CO\u2082 + 2H\u2082O', name: 'Combustion of Methane' },
  { id: 10, reactants: 'N\u2082 + 3H\u2082', products: '2NH\u2083', name: 'Haber Process (Ammonia Synthesis)' },
  { id: 11, reactants: '2K + 2H\u2082O', products: '2KOH + H\u2082', name: 'Potassium Reacting with Water' },
  { id: 12, reactants: 'CuSO\u2084 + Fe', products: 'FeSO\u2084 + Cu', name: 'Displacement of Copper by Iron' },
  { id: 13, reactants: 'AgNO\u2083 + NaCl', products: 'AgCl + NaNO\u2083', name: 'Precipitation of Silver Chloride' },
  { id: 14, reactants: '2Al + 3CuO', products: 'Al\u2082O\u2083 + 3Cu', name: 'Thermite Reaction (Simplified)' },
  { id: 15, reactants: 'NaOH + HCl', products: 'NaCl + H\u2082O', name: 'Neutralization Reaction' },
  { id: 16, reactants: '2Fe + 3Cl\u2082', products: '2FeCl\u2083', name: 'Iron and Chlorine' },
  { id: 17, reactants: 'Ca + 2H\u2082O', products: 'Ca(OH)\u2082 + H\u2082', name: 'Calcium Reacting with Water' },
  { id: 18, reactants: '2KClO\u2083', products: '2KCl + 3O\u2082', name: 'Decomposition of Potassium Chlorate' },
  { id: 19, reactants: 'Pb(NO\u2083)\u2082 + 2KI', products: 'PbI\u2082 + 2KNO\u2083', name: 'Precipitation of Lead Iodide' },
  { id: 20, reactants: 'C\u2086H\u2081\u2082O\u2086 + 6O\u2082', products: '6CO\u2082 + 6H\u2082O', name: 'Cellular Respiration (Glucose)' },
];
