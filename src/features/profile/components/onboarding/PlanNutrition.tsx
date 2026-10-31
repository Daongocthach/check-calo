import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import { CalorieGauge } from '@/features/food-log/components';
import type { ProfilePlan } from '../../hooks/useProfileForm';

interface PlanNutritionProps {
  plan: ProfilePlan;
  maintenanceCalories: number;
}

export function PlanNutrition({ plan, maintenanceCalories }: PlanNutritionProps) {
  const { t, i18n } = useTranslation();
  const [width, setWidth] = useState(240);
  const format = (value: number) => new Intl.NumberFormat(i18n.language).format(Math.round(value));
  const macros = [
    { key: 'carbs', value: plan.carbsGrams },
    { key: 'protein', value: plan.proteinGrams },
    { key: 'fat', value: plan.fatGrams },
  ] as const;
  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const available = event.nativeEvent.layout.width;
        if (available > 0) setWidth(Math.min(310, available));
      }}
    >
      <View style={styles.gaugeWidth(width)}>
        <CalorieGauge
          consumed={plan.dailyCalories}
          target={plan.dailyCalories}
          range={plan.calorieRange}
          state="on_target"
          appearance="primary"
          width={width}
          maximumValue={maintenanceCalories}
          label={t('onboarding.planResults.daily')}
        />
      </View>
      <View style={styles.macros}>
        {macros.map((macro) => (
          <View key={macro.key} style={styles.macro}>
            <View style={[styles.bar, styles[macro.key]]} />
            <Text variant="body" weight="bold" align="center">
              {format(macro.value)} {t('common.units.gram')}
            </Text>
            <Text variant="caption" color="secondary" align="center">
              {t(`macros.${macro.key}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.metrics.spacingV.p12 },
  gaugeWidth: (width: number) => ({ width, alignSelf: 'center' as const }),
  macros: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  macro: { flex: 1, minWidth: 0, gap: theme.metrics.spacingV.p4 },
  bar: { height: theme.metrics.spacingV.p4, borderRadius: theme.metrics.borderRadius.full },
  carbs: { backgroundColor: theme.colors.state.info },
  protein: { backgroundColor: theme.colors.brand.primary },
  fat: { backgroundColor: theme.colors.state.warning },
}));
