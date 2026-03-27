import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Icon, Input, ScreenContainer, Text } from '@/common/components';
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

type FormErrors = Partial<Record<'age' | 'height' | 'weight', string>>;

const DEFAULT_FORM: ProfileFormState = {
  gender: 'male',
  age: '',
  height: '',
  weight: '',
  activityLevel: 'moderate',
};

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const [form, setForm] = useState<ProfileFormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [currentBmi, setCurrentBmi] = useState<number | null>(null);
  const [currentTarget, setCurrentTarget] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    const profile = await getUserProfile();

    if (!profile) {
      setHasProfile(false);
      setCurrentBmi(null);
      setCurrentTarget(null);
      setForm(DEFAULT_FORM);
      setIsLoading(false);
      return;
    }

    setHasProfile(true);
    setCurrentBmi(profile.bmi);
    setCurrentTarget(profile.dailyCalorieTarget);
    setForm({
      gender: profile.gender,
      age: String(profile.age),
      height: String(profile.heightCm),
      weight: String(profile.weightKg),
      activityLevel: profile.activityLevel,
    });
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const profileStatus = useMemo(() => {
    if (currentBmi === null || currentTarget === null) {
      return t('welcomeScreen.status.missing');
    }

    return t('welcomeScreen.status.ready', {
      bmi: currentBmi.toFixed(1),
      calorieTarget: currentTarget,
    });
  }, [currentBmi, currentTarget, t]);

  const updateField = (field: keyof ProfileFormState, value: string | Gender | ActivityLevel) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'age' || field === 'height' || field === 'weight') {
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    }
  };

  const handleContinue = () => {
    router.replace('/(main)/(tabs)');
  };

  const handleSubmit = async () => {
    const nextErrors: FormErrors = {};
    const age = Number(form.age);
    const heightCm = Number(form.height);
    const weightKg = Number(form.weight);

    if (!form.age.trim()) {
      nextErrors.age = t('validation.required');
    } else if (Number.isNaN(age)) {
      nextErrors.age = t('welcomeScreen.validation.number');
    } else if (age <= 0) {
      nextErrors.age = t('welcomeScreen.validation.positive');
    }

    if (!form.height.trim()) {
      nextErrors.height = t('validation.required');
    } else if (Number.isNaN(heightCm)) {
      nextErrors.height = t('welcomeScreen.validation.number');
    } else if (heightCm <= 0) {
      nextErrors.height = t('welcomeScreen.validation.positive');
    }

    if (!form.weight.trim()) {
      nextErrors.weight = t('validation.required');
    } else if (Number.isNaN(weightKg)) {
      nextErrors.weight = t('welcomeScreen.validation.number');
    } else if (weightKg <= 0) {
      nextErrors.weight = t('welcomeScreen.validation.positive');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);

    const profile = await upsertUserProfile({
      gender: form.gender,
      age,
      heightCm,
      weightKg,
      activityLevel: form.activityLevel,
    });

    setCurrentBmi(profile?.bmi ?? null);
    setCurrentTarget(profile?.dailyCalorieTarget ?? null);
    setHasProfile(true);
    setIsSaving(false);
    router.replace('/(main)/(tabs)');
  };

  if (isLoading) {
    return (
      <ScreenContainer padded edges={['top', 'bottom']}>
        <Text>{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable padded edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <LinearGradient colors={theme.colors.gradient.primary} style={styles.heroCard}>
          <View style={styles.logoBubble}>
            <Icon name="nutrition-outline" variant="secondary" size={32} />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="h1">{t('welcomeScreen.title')}</Text>
            <Text variant="body" color="secondary">
              {t('welcomeScreen.subtitle')}
            </Text>
          </View>
          <Card variant="filled" style={styles.statusCard}>
            <Text variant="caption" color="secondary">
              {t('welcomeScreen.profileStatus')}
            </Text>
            <Text variant="h3">{profileStatus}</Text>
          </Card>
        </LinearGradient>

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
                const isActive = form.gender === gender;

                return (
                  <Pressable
                    key={gender}
                    accessibilityRole="button"
                    accessibilityLabel={t(`welcomeScreen.genderOptions.${gender}`)}
                    style={[styles.optionPill, isActive && styles.optionPillActive]}
                    onPress={() => updateField('gender', gender)}
                  >
                    <Text
                      variant="caption"
                      weight="semibold"
                      color={isActive ? 'inverse' : 'secondary'}
                    >
                      {t(`welcomeScreen.genderOptions.${gender}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label={t('welcomeScreen.fields.age')}
            value={form.age}
            onChangeText={(value) => updateField('age', value)}
            keyboardType="number-pad"
            error={errors.age}
            placeholder={t('welcomeScreen.placeholders.age')}
          />
          <Input
            label={t('welcomeScreen.fields.height')}
            value={form.height}
            onChangeText={(value) => updateField('height', value)}
            keyboardType="number-pad"
            error={errors.height}
            placeholder={t('welcomeScreen.placeholders.height')}
          />
          <Input
            label={t('welcomeScreen.fields.weight')}
            value={form.weight}
            onChangeText={(value) => updateField('weight', value)}
            keyboardType="number-pad"
            error={errors.weight}
            placeholder={t('welcomeScreen.placeholders.weight')}
          />

          <View style={styles.optionGroup}>
            <Text variant="label">{t('welcomeScreen.fields.activityLevel')}</Text>
            <View style={styles.optionWrap}>
              {ACTIVITY_LEVEL_KEYS.map((activityLevel) => {
                const isActive = form.activityLevel === activityLevel;

                return (
                  <Pressable
                    key={activityLevel}
                    accessibilityRole="button"
                    accessibilityLabel={t(`welcomeScreen.activityLevels.${activityLevel}`)}
                    style={[styles.optionPill, isActive && styles.optionPillActive]}
                    onPress={() => updateField('activityLevel', activityLevel)}
                  >
                    <Text
                      variant="caption"
                      weight="semibold"
                      color={isActive ? 'inverse' : 'secondary'}
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

        <View style={styles.actions}>
          <Button
            title={t('welcomeScreen.saveAction')}
            fullWidth
            loading={isSaving}
            onPress={() => {
              void handleSubmit();
            }}
          />
          {hasProfile ? (
            <Button
              title={t('welcomeScreen.continueAction')}
              variant="secondary"
              fullWidth
              onPress={handleContinue}
            />
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
    paddingTop: theme.metrics.spacingV.p8,
  },
  heroCard: {
    borderRadius: theme.metrics.borderRadius.xl,
    padding: theme.metrics.spacing.p24,
    gap: theme.metrics.spacingV.p16,
  },
  logoBubble: {
    width: theme.metrics.spacing.p72,
    height: theme.metrics.spacing.p72,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  heroCopy: {
    gap: theme.metrics.spacingV.p8,
  },
  statusCard: {
    gap: vs(6),
    backgroundColor: theme.colors.background.surface,
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
  optionPill: {
    minWidth: '30%',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  optionPillActive: {
    backgroundColor: theme.colors.brand.primary,
  },
  summaryCard: {
    gap: vs(6),
    backgroundColor: theme.colors.background.section,
  },
  actions: {
    gap: theme.metrics.spacingV.p12,
  },
}));
