import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { CircularProgressRing, Text } from '@/common/components';
import { hs } from '@/theme/metrics';

export interface MacroRingsProps {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  /** Daily targets; each ring shows the share of the day this food covers. */
  targets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
}

function toProgress(value: number, target: number) {
  return target > 0 ? Math.min(100, (value / target) * 100) : 0;
}

/** Four rings: calories, protein, carbs, fat — as in the Meal Details design. */
export function MacroRings({
  calories,
  proteinGrams,
  carbsGrams,
  fatGrams,
  targets,
}: MacroRingsProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rings = [
    {
      key: 'calories',
      value: `${Math.round(calories)}`,
      unit: t('common.units.kcal'),
      progress: toProgress(calories, targets.calories),
      color: theme.colors.brand.primary,
    },
    {
      key: 'protein',
      value: `${Math.round(proteinGrams)}`,
      unit: t('common.units.gram'),
      progress: toProgress(proteinGrams, targets.proteinGrams),
      color: theme.colors.state.success,
    },
    {
      key: 'carbs',
      value: `${Math.round(carbsGrams)}`,
      unit: t('common.units.gram'),
      progress: toProgress(carbsGrams, targets.carbsGrams),
      color: theme.colors.state.info,
    },
    {
      key: 'fat',
      value: `${Math.round(fatGrams)}`,
      unit: t('common.units.gram'),
      progress: toProgress(fatGrams, targets.fatGrams),
      color: theme.colors.state.warning,
    },
  ] as const;

  return (
    <View style={styles.row}>
      {rings.map((ring) => (
        <View key={ring.key} style={styles.item}>
          <CircularProgressRing
            progress={ring.progress}
            size={hs(68)}
            strokeWidth={hs(6)}
            trackColor={theme.colors.background.section}
            progressColor={ring.color}
            showCap={false}
          >
            <Text variant="bodySmall" weight="bold">
              {ring.value}
            </Text>
            <Text variant="caption" color="tertiary">
              {ring.unit}
            </Text>
          </CircularProgressRing>
          <Text variant="caption" color="secondary">
            {t(`macros.${ring.key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
  },
}));
