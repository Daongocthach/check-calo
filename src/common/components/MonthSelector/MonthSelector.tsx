import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View, type ListRenderItem } from 'react-native';
import { IconButton } from '@/common/components/IconButton';
import { Text } from '@/common/components/Text';
import { DAY_ITEM_WIDTH, styles } from './MonthSelector.styles';
import type { MonthSelectorProps } from './MonthSelector.types';

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function buildMonthDays(month: Date): Date[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => new Date(year, monthIndex, index + 1));
}

export function MonthSelector({
  selectedDate,
  onChange,
  minDate,
  maxDate,
  locale,
}: MonthSelectorProps) {
  const { t, i18n } = useTranslation();
  const normalizedSelectedDate = useMemo(() => startOfDay(selectedDate), [selectedDate]);
  const minBoundary = useMemo(() => (minDate ? startOfDay(minDate) : undefined), [minDate]);
  const maxBoundary = useMemo(() => startOfDay(maxDate ?? new Date()), [maxDate]);
  const [currentMonth, setCurrentMonth] = useState<Date>(normalizedSelectedDate);
  const listRef = useRef<FlatList<Date>>(null);
  const resolvedLocale = locale ?? i18n.language;

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale, {
        month: 'long',
        year: 'numeric',
      }),
    [resolvedLocale]
  );
  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale, {
        weekday: 'short',
      }),
    [resolvedLocale]
  );
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale, {
        day: 'numeric',
      }),
    [resolvedLocale]
  );

  const daysInMonth = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);

  const isDateDisabled = (date: Date): boolean => {
    if (minBoundary && startOfDay(date) < minBoundary) {
      return true;
    }
    return startOfDay(date) > maxBoundary;
  };

  const canMovePrev = useMemo(() => {
    if (!minBoundary) return true;
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    return prevMonth >= new Date(minBoundary.getFullYear(), minBoundary.getMonth(), 1);
  }, [currentMonth, minBoundary]);

  const canMoveNext = useMemo(() => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return nextMonth <= new Date(maxBoundary.getFullYear(), maxBoundary.getMonth(), 1);
  }, [currentMonth, maxBoundary]);

  useEffect(() => {
    setCurrentMonth((previousMonth) =>
      isSameMonth(previousMonth, normalizedSelectedDate) ? previousMonth : normalizedSelectedDate
    );
  }, [normalizedSelectedDate]);

  useEffect(() => {
    const selectedIndex = daysInMonth.findIndex((day) => isSameDay(day, normalizedSelectedDate));
    if (selectedIndex < 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [daysInMonth, normalizedSelectedDate]);

  const handleChangeMonth = (offset: -1 | 1) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
  };

  const renderItem: ListRenderItem<Date> = ({ item }) => {
    const isSelected = isSameDay(item, normalizedSelectedDate);
    const disabled = isDateDisabled(item);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={new Intl.DateTimeFormat(resolvedLocale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(item)}
        accessibilityState={{ selected: isSelected, disabled }}
        disabled={disabled}
        onPress={() => onChange(startOfDay(item))}
        style={[styles.dayItem, disabled ? styles.dayItemDisabled : undefined]}
      >
        <Text variant="caption" style={styles.dayName}>
          {weekdayFormatter.format(item)}
        </Text>
        <View style={[styles.dayNumberWrap, isSelected ? styles.dayNumberWrapSelected : undefined]}>
          <Text
            variant="bodySmall"
            weight="semibold"
            style={[styles.dayNumberText, isSelected ? styles.dayNumberTextSelected : undefined]}
          >
            {dayFormatter.format(item)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          variant="ghost"
          size="md"
          disabled={!canMovePrev}
          onPress={() => handleChangeMonth(-1)}
          accessibilityLabel={t('common.back')}
        />
        <View style={styles.monthTitleWrap}>
          <Text variant="h3" style={styles.monthTitle}>
            {monthFormatter.format(currentMonth)}
          </Text>
        </View>
        <IconButton
          icon="chevron-forward"
          variant="ghost"
          size="md"
          disabled={!canMoveNext}
          onPress={() => handleChangeMonth(1)}
          accessibilityLabel={t('common.next')}
        />
      </View>

      <FlatList
        ref={listRef}
        horizontal
        data={daysInMonth}
        renderItem={renderItem}
        keyExtractor={(item) => item.toISOString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({
          length: DAY_ITEM_WIDTH,
          offset: DAY_ITEM_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}
