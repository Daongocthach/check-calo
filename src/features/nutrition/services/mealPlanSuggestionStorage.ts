import { STORAGE_KEYS } from '@/utils/storage/constants';
import { getItem, setItem } from '@/utils/storage/storage';
import type { StorageValue } from '@/utils/storage/types';
import { nowIsoString } from '../utils/calorie';
import type { MealPlanCriterion, MealPlanSuggestionItem } from './geminiMealPlanSuggestions';

export interface MealPlanSuggestionSnapshot {
  createdAt: string;
  noteText?: string;
  preferRecentFoods?: boolean;
  availableIngredients?: string;
  contraindications?: string;
  criteria?: MealPlanCriterion[];
  locale: string;
  suggestions: MealPlanSuggestionItem[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMealPlanCriterion(value: unknown): value is MealPlanCriterion {
  return value === 'quick' || value === 'cheap' || value === 'satiating' || value === 'protein';
}

function isSuggestionItem(value: unknown): value is MealPlanSuggestionItem['item'] {
  if (!isObject(value)) {
    return false;
  }

  return (
    (typeof value.sourceKey === 'string' ||
      value.sourceKey === null ||
      value.sourceKey === undefined) &&
    typeof value.title === 'string' &&
    typeof value.quantityLabel === 'string' &&
    (typeof value.quantityGrams === 'number' || value.quantityGrams === null) &&
    typeof value.totalCalories === 'number' &&
    typeof value.proteinGrams === 'number' &&
    typeof value.carbsGrams === 'number' &&
    typeof value.fatGrams === 'number' &&
    (typeof value.notes === 'string' || value.notes === null || value.notes === undefined) &&
    (typeof value.imageUri === 'string' ||
      value.imageUri === null ||
      value.imageUri === undefined) &&
    (typeof value.thumbnailUri === 'string' ||
      value.thumbnailUri === null ||
      value.thumbnailUri === undefined) &&
    (typeof value.servings === 'number' || value.servings === null || value.servings === undefined)
  );
}

function isMealPlanSuggestion(value: unknown): value is MealPlanSuggestionItem {
  if (!isObject(value)) {
    return false;
  }

  return (
    (value.mealType === 'breakfast' ||
      value.mealType === 'lunch' ||
      value.mealType === 'dinner' ||
      value.mealType === 'snack' ||
      value.mealType === 'other') &&
    isSuggestionItem(value.item)
  );
}

function isMealPlanSuggestionSnapshot(value: unknown): value is MealPlanSuggestionSnapshot {
  if (!isObject(value)) {
    return false;
  }

  const hasNoteText = typeof value.noteText === 'string';
  const hasLegacyFields =
    typeof value.preferRecentFoods === 'boolean' &&
    typeof value.availableIngredients === 'string' &&
    typeof value.contraindications === 'string' &&
    Array.isArray(value.criteria) &&
    value.criteria.every(isMealPlanCriterion);

  return (
    typeof value.createdAt === 'string' &&
    typeof value.locale === 'string' &&
    Array.isArray(value.suggestions) &&
    value.suggestions.every(isMealPlanSuggestion) &&
    (hasNoteText || hasLegacyFields)
  );
}

export function loadMealPlanSuggestionSnapshot(): MealPlanSuggestionSnapshot | null {
  const result = getItem<StorageValue>(STORAGE_KEYS.app.mealPlanSuggestionLast);

  if (!result.success || result.data === null || !isMealPlanSuggestionSnapshot(result.data)) {
    return null;
  }

  return result.data;
}

export function saveMealPlanSuggestionSnapshot(input: {
  noteText: string;
  locale: string;
  suggestions: MealPlanSuggestionItem[];
}): MealPlanSuggestionSnapshot {
  const snapshot: MealPlanSuggestionSnapshot = {
    createdAt: nowIsoString(),
    noteText: input.noteText,
    locale: input.locale,
    suggestions: input.suggestions,
  };

  setItem(STORAGE_KEYS.app.mealPlanSuggestionLast, snapshot);
  return snapshot;
}
