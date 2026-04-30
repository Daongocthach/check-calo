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
  reviewDatePill: {
    flexShrink: 1,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
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
  reviewSummaryCard: {
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  reviewSummaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p12,
  },
  reviewSummaryCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  reviewSummaryBadge: {
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  reviewStatsCard: {
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  reviewStatsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.metrics.spacing.p12,
  },
  reviewStat: {
    flexGrow: 1,
    flexBasis: '46%',
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  reviewListBlock: {
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
  reviewBulletDotSuccess: {
    backgroundColor: theme.colors.state.success,
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
