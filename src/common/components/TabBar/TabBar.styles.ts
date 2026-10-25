import { StyleSheet } from 'react-native-unistyles';
import { vs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderTopLeftRadius: theme.metrics.borderRadius.xl,
    borderTopRightRadius: theme.metrics.borderRadius.xl,
    borderTopWidth: 1,
    borderColor: theme.colors.border.subtle,
    paddingTop: vs(10),
    paddingHorizontal: theme.metrics.spacing.p8,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: theme.colors.shadow.elevationMedium,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
    paddingVertical: vs(4),
  },
  label: {
    color: theme.colors.text.tertiary,
  },
  labelActive: {
    color: theme.colors.brand.primary,
  },
}));
