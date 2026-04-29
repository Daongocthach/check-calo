import { create } from 'zustand';

interface MealPlanSuggestionSheetState {
  openRequestId: number;
  sheetState: 'closed' | 'opening' | 'open';
  requestOpen: () => void;
  setSheetState: (sheetState: MealPlanSuggestionSheetState['sheetState']) => void;
}

export const useMealPlanSuggestionSheetStore = create<MealPlanSuggestionSheetState>((set) => ({
  openRequestId: 0,
  sheetState: 'closed',
  requestOpen: () =>
    set((state) =>
      state.sheetState === 'closed'
        ? { openRequestId: state.openRequestId + 1, sheetState: 'opening' }
        : state
    ),
  setSheetState: (sheetState) => set({ sheetState }),
}));
