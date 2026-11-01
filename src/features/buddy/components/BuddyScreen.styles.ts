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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  progressTrack: {
    flex: 1,
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
}));
