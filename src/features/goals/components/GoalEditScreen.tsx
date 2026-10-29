import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Checkbox, Dialog, Loading, ScreenContainer, Text } from '@/common/components';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { SectionCard } from '@/features/profile/components/onboarding/OnboardingParts';
import { getUserProfile, toUserProfileInput } from '@/features/profile/services/profileRepository';
import { saveProfile, TRANSITION_DAYS } from '@/features/profile/services/profileService';
import type { UserProfile } from '@/features/profile/types';
import {
  calculateDailyCalorieTarget,
  calculateMaintenanceCalorieTarget,
  getWeightGoalMode,
} from '@/features/profile/utils/calorie';
import { toast } from '@/utils/toast';
import { useGoalTracking } from '../hooks/useGoalTracking';
import { draftFromPlan, planFromDraft, type GoalDraft } from '../utils/goalPlan';
import { GoalPlanner } from './GoalPlanner';

/** Changes the goal: same direction edits it in place, a new direction starts a new one. */
export function GoalEditScreen() {
  const { t } = useTranslation();
  const { data: profile } = useFoodLogQuery('profile', getUserProfile);
  const { snapshot } = useGoalTracking();

  return (
    <ScreenContainer padded={false} edges={['bottom']} title={t('goalEdit.title')} scrollable>
      {profile && snapshot ? (
        <GoalEditForm
          profile={profile}
          // Profiles saved before target weights keep the running goal's target.
          targetWeightKg={
            profile.targetWeightKg ?? snapshot.activeGoal?.goal.targetWeightKg ?? null
          }
        />
      ) : (
        <Loading />
      )}
    </ScreenContainer>
  );
}

function GoalEditForm({
  profile,
  targetWeightKg,
}: {
  profile: UserProfile;
  targetWeightKg: number | null;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ restart?: string }>();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const [draft, setDraft] = useState<GoalDraft>(() =>
    draftFromPlan(profile, profile.monthlyWeightGoalKg, targetWeightKg)
  );
  const [restart, setRestart] = useState(params.restart === '1');
  const [transition, setTransition] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const input = { ...toUserProfileInput(profile), ...planFromDraft(profile, draft) };
  const currentMode = getWeightGoalMode(profile.monthlyWeightGoalKg);
  const nextMode = getWeightGoalMode(input.monthlyWeightGoalKg);
  const changesMode = nextMode !== currentMode;
  const reversesDirection = changesMode && currentMode !== 'maintain' && nextMode !== 'maintain';
  const maintenanceCalories = calculateMaintenanceCalorieTarget(input);
  const nextCalories = calculateDailyCalorieTarget(input);
  const numberFormat = new Intl.NumberFormat(i18n.language);

  const save = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await saveProfile(input, {
        restart: restart && !changesMode,
        transition: reversesDirection && transition,
      });
      markFoodEntriesChanged();
      toast.success(t('goalEdit.saved'));
      setIsConfirming(false);
      router.back();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.content}>
      <SectionCard icon="flag-outline" title={t('onboarding.goal')}>
        <GoalPlanner body={profile} draft={draft} onChange={setDraft} />
      </SectionCard>

      {changesMode ? null : (
        <View style={styles.restart}>
          <Checkbox checked={restart} onChange={setRestart} label={t('goalEdit.restart')} />
          <Text variant="caption" color="secondary">
            {t('goalEdit.restartHint')}
          </Text>
        </View>
      )}

      <Button
        title={t('common.save')}
        size="lg"
        fullWidth
        loading={isSaving}
        onPress={() => {
          if (changesMode) {
            setIsConfirming(true);
            return;
          }
          void save();
        }}
      />

      <Dialog
        visible={isConfirming}
        onDismiss={() => setIsConfirming(false)}
        title={t('goalEdit.confirmTitle', { mode: t(`onboarding.goals.${nextMode}.title`) })}
        message={t('goalEdit.confirmMessage', {
          from: numberFormat.format(profile.dailyCalorieTarget),
          to: numberFormat.format(
            reversesDirection && transition ? maintenanceCalories : nextCalories
          ),
        })}
        actions={[
          { label: t('common.cancel'), onPress: () => setIsConfirming(false), variant: 'ghost' },
          {
            label: t('goalEdit.confirmAction'),
            onPress: () => {
              void save();
            },
            variant: 'primary',
            loading: isSaving,
          },
        ]}
      >
        {reversesDirection ? (
          <View style={styles.transition}>
            <Checkbox
              checked={transition}
              onChange={setTransition}
              label={t('goalEdit.transition', {
                count: TRANSITION_DAYS / 7,
                kcal: numberFormat.format(maintenanceCalories),
              })}
            />
            <Text variant="caption" color="secondary">
              {t('goalEdit.transitionHint', {
                kcal: numberFormat.format(nextCalories),
              })}
            </Text>
          </View>
        ) : null}
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p24,
    gap: theme.metrics.spacingV.p16,
  },
  restart: {
    gap: theme.metrics.spacingV.p4,
  },
  transition: {
    gap: theme.metrics.spacingV.p8,
  },
}));
