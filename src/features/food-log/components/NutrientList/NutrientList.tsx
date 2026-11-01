import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { ProgressBar, Text } from '@/common/components';
import type { ColorScheme } from '@/common/components/shared.types';
import { NUTRIENT_UNIT_KEYS, NUTRIENTS, type NutrientDefinition } from '../../constants';
import type { NutrientValues } from '../../types';
import { formatNutrientAmount } from '../../utils/format';

export interface NutrientListProps {
  values: NutrientValues;
}

function getBarScheme(nutrient: NutrientDefinition, percent: number): ColorScheme {
  if (nutrient.direction === 'goal') {
    return 'success';
  }

  return percent >= 100 ? 'error' : 'warning';
}

/**
 * Fiber, sugar, sodium and the other tracked nutrients, each with its share of the daily
 * reference value. Unknown values show a dash instead of 0.
 */
export function NutrientList({ values }: NutrientListProps) {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.container}>
      {NUTRIENTS.map((nutrient) => {
        const value = values[nutrient.key];
        const percent = value === null ? 0 : Math.round((value / nutrient.dailyValue) * 100);
        const unit = t(NUTRIENT_UNIT_KEYS[nutrient.unit]);

        return (
          <View key={nutrient.key} style={styles.row}>
            <View style={styles.header}>
              <Text variant="bodySmall" style={styles.label}>
                {t(`nutrients.${nutrient.key}`)}
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {value === null
                  ? t('nutrients.unknown')
                  : `${formatNutrientAmount(value, nutrient.unit, i18n.language)} ${unit}`}
              </Text>
              <Text variant="caption" color="tertiary" align="right" style={styles.percent}>
                {value === null ? '' : `${percent}%`}
              </Text>
            </View>
            <ProgressBar
              size="sm"
              value={percent}
              colorScheme={getBarScheme(nutrient, percent)}
              accessibilityLabel={t(`nutrients.${nutrient.key}`)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.metrics.spacingV.p12,
  },
  row: {
    gap: theme.metrics.spacingV.p4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.metrics.spacing.p8,
  },
  label: {
    flex: 1,
  },
  percent: {
    minWidth: theme.metrics.spacing.p40,
  },
}));
