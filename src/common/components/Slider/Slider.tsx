import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import type { SliderProps } from './Slider.types';

const ACCESSIBILITY_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Lightweight horizontal slider built on PanResponder (no native dependency).
 *
 * @example
 * ```tsx
 * <Slider value={height} minimumValue={120} maximumValue={220} onValueChange={setHeight} />
 * ```
 */
export function Slider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  accessibilityLabel,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  const latest = useRef({ width, minimumValue, maximumValue, step, onValueChange });
  latest.current = { width, minimumValue, maximumValue, step, onValueChange };

  const range = maximumValue - minimumValue;
  const ratio = range > 0 ? clamp((value - minimumValue) / range, 0, 1) : 0;

  const panResponder = useMemo(() => {
    const update = (locationX: number) => {
      const current = latest.current;
      if (current.width <= 0) {
        return;
      }

      const raw =
        current.minimumValue +
        clamp(locationX / current.width, 0, 1) * (current.maximumValue - current.minimumValue);
      const stepped = Math.round(raw / current.step) * current.step;
      current.onValueChange(
        Number(clamp(stepped, current.minimumValue, current.maximumValue).toFixed(2))
      );
    };

    return PanResponder.create({
      // Claim only horizontal drags so vertical swipes still scroll the parent list.
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => update(event.nativeEvent.locationX),
      onPanResponderMove: (event) => update(event.nativeEvent.locationX),
    });
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  // Screen readers adjust "adjustable" elements through increment/decrement actions.
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const nextValue = clamp(value + direction * step, minimumValue, maximumValue);

    if (nextValue !== value) {
      onValueChange(Number(nextValue.toFixed(2)));
    }
  };

  return (
    <View
      style={styles.hitArea}
      onLayout={handleLayout}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      onAccessibilityAction={handleAccessibilityAction}
      {...panResponder.panHandlers}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, styles.fillWidth(ratio * 100)]} />
      </View>
      <View style={[styles.thumb, styles.thumbOffset(ratio * width)]} pointerEvents="none" />
    </View>
  );
}

const THUMB_SIZE = 22;

const styles = StyleSheet.create((theme) => ({
  hitArea: {
    height: theme.metrics.spacingV.p32,
    justifyContent: 'center',
  },
  track: {
    height: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.border.default,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.brand.primary,
  },
  fillWidth: (percent: number) => ({
    width: `${percent}%`,
  }),
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 3,
    borderColor: theme.colors.brand.primary,
  },
  thumbOffset: (offset: number) => ({
    left: offset - THUMB_SIZE / 2,
  }),
}));
