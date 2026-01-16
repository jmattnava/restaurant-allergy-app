import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Ingredient {
  id: string;
  name: string;
  allergens: string[];
  may_contain: string[];
  cross_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  supplier: string;
  allergens: string[];
  may_contain: string[];
  created_at: string;
  updated_at: string;
}

export interface Component {
  id: string;
  name: string;
  allergens: string[];
  cross_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComponentIngredient {
  id: string;
  component_id: string;
  ingredient_id: string;
  quantity: string;
  created_at: string;
}

export interface ComponentSupplierItem {
  id: string;
  component_id: string;
  supplier_item_id: string;
  quantity: string;
  created_at: string;
}

export interface Dish {
  id: string;
  name: string;
  station: string;
  allergens: string[];
  created_at: string;
  updated_at: string;
}

export interface DishIngredient {
  id: string;
  dish_id: string;
  ingredient_id: string;
  quantity: string;
  removable: boolean;
  created_at: string;
}

export interface DishSupplierItem {
  id: string;
  dish_id: string;
  supplier_item_id: string;
  quantity: string;
  removable: boolean;
  created_at: string;
}

export interface DishComponent {
  id: string;
  dish_id: string;
  component_id: string;
  quantity: string;
  removable: boolean;
  created_at: string;
}
