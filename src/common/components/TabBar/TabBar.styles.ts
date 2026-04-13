import { StyleSheet } from 'react-native-unistyles';
import { hs, vs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  container: {
    position: 'absolute',
    bottom: 0,
    left: theme.metrics.spacing.p24,
    right: theme.metrics.spacing.p24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    paddingVertical: vs(12),
    paddingHorizontal: hs(12),
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: theme.colors.shadow.elevationMedium,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(8),
    borderRadius: theme.metrics.borderRadius.full,
    zIndex: 1,
  },
  standardTab: {
    maxWidth: '22%',
  },
  addTab: {
    flex: 0,
    marginTop: -vs(34),
    paddingHorizontal: theme.metrics.spacing.p8,
  },
  addTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p8,
  },
  tabBubble: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBubbleActive: {
    backgroundColor:
      theme.colors.mode === 'dark'
        ? theme.colors.background.section
        : theme.colors.brand.primaryVariant,
    borderWidth: 1,
    borderRadius: theme.metrics.borderRadius.full,
    borderColor:
      theme.colors.mode === 'dark' ? theme.colors.border.strong : theme.colors.brand.primary,
  },
  tabBubbleInactive: {
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
  addTabActiveBadge: {
    position: 'absolute',
    top: theme.metrics.spacingV.p4,
    right: theme.metrics.spacing.p4,
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderWidth: 1,
    borderColor:
      theme.colors.mode === 'dark' ? theme.colors.background.app : theme.colors.background.surface,
  },
  addTabActiveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
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
