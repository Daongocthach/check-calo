import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Icon, Input, ScreenContainer, Text } from '@/common/components';
import { vs } from '@/theme/metrics';
import { STORAGE_KEYS } from '@/utils/storage/constants';
import { useStorage } from '@/utils/storage/useStorage';

interface BmiProfile {
  age: number;
  height: number;
  weight: number;
  bmi: number;
}

interface ProfileFormState {
  age: string;
  height: string;
  weight: string;
}

type FormErrors = Partial<Record<keyof ProfileFormState, string>>;

function calculateBmi(height: number, weight: number) {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { value, setValue, loading } = useStorage<BmiProfile>(STORAGE_KEYS.profile.bmiProfile);

  const [form, setForm] = useState<ProfileFormState>({
    age: '',
    height: '',
    weight: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!value) return;

    setForm({
      age: String(value.age),
      height: String(value.height),
      weight: String(value.weight),
    });
  }, [value]);

  const bmiStatus = useMemo(() => {
    if (!value) return t('welcomeScreen.status.missing');
    return t('welcomeScreen.status.ready', { bmi: value.bmi.toFixed(1) });
  }, [t, value]);

  const handleChange = (field: keyof ProfileFormState, nextValue: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleContinue = () => {
    router.replace('/(main)/(tabs)');
  };

  const handleSubmit = () => {
    const nextErrors: FormErrors = {};

    if (!form.age.trim()) nextErrors.age = t('validation.required');
    if (!form.height.trim()) nextErrors.height = t('validation.required');
    if (!form.weight.trim()) nextErrors.weight = t('validation.required');

    const age = Number(form.age);
    const height = Number(form.height);
    const weight = Number(form.weight);

    if (form.age.trim() && Number.isNaN(age)) nextErrors.age = t('welcomeScreen.validation.number');
    if (form.height.trim() && Number.isNaN(height)) {
      nextErrors.height = t('welcomeScreen.validation.number');
    }
    if (form.weight.trim() && Number.isNaN(weight)) {
      nextErrors.weight = t('welcomeScreen.validation.number');
    }

    if (form.height.trim() && height <= 0) {
      nextErrors.height = t('welcomeScreen.validation.positive');
    }
    if (form.weight.trim() && weight <= 0) {
      nextErrors.weight = t('welcomeScreen.validation.positive');
    }
    if (form.age.trim() && age <= 0) nextErrors.age = t('welcomeScreen.validation.positive');

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const bmi = calculateBmi(height, weight);
    setValue({
      age,
      height,
      weight,
      bmi: Number(bmi.toFixed(1)),
    });

    router.replace('/(main)/(tabs)');
  };

  if (loading) {
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
            <Text variant="h3">{bmiStatus}</Text>
          </Card>
        </LinearGradient>

        <Card variant="elevated" style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text variant="h2">{t('welcomeScreen.formTitle')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('welcomeScreen.formSubtitle')}
            </Text>
          </View>

          <Input
            label={t('welcomeScreen.fields.age')}
            value={form.age}
            onChangeText={(nextValue) => handleChange('age', nextValue)}
            keyboardType="number-pad"
            error={errors.age}
            placeholder={t('welcomeScreen.placeholders.age')}
          />
          <Input
            label={t('welcomeScreen.fields.height')}
            value={form.height}
            onChangeText={(nextValue) => handleChange('height', nextValue)}
            keyboardType="number-pad"
            error={errors.height}
            placeholder={t('welcomeScreen.placeholders.height')}
          />
          <Input
            label={t('welcomeScreen.fields.weight')}
            value={form.weight}
            onChangeText={(nextValue) => handleChange('weight', nextValue)}
            keyboardType="number-pad"
            error={errors.weight}
            placeholder={t('welcomeScreen.placeholders.weight')}
          />
        </Card>

        {value ? (
          <Card variant="filled" style={styles.summaryCard}>
            <Text variant="h3">{t('welcomeScreen.summaryTitle')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('welcomeScreen.summaryBody', {
                bmi: value.bmi.toFixed(1),
                height: value.height,
                weight: value.weight,
              })}
            </Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button title={t('welcomeScreen.saveAction')} fullWidth onPress={handleSubmit} />
          {value ? (
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
  summaryCard: {
    gap: vs(6),
    backgroundColor: theme.colors.background.section,
  },
  actions: {
    gap: theme.metrics.spacingV.p12,
  },
}));
