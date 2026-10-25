import { useLocalSearchParams } from 'expo-router';
import { MealDetailScreen } from '@/features/food-log/components';

export default function MealDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <MealDetailScreen entryId={id} />;
}
