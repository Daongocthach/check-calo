export type MonthSelectorDayStatus = 'success' | 'failed';

export interface MonthSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  dayStatuses?: Partial<Record<string, MonthSelectorDayStatus>>;
  onMonthChange?: (month: Date) => void;
}
