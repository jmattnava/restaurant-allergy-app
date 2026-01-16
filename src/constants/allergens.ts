export interface AllergenOption {
  id: string;
  name: string;
  emoji: string;
}

export const ALLERGEN_OPTIONS: AllergenOption[] = [
  { id: 'dairy', name: 'Dairy', emoji: '🥛' },
  { id: 'eggs', name: 'Eggs', emoji: '🥚' },
  { id: 'peanuts', name: 'Peanuts', emoji: '🥜' },
  { id: 'tree_nuts', name: 'Tree Nuts', emoji: '🌰' },
  { id: 'fish', name: 'Fish', emoji: '🐟' },
  { id: 'shellfish', name: 'Shellfish', emoji: '🦐' },
  { id: 'soy', name: 'Soy', emoji: '🫘' },
  { id: 'gluten', name: 'Gluten', emoji: '🌾' },
  { id: 'mustard', name: 'Mustard', emoji: '🌼' },
  { id: 'sesame', name: 'Sesame', emoji: '🌱' },
  { id: 'sulfites', name: 'Sulfites', emoji: '🍇' },
  { id: 'alcohol', name: 'Alcohol', emoji: '🍷' },
  { id: 'nightshades', name: 'Nightshades', emoji: '🌶️' },
  
];
