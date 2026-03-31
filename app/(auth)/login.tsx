import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import { login } from '@/features/auth/services/authService';
import { useAuthStore } from '@/providers/auth/authStore';
import { toast } from '@/utils/toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error(t('validation.emailInvalid'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('validation.passwordMin'));
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: normalizedEmail,
        password,
      });
      toast.success(t('auth.loginSuccess'));
      router.replace('/(main)/(tabs)/profile');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.loginFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable padded edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text variant="h2">{t('auth.loginTitle')}</Text>
          <Text variant="bodySmall" color="secondary">
            {authUser?.isAnonymous ? t('auth.loginSubtitleAnonymous') : t('auth.loginSubtitle')}
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

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            accessibilityLabel={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
          />

          <Button
            title={t('auth.signIn')}
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleSubmit}
          />

          <Button
            title={t('auth.goToRegister')}
            variant="ghost"
            disabled={isSubmitting}
            onPress={() => router.push('/(auth)/register')}
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
