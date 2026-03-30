export interface StackedMacroBarChartPoint {
  label: string;
  proteinValue: number;
  carbsValue: number;
  fatValue: number;
}

export interface StackedMacroBarChartProps {
  data: StackedMacroBarChartPoint[];
  proteinLabel: string;
  carbsLabel: string;
  fatLabel: string;
  gramUnit: string;
  scrollEnabled?: boolean;
}
