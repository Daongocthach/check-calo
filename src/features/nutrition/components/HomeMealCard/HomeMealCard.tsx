import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Icon, Text } from '@/common/components';
import type { FoodEntry } from '@/features/nutrition/types';

interface HomeMealCardProps {
  meal: FoodEntry;
  onPress: () => void;
  onToggleFavorite: () => void | Promise<void>;
}

function getQuantityDisplay(meal: FoodEntry, gramUnit: string) {
  if (typeof meal.quantityGrams === 'number' && !Number.isNaN(meal.quantityGrams)) {
    return `${Math.round(meal.quantityGrams)} ${gramUnit}`;
  }

  return meal.quantityLabel;
}

function getPreviewStyle(entry: FoodEntry) {
  if (entry.proteinGrams >= entry.carbsGrams && entry.proteinGrams >= entry.fatGrams) {
    return {
      icon: 'fish-outline' as const,
      previewStyle: 'nightPreview' as const,
    };
  }

  if (entry.carbsGrams >= entry.fatGrams) {
    return {
      icon: 'nutrition-outline' as const,
      previewStyle: 'sunrisePreview' as const,
    };
  }

  return {
    icon: 'water' as const,
    previewStyle: 'greenPreview' as const,
  };
}

export function HomeMealCard({ meal, onPress, onToggleFavorite }: HomeMealCardProps) {
  const { t } = useTranslation();
  const preview = getPreviewStyle(meal);
  const quantityDisplay = getQuantityDisplay(meal, t('common.units.gram'));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meal.mealName}
      style={styles.mealPressable}
      onPress={onPress}
    >
      <Card variant="elevated" style={styles.mealCard}>
        <View style={styles.mealMainRow}>
          <View style={styles.mealCopy}>
            <View style={styles.mealHeaderRow}>
              <View style={styles.mealTitleBlock}>
                <Text variant="h3">{meal.mealName}</Text>
                <Text variant="caption" color="secondary">
                  {quantityDisplay}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  meal.isFavorite
                    ? t('homeScreen.meals.removeFavorite')
                    : t('homeScreen.meals.addFavorite')
                }
                style={styles.favoriteButton}
                onPress={(event) => {
                  event.stopPropagation();
                  void onToggleFavorite();
                }}
              >
                <Icon
                  name={meal.isFavorite ? 'heart' : 'heart-outline'}
                  size={18}
                  variant={meal.isFavorite ? 'accent' : 'muted'}
                />
              </Pressable>
            </View>

            <View style={styles.macroPanel}>
              <View style={styles.macroColumn}>
                <Text variant="caption" color="secondary">
                  {t('statsScreen.macros.protein')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {`${Math.round(meal.proteinGrams)} ${t('common.units.gram')}`}
                </Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroColumn}>
                <Text variant="caption" color="secondary">
                  {t('statsScreen.macros.carbs')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {`${Math.round(meal.carbsGrams)} ${t('common.units.gram')}`}
                </Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroColumn}>
                <Text variant="caption" color="secondary">
                  {t('statsScreen.macros.fat')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {`${Math.round(meal.fatGrams)} ${t('common.units.gram')}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.mealPreview, styles[preview.previewStyle]]}>
            <View style={styles.previewPlate}>
              <Icon name={preview.icon} variant="inverse" size={28} />
            </View>
            <View style={styles.previewCalories}>
              <Text variant="caption" weight="semibold" color="inverse">
                {`${Math.round(meal.totalCalories)} ${t('common.units.kcal')}`}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  mealPressable: {
    flex: 1,
  },
  mealCard: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  mealMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p12,
  },
  mealCopy: {
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.metrics.spacingV.p8,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  mealTitleBlock: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  favoriteButton: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  macroPanel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
    overflow: 'hidden',
  },
  macroColumn: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
  },
  macroDivider: {
    width: 1,
    backgroundColor: theme.colors.border.subtle,
  },
  mealPreview: {
    width: theme.metrics.spacing.p112,
    minHeight: theme.metrics.spacing.p104,
    borderRadius: theme.metrics.borderRadius.lg,
    padding: theme.metrics.spacing.p8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sunrisePreview: {
    backgroundColor: theme.colors.state.warning,
  },
  greenPreview: {
    backgroundColor: theme.colors.state.success,
  },
  nightPreview: {
    backgroundColor: theme.colors.brand.secondary,
  },
  previewPlate: {
    alignSelf: 'center',
    width: theme.metrics.spacing.p52,
    height: theme.metrics.spacing.p52,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.ripple,
  },
  previewCalories: {
    alignSelf: 'center',
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.overlay.modal,
  },
}));
