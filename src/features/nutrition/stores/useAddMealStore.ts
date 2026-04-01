import { create } from 'zustand';
import { createEntityId } from '@/features/nutrition/utils/calorie';

export interface DraftMealItemInput {
  id?: string;
  sourceKey?: string | null;
  title: string;
  quantityLabel: string;
  quantityGrams?: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  imageUri?: string | null;
  thumbnailUri?: string | null;
  servings?: number;
}

export interface DraftMealItem {
  id: string;
  sourceKey: string | null;
  title: string;
  quantityLabel: string;
  quantityGrams: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
  imageUri: string | null;
  thumbnailUri: string | null;
  servings: number;
}

interface AddMealState {
  items: DraftMealItem[];
  addItem: (item: DraftMealItemInput) => void;
  increaseServings: (itemId: string) => void;
  decreaseServings: (itemId: string) => void;
  clearMeal: () => void;
}

function toDraftMealItem(input: DraftMealItemInput): DraftMealItem {
  return {
    id: input.id ?? createEntityId('draft-meal'),
    sourceKey: input.sourceKey ?? null,
    title: input.title,
    quantityLabel: input.quantityLabel,
    quantityGrams: input.quantityGrams ?? null,
    totalCalories: input.totalCalories,
    proteinGrams: input.proteinGrams,
    carbsGrams: input.carbsGrams,
    fatGrams: input.fatGrams,
    notes: input.notes ?? null,
    imageUri: input.imageUri ?? null,
    thumbnailUri: input.thumbnailUri ?? input.imageUri ?? null,
    servings: Math.max(1, input.servings ?? 1),
  };
}

export const useAddMealStore = create<AddMealState>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const sourceKey = item.sourceKey ?? null;

      if (sourceKey) {
        const existingItem = state.items.find((draftItem) => draftItem.sourceKey === sourceKey);

        if (existingItem) {
          return {
            items: state.items.map((draftItem) =>
              draftItem.id === existingItem.id
                ? {
                    ...draftItem,
                    servings: draftItem.servings + Math.max(1, item.servings ?? 1),
                  }
                : draftItem
            ),
          };
        }
      }

      return {
        items: [toDraftMealItem(item), ...state.items],
      };
    }),

  increaseServings: (itemId) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, servings: item.servings + 1 } : item
      ),
    })),

  decreaseServings: (itemId) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.id === itemId ? { ...item, servings: item.servings - 1 } : item))
        .filter((item) => item.servings > 0),
    })),

  clearMeal: () => set({ items: [] }),
}));
