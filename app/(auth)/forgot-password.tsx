import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import { sendPasswordResetEmail } from '@/features/auth/services/authService';
import { toast } from '@/utils/toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error(t('validation.emailInvalid'));
      return;
    }

    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail({ email: normalizedEmail });
      toast.success(t('auth.forgotPasswordSuccess'));
      router.replace('/(auth)/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.forgotPasswordFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable padded edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text variant="h2">{t('auth.forgotPasswordTitle')}</Text>
          <Text variant="bodySmall" color="secondary">
            {t('auth.forgotPasswordSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
          />

          <Button
            title={t('auth.forgotPasswordAction')}
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleSubmit}
          />

          <Button
            title={t('auth.goToLogin')}
            variant="ghost"
            disabled={isSubmitting}
            onPress={() => {
              router.replace('/(auth)/login');
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  header: {
    gap: theme.metrics.spacingV.p8,
  },
  form: {
    gap: theme.metrics.spacingV.p12,
  },
}));
