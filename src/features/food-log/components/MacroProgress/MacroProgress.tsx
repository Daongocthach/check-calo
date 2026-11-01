import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import type { MacroKey } from '../../constants';

export interface MacroProgressProps {
  macro: MacroKey;
  value: number;
  target: number;
}

/** Compact "60 / 250" macro block with a colored bar, used on the Home card. */
export function MacroProgress({ macro, value, target }: MacroProgressProps) {
  const { t } = useTranslation();
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const width = useSharedValue(0);

  // Grows from its previous width; skipped when the system asks for reduced motion.
  useEffect(() => {
    width.value = withTiming(percent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [percent, width]);

  const widthStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={styles.container}>
      <Text variant="body" weight="bold">
        {Math.round(value)}
        <Text variant="bodySmall" color="tertiary">
          {` / ${Math.round(target)}`}
        </Text>
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill(macro), widthStyle]} />
      </View>
      <Text variant="caption" color="secondary" align="center">
        {t(`macros.${macro}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
  },
  track: {
    alignSelf: 'stretch',
    height: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
    overflow: 'hidden',
  },
  fill: (macro: MacroKey) => ({
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: {
      carbs: theme.colors.state.info,
      protein: theme.colors.state.success,
      fat: theme.colors.state.warning,
    }[macro],
  }),
}));
