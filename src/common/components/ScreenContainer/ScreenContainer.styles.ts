import { StyleSheet, type UnistylesVariants } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: {
      xs: theme.metrics.spacing.p12,
      sm: theme.metrics.spacing.p16,
      md: theme.metrics.spacing.p24,
      lg: theme.metrics.spacing.p32,
    },
  },
  edgeTop: {
    paddingTop: rt.insets.top,
  },
  edgeBottom: {
    paddingBottom: rt.insets.bottom + theme.metrics.spacing.p4,
  },
}));

export type ScreenContainerStyleVariants = UnistylesVariants<typeof styles>;
