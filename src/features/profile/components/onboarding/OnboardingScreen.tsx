import { Redirect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native-unistyles';
import {
  Button,
  Checkbox,
  Icon,
  Loading,
  ProgressBar,
  ScreenHeader,
  Text,
} from '@/common/components';
import { BuddyMascot } from '@/features/buddy/components/BuddyMascot';
import { useBuddyName } from '@/features/buddy/hooks/useBuddyName';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import {
  getTargetWeightBounds,
  normalizeGoalDraft,
  type GoalDraft,
} from '@/features/goals/utils/goalPlan';
import { hs } from '@/theme/metrics';
import { toast } from '@/utils/toast';
import { toBodyStats, toGoalDraft, useProfileForm } from '../../hooks/useProfileForm';
import { getUserProfile } from '../../services/profileRepository';
import { TRANSITION_DAYS } from '../../services/profileService';
import type { UserProfile } from '../../types';
import { calculateMaintenanceCalorieTarget, getWeightGoalMode } from '../../utils/calorie';
import { AboutStep } from './AboutStep';
import { PlanStep } from './PlanStep';

const STEPS = ['about', 'plan'] as const;

interface OnboardingScreenProps {
  editing?: boolean;
  restart?: boolean;
}

export function OnboardingScreen({ editing = false, restart = false }: OnboardingScreenProps) {
  const { data: existingProfile, isLoading } = useFoodLogQuery('profile', getUserProfile);
  if (isLoading) return <Loading />;
  if (!editing && existingProfile) return <Redirect href="/" />;
  if (editing && !existingProfile) return <Redirect href="/welcome" />;
  return <OnboardingForm initialProfile={existingProfile} editing={editing} restart={restart} />;
}

interface OnboardingFormProps extends OnboardingScreenProps {
  initialProfile?: UserProfile | null;
}

function OnboardingForm({ initialProfile, editing = false, restart = false }: OnboardingFormProps) {
  const { t } = useTranslation();
  const { name: buddyName } = useBuddyName();
  const router = useRouter();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const [restartGoal, setRestartGoal] = useState(restart);
  const [transition, setTransition] = useState(false);
  const { form, plan, submit } = useProfileForm(initialProfile, {
    restart: editing && restartGoal,
    transition: editing && transition,
  });
  const { control, watch, getValues, setValue, trigger, formState } = form;
  const bmiAnimationPlayed = useRef(false);
  const [step, setStep] = useState(0);
  const [planReady, setPlanReady] = useState(false);
  const markPlanReady = useCallback(() => setPlanReady(true), []);
  const values = watch();
  const previousMode = initialProfile
    ? getWeightGoalMode(initialProfile.monthlyWeightGoalKg)
    : null;
  const sameDirection = previousMode === values.goalMode;
  const reversesDirection =
    previousMode !== null &&
    !sameDirection &&
    previousMode !== 'maintain' &&
    values.goalMode !== 'maintain';

  const applyGoal = (change: Partial<GoalDraft>) => {
    const current = getValues();
    const draft = normalizeGoalDraft(toBodyStats(current), {
      ...toGoalDraft(current),
      ...change,
      weeks: 0,
    });
    setValue('goalMode', draft.mode);
    setValue('targetWeightKg', draft.targetWeightKg);
    setValue('weeks', draft.weeks);
  };

  const goNext = async () => {
    if (step === 0 && !(await trigger(['displayName', 'age']))) {
      return;
    }

    const formValues = getValues();
    const draft = normalizeGoalDraft(toBodyStats(formValues), toGoalDraft(formValues));
    setValue('targetWeightKg', draft.targetWeightKg);
    setValue('weeks', draft.weeks);

    setPlanReady(false);
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const handleSubmit = async () => {
    try {
      const saved = await submit();
      if (!saved) {
        setStep(0);
        return;
      }
      markFoodEntriesChanged();
      toast.success(t(editing ? 'goalEdit.saved' : 'onboarding.saveSuccess'));
      if (editing && router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t(editing ? 'goalEdit.title' : 'onboarding.headerTitle')}
        showBack={editing}
      />
      <View style={styles.progress}>
        <Text variant="caption" color="secondary">
          {t('onboarding.step', {
            current: step + 1,
            total: STEPS.length,
            title: t(`onboarding.steps.${STEPS[step]}`),
          })}
        </Text>
        <ProgressBar value={((step + 1) / STEPS.length) * 100} size="sm" />
      </View>
      <KeyboardAwareScrollView
        // Each step starts at the top.
        key={step}
        contentContainerStyle={styles.content}
        bottomOffset={hs(24)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroText}>
                <Text variant="h2" weight="bold">
                  {t(editing ? 'onboarding.editTitle' : 'onboarding.title')}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {t(editing ? 'onboarding.editSubtitle' : 'onboarding.subtitle', {
                    name: buddyName,
                  })}
                </Text>
              </View>
              <BuddyMascot level={2} size={hs(96)} />
            </View>

            <AboutStep
              control={control}
              goalMode={values.goalMode}
              targetBounds={getTargetWeightBounds(toBodyStats(values), values.goalMode)}
              onGoalChange={applyGoal}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <PlanStep
              body={toBodyStats(values)}
              draft={toGoalDraft(values)}
              plan={plan}
              bmiAnimationPlayed={bmiAnimationPlayed}
              onReady={markPlanReady}
            />
            {planReady && editing && initialProfile ? (
              <View style={styles.editOptions}>
                {sameDirection ? (
                  <Checkbox
                    checked={restartGoal}
                    onChange={setRestartGoal}
                    label={t('goalEdit.restart')}
                  />
                ) : null}
                {reversesDirection ? (
                  <Checkbox
                    checked={transition}
                    onChange={setTransition}
                    label={t('goalEdit.transition', {
                      count: TRANSITION_DAYS / 7,
                      kcal: String(calculateMaintenanceCalorieTarget(toBodyStats(values))),
                    })}
                  />
                ) : null}
              </View>
            ) : null}
            {planReady ? (
              <View style={styles.sourceLink}>
                <Button
                  title={t('onboarding.healthSources')}
                  rightIcon={<Icon name="link-outline" variant="brand" size={18} />}
                  variant="ghost"
                  size="sm"
                  onPress={() => router.push('/health-sources')}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {step === 0 || planReady ? (
          <View style={styles.actions}>
            {step > 0 ? (
              <View style={styles.flex}>
                <Button
                  title={t('common.back')}
                  leftIcon={<Icon name="arrow-back" variant="primary" size={22} />}
                  variant="outline"
                  size="md"
                  fullWidth
                  onPress={() => setStep((current) => current - 1)}
                />
              </View>
            ) : null}
            <View style={styles.flex}>
              {step < STEPS.length - 1 ? (
                <Button
                  title={t(editing ? 'onboarding.previewUpdate' : 'onboarding.createPlan')}
                  rightIcon={<Icon name="arrow-forward" variant="onBrand" size={22} />}
                  size="md"
                  fullWidth
                  onPress={() => {
                    void goNext();
                  }}
                />
              ) : (
                <Button
                  title={t(editing ? 'common.save' : 'onboarding.start')}
                  rightIcon={<Icon name="arrow-forward" variant="onBrand" size={22} />}
                  size="md"
                  fullWidth
                  loading={formState.isSubmitting}
                  onPress={() => {
                    void handleSubmit();
                  }}
                />
              )}
            </View>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
  },
  progress: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p12,
    gap: theme.metrics.spacingV.p8,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p24,
    gap: theme.metrics.spacingV.p16,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  heroText: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  flex: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  editOptions: { gap: theme.metrics.spacingV.p8 },
  sourceLink: { alignItems: 'flex-end' },
  actions: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
}));
