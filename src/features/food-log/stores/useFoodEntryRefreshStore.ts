import { create } from 'zustand';

interface FoodEntryRefreshState {
  refreshRevision: number;
  markFoodEntriesChanged: () => void;
}

/** Bumped after any local write so screens reading SQLite reload their data. */
export const useFoodEntryRefreshStore = create<FoodEntryRefreshState>((set) => ({
  refreshRevision: 0,
  markFoodEntriesChanged: () =>
    set((state) => ({
      refreshRevision: state.refreshRevision + 1,
    })),
}));
