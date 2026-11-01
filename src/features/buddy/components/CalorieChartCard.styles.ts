import { StyleSheet } from 'react-native-unistyles';
import { vs } from '@/theme/metrics';

export type CalorieStack = 'carbs' | 'protein' | 'fat' | 'other';

export const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  periodLabel: {
    minWidth: theme.metrics.spacing.p80,
  },
  chart: {
    overflow: 'hidden',
  },
  chartPlaceholder: {
    height: vs(220),
  },
  axisText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.metrics.fontSize.xs,
  },
  topLabel: (width: number) => ({
    width,
    textAlign: 'center',
    fontSize: theme.metrics.fontSize.xs,
  }),
  detail: {
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  detailTitle: {
    flex: 1,
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: theme.metrics.spacing.p12,
    rowGap: theme.metrics.spacingV.p4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  // Same colours as the macro bars on the dashboard (MacroProgress).
  dot: (stack: CalorieStack) => ({
    width: theme.metrics.spacing.p8,
    height: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: {
      carbs: theme.colors.state.info,
      protein: theme.colors.state.success,
      fat: theme.colors.state.warning,
      other: theme.colors.text.muted,
    }[stack],
  }),
  goalMark: {
    width: theme.metrics.spacing.p12,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.brand.primary,
  },
}));
