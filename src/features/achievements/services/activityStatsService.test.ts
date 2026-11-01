import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  countFoodEntries,
  getFirstEntryDate,
  listDailyNutritionSummaries,
} from '@/features/food-log/services/dailySummaryService';
import type { NutritionTrendPoint } from '@/features/food-log/types';
import { EMPTY_NUTRIENTS } from '@/features/food-log/utils/nutrients';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { getActivityStats } from './activityStatsService';

jest.mock('@/features/food-log/services/dailySummaryService', () => ({
  countFoodEntries: jest.fn(),
  getFirstEntryDate: jest.fn(),
  listDailyNutritionSummaries: jest.fn(),
}));

jest.mock('@/features/profile/services/profileRepository', () => ({
  getUserProfile: jest.fn(),
}));

const mockSummaries = jest.mocked(listDailyNutritionSummaries);

function day(date: string, overrides: Partial<NutritionTrendPoint>): NutritionTrendPoint {
  return {
    date,
    label: date,
    calorieTarget: 2000,
    goalMode: 'maintain',
    consumedCalories: 2000,
    remainingCalories: 0,
    progressPercent: 100,
    proteinGrams: 100,
    carbsGrams: 250,
    fatGrams: 70,
    proteinTargetGrams: 100,
    carbsTargetGrams: 250,
    fatTargetGrams: 70,
    nutrients: EMPTY_NUTRIENTS,
    ...overrides,
  };
}

beforeEach(() => {
  jest.mocked(getFirstEntryDate).mockResolvedValue('2026-10-01');
  jest.mocked(countFoodEntries).mockResolvedValue(2);
  jest.mocked(getUserProfile).mockResolvedValue(null);
});

describe('getActivityStats', () => {
  it("judges protein and balance by each day's own targets", async () => {
    mockSummaries.mockResolvedValue([
      // Planned while losing weight: 150 g protein needed, 100 g eaten.
      day('2026-10-01', { proteinTargetGrams: 150 }),
      // Planned while maintaining: 100 g needed, 100 g eaten.
      day('2026-10-02', {}),
    ]);

    const stats = await getActivityStats();

    expect(stats.loggedDays).toBe(2);
    expect(stats.proteinDays).toBe(1);
    expect(stats.balancedDays).toBe(1);
  });

  it('counts no protein day when the day has no target', async () => {
    mockSummaries.mockResolvedValue([day('2026-10-01', { proteinTargetGrams: 0 })]);

    const stats = await getActivityStats();

    expect(stats.proteinDays).toBe(0);
  });
});
