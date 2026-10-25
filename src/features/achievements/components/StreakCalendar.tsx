import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { CircularProgressRing, Icon, IconButton, Text } from '@/common/components';
import { hs } from '@/theme/metrics';
import { formatDateKey } from '@/utils/date';
import type { ActivityStats } from '../types';

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

  return { cells, daysInMonth };
}

/** Month grid of logged days (Mon-first) with a ring of logged days and the best streak. */
export function StreakCalendar({ stats }: { stats: ActivityStats }) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const { cells, daysInMonth } = buildMonthCells(month);
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const loggedInMonth = cells.filter(
    (cell) =>
      cell &&
      stats.dayStatuses[formatDateKey(cell)] &&
      stats.dayStatuses[formatDateKey(cell)] !== 'empty'
  ).length;
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
      <View style={styles.body}>
        <View style={styles.grid}>
          <View style={styles.week}>
            {weekdayLabels.map((label) => (
              <Text
                key={label}
                variant="caption"
                color="tertiary"
                align="center"
                style={styles.cell}
              >
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

                const status = stats.dayStatuses[formatDateKey(cell)] ?? 'empty';
                const isFuture = cell > today;

                return (
                  <View key={cell.toISOString()} style={styles.cell}>
                    <View
                      style={[
                        styles.dot,
                        status === 'on_target' && styles.dotOnTarget,
                        status === 'off_target' && styles.dotLogged,
                        isFuture && styles.dotFuture,
                      ]}
                    >
                      {status === 'empty' ? null : (
                        <Icon name="checkmark" variant="onBrand" size={12} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.side}>
          <CircularProgressRing
            progress={(loggedInMonth / daysInMonth) * 100}
            size={hs(84)}
            strokeWidth={hs(8)}
            trackColor={theme.colors.background.section}
            progressColor={theme.colors.brand.primary}
            showCap={false}
          >
            <Text variant="h3" weight="bold">
              {loggedInMonth}
            </Text>
            <Text variant="caption" color="tertiary">
              {`/${daysInMonth}`}
            </Text>
          </CircularProgressRing>
          <View style={styles.longest}>
            <Icon name="flame" variant="accent" size={14} />
            <Text variant="caption" color="secondary">
              {t('achievements.longestStreak')}
            </Text>
          </View>
          <Text variant="bodySmall" weight="bold">
            {t('achievements.days', { count: stats.longestStreak })}
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendDot, styles.dotOnTarget]} />
        <Text variant="caption" color="secondary">
          {t('achievements.legendOnTarget')}
        </Text>
        <View style={[styles.legendDot, styles.dotLogged]} />
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
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  grid: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  dot: {
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  dotOnTarget: {
    backgroundColor: theme.colors.state.success,
  },
  dotLogged: {
    backgroundColor: theme.colors.brand.primaryVariant,
  },
  dotFuture: {
    opacity: 0.35,
  },
  side: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  longest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  legendDot: {
    width: theme.metrics.spacing.p12,
    height: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.full,
  },
}));
