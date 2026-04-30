import { StyleSheet } from 'react-native-unistyles';
import { vs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  sheetBackground: {
    backgroundColor: theme.colors.background.surface,
    borderTopLeftRadius: theme.metrics.spacing.p28,
    borderTopRightRadius: theme.metrics.spacing.p28,
  },
  sheetHandle: {
    width: theme.metrics.spacing.p52,
    height: vs(5),
    backgroundColor: theme.colors.border.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.metrics.spacingV.p32,
  },
  scrollView: {
    flex: 1,
  },
  sheetContent: {
    flexGrow: 1,
    gap: theme.metrics.spacingV.p16,
  },
  header: {
    minHeight: theme.metrics.spacing.p56,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p16,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  subtitle: {
    lineHeight: theme.fonts.size.lg,
  },
  sparkleGroup: {
    width: theme.metrics.spacing.p56,
    minHeight: theme.metrics.spacing.p48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    alignItems: 'flex-end' as const,
    gap: theme.metrics.spacingV.p8,
  },
  headerActionButtons: {
    flexDirection: 'row' as const,
    gap: theme.metrics.spacing.p8,
  },
  reviewHistoryHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p12,
  },
  switchCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.section,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  switchCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  switchActions: {
    alignItems: 'flex-end',
    gap: theme.metrics.spacingV.p4,
  },
  emptySuggestionCard: {
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  reviewLoadingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.metrics.spacing.p12,
  },
  reviewResult: {
    gap: theme.metrics.spacingV.p12,
  },
  heroCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: theme.metrics.spacing.p16,
    shadowOffset: { width: 0, height: theme.metrics.spacingV.p8 },
    elevation: theme.colors.shadow.elevationSmall,
  },
  heroTopRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p12,
  },
  heroToneBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  heroToneBadgeGood: {
    backgroundColor: theme.colors.state.successBg,
  },
  heroToneBadgeWarning: {
    backgroundColor: theme.colors.state.warningBg,
  },
  heroToneBadgeAttention: {
    backgroundColor: theme.colors.state.errorBg,
  },
  goalPill: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  heroCopy: {
    gap: theme.metrics.spacingV.p4,
  },
  reviewListBlock: {
    gap: theme.metrics.spacingV.p12,
  },
  reviewSummaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p12,
  },
  metricList: {
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  metricRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.metrics.spacing.p4,
  },
  metricDot: {
    width: theme.metrics.spacing.p8,
    height: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
  },
  metricRowText: {
    flex: 1,
  },
  sectionCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  reviewListHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.metrics.spacing.p8,
  },
  reviewBulletList: {
    gap: theme.metrics.spacingV.p8,
  },
  reviewBulletRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: theme.metrics.spacing.p8,
  },
  reviewBulletDot: {
    width: theme.metrics.spacing.p8,
    height: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
    marginTop: theme.metrics.spacingV.p8,
  },
  reviewBulletDotWarning: {
    backgroundColor: theme.colors.state.warning,
  },
  reviewBulletText: {
    flex: 1,
  },
  reviewActionCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
}));
