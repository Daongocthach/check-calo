import { create } from 'zustand';

interface FoodEntryRefreshState {
  refreshRevision: number;
  menuRefreshRevision: number;
  recentFoodsRefreshRevision: number;
  markFoodEntriesChanged: () => void;
  markMenuMealsChanged: () => void;
  markRecentFoodsChanged: () => void;
}

export const useFoodEntryRefreshStore = create<FoodEntryRefreshState>((set) => ({
  refreshRevision: 0,
  menuRefreshRevision: 0,
  recentFoodsRefreshRevision: 0,
  markFoodEntriesChanged: () =>
    set((state) => ({
      refreshRevision: state.refreshRevision + 1,
    })),
  markMenuMealsChanged: () =>
    set((state) => ({
      menuRefreshRevision: state.menuRefreshRevision + 1,
    })),
  markRecentFoodsChanged: () =>
    set((state) => ({
      recentFoodsRefreshRevision: state.recentFoodsRefreshRevision + 1,
    })),
}));
