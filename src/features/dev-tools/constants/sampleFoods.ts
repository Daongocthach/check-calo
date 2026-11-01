import type { NutrientValues } from '@/features/food-log/types';

/** Prefix for sample diary rows so they can be found and removed without touching real entries. */
export const SAMPLE_ENTRY_ID_PREFIX = 'devsample';

/** Product on Open Food Facts, used when the barcode scan is simulated. */
export const SAMPLE_BARCODE = '3017620422003';

export interface SampleFood {
  name: string;
  quantityLabel: string;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Rough values for the portion, so nutrition quality has something to score. */
  nutrients: Partial<NutrientValues>;
  /** Local clock time the meal is logged at. */
  hour: number;
  minute: number;
}

/** One realistic day of meals; each sample day logs these with small variations. */
export const SAMPLE_DAY: SampleFood[] = [
  {
    name: 'Phở bò',
    quantityLabel: '1 tô',
    quantityGrams: 500,
    calories: 450,
    protein: 28,
    carbs: 55,
    fat: 12,
    nutrients: {
      fiberGrams: 2,
      sugarGrams: 4,
      sodiumMg: 1800,
      saturatedFatGrams: 4,
      cholesterolMg: 60,
    },
    hour: 7,
    minute: 30,
  },
  {
    name: 'Cà phê sữa đá',
    quantityLabel: '1 ly',
    quantityGrams: 200,
    calories: 120,
    protein: 2,
    carbs: 20,
    fat: 4,
    nutrients: {
      fiberGrams: 0,
      sugarGrams: 18,
      sodiumMg: 60,
      saturatedFatGrams: 2.5,
      cholesterolMg: 10,
    },
    hour: 9,
    minute: 0,
  },
  {
    name: 'Cơm gà xối mỡ',
    quantityLabel: '1 đĩa',
    quantityGrams: 450,
    calories: 680,
    protein: 32,
    carbs: 78,
    fat: 25,
    nutrients: {
      fiberGrams: 2,
      sugarGrams: 3,
      sodiumMg: 1100,
      saturatedFatGrams: 7,
      transFatGrams: 0.3,
      cholesterolMg: 120,
    },
    hour: 12,
    minute: 15,
  },
  {
    name: 'Sữa chua',
    quantityLabel: '1 hũ',
    quantityGrams: 100,
    calories: 95,
    protein: 4,
    carbs: 14,
    fat: 3,
    nutrients: {
      fiberGrams: 0,
      sugarGrams: 12,
      sodiumMg: 50,
      saturatedFatGrams: 2,
      cholesterolMg: 10,
    },
    hour: 15,
    minute: 30,
  },
  {
    name: 'Cá hồi áp chảo, salad',
    quantityLabel: '1 phần',
    quantityGrams: 350,
    calories: 520,
    protein: 38,
    carbs: 18,
    fat: 30,
    nutrients: {
      fiberGrams: 5,
      sugarGrams: 6,
      sodiumMg: 550,
      saturatedFatGrams: 5,
      cholesterolMg: 90,
    },
    hour: 19,
    minute: 0,
  },
];
