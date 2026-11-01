import { StyleSheet } from 'react-native-unistyles';
import { hs } from '@/theme/metrics';
import type { Point } from '../../utils/hexagonGeometry';

export const LABEL_WIDTH = hs(84);
export const LABEL_HEIGHT = hs(44);
export const SWATCH_WIDTH = hs(20);
export const SWATCH_HEIGHT = hs(4);

export const styles = StyleSheet.create((theme) => ({
  container: {
    alignSelf: 'stretch',
    gap: theme.metrics.spacingV.p8,
  },
  chart: (width: number, height: number) => ({
    width,
    height,
    alignSelf: 'center',
  }),
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  bubble: (center: Point, size: number) => ({
    position: 'absolute',
    left: center.x - size / 2,
    top: center.y - size / 2,
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  mascot: (lift: number) => ({
    transform: [{ translateY: -lift }],
  }),
  label: (left: number, top: number) => ({
    position: 'absolute',
    left,
    top,
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.md,
  }),
  labelTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  axisTitle: {
    fontSize: theme.fonts.size.xxs,
  },
  labelLocked: {
    opacity: 0.6,
  },
  labelPressed: {
    backgroundColor: theme.colors.overlay.pressed,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
}));
