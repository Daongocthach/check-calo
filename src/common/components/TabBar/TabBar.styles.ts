import { StyleSheet } from 'react-native-unistyles';
import { hs, vs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.surface,
    borderTopLeftRadius: theme.metrics.borderRadius.xl,
    borderTopRightRadius: theme.metrics.borderRadius.xl,
    borderBottomLeftRadius: theme.metrics.borderRadius.xl,
    borderBottomRightRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    paddingTop: vs(10),
    paddingHorizontal: hs(16),
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: theme.colors.shadow.elevationMedium,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(4),
    zIndex: 1,
  },
  standardTab: {
    maxWidth: '22%',
  },
  addTab: {
    flex: 0,
    marginTop: -vs(34),
    paddingHorizontal: theme.metrics.spacing.p4,
  },
  addTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  iconWrap: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor:
      theme.colors.mode === 'dark'
        ? theme.colors.background.section
        : theme.colors.brand.primaryVariant,
    borderWidth: 1,
    borderRadius: theme.metrics.borderRadius.full,
    borderColor:
      theme.colors.mode === 'dark' ? theme.colors.border.strong : theme.colors.brand.primary,
  },
  iconWrapInactive: {
    backgroundColor: 'transparent',
  },
  addBubble: {
    width: theme.metrics.spacing.p64,
    height: theme.metrics.spacing.p64,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.colors.mode === 'dark' ? 0 : 6,
    borderColor: theme.colors.background.app,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: theme.colors.shadow.elevationLarge,
  },
  addBubbleActive: {
    transform: [{ scale: 1.06 }],
    shadowOpacity: 0.34,
    shadowRadius: 24,
  },
  addBubbleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBubbleSolid: {
    backgroundColor: theme.colors.brand.tertiary,
  },
  addBubbleSolidActive: {
    borderWidth: 2,
    borderColor:
      theme.colors.mode === 'dark' ? theme.colors.brand.onBrand : theme.colors.background.surface,
  },
}));
