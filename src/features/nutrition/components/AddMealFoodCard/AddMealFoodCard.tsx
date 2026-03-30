import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Icon, Text } from '@/common/components';
import { FoodImagePreview } from '@/features/nutrition/components/FoodImagePreview';

export interface AddMealFoodCardProps {
  title: string;
  quantityDisplay?: string;
  imageUri?: string | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  servings: number;
  proteinLabel: string;
  carbsLabel: string;
  fatLabel: string;
  gramUnit: string;
  kcalUnit: string;
  increaseLabel: string;
  decreaseLabel: string;
  onIncrease: () => void;
  onDecrease: () => void;
}

export function AddMealFoodCard({
  title,
  quantityDisplay,
  imageUri,
  totalCalories,
  proteinGrams,
  carbsGrams,
  fatGrams,
  servings,
  proteinLabel,
  carbsLabel,
  fatLabel,
  gramUnit,
  kcalUnit,
  increaseLabel,
  decreaseLabel,
  onIncrease,
  onDecrease,
}: AddMealFoodCardProps) {
  return (
    <Card variant="filled" style={styles.card}>
      <FoodImagePreview imageUri={imageUri} style={styles.imageWrap}>
        <View style={styles.caloriesBadge}>
          <Text variant="caption" weight="semibold" color="inverse">
            {`${Math.round(totalCalories)} ${kcalUnit}`}
          </Text>
        </View>
      </FoodImagePreview>

      <View style={styles.copy}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {quantityDisplay ? `${title} (${quantityDisplay})` : title}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="caption" color="secondary">
            {`${proteinLabel} ${Math.round(proteinGrams)}${gramUnit}`}
          </Text>
          <Text variant="caption" color="secondary">
            {`${carbsLabel} ${Math.round(carbsGrams)}${gramUnit}`}
          </Text>
          <Text variant="caption" color="secondary">
            {`${fatLabel} ${Math.round(fatGrams)}${gramUnit}`}
          </Text>
        </View>
      </View>

      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decreaseLabel}
          style={styles.stepperButton}
          onPress={onDecrease}
        >
          <Icon name="remove" variant="primary" size={16} />
        </Pressable>
        <Text variant="bodySmall" weight="semibold">
          {servings}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={increaseLabel}
          style={styles.stepperButton}
          onPress={onIncrease}
        >
          <Icon name="add" variant="primary" size={16} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  imageWrap: {
    width: theme.metrics.spacing.p56,
    height: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.md,
  },
  caloriesBadge: {
    position: 'absolute',
    left: theme.metrics.spacing.p4,
    right: theme.metrics.spacing.p4,
    bottom: theme.metrics.spacingV.p4,
    paddingHorizontal: theme.metrics.spacing.p4,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
  copy: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  stepperButton: {
    width: theme.metrics.spacing.p28,
    height: theme.metrics.spacing.p28,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
}));
