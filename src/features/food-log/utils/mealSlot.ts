import type { FoodEntry } from '../types';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealSlotGroup {
  slot: MealSlot;
  entries: FoodEntry[];
  totalCalories: number;
  /** Time of the earliest entry in the slot, ISO string. */
  firstConsumedAt: string;
  coverEntry: FoodEntry;
}

/** Maps an eating time to a meal slot using local hours. */
export function getMealSlot(consumedAt: string | Date): MealSlot {
  const hour = new Date(consumedAt).getHours();

  if (hour >= 4 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

export function groupEntriesByMealSlot(entries: FoodEntry[]): MealSlotGroup[] {
  const groups = new Map<MealSlot, FoodEntry[]>();

  for (const entry of entries) {
    const slot = getMealSlot(entry.consumedAt);
    groups.set(slot, [...(groups.get(slot) ?? []), entry]);
  }

  return MEAL_SLOTS.flatMap((slot) => {
    const slotEntries = groups.get(slot);

    if (!slotEntries || slotEntries.length === 0) {
      return [];
    }

    const sorted = [...slotEntries].sort((left, right) =>
      left.consumedAt.localeCompare(right.consumedAt)
    );

    return [
      {
        slot,
        entries: sorted,
        totalCalories: Math.round(sorted.reduce((sum, entry) => sum + entry.totalCalories, 0)),
        firstConsumedAt: sorted[0].consumedAt,
        coverEntry: sorted.find((entry) => entry.thumbnailUri || entry.imageUri) ?? sorted[0],
      },
    ];
  });
}
