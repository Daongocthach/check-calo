import { create } from 'zustand';

interface FoodEntryRefreshState {
  refreshRevision: number;
  markFoodEntriesChanged: () => void;
}

export const useFoodEntryRefreshStore = create<FoodEntryRefreshState>((set) => ({
  refreshRevision: 0,
  markFoodEntriesChanged: () =>
    set((state) => ({
      refreshRevision: state.refreshRevision + 1,
    })),
}));
