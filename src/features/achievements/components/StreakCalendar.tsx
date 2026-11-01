import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { IconButton, Text } from '@/common/components';
import { toLocale } from '@/features/food-log/utils/format';
import { formatDateKey } from '@/utils/date';
import type { ActivityStats } from '../types';
import { DayStatusBadge, DayStatusBubble } from './DayStatusBubble';

function buildMonthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

/** Month grid (Mon-first) marking each day the same way as the dashboard week strip. */
export function StreakCalendar({ stats }: { stats: ActivityStats }) {
  const { t, i18n } = useTranslation();
  const locale = toLocale(i18n.language);
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const cells = buildMonthCells(month);
  const todayKey = formatDateKey(today);
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 1 + index).toLocaleDateString(locale, { weekday: 'narrow' })
  );

  const shiftMonth = (delta: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="body" weight="bold" style={styles.flex}>
          {t('achievements.streakHistory')}
        </Text>
        <IconButton
          icon="chevron-back"
          size="sm"
          onPress={() => shiftMonth(-1)}
          accessibilityLabel={t('achievements.previousMonth')}
        />
        <Text variant="bodySmall" weight="semibold" style={styles.monthLabel}>
          {month.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}
        </Text>
        <IconButton
          icon="chevron-forward"
          size="sm"
          disabled={isCurrentMonth}
          onPress={() => shiftMonth(1)}
          accessibilityLabel={t('achievements.nextMonth')}
        />
      </View>
      <View style={styles.grid}>
        <View style={styles.week}>
          {weekdayLabels.map((label, index) => (
            <Text key={index} variant="caption" color="tertiary" align="center" style={styles.cell}>
              {label}
            </Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={styles.week}>
            {cells.slice(row * 7, row * 7 + 7).map((cell, index) => {
              if (!cell) {
                return <View key={`empty-${row}-${index}`} style={styles.cell} />;
              }

              const dateKey = formatDateKey(cell);
              const isToday = dateKey === todayKey;

              return (
                <View key={cell.toISOString()} style={styles.cell}>
                  <DayStatusBubble
                    label={String(cell.getDate())}
                    status={stats.dayStatuses[dateKey] ?? 'empty'}
                    future={cell > today && !isToday}
                    highlighted={isToday}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <DayStatusBadge status="on_target" />
        <Text variant="caption" color="secondary">
          {t('achievements.legendOnTarget')}
        </Text>
        <DayStatusBadge status="off_target" style={styles.legendGap} />
        <Text variant="caption" color="secondary">
          {t('achievements.legendLogged')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  monthLabel: {
    textTransform: 'capitalize',
  },
  grid: {
    gap: theme.metrics.spacingV.p12,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  legendGap: {
    marginLeft: theme.metrics.spacing.p8,
  },
}));
