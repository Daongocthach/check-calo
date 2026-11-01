import { useEffect, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, Text } from '@/common/components';
import { toLocale } from '@/features/food-log/utils/format';
import { BMI_THRESHOLDS, getBmiCategory, type BmiCategory } from '../../utils/bmi';
import { styles } from './BmiCard.styles';

export interface BmiStat {
  label: string;
  value: string;
  secondaryValue?: string;
}

interface BmiCardProps {
  bmi: number;
  /** Rows of figures shown under the BMI scale. */
  stats: BmiStat[][];
  animationPlayed: RefObject<boolean>;
}

const CATEGORIES: BmiCategory[] = ['underweight', 'normal', 'overweight', 'obese'];

function formatRanges(format: (value: number) => string): Record<BmiCategory, string> {
  const { normal, overweight, obese } = BMI_THRESHOLDS;
  const below = (value: number) => format(value - 0.1);

  return {
    underweight: `< ${format(normal)}`,
    normal: `${format(normal)} – ${below(overweight)}`,
    overweight: `${format(overweight)} – ${below(obese)}`,
    obese: `≥ ${format(obese)}`,
  };
}

export function BmiCard({ bmi, stats, animationPlayed }: BmiCardProps) {
  const { t, i18n } = useTranslation();
  const category = getBmiCategory(bmi);
  const bmiNumber = new Intl.NumberFormat(toLocale(i18n.language), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const rangeNumber = new Intl.NumberFormat(toLocale(i18n.language), { maximumFractionDigits: 1 });
  const ranges = formatRanges((value) => rangeNumber.format(value));
  const scale = useSharedValue(1);
  useEffect(() => {
    if (animationPlayed.current) return;
    animationPlayed.current = true;
    scale.value = 0.8;
    scale.value = withTiming(1, { duration: 450 });
  }, [animationPlayed, scale]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.bmiHeader}>
        <View style={styles.bmiNumberRow}>
          <Text variant="label">{t('onboarding.bmi')}</Text>
          <Text variant="h2" weight="bold">
            {bmiNumber.format(bmi)}
          </Text>
        </View>
        <View style={[styles.badge, styles[category]]}>
          <Text
            variant="caption"
            weight="semibold"
            style={category === 'normal' ? styles.status : styles.warning}
          >
            {t(`onboarding.bmiCategories.${category}.title`)}
          </Text>
        </View>
      </View>
      <View style={styles.scale}>
        {CATEGORIES.map((range) => (
          <View key={range} style={[styles.bar, styles[range]]}>
            {range === category ? (
              <View style={styles.marker}>
                <Icon name="radio-button-on" variant="brand" size={18} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.bmiLegend}>
        {CATEGORIES.map((range) => (
          <View key={range} style={styles.legendItem}>
            <View style={[styles.legendDot, styles[range]]} />
            <Text variant="caption" color="secondary" style={styles.legendText}>
              {ranges[range]} · {t(`onboarding.bmiCategories.${range}.title`)}
            </Text>
          </View>
        ))}
      </View>
      {stats.map((row) => (
        <View key={row[0]?.label} style={styles.stats}>
          {row.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text variant="caption" color="secondary" align="center">
                {stat.label}
              </Text>
              <Text variant="bodySmall" weight="semibold" align="center">
                {stat.value}
                {stat.secondaryValue ? (
                  <Text variant="caption" color="secondary">
                    {stat.secondaryValue}
                  </Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}
