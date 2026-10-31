import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, AVATAR_SIZES } from '@/common/components';
import { useBuddyName } from '../../hooks/useBuddyName';
import { useBuddyProgress } from '../../hooks/useBuddyProgress';
import { BuddyMascot } from '../BuddyMascot';

export interface BuddyAvatarProps {
  onPress: () => void;
}

/** The pet at its current level in a round frame; stands in for the user avatar in headers. */
export function BuddyAvatar({ onPress }: BuddyAvatarProps) {
  const { t } = useTranslation();
  const { name } = useBuddyName();
  const { progress } = useBuddyProgress();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('buddy.openBuddy', { name })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Avatar
        size="lg"
        tone="muted"
        icon={<BuddyMascot level={progress?.current.level ?? 1} size={AVATAR_SIZES.lg} />}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
});
