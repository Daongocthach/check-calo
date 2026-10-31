import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import { FoodEntryCard } from '@/features/food-log/components';
import type { FoodEntry } from '@/features/food-log/types';

export interface MealsGridProps {
  entries: FoodEntry[];
  onEntryPress: (entry: FoodEntry) => void;
}

function chunkPairs<T>(items: T[]) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

export function MealsGrid({ entries, onEntryPress }: MealsGridProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
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
      {chunkPairs(entries).map((row) => (
        <View key={row.map((entry) => entry.id).join('-')} style={styles.row}>
          {row.map((entry) => (
            <FoodEntryCard key={entry.id} entry={entry} onPress={onEntryPress} />
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
