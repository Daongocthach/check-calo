import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Menu } from '@/common/components';
import { HomeMealCard } from '@/features/nutrition/components/HomeMealCard';
import type { ManualMealItem } from '@/features/nutrition/services/manualMealsDatabase';

interface MenuMealCardProps {
  item: ManualMealItem;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  proteinTargetGrams?: number;
  carbsTargetGrams?: number;
  fatTargetGrams?: number;
  quantityLabel: string;
  editLabel: string;
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
    isFavorite: false,
  };
}

function MoreButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={styles.moreButton}
    >
      <Icon name="ellipsis-vertical" size={18} variant="tertiary" />
    </Pressable>
  );
}

export function MenuMealCard({
  item,
  onPress,
  onEdit,
  onDelete,
  onDecreaseQuantity,
  onIncreaseQuantity,
  editLabel,
  deleteLabel,
  decreaseQuantityLabel,
  increaseQuantityLabel,
  proteinTargetGrams,
  carbsTargetGrams,
  fatTargetGrams,
}: MenuMealCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const cardItem = toHomeMenuItem(item);

  return (
    <View style={styles.cardWrap}>
      <HomeMealCard.Root item={cardItem} onPress={onPress}>
        <HomeMealCard.Preview />
        <HomeMealCard.Content>
          <HomeMealCard.Header>
            <Menu
              visible={menuVisible}
              onDismiss={() => {
                setMenuVisible(false);
              }}
              anchor={
                <MoreButton
                  label={editLabel}
                  onPress={() => {
                    setMenuVisible(true);
                  }}
                />
              }
              items={[
                { label: editLabel, icon: 'create-outline', onPress: onEdit },
                {
                  label: deleteLabel,
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: onDelete,
                },
                {
                  label: decreaseQuantityLabel,
                  icon: 'remove-outline',
                  disabled: item.servings <= 1,
                  onPress: onDecreaseQuantity,
                },
                { label: increaseQuantityLabel, icon: 'add-outline', onPress: onIncreaseQuantity },
              ]}
            />
          </HomeMealCard.Header>
          <HomeMealCard.Macros
            proteinTargetGrams={proteinTargetGrams}
            carbsTargetGrams={carbsTargetGrams}
            fatTargetGrams={fatTargetGrams}
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
  moreButton: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
}));
