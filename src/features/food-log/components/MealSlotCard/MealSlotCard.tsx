import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import FALLBACK_MEAL_IMAGE from '../../../../../assets/fallback-meal.png';
import { formatTime } from '../../utils/format';
import type { MealSlotGroup } from '../../utils/mealSlot';

export interface MealSlotCardProps {
  group: MealSlotGroup;
  onPress: () => void;
}

/** Photo card for one meal slot (breakfast, lunch...) on the Home grid. */
export function MealSlotCard({ group, onPress }: MealSlotCardProps) {
  const { t, i18n } = useTranslation();
  const cover = group.coverEntry.thumbnailUri ?? group.coverEntry.imageUri;
  const names = group.entries.map((entry) => entry.mealName).join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(`mealSlots.${group.slot}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image
        source={cover ? { uri: cover } : FALLBACK_MEAL_IMAGE}
        style={styles.image}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text variant="body" weight="bold" numberOfLines={1} style={styles.flex}>
            {t(`mealSlots.${group.slot}`)}
          </Text>
          <Text variant="caption" color="tertiary">
            {formatTime(group.firstConsumedAt, i18n.language)}
          </Text>
        </View>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {names}
        </Text>
        <View style={styles.row}>
          <Text variant="h3" weight="bold">
            {group.totalCalories}
            <Text variant="caption" color="tertiary">
              {` ${t('common.units.kcal')}`}
            </Text>
          </Text>
          <Icon name="ellipsis-horizontal" variant="secondary" size={18} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: theme.colors.shadow.elevationSmall,
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: '100%',
    aspectRatio: 1.15,
  },
  body: {
    padding: theme.metrics.spacing.p12,
    gap: theme.metrics.spacingV.p4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  flex: {
    flex: 1,
  },
}));
