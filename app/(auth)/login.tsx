import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import {
  linkAnonymousAccountWithProvider,
  login,
  signInWithProvider,
} from '@/features/auth/services/authService';
import { useAuthStore } from '@/providers/auth/authStore';
import { toast } from '@/utils/toast';
import GoogleLogo from '../../assets/google-logo.png';
import LoginBanner from '../../assets/login-banner.png';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      if (authUser?.isAnonymous) {
        const result = await linkAnonymousAccountWithProvider('google');

        if (result.linked) {
          toast.success(t('profileScreen.account.linkGoogleSuccess'));
          router.replace('/(main)/(tabs)/profile');
        }
      } else {
        const result = await signInWithProvider('google');

        if (result.signedIn) {
          toast.success(t('auth.loginSuccess'));
          router.replace('/(main)/(tabs)/profile');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.loginFailed');
      toast.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.heroSection}>
          <Image source={LoginBanner} style={styles.heroImage} contentFit="contain" />
          <View style={styles.heroCopy}>
            <Text variant="h3" align="center">
              {t('auth.welcomeBack')}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {t('auth.welcomeBackSubtitle')}
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text variant="h2">{t('auth.signIn')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('auth.loginCardSubtitle')}
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
              disabled={isSubmitting || isGoogleLoading}
              onPress={handleSubmit}
              style={styles.primaryButton}
            />

            <Button
              title={t('auth.signInWithGoogle')}
              variant="outline"
              loading={isGoogleLoading}
              disabled={isSubmitting || isGoogleLoading}
              onPress={() => {
                void handleGoogleSignIn();
              }}
              style={styles.googleButton}
              leftIcon={
                <Image source={GoogleLogo} style={styles.googleLogo} contentFit="contain" />
              }
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p20,
    paddingTop: theme.metrics.spacingV.p24,
    paddingBottom: theme.metrics.spacingV.p32,
    gap: theme.metrics.spacingV.p24,
  },
  heroSection: {
    gap: theme.metrics.spacingV.p16,
  },
  heroImage: {
    width: '100%',
    height: 150,
  },
  heroCopy: {
    gap: theme.metrics.spacingV.p8,
  },
  formCard: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p20,
    paddingVertical: theme.metrics.spacingV.p20,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  formHeader: {
    gap: theme.metrics.spacingV.p8,
  },
  form: {
    gap: theme.metrics.spacingV.p12,
  },
  primaryButton: {
    marginTop: theme.metrics.spacingV.p8,
  },
  googleButton: {
    backgroundColor: theme.colors.background.surface,
    borderColor: theme.colors.border.default,
  },
  googleLogo: {
    width: theme.metrics.spacing.p24,
    height: theme.metrics.spacing.p24,
  },
}));
