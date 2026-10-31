import type { NutrientValues } from '../types';

export interface BarcodeFoodLookupResult {
  barcode: string;
  foodName: string;
  brand: string;
  quantityLabel: string;
  quantityGrams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  imageUri?: string;
  nutrients: NutrientValues;
  source: 'local' | 'supabase' | 'openfoodfacts';
}

export type FoodProductSource = 'user' | 'openfoodfacts' | 'admin';

export interface FoodProductCatalogInput extends Partial<NutrientValues> {
  barcode: string;
  name: string;
  brand?: string | null;
  quantityLabel: string;
  quantityGrams?: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  imageUri?: string | null;
  source: FoodProductSource;
  verifiedAt?: string | null;
}
