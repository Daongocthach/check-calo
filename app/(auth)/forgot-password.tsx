import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import { sendPasswordResetEmail } from '@/features/auth/services/authService';
import { toast } from '@/utils/toast';
import AppLogo from '../../assets/splash-icon-light.png';

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
        <View style={styles.heroSection}>
          <Image source={AppLogo} style={styles.heroLogo} contentFit="contain" />
          <View style={styles.heroCopy}>
            <Text variant="body" weight="bold" align="center">
              {t('auth.forgotPasswordTitle')}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {t('auth.forgotPasswordSubtitle')}
            </Text>
          </View>
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
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  heroSection: {
    gap: theme.metrics.spacingV.p16,
    alignItems: 'center',
  },
  heroLogo: {
    width: theme.metrics.spacing.p120,
    height: theme.metrics.spacing.p120,
    transform: [{ scale: 1.2 }],
  },
  heroCopy: {
    gap: theme.metrics.spacingV.p8,
  },
  form: {
    gap: theme.metrics.spacingV.p12,
  },
}));
