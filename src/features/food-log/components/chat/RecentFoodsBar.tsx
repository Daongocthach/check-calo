import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Chip, Icon } from '@/common/components';
import type { RecentFood } from '../../types';

export interface RecentFoodsBarProps {
  foods: RecentFood[];
  onSelect: (food: RecentFood) => void;
  disabled?: boolean;
}

/** Horizontal row of logged foods; tapping one logs it again without asking the AI. */
export function RecentFoodsBar({ foods, onSelect, disabled = false }: RecentFoodsBarProps) {
  const { t } = useTranslation();

  if (foods.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel={t('chat.recentTitle')}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {foods.map((food) => (
        <Chip
          key={food.id}
          size="sm"
          text={t('chat.recentChip', {
            name: food.name,
            calories: Math.round(food.totalCalories),
          })}
          icon={<Icon name="time-outline" sizeVariant="xs" variant="secondary" />}
          onPress={() => onSelect(food)}
          disabled={disabled}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: {
    // Bleed to the sheet edges so chips scroll under the screen gutter.
    marginHorizontal: -theme.metrics.spacing.p16,
    flexGrow: 0,
  },
  content: {
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
  },
}));
