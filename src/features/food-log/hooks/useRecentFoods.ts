import { listRecentFoodsPage } from '../services/recentFoodRepository';
import { useFoodLogQuery } from './useFoodLogQuery';

const RECENT_FOODS_LIMIT = 10;

async function loadRecentFoods() {
  const page = await listRecentFoodsPage({ pageSize: RECENT_FOODS_LIMIT });
  return page.items;
}

/** Most recently logged foods, for one-tap re-logging from the chat. */
export function useRecentFoods() {
  return useFoodLogQuery('recent-foods', loadRecentFoods);
}
