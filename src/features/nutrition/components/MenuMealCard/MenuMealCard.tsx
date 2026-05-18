import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon } from '@/common/components';
import { HomeMealCard } from '@/features/nutrition/components/HomeMealCard';
import { QuantitySelector } from '@/features/nutrition/components/QuantitySelector';
import type { ManualMealItem } from '@/features/nutrition/services/manualMealsDatabase';

interface MenuMealCardProps {
  item: ManualMealItem;
  onPress: () => void;
  onDelete: () => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  proteinTargetGrams?: number;
  carbsTargetGrams?: number;
  fatTargetGrams?: number;
  deleteLabel: string;
  decreaseQuantityLabel: string;
  increaseQuantityLabel: string;
}

function toHomeMenuItem(item: ManualMealItem) {
  const servings = Math.max(1, item.servings);
  const quantityGrams =
    item.quantityGrams !== null && item.quantityGrams !== undefined
      ? item.quantityGrams * servings
      : null;

  return {
    title: item.title,
    quantityLabel: item.quantityLabel,
    quantityGrams,
    totalCalories: item.totalCalories * servings,
    proteinGrams: item.proteinGrams * servings,
    carbsGrams: item.carbsGrams * servings,
    fatGrams: item.fatGrams * servings,
    imageUri: item.imageUri,
    thumbnailUri: item.thumbnailUri,
    devSyncBadgeLabel: null,
    isRecent: false,
  };
}

function DeleteButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={styles.deleteButton}
    >
      <Icon name="trash-outline" size={18} destructive />
    </Pressable>
  );
}

export function MenuMealCard({
  item,
  onPress,
  onDelete,
  onDecreaseQuantity,
  onIncreaseQuantity,
  deleteLabel,
  decreaseQuantityLabel,
  increaseQuantityLabel,
  proteinTargetGrams,
  carbsTargetGrams,
  fatTargetGrams,
}: MenuMealCardProps) {
  const cardItem = toHomeMenuItem(item);

  return (
    <View style={styles.cardWrap}>
      <HomeMealCard.Root item={cardItem} onPress={onPress}>
        <HomeMealCard.Preview />
        <HomeMealCard.Content>
          <HomeMealCard.Header>
            <DeleteButton label={deleteLabel} onPress={onDelete} />
          </HomeMealCard.Header>
          <HomeMealCard.Macros
            proteinTargetGrams={proteinTargetGrams}
            carbsTargetGrams={carbsTargetGrams}
            fatTargetGrams={fatTargetGrams}
          />
          <QuantitySelector
            value={item.servings}
            minValue={1}
            decreaseLabel={decreaseQuantityLabel}
            increaseLabel={increaseQuantityLabel}
            onDecrease={onDecreaseQuantity}
            onIncrease={onIncreaseQuantity}
            style={styles.quantityRow}
            stepperStyle={styles.quantityStepper}
          />
        </HomeMealCard.Content>
      </HomeMealCard.Root>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  cardWrap: {
    width: '100%',
  },
  deleteButton: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  quantityRow: {
    width: '100%',
    justifyContent: 'flex-end',
    paddingBottom: theme.metrics.spacingV.p4,
  },
  quantityStepper: {
    alignSelf: 'flex-end',
    width: theme.metrics.spacing.p100,
    paddingHorizontal: theme.metrics.spacing.p4,
    paddingVertical: theme.metrics.spacingV.p4,
    justifyContent: 'space-between',
    gap: 0,
  },
}));
