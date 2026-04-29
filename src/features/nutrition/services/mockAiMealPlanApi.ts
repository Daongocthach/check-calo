import type { MealType, UserProfile } from '@/features/nutrition/types';
import type { ManualMealItemInput } from './manualMealsDatabase';

export type MealPlanCriterion = 'quick' | 'cheap' | 'satiating' | 'protein';

export interface MockAiMealPlanRequest {
  selectedDateIso: string;
  targetMealType?: MealType;
  preferRecentFoods: boolean;
  availableIngredients: string;
  contraindications: string;
  criteria: MealPlanCriterion[];
  profile: UserProfile | null;
  locale: string;
}

export interface MockAiMealPlanSuggestion {
  mealType: MealType;
  item: ManualMealItemInput;
}

const MOCK_API_DELAY_MS = 900;

const VI_PLAN: Record<Exclude<MealType, 'other'>, ManualMealItemInput> = {
  breakfast: {
    sourceKey: 'mock-ai-breakfast',
    title: 'Yến mạch sữa chua trứng luộc',
    quantityLabel: '1 phần',
    quantityGrams: 320,
    totalCalories: 430,
    proteinGrams: 27,
    carbsGrams: 48,
    fatGrams: 14,
    notes: 'Gợi ý mock từ AI cho bữa sáng.',
  },
  lunch: {
    sourceKey: 'mock-ai-lunch',
    title: 'Cơm gạo lứt ức gà rau luộc',
    quantityLabel: '1 hộp',
    quantityGrams: 450,
    totalCalories: 620,
    proteinGrams: 46,
    carbsGrams: 68,
    fatGrams: 16,
    notes: 'Gợi ý mock từ AI cho bữa trưa.',
  },
  dinner: {
    sourceKey: 'mock-ai-dinner',
    title: 'Cá hồi áp chảo khoai lang salad',
    quantityLabel: '1 đĩa',
    quantityGrams: 390,
    totalCalories: 560,
    proteinGrams: 38,
    carbsGrams: 42,
    fatGrams: 24,
    notes: 'Gợi ý mock từ AI cho bữa tối.',
  },
  snack: {
    sourceKey: 'mock-ai-snack',
    title: 'Chuối và sữa chua Hy Lạp',
    quantityLabel: '1 phần nhỏ',
    quantityGrams: 220,
    totalCalories: 230,
    proteinGrams: 18,
    carbsGrams: 34,
    fatGrams: 3,
    notes: 'Gợi ý mock từ AI cho bữa phụ.',
  },
};

const EN_PLAN: Record<Exclude<MealType, 'other'>, ManualMealItemInput> = {
  breakfast: {
    sourceKey: 'mock-ai-breakfast',
    title: 'Oats with yogurt and boiled eggs',
    quantityLabel: '1 serving',
    quantityGrams: 320,
    totalCalories: 430,
    proteinGrams: 27,
    carbsGrams: 48,
    fatGrams: 14,
    notes: 'Mock AI suggestion for breakfast.',
  },
  lunch: {
    sourceKey: 'mock-ai-lunch',
    title: 'Brown rice with chicken breast and greens',
    quantityLabel: '1 box',
    quantityGrams: 450,
    totalCalories: 620,
    proteinGrams: 46,
    carbsGrams: 68,
    fatGrams: 16,
    notes: 'Mock AI suggestion for lunch.',
  },
  dinner: {
    sourceKey: 'mock-ai-dinner',
    title: 'Pan-seared salmon with sweet potato salad',
    quantityLabel: '1 plate',
    quantityGrams: 390,
    totalCalories: 560,
    proteinGrams: 38,
    carbsGrams: 42,
    fatGrams: 24,
    notes: 'Mock AI suggestion for dinner.',
  },
  snack: {
    sourceKey: 'mock-ai-snack',
    title: 'Banana with Greek yogurt',
    quantityLabel: '1 small serving',
    quantityGrams: 220,
    totalCalories: 230,
    proteinGrams: 18,
    carbsGrams: 34,
    fatGrams: 3,
    notes: 'Mock AI suggestion for snack.',
  },
};

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getPlan(locale: string) {
  return locale.startsWith('vi') ? VI_PLAN : EN_PLAN;
}

function adjustForCriteria(
  item: ManualMealItemInput,
  criteria: MealPlanCriterion[],
  profile: UserProfile | null
): ManualMealItemInput {
  const proteinBoost = criteria.includes('protein') ? 8 : 0;
  const calorieTarget = profile?.dailyCalorieTarget ?? 0;
  const shouldKeepLighter = calorieTarget > 0 && calorieTarget < 1800;
  const satiatingAdjustment = criteria.includes('satiating') ? 60 : 0;
  const calorieAdjustment = shouldKeepLighter ? -40 : satiatingAdjustment;

  return {
    ...item,
    sourceKey: `${item.sourceKey}-${Date.now()}`,
    totalCalories: Math.max(120, item.totalCalories + calorieAdjustment),
    proteinGrams: item.proteinGrams + proteinBoost,
  };
}

export async function generateMockAiMealPlanSuggestions({
  targetMealType,
  criteria,
  profile,
  locale,
}: MockAiMealPlanRequest): Promise<MockAiMealPlanSuggestion[]> {
  await delay(MOCK_API_DELAY_MS);

  const plan = getPlan(locale);
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const requestedMealTypes = targetMealType ? [targetMealType] : mealTypes;

  return requestedMealTypes.map((mealType) => ({
    mealType,
    item: adjustForCriteria(plan[mealType === 'other' ? 'snack' : mealType], criteria, profile),
  }));
}
