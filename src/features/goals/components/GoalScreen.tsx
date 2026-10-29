import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Dialog, ScreenHeader } from '@/common/components';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { DrawerMenuButton } from '@/features/navigation';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { SettingsGroup, SettingsRow } from '@/features/settings/components/SettingsRow';
import { useBottomPadding } from '@/hooks';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';
import { useGoalTracking } from '../hooks/useGoalTracking';
import type { GoalTrackingSnapshot } from '../types';
import { formatWeightGoalTitle } from '../utils/goalTracking';
import { GoalTrackingCard } from './GoalTrackingCard';

/** The latest reached weight target the user has not been congratulated on yet. */
function getUncelebratedGoal(snapshot: GoalTrackingSnapshot | null) {
  const goal = snapshot?.latestCompletedGoal ?? null;

  if (!goal || goal.goal.mode === 'maintain') {
    return null;
  }

  const celebrated = getItem<string>(STORAGE_KEYS.app.celebratedGoalId);
  return celebrated.success && celebrated.data === goal.goal.id ? null : goal;
}

export function GoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const { data: profile } = useFoodLogQuery('profile', getUserProfile);
  const goals = useGoalTracking();
  const [dismissedGoalId, setDismissedGoalId] = useState<string | null>(null);
  const reachedGoal = getUncelebratedGoal(goals.snapshot);
  const celebrating = reachedGoal !== null && reachedGoal.goal.id !== dismissedGoalId;

  const closeCelebration = (next?: () => void) => {
    if (reachedGoal) {
      setItem(STORAGE_KEYS.app.celebratedGoalId, reachedGoal.goal.id);
      setDismissedGoalId(reachedGoal.goal.id);
    }
    next?.();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('goalScreen.title')}
        subtitle={t('goalScreen.subtitle')}
        right={<DrawerMenuButton />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        // The weigh-in dialog gets touches through this ScrollView; without this the first
        // tap on its buttons only dismisses the keyboard.
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {goals.todaySummary ? (
          <GoalTrackingCard
            goalTracking={goals.snapshot}
            todaySummary={goals.todaySummary}
            profile={profile}
          />
        ) : null}

        <SettingsGroup title={t('goalScreen.manage')}>
          <SettingsRow
            icon="flag-outline"
            title={t('goalScreen.changeGoal')}
            subtitle={t('goalScreen.changeGoalHint')}
            onPress={() => router.push('/goal-edit')}
          />
          <SettingsRow
            icon="trophy-outline"
            title={t('profileTab.goalHistory')}
            onPress={() => router.push('/goal-history')}
          />
        </SettingsGroup>
      </ScrollView>

      <Dialog
        visible={celebrating}
        onDismiss={() => closeCelebration()}
        title={t('goalScreen.reachedTitle', {
          goal: reachedGoal ? formatWeightGoalTitle(t, reachedGoal.goal) : '',
        })}
        message={t('goalScreen.reachedMessage')}
        actions={[
          {
            label: t('goalTracking.newGoalAction'),
            onPress: () => closeCelebration(() => router.push('/goal-edit')),
            variant: 'ghost',
          },
          {
            label: t('goalScreen.keepMaintaining'),
            onPress: () => closeCelebration(),
            variant: 'primary',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p20,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
}));
