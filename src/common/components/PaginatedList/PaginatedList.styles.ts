import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flex: 1,
  },
  contentPadding: (paddingBottom: number) => ({ paddingBottom }),
  fabOffset: (bottom: number) => ({ bottom }),
  footer: {
    paddingVertical: theme.metrics.spacingV.p16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p8,
  },
  separator: {
    height: theme.metrics.spacingV.p12,
  },
  scrollTopFabWrap: {
    position: 'absolute',
    right: theme.metrics.spacing.p16,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.metrics.borderRadius.full,
    zIndex: 1,
    elevation: 6,
  },
}));
