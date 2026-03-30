export interface LineTrendChartPoint {
  label: string;
  value: number;
}

export interface LineTrendChartProps {
  data: LineTrendChartPoint[];
  scrollEnabled?: boolean;
}
