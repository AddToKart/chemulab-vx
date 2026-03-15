export interface Reaction {
  id: number;
  reactants: string;
  reactantsName: string;
  products: string;
  productsName: string;
  name: string;
}

export const reactionsData: Reaction[] = [
  { id: 1, reactants: '2H\u2082 + O\u2082', reactantsName: 'Hydrogen + Oxygen', products: '2H\u2082O', productsName: 'Water', name: 'Combustion of Hydrogen' },
  { id: 2, reactants: 'C + O\u2082', reactantsName: 'Carbon + Oxygen', products: 'CO\u2082', productsName: 'Carbon Dioxide', name: 'Combustion of Carbon' },
  { id: 3, reactants: '2Na + Cl\u2082', reactantsName: 'Sodium + Chlorine', products: '2NaCl', productsName: 'Sodium Chloride', name: 'Formation of Sodium Chloride' },
  { id: 4, reactants: 'Fe + S', reactantsName: 'Iron + Sulfur', products: 'FeS', productsName: 'Iron Sulfide', name: 'Formation of Iron Sulfide' },
  { id: 5, reactants: '2Mg + O\u2082', reactantsName: 'Magnesium + Oxygen', products: '2MgO', productsName: 'Magnesium Oxide', name: 'Combustion of Magnesium' },
  { id: 6, reactants: 'CaCO\u2083', reactantsName: 'Calcium Carbonate', products: 'CaO + CO\u2082', productsName: 'Calcium Oxide + Carbon Dioxide', name: 'Thermal Decomposition of Calcium Carbonate' },
  { id: 7, reactants: 'Zn + 2HCl', reactantsName: 'Zinc + Hydrochloric Acid', products: 'ZnCl\u2082 + H\u2082', productsName: 'Zinc Chloride + Hydrogen', name: 'Zinc and Hydrochloric Acid' },
  { id: 8, reactants: '2H\u2082O\u2082', reactantsName: 'Hydrogen Peroxide', products: '2H\u2082O + O\u2082', productsName: 'Water + Oxygen', name: 'Decomposition of Hydrogen Peroxide' },
  { id: 9, reactants: 'CH\u2084 + 2O\u2082', reactantsName: 'Methane + Oxygen', products: 'CO\u2082 + 2H\u2082O', productsName: 'Carbon Dioxide + Water', name: 'Combustion of Methane' },
  { id: 10, reactants: 'N\u2082 + 3H\u2082', reactantsName: 'Nitrogen + Hydrogen', products: '2NH\u2083', productsName: 'Ammonia', name: 'Haber Process (Ammonia Synthesis)' },
  { id: 11, reactants: '2K + 2H\u2082O', reactantsName: 'Potassium + Water', products: '2KOH + H\u2082', productsName: 'Potassium Hydroxide + Hydrogen', name: 'Potassium Reacting with Water' },
  { id: 12, reactants: 'CuSO\u2084 + Fe', reactantsName: 'Copper Sulfate + Iron', products: 'FeSO\u2084 + Cu', productsName: 'Iron Sulfate + Copper', name: 'Displacement of Copper by Iron' },
  { id: 13, reactants: 'AgNO\u2083 + NaCl', reactantsName: 'Silver Nitrate + Sodium Chloride', products: 'AgCl + NaNO\u2083', productsName: 'Silver Chloride + Sodium Nitrate', name: 'Precipitation of Silver Chloride' },
  { id: 14, reactants: '2Al + 3CuO', reactantsName: 'Aluminum + Copper(II) Oxide', products: 'Al\u2082O\u2083 + 3Cu', productsName: 'Aluminum Oxide + Copper', name: 'Thermite Reaction (Simplified)' },
  { id: 15, reactants: 'NaOH + HCl', reactantsName: 'Sodium Hydroxide + Hydrochloric Acid', products: 'NaCl + H\u2082O', productsName: 'Sodium Chloride + Water', name: 'Neutralization Reaction' },
  { id: 16, reactants: '2Fe + 3Cl\u2082', reactantsName: 'Iron + Chlorine', products: '2FeCl\u2083', productsName: 'Iron(III) Chloride', name: 'Iron and Chlorine' },
  { id: 17, reactants: 'Ca + 2H\u2082O', reactantsName: 'Calcium + Water', products: 'Ca(OH)\u2082 + H\u2082', productsName: 'Calcium Hydroxide + Hydrogen', name: 'Calcium Reacting with Water' },
  { id: 18, reactants: '2KClO\u2083', reactantsName: 'Potassium Chlorate', products: '2KCl + 3O\u2082', productsName: 'Potassium Chloride + Oxygen', name: 'Decomposition of Potassium Chlorate' },
  { id: 19, reactants: 'Pb(NO\u2083)\u2082 + 2KI', reactantsName: 'Lead Nitrate + Potassium Iodide', products: 'PbI\u2082 + 2KNO\u2083', productsName: 'Lead Iodide + Potassium Nitrate', name: 'Precipitation of Lead Iodide' },
  { id: 20, reactants: 'C\u2086H\u2081\u2082O\u2086 + 6O\u2082', reactantsName: 'Glucose + Oxygen', products: '6CO\u2082 + 6H\u2082O', productsName: 'Carbon Dioxide + Water', name: 'Cellular Respiration (Glucose)' },
];
