import { create } from 'zustand';

export interface AddMealSourceSheetPayload {
  context?: 'addMeal' | 'menuMeal';
  mealLocalId?: string;
}

interface AddMealSourceSheetState {
  openRequestId: number;
  sheetState: 'closed' | 'opening' | 'open';
  payload: AddMealSourceSheetPayload | null;
  requestOpen: (payload?: AddMealSourceSheetPayload) => void;
  setSheetState: (sheetState: AddMealSourceSheetState['sheetState']) => void;
}

export const useAddMealSourceSheetStore = create<AddMealSourceSheetState>((set) => ({
  openRequestId: 0,
  sheetState: 'closed',
  payload: null,
  requestOpen: (payload) =>
    set((state) =>
      state.sheetState === 'closed'
        ? {
            openRequestId: state.openRequestId + 1,
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
