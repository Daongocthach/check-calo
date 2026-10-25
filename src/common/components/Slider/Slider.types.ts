/** Props for the {@link Slider} component. */
export interface SliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  /** Snapping interval. Defaults to `1`. */
  step?: number;
  onValueChange: (value: number) => void;
  accessibilityLabel?: string;
}
