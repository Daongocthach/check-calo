import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import {
  linkAnonymousAccountWithEmail,
  linkAnonymousAccountWithProvider,
  register,
} from '@/features/auth/services/authService';
import { useAuthStore } from '@/providers/auth/authStore';
import { toast } from '@/utils/toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const [email, setEmail] = useState(authUser?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingApple, setIsLinkingApple] = useState(false);

  const isAnonymous = authUser?.isAnonymous ?? false;

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

    if (password !== confirmPassword) {
      toast.error(t('validation.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (isAnonymous) {
        await linkAnonymousAccountWithEmail({
          email: normalizedEmail,
          password,
        });
        toast.success(t('profileScreen.account.linkEmailSuccess'));
      } else {
        await register({
          email: normalizedEmail,
          password,
        });
        toast.success(t('auth.registerSuccess'));
      }

      router.replace('/(main)/(tabs)/profile');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.registerFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkProvider = async (provider: 'google' | 'apple') => {
    const setLoadingState = provider === 'google' ? setIsLinkingGoogle : setIsLinkingApple;
    const successMessage =
      provider === 'google'
        ? t('profileScreen.account.linkGoogleSuccess')
        : t('profileScreen.account.linkAppleSuccess');

    setLoadingState(true);

    try {
      const result = await linkAnonymousAccountWithProvider(provider);

      if (result.linked) {
        toast.success(successMessage);
        router.replace('/(main)/(tabs)/profile');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('profileScreen.account.actionError');
      toast.error(message);
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <ScreenContainer scrollable padded edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text variant="h2">
            {isAnonymous ? t('auth.registerUpgradeTitle') : t('auth.registerTitle')}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {isAnonymous ? t('auth.registerUpgradeSubtitle') : t('auth.registerSubtitle')}
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
            textContentType="newPassword"
            accessibilityLabel={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
          />

          <Input
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            accessibilityLabel={t('auth.confirmPassword')}
            placeholder={t('auth.confirmPasswordPlaceholder')}
          />

          <Button
            title={isAnonymous ? t('auth.upgradeAccount') : t('auth.signUp')}
            loading={isSubmitting}
            disabled={isSubmitting || isLinkingGoogle || isLinkingApple}
            onPress={handleSubmit}
          />

          <View style={styles.providerActions}>
            <View style={styles.providerAction}>
              <Button
                title={t('profileScreen.account.linkGoogleAction')}
                variant="outline"
                loading={isLinkingGoogle}
                disabled={isSubmitting || isLinkingApple}
                onPress={() => {
                  void handleLinkProvider('google');
                }}
              />
            </View>

            <View style={styles.providerAction}>
              <Button
                title={t('profileScreen.account.linkAppleAction')}
                variant="outline"
                loading={isLinkingApple}
                disabled={isSubmitting || isLinkingGoogle}
                onPress={() => {
                  void handleLinkProvider('apple');
                }}
              />
            </View>
          </View>

          <Button
            title={t('auth.goToLogin')}
            variant="ghost"
            disabled={isSubmitting || isLinkingGoogle || isLinkingApple}
            onPress={() => router.push('/(auth)/login')}
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
  providerActions: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  providerAction: {
    flex: 1,
  },
}));
