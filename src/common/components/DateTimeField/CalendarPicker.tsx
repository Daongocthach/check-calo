import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components/Text';
import { styles } from './CalendarPicker.styles';

interface CalendarPickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  locale: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

interface CalendarDayProps {
  date?: DateData;
  state?: string;
  selected: boolean;
  today: boolean;
  onSelect: (day: DateData) => void;
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const CalendarDay = memo(({ date, state, selected, today, onSelect }: CalendarDayProps) => {
  const disabled = state === 'disabled';
  let variant: 'selected' | 'normal' | 'outside' = 'normal';
  if (disabled) variant = 'outside';
  else if (selected) variant = 'selected';
  styles.useVariants({ state: variant });

  return (
    <Pressable
      disabled={disabled || !date}
      onPress={() => date && onSelect(date)}
      style={styles.pickerGridCell}
      accessibilityRole="button"
      accessibilityLabel={date?.dateString}
      accessibilityState={{ selected, disabled }}
    >
      <View style={styles.pickerGridDayCircle}>
        <Text style={styles.pickerGridDayText}>{date?.day}</Text>
        {today && <View style={styles.todayDot} />}
      </View>
    </Pressable>
  );
});

export function CalendarPicker({
  selectedDate,
  onDateSelect,
  locale,
  minimumDate,
  maximumDate,
}: CalendarPickerProps) {
  const { i18n } = useTranslation();
  const { theme } = useUnistyles();
  const language = locale.startsWith('vi') ? 'vi' : 'en';
  const t = i18n.getFixedT(language);
  LocaleConfig.locales[language] = {
    monthNames: t('dateTimePicker.monthNames', { returnObjects: true }),
    monthNamesShort: t('dateTimePicker.monthNamesShort', { returnObjects: true }),
    dayNames: t('dateTimePicker.dayNames', { returnObjects: true }),
    dayNamesShort: t('dateTimePicker.dayNamesShort', { returnObjects: true }),
    today: t('dateTimePicker.today'),
  };
  LocaleConfig.defaultLocale = language;
  const selectedKey = dateKey(selectedDate);
  const todayKey = dateKey(new Date());
  const handleSelect = useCallback(
    (day: DateData) => onDateSelect(new Date(day.year, day.month - 1, day.day)),
    [onDateSelect]
  );
  const renderDay = useCallback(
    ({ date, state }: { date?: DateData; state?: string }) => (
      <CalendarDay
        date={date}
        state={state}
        selected={date?.dateString === selectedKey}
        today={date?.dateString === todayKey}
        onSelect={handleSelect}
      />
    ),
    [handleSelect, selectedKey, todayKey]
  );
  const calendarTheme = useMemo(
    () => ({
      calendarBackground: theme.colors.background.surface,
      textSectionTitleColor: theme.colors.text.secondary,
      arrowColor: theme.colors.brand.primary,
      monthTextColor: theme.colors.text.primary,
      textMonthFontFamily: theme.fonts.bold,
      textDayHeaderFontFamily: theme.fonts.medium,
      textMonthFontSize: theme.fonts.size.lg,
      textDayHeaderFontSize: theme.fonts.size.sm,
    }),
    [theme]
  );

  return (
    <View style={styles.modalContainer}>
      <Calendar
        key={`${language}-${theme.colors.mode}`}
        current={selectedKey}
        minDate={minimumDate ? dateKey(minimumDate) : undefined}
        maxDate={maximumDate ? dateKey(maximumDate) : undefined}
        disableAllTouchEventsForDisabledDays
        hideExtraDays
        firstDay={1}
        enableSwipeMonths
        dayComponent={renderDay}
        theme={calendarTheme}
        accessibilityLabel={t('common.date')}
        arrowsHitSlop={theme.metrics.spacing.p12}
      />
    </View>
  );
}
