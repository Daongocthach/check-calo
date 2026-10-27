import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import { MealSlotCard } from '@/features/food-log/components';
import type { MealSlotGroup } from '@/features/food-log/utils/mealSlot';

export interface MealsGridProps {
  groups: MealSlotGroup[];
  onGroupPress: (group: MealSlotGroup) => void;
}

function chunkPairs<T>(items: T[]) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

export function MealsGrid({ groups, onGroupPress }: MealsGridProps) {
  const { t } = useTranslation();

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="body" weight="semibold" align="center">
          {t('home.emptyTitle')}
        </Text>
        <Text variant="bodySmall" color="secondary" align="center">
          {t('home.emptySubtitle')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {chunkPairs(groups).map((row) => (
        <View key={row.map((group) => group.slot).join('-')} style={styles.row}>
          {row.map((group) => (
            <MealSlotCard key={group.slot} group={group} onPress={() => onGroupPress(group)} />
          ))}
          {row.length === 1 ? <View style={styles.spacer} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.metrics.spacingV.p12,
  },
  row: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  spacer: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p24,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border.strong,
  },
}));
