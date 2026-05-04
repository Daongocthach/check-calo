import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import { linkAnonymousAccountWithProvider, register } from '@/features/auth/services/authService';
import { toast } from '@/utils/toast';
import GoogleLogo from '../../assets/google-logo.png';
import AppLogo from '../../assets/splash-icon-light.png';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingApple, setIsLinkingApple] = useState(false);

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
      await register({
        email: normalizedEmail,
        password,
      });

      toast.success(t('auth.registerSuccess'));

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
        <View style={styles.heroSection}>
          <Image source={AppLogo} style={styles.heroLogo} contentFit="contain" />
          <View style={styles.heroCopy}>
            <Text variant="body" weight="bold" align="center">
              {t('auth.registerTitle')}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {t('auth.registerSubtitle')}
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
            title={t('auth.registerAction')}
            loading={isSubmitting}
            disabled={isSubmitting || isLinkingGoogle}
            onPress={handleSubmit}
          />

          <View style={styles.providerActions}>
            <View style={styles.providerAction}>
              <Button
                title={t('auth.signInWithGoogle')}
                variant="outline"
                loading={isLinkingGoogle}
                disabled={isSubmitting || isLinkingApple}
                onPress={() => {
                  void handleLinkProvider('google');
                }}
                leftIcon={
                  <Image source={GoogleLogo} style={styles.googleLogo} contentFit="contain" />
                }
              />
            </View>
          </View>
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
  providerActions: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  providerAction: {
    flex: 1,
  },
  googleLogo: {
    width: theme.metrics.spacing.p24,
    height: theme.metrics.spacing.p24,
  },
}));
