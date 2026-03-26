export type DateTimeFieldMode = 'date' | 'time' | 'datetime';

export interface DateTimeFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  mode?: DateTimeFieldMode;
  title?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  locale?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}
