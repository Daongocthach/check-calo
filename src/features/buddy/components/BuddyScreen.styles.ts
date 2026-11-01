import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p16,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  hero: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p24,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    maxWidth: '100%',
  },
  editBadge: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  progressWrap: {
    alignSelf: 'stretch',
    gap: theme.metrics.spacingV.p8,
  },
  flex: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  ruleIcon: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  pointsPill: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.focus,
    backgroundColor: theme.colors.background.surface,
  },
}));
