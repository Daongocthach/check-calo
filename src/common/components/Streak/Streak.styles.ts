import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  header: {
    gap: theme.metrics.spacingV.p4,
  },
  title: {
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  dayLabel: {
    textAlign: 'center',
  },
  statusCircle: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusCircleNone: {
    backgroundColor: theme.colors.background.section,
    borderColor: theme.colors.border.default,
  },
  statusCircleCompleted: {
    backgroundColor: theme.colors.state.success,
    borderColor: theme.colors.state.success,
  },
  statusCircleMissed: {
    backgroundColor: theme.colors.state.error,
    borderColor: theme.colors.state.error,
  },
  statusDot: {
    width: theme.metrics.spacing.p8,
    height: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.text.muted,
  },
}));
