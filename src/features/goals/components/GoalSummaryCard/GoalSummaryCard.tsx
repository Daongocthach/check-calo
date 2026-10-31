import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Chip, Dialog, IconButton, Text } from '@/common/components';
import { formatDayDate, formatWholeNumber } from '@/features/food-log/utils/format';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';
import { useGoalTracking } from '../../hooks/useGoalTracking';
import type { GoalTrackingSnapshot } from '../../types';
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

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last ? null : styles.rowDivider]}>
      <Text variant="bodySmall" color="secondary">
        {label}
      </Text>
      <Text variant="bodySmall" weight="bold" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The active goal on the dashboard: progress by the diary, what is left and when it should
 * end, with shortcuts to change the goal or see past ones. Reaching it asks for the next one.
 */
export function GoalSummaryCard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { snapshot } = useGoalTracking();
  const [dismissedGoalId, setDismissedGoalId] = useState<string | null>(null);
  const reachedGoal = getUncelebratedGoal(snapshot);
  const celebrating = reachedGoal !== null && reachedGoal.goal.id !== dismissedGoalId;
  const progress = snapshot?.activeGoal ?? null;

  const closeCelebration = (next?: () => void) => {
    if (reachedGoal) {
      setItem(STORAGE_KEYS.app.celebratedGoalId, reachedGoal.goal.id);
      setDismissedGoalId(reachedGoal.goal.id);
    }
    next?.();
  };

  const format = (value: number) => formatWholeNumber(value, i18n.language);
  const unit = progress?.unit === 'days' ? t('home.goalSummary.daysUnit') : t('common.units.kcal');

  return (
    <>
      {progress ? (
        <View style={styles.card}>
          <View style={styles.header}>
            <Text variant="body" weight="bold" style={styles.title}>
              {t('home.goalSummary.title')}
            </Text>
            <View style={styles.actions}>
              <Chip text={t(`home.goalSummary.modes.${progress.goal.mode}`)} size="sm" selected />
              <IconButton
                icon="time-outline"
                size="sm"
                onPress={() => router.push('/goal-history')}
                accessibilityLabel={t('profileTab.goalHistory')}
              />
              <IconButton
                icon="pencil-outline"
                size="sm"
                onPress={() => router.push(EDIT_GOAL_ROUTE)}
                accessibilityLabel={t('home.goalSummary.changeGoal')}
              />
            </View>
          </View>
          <View style={styles.table}>
            <SummaryRow
              label={t('home.goalSummary.progress')}
              value={`${format(progress.progressValue)} / ${format(progress.targetValue)} ${unit}`}
            />
            <SummaryRow
              label={t(`home.goalSummary.remaining.${progress.goal.mode}`)}
              value={`${format(progress.remainingValue)} ${unit}`}
            />
            <SummaryRow
              label={t('home.goalSummary.expectedEnd')}
              value={formatDayDate(progress.expectedEndDate, i18n.language)}
              last
            />
          </View>
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
  table: {
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    paddingHorizontal: theme.metrics.spacing.p12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
}));
