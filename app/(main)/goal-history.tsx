import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Chip, ProgressBar, ScreenContainer, Text } from '@/common/components';
import { formatDayDate, formatWholeNumber } from '@/features/food-log/utils/format';
import { useGoalTracking } from '@/features/goals/hooks/useGoalTracking';
import type { WeightGoal, WeightGoalProgress } from '@/features/goals/types';
import { formatWeightGoalTitle } from '@/features/goals/utils/goalTracking';
import { formatDateKey } from '@/utils/date';

const GOAL_PROGRESS_KEYS = {
  days: 'goalTracking.progressMaintainDays',
  kcal: 'goalTracking.progressKcal',
} as const satisfies Record<WeightGoalProgress['unit'], string>;

/** How a goal stopped; maintaining has no end to miss, so changing the goal just ends it. */
function getGoalEnding(goal: Pick<WeightGoal, 'mode' | 'status'>) {
  if (goal.status === 'cancelled' && goal.mode === 'maintain') {
    return 'ended' as const;
  }

  return goal.status;
}

function getGoalStatusLabelKey(goal: Pick<WeightGoal, 'mode' | 'status'>) {
  switch (getGoalEnding(goal)) {
    case 'completed':
      return 'goalTracking.status.completed' as const;
    case 'cancelled':
      return 'goalTracking.status.cancelled' as const;
    case 'ended':
      return 'goalTracking.status.ended' as const;
    default:
      return 'goalTracking.status.active' as const;
  }
}

function getGoalPeriodKey(goal: Pick<WeightGoal, 'mode' | 'status'>) {
  switch (getGoalEnding(goal)) {
    case 'completed':
      return 'goalTracking.history.period.completed' as const;
    case 'ended':
      return 'goalTracking.history.period.ended' as const;
    default:
      return 'goalTracking.history.period.cancelled' as const;
  }
}

export default function GoalHistoryScreen() {
  const { t, i18n } = useTranslation();
  // Shares the cached snapshot with the dashboard, so it renders without a reload.
  const { snapshot } = useGoalTracking();
  const goalHistory = snapshot?.goalHistory ?? [];

  return (
    <ScreenContainer padded={false} edges={['bottom']} title={t('profileTab.goalHistory')}>
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={styles.headerCopy}>
            <Text variant="bodySmall" color="secondary">
              {t('goalTracking.history.subtitle')}
            </Text>
          </View>

          {goalHistory.length === 0 ? (
            <Card variant="filled" style={styles.emptyCard}>
              <Text variant="bodySmall" color="secondary">
                {t('goalTracking.history.empty')}
              </Text>
            </Card>
          ) : (
            <View style={styles.historyList}>
              {goalHistory.map((goalItem) => (
                <Card key={goalItem.goal.id} variant="filled" style={styles.historyItemCard}>
                  <View style={styles.historyItemHeader}>
                    <View style={styles.historyItemCopy}>
                      <Text variant="body" weight="semibold">
                        {formatWeightGoalTitle(t, goalItem.goal)}
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        {t(getGoalPeriodKey(goalItem.goal), {
                          start: formatDayDate(
                            formatDateKey(goalItem.goal.startedAt),
                            i18n.language
                          ),
                          end: formatDayDate(
                            formatDateKey(goalItem.goal.endedAt ?? goalItem.goal.updatedAt),
                            i18n.language
                          ),
                        })}
                      </Text>
                    </View>
                    <Chip label={t(getGoalStatusLabelKey(goalItem.goal))} variant="outline" />
                  </View>

                  <View style={styles.historyMetrics}>
                    <Text variant="bodySmall" color="secondary">
                      {t(GOAL_PROGRESS_KEYS[goalItem.unit], {
                        current: formatWholeNumber(goalItem.progressValue, i18n.language),
                        target: formatWholeNumber(goalItem.targetValue, i18n.language),
                      })}
                    </Text>
                  </View>

                  <ProgressBar value={goalItem.progressPercent} size="md" colorScheme="success" />
                </Card>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
  },
  content: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  headerCopy: {
    gap: theme.metrics.spacingV.p4,
  },
  emptyCard: {
    gap: theme.metrics.spacingV.p8,
  },
  historyList: {
    gap: theme.metrics.spacingV.p12,
  },
  historyItemCard: {
    gap: theme.metrics.spacingV.p12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  historyItemCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  historyMetrics: {
    gap: theme.metrics.spacingV.p8,
  },
}));
