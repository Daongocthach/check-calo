import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, SegmentedControl, Text } from '@/common/components';
import { GoalTrackingCard } from '@/features/goals/components/GoalTrackingCard';
import { useBottomPadding } from '@/hooks';
import { useProgressScreen } from '../hooks/useProgressScreen';
import type { ProgressPeriod } from '../utils/periods';
import { CalorieBarChart } from './CalorieBarChart';
import { WeeklyChallenge } from './WeeklyChallenge';

const PERIODS: ProgressPeriod[] = ['day', 'week', 'month', 'year'];

export function ProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const progress = useProgressScreen();

  return (
    <ScrollView
      contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="h1" weight="bold">
          {t('progress.title')}
        </Text>
      </View>
      <View style={styles.totalRow}>
        <Text variant="h1" weight="bold">
          {progress.total.toLocaleString()}
          <Text variant="body" color="secondary">
            {` ${progress.totalIsAverage ? t('progress.kcalPerDay') : t('common.units.kcal')}`}
          </Text>
        </Text>
        <Text variant="caption" color="secondary">
          {progress.rangeLabel}
        </Text>
      </View>
      <SegmentedControl
        value={progress.period}
        onChange={(value) => {
          if (PERIODS.includes(value as ProgressPeriod)) {
            progress.setPeriod(value as ProgressPeriod);
          }
        }}
        options={PERIODS.map((period) => ({
          value: period,
          label: t(`progress.periods.${period}`),
        }))}
      />
      <CalorieBarChart bars={progress.bars} />
      <WeeklyChallenge days={progress.challenge} />
      {progress.todaySummary ? (
        <GoalTrackingCard
          goalTracking={progress.goalSnapshot}
          todaySummary={progress.todaySummary}
        />
      ) : null}
      <Button
        title={t('progress.goalHistory')}
        variant="outline"
        onPress={() => router.push('/goal-history')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p16,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
}));
