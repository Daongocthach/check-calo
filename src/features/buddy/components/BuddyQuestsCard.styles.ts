import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  header: {
    gap: theme.metrics.spacingV.p4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  iconDone: {
    backgroundColor: theme.colors.brand.primarySoft,
  },
  body: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  week: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p4,
  },
  weekDot: {
    width: theme.metrics.spacing.p12,
    height: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.full,
  },
  weekDot_met: {
    backgroundColor: theme.colors.brand.primary,
  },
  weekDot_missed: {
    backgroundColor: theme.colors.background.section,
  },
  weekDot_today: {
    borderWidth: 1.5,
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.background.section,
  },
  weekDot_future: {
    backgroundColor: theme.colors.background.section,
  },
  reward: {
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  rewardDone: {
    opacity: 0.6,
  },
}));
