import { StyleSheet, type UnistylesVariants } from 'react-native-unistyles';
import { hs } from '@/theme/metrics';

/** Inner padding of the track per size; the indicator is inset by the same amount. */
export const SEGMENT_TRACK_PADDING = { sm: hs(2), md: hs(3) } as const;

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.background.surfaceAlt,
    borderRadius: theme.metrics.borderRadius.md,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    variants: {
      size: {
        sm: {
          padding: SEGMENT_TRACK_PADDING.sm,
        },
        md: {
          padding: SEGMENT_TRACK_PADDING.md,
        },
      },
      disabled: {
        true: {
          opacity: 0.5,
        },
      },
    },
  },
  indicator: {
    position: 'absolute' as const,
    backgroundColor: theme.colors.brand.primary,
    variants: {
      size: {
        sm: {
          top: SEGMENT_TRACK_PADDING.sm,
          bottom: SEGMENT_TRACK_PADDING.sm,
          left: SEGMENT_TRACK_PADDING.sm,
        },
        md: {
          top: SEGMENT_TRACK_PADDING.md,
          bottom: SEGMENT_TRACK_PADDING.md,
          left: SEGMENT_TRACK_PADDING.md,
        },
      },
    },
    borderRadius: theme.metrics.borderRadius.md,
    elevation: 1,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: hs(1) },
    shadowOpacity: 0.1,
    shadowRadius: hs(2),
  },
  segment: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    gap: theme.metrics.spacing.p4,
    zIndex: 1,
  },
  segmentIcon: {
    marginRight: theme.metrics.spacing.p4,
  },
  segmentTextSelected: {
    fontWeight: '600' as const,
  },
  segmentText: {
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    variants: {
      size: {
        sm: {
          fontSize: theme.fonts.size.xs,
        },
        md: {
          fontSize: theme.fonts.size.sm,
        },
      },
    },
  },
}));

export type SegmentedControlStyleVariants = UnistylesVariants<typeof styles>;
