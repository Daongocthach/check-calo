import { create } from 'zustand';

interface AddMealSourceSheetState {
  openRequestId: number;
  requestOpen: () => void;
}

export const useAddMealSourceSheetStore = create<AddMealSourceSheetState>((set) => ({
  openRequestId: 0,
  requestOpen: () =>
    set((state) => ({
      openRequestId: state.openRequestId + 1,
    })),
}));
