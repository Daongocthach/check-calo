import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import { DayStatusBubble } from '@/features/achievements';
import type { DayStatus } from '@/features/achievements/types';
import { formatDateKey } from '@/utils/date';
import { addDays, getWeekStart, getWeekStarts, isSameDay } from '../utils/week';
import { MonthYearSelector } from './MonthYearSelector';

/** How far back the strip can be swiped without using the date picker. */
const WEEKS_BACK = 104;

export interface WeekStripProps {
  selectedDate: Date;
  today: Date;
  /** Status per date key (YYYY-MM-DD); missing days count as empty. */
  dayStatuses: Record<string, DayStatus>;
  /** Current logging streak, shown as a badge on the date picker button. */
  streak: number;
  onSelect: (date: Date) => void;
}

export function WeekStrip({ selectedDate, today, dayStatuses, streak, onSelect }: WeekStripProps) {
  const { t, i18n } = useTranslation();
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
  const extraData = useMemo(() => ({ selectedDate, dayStatuses }), [selectedDate, dayStatuses]);

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
        const isToday = isSameDay(day, today);
        const isFuture = day > today && !isToday;
        const status = dayStatuses[formatDateKey(day)] ?? 'empty';
        const weekday = day.toLocaleDateString(locale, { weekday: 'narrow' });
        const label = day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric' });
        // Today keeps the plain layout and is marked by a brand-coloured date.
        let dateColor: 'link' | 'tertiary' | 'primary' = isToday ? 'link' : 'primary';
        if (isFuture) {
          dateColor = 'tertiary';
        }

        return (
          <Pressable
            key={offset}
            disabled={isFuture}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityLabel={isFuture ? label : `${label}, ${t(`home.dayStatus.${status}`)}`}
            accessibilityState={{ selected: isSelected, disabled: isFuture }}
            style={styles.day}
          >
            <DayStatusBubble
              label={weekday}
              status={status}
              future={isFuture}
              selected={isSelected}
              borderStyle={isToday ? 'solid' : 'dashed'}
            />
            <Text
              variant="bodySmall"
              weight={isSelected || isToday ? 'bold' : 'medium'}
              color={dateColor}
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
      <MonthYearSelector
        selectedDate={selectedDate}
        today={today}
        streak={streak}
        onSelect={onSelect}
      />
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
  // Top padding keeps the status badge from being clipped by the list.
  page: (width: number) => ({
    width,
    flexDirection: 'row',
    paddingTop: theme.metrics.spacingV.p8,
  }),
  // Equal cells (not space-between) leave half a gap at each page edge, so while swiping the last
  // day of one week and the first day of the next sit as far apart as neighbouring days.
  day: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
  },
}));
