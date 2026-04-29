import { create } from 'zustand';

interface MealPlanSuggestionSheetState {
  sheetState: 'closed' | 'opening' | 'open';
  requestOpen: () => void;
  setSheetState: (sheetState: MealPlanSuggestionSheetState['sheetState']) => void;
}

export const useMealPlanSuggestionSheetStore = create<MealPlanSuggestionSheetState>((set) => ({
  sheetState: 'closed',
  requestOpen: () =>
    set((state) => (state.sheetState === 'closed' ? { sheetState: 'opening' } : state)),
  setSheetState: (sheetState) => set({ sheetState }),
}));
