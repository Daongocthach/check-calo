import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Dialog, IconButton, ProgressBar, Text } from '@/common/components';
import { formatDayDate, formatWholeNumber } from '@/features/food-log/utils/format';
import { formatDateKey } from '@/utils/date';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';
import { useGoalTracking } from '../../hooks/useGoalTracking';
import type { GoalTrackingSnapshot, WeightGoalProgress } from '../../types';
import { getReachedMaintainMilestone } from '../../utils/goalProgress';
import { formatWeightGoalTitle } from '../../utils/goalTracking';

const EDIT_GOAL_ROUTE = { pathname: '/welcome', params: { mode: 'edit' } } as const;

/** The latest reached weight target the user has not been congratulated on yet. */
function getUncelebratedGoal(snapshot: GoalTrackingSnapshot | null) {
  const goal = snapshot?.latestCompletedGoal ?? null;

  if (!goal || goal.goal.mode === 'maintain') {
    return null;
  }

  const celebrated = getItem<string>(STORAGE_KEYS.app.celebratedGoalId);
  return celebrated.success && celebrated.data === goal.goal.id ? null : goal;
}

/** How a congratulated maintain milestone is stored: `goalId:days`. */
function getMilestoneKey(goalId: string, days: number) {
  return `${goalId}:${days}`;
}

/** The highest maintain milestone reached that has not been congratulated on yet. */
function getUncelebratedMilestone(progress: WeightGoalProgress | null) {
  if (!progress || progress.goal.mode !== 'maintain') {
    return null;
  }

  const days = getReachedMaintainMilestone(progress.progressValue);

  if (days === null) {
    return null;
  }

  const celebrated = getItem<string>(STORAGE_KEYS.app.celebratedMaintainMilestone);
  const [goalId, celebratedDays] =
    celebrated.success && typeof celebrated.data === 'string' ? celebrated.data.split(':') : [];

  return goalId === progress.goal.id && Number(celebratedDays) >= days ? null : days;
}

/**
 * The active goal on the dashboard: progress by the diary, what is left and when it should
 * end, with shortcuts to change the goal or see past ones. Reaching it asks for the next one.
 * Maintaining has no end: it shows the on-target days of the last week and since it started,
 * with a congratulation at each milestone.
 */
