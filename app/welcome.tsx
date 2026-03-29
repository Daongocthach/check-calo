import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Input, ScreenContainer, Text } from '@/common/components';
import { ACTIVITY_LEVEL_KEYS, GENDER_KEYS } from '@/features/nutrition/constants';
import { getUserProfile, upsertUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import type { ActivityLevel, Gender } from '@/features/nutrition/types';
import { vs } from '@/theme/metrics';

interface ProfileFormState {
  gender: Gender;
  age: string;
  height: string;
  weight: string;
  activityLevel: ActivityLevel;
}

const DEFAULT_FORM: ProfileFormState = {
  gender: 'male',
  age: '18',
  height: '170',
  weight: '65',
  activityLevel: 'moderate',
};

function isPositiveNumber(value: string) {
  const parsedValue = Number(value);
  return !Number.isNaN(parsedValue) && parsedValue > 0;
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentBmi, setCurrentBmi] = useState<number | null>(null);
  const [currentTarget, setCurrentTarget] = useState<number | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormState>({
    defaultValues: DEFAULT_FORM,
  });

  const selectedGender = watch('gender');
  const selectedActivityLevel = watch('activityLevel');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    const profile = await getUserProfile();

    if (!profile) {
      setCurrentBmi(null);
      setCurrentTarget(null);
      reset(DEFAULT_FORM);
      setIsLoading(false);
      return;
    }

    setCurrentBmi(profile.bmi);
    setCurrentTarget(profile.dailyCalorieTarget);
    reset({
      gender: profile.gender,
      age: String(profile.age),
      height: String(profile.heightCm),
      weight: String(profile.weightKg),
      activityLevel: profile.activityLevel,
    });
    setIsLoading(false);
  }, [reset]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const onSubmit = async (form: ProfileFormState) => {
    setIsSaving(true);

    const profile = await upsertUserProfile({
      gender: form.gender,
      age: Number(form.age),
      heightCm: Number(form.height),
      weightKg: Number(form.weight),
      activityLevel: form.activityLevel,
    });

    setCurrentBmi(profile?.bmi ?? null);
    setCurrentTarget(profile?.dailyCalorieTarget ?? null);
    setIsSaving(false);
    router.replace('/(main)/(tabs)');
  };

  if (isLoading) {
    return (
      <ScreenContainer padded edges={['bottom']}>
        <Text>{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={[]}>
      <View style={styles.layout}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={theme.metrics.spacingV.p24}
        >
          <View style={styles.screen}>
            <Card variant="elevated" style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text variant="h2">{t('welcomeScreen.formTitle')}</Text>
                <Text variant="bodySmall" color="secondary">
                  {t('welcomeScreen.formSubtitle')}
                </Text>
              </View>

              <View style={styles.optionGroup}>
                <Text variant="label">{t('welcomeScreen.fields.gender')}</Text>
                <View style={styles.optionRow}>
                  {GENDER_KEYS.map((gender) => {
                    const isActive = selectedGender === gender;

                    return (
                      <Pressable
                        key={gender}
                        accessibilityRole="button"
                        accessibilityLabel={t(`welcomeScreen.genderOptions.${gender}`)}
                        style={[styles.optionPill, isActive && styles.optionPillActive]}
                        onPress={() => setValue('gender', gender, { shouldValidate: true })}
                      >
                        <Text
                          variant="caption"
                          weight="semibold"
                          color={isActive ? 'primary' : 'secondary'}
                        >
                          {t(`welcomeScreen.genderOptions.${gender}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Controller
                control={control}
                name="age"
                rules={{
                  required: t('validation.required'),
                  validate: (value) =>
                    isPositiveNumber(value) || t('welcomeScreen.validation.positive'),
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('welcomeScreen.fields.age')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    error={errors.age?.message}
                    placeholder={t('welcomeScreen.placeholders.age')}
                  />
                )}
              />

              <View style={styles.measurementRow}>
                <View style={styles.measurementField}>
                  <Controller
                    control={control}
                    name="height"
                    rules={{
                      required: t('validation.required'),
                      validate: (value) =>
                        isPositiveNumber(value) || t('welcomeScreen.validation.positive'),
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('welcomeScreen.fields.height')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                        error={errors.height?.message}
                        placeholder={t('welcomeScreen.placeholders.height')}
                      />
                    )}
                  />
                </View>
                <View style={styles.measurementField}>
                  <Controller
                    control={control}
                    name="weight"
                    rules={{
                      required: t('validation.required'),
                      validate: (value) =>
                        isPositiveNumber(value) || t('welcomeScreen.validation.positive'),
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('welcomeScreen.fields.weight')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                        error={errors.weight?.message}
                        placeholder={t('welcomeScreen.placeholders.weight')}
                      />
                    )}
                  />
                </View>
              </View>

              <View style={styles.optionGroup}>
                <Text variant="label">{t('welcomeScreen.fields.activityLevel')}</Text>
                <View style={styles.optionWrap}>
                  {ACTIVITY_LEVEL_KEYS.map((activityLevel) => {
                    const isActive = selectedActivityLevel === activityLevel;

                    return (
                      <Pressable
                        key={activityLevel}
                        accessibilityRole="button"
                        accessibilityLabel={t(`welcomeScreen.activityLevels.${activityLevel}`)}
                        style={[styles.optionPill, isActive && styles.optionPillActive]}
                        onPress={() =>
                          setValue('activityLevel', activityLevel, { shouldValidate: true })
                        }
                      >
                        <Text
                          variant="caption"
                          weight="semibold"
                          color={isActive ? 'primary' : 'secondary'}
                        >
                          {t(`welcomeScreen.activityLevels.${activityLevel}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>

            {currentBmi !== null && currentTarget !== null ? (
              <Card variant="filled" style={styles.summaryCard}>
                <Text variant="h3">{t('welcomeScreen.summaryTitle')}</Text>
                <Text variant="bodySmall" color="secondary">
                  {t('welcomeScreen.summaryBody', {
                    bmi: currentBmi.toFixed(1),
                    calorieTarget: currentTarget,
                  })}
                </Text>
              </Card>
            ) : null}
          </View>
        </KeyboardAwareScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + theme.metrics.spacingV.p16,
            },
          ]}
        >
          <View style={styles.actions}>
            <Button
              title={t('welcomeScreen.saveAction')}
              fullWidth
              loading={isSaving}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  layout: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p120,
  },
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  formCard: {
    gap: theme.metrics.spacingV.p16,
  },
  formHeader: {
    gap: theme.metrics.spacingV.p4,
  },
  optionGroup: {
    gap: theme.metrics.spacingV.p8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p12,
  },
  measurementField: {
    flex: 1,
  },
  optionPill: {
    minWidth: '30%',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.input,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  optionPillActive: {
    backgroundColor: theme.colors.brand.primaryVariant,
    borderWidth: 1,
    borderColor: theme.colors.brand.primary,
  },
  summaryCard: {
    gap: vs(6),
    backgroundColor: theme.colors.background.section,
  },
  footer: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.app,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  actions: {
    gap: theme.metrics.spacingV.p12,
  },
}));
