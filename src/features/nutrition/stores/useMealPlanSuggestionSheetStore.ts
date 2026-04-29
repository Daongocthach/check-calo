import { create } from 'zustand';
import type { MealType } from '@/features/nutrition/types';

export interface MealPlanSuggestionSheetPayload {
  selectedDateIso: string;
  mealLocalId?: string;
  mealType?: MealType;
}

interface MealPlanSuggestionSheetState {
  sheetState: 'closed' | 'opening' | 'open';
  payload: MealPlanSuggestionSheetPayload | null;
  generationRevision: number;
  requestOpen: (payload?: MealPlanSuggestionSheetPayload) => void;
  markGenerated: () => void;
  setSheetState: (sheetState: MealPlanSuggestionSheetState['sheetState']) => void;
}

export const useMealPlanSuggestionSheetStore = create<MealPlanSuggestionSheetState>((set) => ({
  sheetState: 'closed',
  payload: null,
  generationRevision: 0,
  requestOpen: (payload) =>
    set((state) =>
      state.sheetState === 'closed' ? { sheetState: 'opening', payload: payload ?? null } : state
    ),
  markGenerated: () => set((state) => ({ generationRevision: state.generationRevision + 1 })),
  setSheetState: (sheetState) => set({ sheetState }),
}));
