import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';

interface MenuWeekSelectorProps {
  selectedDate: Date;
  currentDate: Date;
  locale: string;
  onSelectDate: (date: Date) => void;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function startOfWeek(date: Date) {
  const nextDate = startOfDay(date);
  const dayOffset = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - dayOffset);
  return nextDate;
}

function isSameCalendarDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isAfterCalendarDate(left: Date, right: Date) {
  return (
    left.getFullYear() > right.getFullYear() ||
    (left.getFullYear() === right.getFullYear() && left.getMonth() > right.getMonth()) ||
    (left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() > right.getDate())
  );
}

function getWeekdayLabel(locale: string, date: Date) {
  if (locale.startsWith('vi')) {
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
    const index = (date.getDay() + 6) % 7;
    return labels[index] ?? 'T2';
  }

  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
}

function getDayLabelColor(isSelected: boolean, isToday: boolean) {
  if (isSelected) {
    return 'onBrand';
  }

  if (isToday) {
    return 'accent';
  }

  return 'secondary';
}

export function MenuWeekSelector({
  selectedDate,
  currentDate,
  locale,
  onSelectDate,
}: MenuWeekSelectorProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <View style={styles.weekBar}>
        {weekDays.map((day) => {
          const isSelected = isSameCalendarDate(day, selectedDate);
          const isToday = isSameCalendarDate(day, currentDate);
          const disabled = isAfterCalendarDate(day, currentDate);

          return (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={new Intl.DateTimeFormat(locale, {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
              }).format(day)}
              disabled={disabled}
              onPress={() => onSelectDate(day)}
              style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
            >
              <Text variant="body" weight="bold" color={getDayLabelColor(isSelected, isToday)}>
                {getWeekdayLabel(locale, day)}
              </Text>
              {isSelected ? (
                <View style={styles.selectedLeaf}>
                  <Icon name="leaf" size={16} variant="onBrand" />
                </View>
              ) : null}
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
  weekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: theme.metrics.spacing.p16,
    shadowOffset: { width: 0, height: theme.metrics.spacingV.p8 },
    elevation: theme.colors.shadow.elevationSmall,
  },
  dayButton: {
    flex: 1,
    minHeight: theme.metrics.spacing.p48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: 'transparent',
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.brand.primary,
  },
  selectedLeaf: {
    position: 'absolute',
    top: -theme.metrics.spacingV.p4,
    right: theme.metrics.spacing.p8,
  },
}));
