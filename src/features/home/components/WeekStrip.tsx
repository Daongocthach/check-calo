import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import { formatDateKey } from '@/utils/date';
import { isSameDay } from '../utils/week';
import { MonthYearSelector } from './MonthYearSelector';

export interface WeekStripProps {
  weekDays: Date[];
  selectedDate: Date;
  today: Date;
  loggedDateKeys: Set<string>;
  onSelect: (date: Date) => void;
}

export function WeekStrip({
  weekDays,
  selectedDate,
  today,
  loggedDateKeys,
  onSelect,
}: WeekStripProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';

  return (
    <View style={styles.container}>
      <MonthYearSelector selectedDate={selectedDate} today={today} onSelect={onSelect} />
      <View style={styles.days}>
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isFuture = day > today && !isSameDay(day, today);
          const isLogged = loggedDateKeys.has(formatDateKey(day));
          const weekday = day.toLocaleDateString(locale, { weekday: 'narrow' });

          return (
            <Pressable
              key={day.toISOString()}
              disabled={isFuture}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isFuture }}
              style={[styles.day, isFuture && styles.dayFuture]}
            >
              <View
                style={[
                  styles.weekdayBubble,
                  isLogged ? styles.weekdayLogged : styles.weekdayEmpty,
                  isFuture && styles.weekdayFuture,
                  isSelected && styles.weekdaySelected,
                ]}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  color={isSelected ? 'inverse' : 'primary'}
                >
                  {weekday}
                </Text>
              </View>
              <Text variant="bodySmall" weight={isSelected ? 'bold' : 'medium'}>
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.metrics.spacingV.p12,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  dayFuture: {
    opacity: 0.4,
  },
  weekdayBubble: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  weekdayEmpty: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border.strong,
  },
  weekdayFuture: {
    borderColor: 'transparent',
  },
  weekdayLogged: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.background.section,
  },
  weekdaySelected: {
    borderStyle: 'solid',
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.brand.primary,
  },
}));
