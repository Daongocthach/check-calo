import { Image } from 'expo-image';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import FALLBACK_MEAL_IMAGE from '../../../../../assets/fallback-meal.webp';
import type { FoodEntry } from '../../types';
import { formatTime } from '../../utils/format';

export interface FoodEntryCardProps {
  entry: FoodEntry;
  onPress: (entry: FoodEntry) => void;
}

/** Photo card for one logged food on the Home grid. */
export const FoodEntryCard = memo(({ entry, onPress }: FoodEntryCardProps) => {
  const { t, i18n } = useTranslation();
  const cover = entry.thumbnailUri ?? entry.imageUri;

  return (
    <Pressable
      onPress={() => onPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={`${entry.mealName}, ${Math.round(entry.totalCalories)} ${t('common.units.kcal')}`}
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
            {entry.mealName}
          </Text>
          <Text variant="caption" color="tertiary">
            {formatTime(entry.consumedAt, i18n.language)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text variant="h3" weight="bold">
            {Math.round(entry.totalCalories)}
            <Text variant="caption" color="tertiary">
              {` ${t('common.units.kcal')}`}
            </Text>
          </Text>
          <Icon name="ellipsis-horizontal" variant="secondary" size={18} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    padding: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
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
    borderRadius: theme.metrics.borderRadius.lg,
  },
  body: {
    paddingHorizontal: theme.metrics.spacing.p4,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p4,
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
