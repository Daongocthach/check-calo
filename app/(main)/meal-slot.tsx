import { useLocalSearchParams } from 'expo-router';
import { MealSlotScreen } from '@/features/food-log/components';
import { MEAL_SLOTS, type MealSlot } from '@/features/food-log/utils/mealSlot';
import { formatDateKey } from '@/utils/date';

function toMealSlot(value: string | undefined): MealSlot {
  return MEAL_SLOTS.find((slot) => slot === value) ?? 'snack';
}

export default function MealSlotRoute() {
  const { date, slot } = useLocalSearchParams<{ date?: string; slot?: string }>();

  return <MealSlotScreen date={date ?? formatDateKey(new Date())} slot={toMealSlot(slot)} />;
}
