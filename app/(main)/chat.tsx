import { FoodChatScreen } from '@/features/food-log/components';
import { ModalScreenOverlays } from '@/providers/ModalScreenOverlays';

export default function ChatRoute() {
  // Chat is a native form sheet (see the main stack layout), so it needs its own overlay hosts.
  return (
    <ModalScreenOverlays>
      <FoodChatScreen />
    </ModalScreenOverlays>
  );
}
