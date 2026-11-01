import { useLocalSearchParams } from 'expo-router';
import { BuddyAxisDetailScreen } from '@/features/buddy';

export default function BuddyStatRoute() {
  const { axis } = useLocalSearchParams<{ axis: string }>();

  return <BuddyAxisDetailScreen axis={axis} />;
}
