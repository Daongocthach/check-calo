import { create } from 'zustand';

interface AddMealSourceSheetState {
  openRequestId: number;
  sheetState: 'closed' | 'opening' | 'open';
  requestOpen: () => void;
  setSheetState: (sheetState: AddMealSourceSheetState['sheetState']) => void;
}

export const useAddMealSourceSheetStore = create<AddMealSourceSheetState>((set) => ({
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
