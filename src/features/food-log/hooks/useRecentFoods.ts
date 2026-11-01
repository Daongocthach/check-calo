import { useMemo } from 'react';
import { listRecentFoodsPage } from '../services/recentFoodRepository';
import { matchesFoodSearch, mentionsFood } from '../utils/foodSearch';
import { useFoodLogQuery } from './useFoodLogQuery';

const RECENT_FOODS_LIMIT = 10;
/** Foods searched while typing; one row per food, so this covers months of logging. */
const RECENT_FOODS_SEARCH_POOL = 300;

async function loadRecentFoods() {
  const page = await listRecentFoodsPage({ pageSize: RECENT_FOODS_SEARCH_POOL });
  return page.items;
}

/** Every recently logged food the chat searches, newest first; `null` until loaded. */
export function useRecentFoodPool() {
  return useFoodLogQuery('recent-foods', loadRecentFoods).data;
}

/**
 * Logged foods for one-tap re-logging from the chat, which skips the AI. With `search`, only the
 * foods that match what is being typed; otherwise the latest ones.
 */
export function useRecentFoods(search = '') {
  const data = useRecentFoodPool();

  return useMemo(() => {
    const foods = data ?? [];
    const matches = search.trim()
      ? foods.filter(
          (food) => matchesFoodSearch(food.name, search) || mentionsFood(search, food.name)
        )
      : foods;

    return matches.slice(0, RECENT_FOODS_LIMIT);
  }, [data, search]);
}
