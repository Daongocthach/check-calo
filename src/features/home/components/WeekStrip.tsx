import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import { formatDateKey } from '@/utils/date';
import { addDays, getWeekStart, getWeekStarts, isSameDay } from '../utils/week';
import { MonthYearSelector } from './MonthYearSelector';

/** How far back the strip can be swiped without using the date picker. */
const WEEKS_BACK = 104;

export interface WeekStripProps {
  selectedDate: Date;
  today: Date;
  loggedDateKeys: Set<string>;
  onSelect: (date: Date) => void;
}

export function WeekStrip({ selectedDate, today, loggedDateKeys, onSelect }: WeekStripProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const listRef = useRef<FlatList<Date>>(null);
  const visibleIndexRef = useRef(-1);
  const [pageWidth, setPageWidth] = useState(0);

  const earliestDefault = addDays(getWeekStart(today), -WEEKS_BACK * 7);
  const firstWeek = selectedDate < earliestDefault ? selectedDate : earliestDefault;
  const firstWeekKey = formatDateKey(getWeekStart(firstWeek));
  const todayKey = formatDateKey(today);
  // Keyed by date strings so a new Date instance for the same day keeps the list stable.
  const weeks = useMemo(
    () => getWeekStarts(new Date(`${firstWeekKey}T00:00:00`), new Date(`${todayKey}T00:00:00`)),
    [firstWeekKey, todayKey]
  );
  const selectedWeekKey = formatDateKey(getWeekStart(selectedDate));
  const selectedIndex = weeks.findIndex((week) => formatDateKey(week) === selectedWeekKey);
  const extraData = useMemo(
    () => ({ selectedDate, loggedDateKeys }),
    [selectedDate, loggedDateKeys]
  );

  // Follow selections made elsewhere (date picker, "today" button).
  useEffect(() => {
    if (pageWidth === 0 || selectedIndex < 0 || visibleIndexRef.current === selectedIndex) {
      return;
    }
    const animated = visibleIndexRef.current >= 0;
    visibleIndexRef.current = selectedIndex;
    listRef.current?.scrollToIndex({ index: selectedIndex, animated });
  }, [pageWidth, selectedIndex]);

  // Swiping to another week selects the same weekday there, never past today.
  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    visibleIndexRef.current = index;
    const week = weeks[index];
    if (!week || index === selectedIndex) {
      return;
    }
    const target = addDays(week, (selectedDate.getDay() + 6) % 7);
    onSelect(target > today && !isSameDay(target, today) ? today : target);
  };

  const renderWeek = ({ item }: { item: Date }) => (
    <View style={styles.page(pageWidth)}>
      {Array.from({ length: 7 }, (_, offset) => {
        const day = addDays(item, offset);
        const isSelected = isSameDay(day, selectedDate);
        const isFuture = day > today && !isSameDay(day, today);
        const isLogged = loggedDateKeys.has(formatDateKey(day));
        const weekday = day.toLocaleDateString(locale, { weekday: 'narrow' });
        let textColor: 'inverse' | 'tertiary' | 'primary' = 'primary';
        if (isSelected) {
          textColor = 'inverse';
        } else if (isFuture) {
          textColor = 'tertiary';
        }

        return (
          <Pressable
            key={offset}
            disabled={isFuture}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isFuture }}
            style={styles.day}
          >
            <View
              style={[
                styles.weekdayBubble,
                isLogged ? styles.weekdayLogged : styles.weekdayEmpty,
                isSelected && styles.weekdaySelected,
              ]}
            >
              <Text variant="caption" weight="semibold" color={textColor}>
                {weekday}
              </Text>
            </View>
            <Text
              variant="bodySmall"
              weight={isSelected ? 'bold' : 'medium'}
              color={isFuture ? 'tertiary' : 'primary'}
            >
              {day.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <MonthYearSelector selectedDate={selectedDate} today={today} onSelect={onSelect} />
      <View onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
        {pageWidth > 0 ? (
          <FlatList
            ref={listRef}
            data={weeks}
            extraData={extraData}
            keyExtractor={(week) => formatDateKey(week)}
            renderItem={renderWeek}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.max(selectedIndex, 0)}
            initialNumToRender={3}
            windowSize={3}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            onMomentumScrollEnd={handleMomentumEnd}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.metrics.spacingV.p12,
  },
  page: (width: number) => ({
    width,
    flexDirection: 'row',
  }),
  // Equal cells (not space-between) leave half a gap at each page edge, so while swiping the last
  // day of one week and the first day of the next sit as far apart as neighbouring days.
  day: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  weekdayBubble: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weekdayEmpty: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border.strong,
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
