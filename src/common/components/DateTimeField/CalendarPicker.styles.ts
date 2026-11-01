import { StyleSheet } from 'react-native-unistyles';
import { hs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  modalContainer: {
    padding: theme.metrics.spacing.p16,
    backgroundColor: theme.colors.background.surface,
  },
  pickerGridCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.metrics.spacingV.p4,
  },
  pickerGridDayCircle: {
    width: hs(36),
    height: hs(36),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    variants: {
      state: {
        selected: {
          backgroundColor: theme.colors.brand.primary,
          borderWidth: 0,
        },
        normal: {
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        outside: {
          backgroundColor: 'transparent',
          borderWidth: 0,
          opacity: 0.3,
        },
      },
    },
  },
  pickerGridDayText: {
    fontSize: theme.fonts.size.md,
    fontFamily: theme.fonts.medium,
    variants: {
      state: {
        selected: {
          color: theme.colors.text.inverse,
          fontFamily: theme.fonts.bold,
        },
        normal: {
          color: theme.colors.text.primary,
        },
        outside: {
          color: theme.colors.text.tertiary,
        },
      },
    },
  },
  todayDot: {
    width: hs(4),
    height: hs(4),
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
    position: 'absolute',
    bottom: hs(3),
    alignSelf: 'center',
    variants: {
      state: {
        selected: {
          backgroundColor: theme.colors.text.inverse,
        },
        normal: {
          backgroundColor: theme.colors.brand.primary,
        },
        outside: {
          backgroundColor: theme.colors.text.tertiary,
        },
      },
    },
  },
}));
