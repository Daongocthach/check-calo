import { create } from 'zustand';

export interface AddMealSourceSheetPayload {
  context?: 'addMeal' | 'menuMeal' | 'recentFood';
  mealLocalId?: string;
}

interface AddMealSourceSheetState {
  sheetState: 'closed' | 'opening' | 'open';
  payload: AddMealSourceSheetPayload | null;
  requestOpen: (payload?: AddMealSourceSheetPayload) => void;
  setSheetState: (sheetState: AddMealSourceSheetState['sheetState']) => void;
}

export const useAddMealSourceSheetStore = create<AddMealSourceSheetState>((set) => ({
  sheetState: 'closed',
  payload: null,
  requestOpen: (payload) =>
    set((state) =>
      state.sheetState === 'closed'
        ? {
            sheetState: 'opening',
            payload: payload ?? null,
          }
        : state
    ),
  setSheetState: (sheetState) =>
    set((state) =>
      sheetState === 'closed' ? { sheetState, payload: null } : { ...state, sheetState }
    ),
}));
