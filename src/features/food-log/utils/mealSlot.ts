export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Maps an eating time to a meal slot using local hours. */
export function getMealSlot(consumedAt: string | Date): MealSlot {
  const hour = new Date(consumedAt).getHours();

  if (hour >= 4 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}