export function GoalSummaryCard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { snapshot } = useGoalTracking();
  const [dismissedGoalId, setDismissedGoalId] = useState<string | null>(null);
  const reachedGoal = getUncelebratedGoal(snapshot);
  const celebrating = reachedGoal !== null && reachedGoal.goal.id !== dismissedGoalId;
  const progress = snapshot?.activeGoal ?? null;
  const [dismissedMilestone, setDismissedMilestone] = useState<string | null>(null);
  const milestoneDays = getUncelebratedMilestone(progress);
  const milestoneKey =
    progress && milestoneDays !== null ? getMilestoneKey(progress.goal.id, milestoneDays) : null;
  const celebratingMilestone =
    !celebrating && milestoneKey !== null && milestoneKey !== dismissedMilestone;

  const closeCelebration = (next?: () => void) => {
    if (reachedGoal) {
      setItem(STORAGE_KEYS.app.celebratedGoalId, reachedGoal.goal.id);
      setDismissedGoalId(reachedGoal.goal.id);
    }
    next?.();
  };

  const closeMilestone = () => {
    if (milestoneKey) {
      setItem(STORAGE_KEYS.app.celebratedMaintainMilestone, milestoneKey);
      setDismissedMilestone(milestoneKey);
    }
  };

  const format = (value: number) => formatWholeNumber(value, i18n.language);
  const unit = progress?.unit === 'days' ? t('home.goalSummary.daysUnit') : t('common.units.kcal');
  const recent = progress?.recent ?? null;
  // A key of its own: most app languages have no singular plural form to say "today".
  const recentLabel =
    recent?.days === 1
      ? t('home.goalSummary.maintainToday')
      : t('home.goalSummary.maintainRecent', { count: recent?.days ?? 0 });

  return (
    <>
      {progress ? (
        <View style={styles.card}>
          <View style={styles.header}>
            <Text variant="body" weight="bold" style={styles.title}>
              {t('home.goalSummary.title')} - {t(`home.goalSummary.modes.${progress.goal.mode}`)}
            </Text>
            <View style={styles.actions}>
              <View style={styles.actionButton}>
                <IconButton
                  icon="time-outline"
                  size="sm"
                  onPress={() => router.push('/goal-history')}
                  accessibilityLabel={t('profileTab.goalHistory')}
                />
              </View>
              <View style={styles.actionButton}>
                <IconButton
                  icon="create-outline"
                  size="sm"
                  onPress={() => router.push(EDIT_GOAL_ROUTE)}
                  accessibilityLabel={t('home.goalSummary.changeGoal')}
                />
              </View>
            </View>
          </View>
          {recent ? (
            <>
              <View style={styles.progress}>
                <Text variant="caption" color="secondary">
                  {recentLabel}
                </Text>
                <View style={styles.progressLabels}>
                  <Text variant="bodySmall" weight="bold" style={styles.progressCurrent}>
                    {t('home.goalSummary.maintainOnTarget', {
                      value: format(recent.onTargetDays),
                    })}
                  </Text>
                  <Text variant="bodySmall" color="secondary" style={styles.progressTotal}>
                    {format(recent.days)} {unit}
                  </Text>
                </View>
                <ProgressBar
                  value={Math.round((recent.onTargetDays / recent.days) * 100)}
                  accessibilityLabel={recentLabel}
                />
              </View>
              <View style={styles.details}>
                <View style={styles.detailColumn}>
                  <Text variant="caption" color="secondary">
                    {t('home.goalSummary.maintainTotal')}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {format(progress.progressValue)} {unit}
                  </Text>
                </View>
                <View style={[styles.detailColumn, styles.detailRight]}>
                  <Text variant="caption" color="secondary" align="right">
                    {t('home.goalSummary.maintainSince')}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue} align="right">
                    {formatDayDate(formatDateKey(progress.goal.startedAt), i18n.language)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.progress}>
                <Text variant="caption" color="secondary">
                  {t('home.goalSummary.progress')}
                </Text>
                <View style={styles.progressLabels}>
                  <Text variant="bodySmall" weight="bold" style={styles.progressCurrent}>
                    {format(progress.progressValue)} {unit}
                  </Text>
                  <Text variant="bodySmall" color="secondary" style={styles.progressTotal}>
                    {format(progress.targetValue)} {unit}
                  </Text>
                </View>
                <ProgressBar
                  value={progress.progressPercent}
                  accessibilityLabel={t('home.goalSummary.progress')}
                />
              </View>
              <View style={styles.details}>
                <View style={styles.detailColumn}>
                  <Text variant="caption" color="secondary">
                    {t(`home.goalSummary.remaining.${progress.goal.mode}`)}
                  </Text>
                  <Text variant="bodySmall" style={styles.detailValue}>
                    {format(progress.remainingValue)} {unit}
                  </Text>
                </View>
                {progress.expectedEndDate ? (
                  <View style={[styles.detailColumn, styles.detailRight]}>
                    <Text variant="caption" color="secondary" align="right">
                      {t('home.goalSummary.expectedEnd')}
                    </Text>
                    <Text variant="bodySmall" style={styles.detailValue} align="right">
                      {formatDayDate(progress.expectedEndDate, i18n.language)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
      ) : null}

      <Dialog
        visible={celebrating}
        onDismiss={() => closeCelebration()}
        title={t('home.goalSummary.reachedTitle', {
          goal: reachedGoal ? formatWeightGoalTitle(t, reachedGoal.goal) : '',
        })}
        message={t('home.goalSummary.reachedMessage')}
        actions={[
          {
            label: t('home.goalSummary.keepMaintaining'),
            onPress: () => closeCelebration(),
            variant: 'ghost',
          },
          {
            label: t('home.goalSummary.nextGoal'),
            onPress: () => closeCelebration(() => router.push(EDIT_GOAL_ROUTE)),
            variant: 'primary',
          },
        ]}
      />

      <Dialog
        visible={celebratingMilestone}
        onDismiss={closeMilestone}
        title={t('home.goalSummary.milestoneTitle', { value: milestoneDays ?? 0 })}
        message={t('home.goalSummary.milestoneMessage', { value: milestoneDays ?? 0 })}
        actions={[
          {
            label: t('home.goalSummary.milestoneAction'),
            onPress: closeMilestone,
            variant: 'primary',
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    padding: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p12,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: theme.colors.shadow.elevationSmall,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  title: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  actionButton: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.md,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  progress: { gap: theme.metrics.spacingV.p8 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  progressCurrent: { flexShrink: 1 },
  progressTotal: { flexShrink: 1, textAlign: 'right' },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p16,
  },
  detailColumn: { flex: 1, minWidth: 0, gap: theme.metrics.spacingV.p4 },
  detailRight: { alignItems: 'flex-end' },
  detailValue: { fontStyle: 'italic' },
}));
