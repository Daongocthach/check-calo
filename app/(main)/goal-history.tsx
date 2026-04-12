import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Chip, ProgressBar, ScreenContainer, TabsHeader, Text } from '@/common/components';
import { syncGoalTracking } from '@/features/nutrition/services/goalTrackingService';
import type {
  GoalTrackingSnapshot,
  WeightGoalProgress,
  WeightGoalStatus,
} from '@/features/nutrition/types';
import {
  formatWeightGoalTitle,
  getGoalCycleDayProgress,
} from '@/features/nutrition/utils/goalTracking';

function formatGoalHistoryDateRange(
  goalProgress: Pick<WeightGoalProgress, 'goal'>,
  locale: string
) {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const startedAt = formatter.format(new Date(goalProgress.goal.startedAt));
  const endedAt = formatter.format(
    new Date(goalProgress.goal.completedAt ?? goalProgress.goal.updatedAt)
  );

  return `${startedAt} - ${endedAt}`;
}

function getGoalStatusLabelKey(status: WeightGoalStatus) {
  switch (status) {
    case 'completed':
      return 'goalTracking.status.completed' as const;
    case 'cancelled':
      return 'goalTracking.status.cancelled' as const;
    default:
      return 'goalTracking.status.active' as const;
  }
}

export default function GoalHistoryScreen() {
  const { t, i18n } = useTranslation();
  const [goalTracking, setGoalTracking] = useState<GoalTrackingSnapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void syncGoalTracking().then((snapshot) => {
        if (!active) {
          return;
        }

        setGoalTracking(snapshot);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const goalHistory = goalTracking?.goalHistory ?? [];

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <TabsHeader
          title={t('goalTracking.history.title')}
          onBack={() => router.back()}
          showSync={false}
        />

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
              {goalHistory.map((goalItem) => {
                const goalCycleProgress = getGoalCycleDayProgress(goalItem);

                return (
                  <Card key={goalItem.goal.id} variant="filled" style={styles.historyItemCard}>
                    <View style={styles.historyItemHeader}>
                      <View style={styles.historyItemCopy}>
                        <Text variant="body" weight="semibold">
                          {formatWeightGoalTitle(t, goalItem.goal)}
                        </Text>
                        <Text variant="bodySmall" color="secondary">
                          {formatGoalHistoryDateRange(goalItem, i18n.language)}
                        </Text>
                      </View>
                      <Chip
                        label={t(getGoalStatusLabelKey(goalItem.goal.status))}
                        variant="outline"
                      />
                    </View>

                    <View style={styles.historyMetrics}>
                      <Text variant="bodySmall" color="secondary">
                        {goalItem.unit === 'days'
                          ? t('goalTracking.progressDays', {
                              current: goalItem.progressValue,
                              target: goalItem.targetValue,
                            })
                          : t('goalTracking.progressKcal', {
                              current: goalItem.progressValue,
                              target: goalItem.targetValue,
                            })}
                      </Text>
                      {goalCycleProgress ? (
                        <Text variant="bodySmall" color="secondary">
                          {t('goalTracking.progressDays', {
                            current: goalCycleProgress.current,
                            target: goalCycleProgress.target,
                          })}
                        </Text>
                      ) : null}
                    </View>

                    <ProgressBar value={goalItem.progressPercent} size="md" colorScheme="success" />
                  </Card>
                );
              })}
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
