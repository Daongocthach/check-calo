import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import { login, signInWithProvider } from '@/features/auth/services/authService';
import { useResponsiveKeyboardLayout, useScreenDimensions } from '@/hooks';
import { toast } from '@/utils/toast';
import GoogleLogo from '../../assets/google-logo.png';
import AppLogo from '../../assets/splash-icon-light.png';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const { height } = useScreenDimensions();
  const isCompactHeight = height < 700;
  const { keyboardBottomOffset, footerBottomPadding } = useResponsiveKeyboardLayout({
    compactHeightThreshold: 700,
    compactKeyboardBottomOffset: theme.metrics.spacingV.p32,
    regularKeyboardBottomOffset: theme.metrics.spacingV.p24,
    compactKeyboardOpenedOffset: theme.metrics.spacingV.p20,
    regularKeyboardOpenedOffset: theme.metrics.spacingV.p32,
    compactFooterPadding: theme.metrics.spacingV.p12,
    regularFooterPadding: theme.metrics.spacingV.p16,
  });
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
      const result = await signInWithProvider('google');

      if (result.signedIn) {
        toast.success(t('auth.loginSuccess'));
        router.replace('/(main)/(tabs)/profile');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.loginFailed');
      toast.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <ScreenContainer padded={false} edges={[]}>
      <View style={styles.layout}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isCompactHeight && styles.scrollContentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={keyboardBottomOffset}
        >
          <View style={[styles.screen, isCompactHeight && styles.screenCompact]}>
            <View style={styles.heroSection}>
              <Image source={AppLogo} style={styles.heroLogo} contentFit="contain" />
              <View style={styles.heroCopy}>
                <Text variant="body" weight="bold" align="center">
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
              </View>
            </View>

            <View style={[styles.actionsCard, { paddingBottom: footerBottomPadding }]}>
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

              <View style={styles.linkRow}>
                <Button
                  title={t('auth.forgotPassword')}
                  variant="ghost"
                  disabled={isSubmitting || isGoogleLoading}
                  onPress={() => {
                    router.push('/(auth)/forgot-password');
                  }}
                />

                <Button
                  title={t('auth.signUp')}
                  variant="ghost"
                  disabled={isSubmitting || isGoogleLoading}
                  onPress={() => {
                    router.push('/(auth)/register');
                  }}
                />
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>
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
  scrollContentCompact: {
    paddingBottom: theme.metrics.spacingV.p88,
  },
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  screenCompact: {
    gap: theme.metrics.spacingV.p12,
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
  formCard: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p20,
    paddingVertical: theme.metrics.spacingV.p20,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  actionsCard: {
    gap: theme.metrics.spacingV.p12,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  formHeader: {
    gap: theme.metrics.spacingV.p8,
  },
  form: {
    gap: theme.metrics.spacingV.p12,
  },
  primaryButton: {},
  googleButton: {
    backgroundColor: theme.colors.background.surface,
    borderColor: theme.colors.border.default,
  },
  googleLogo: {
    width: theme.metrics.spacing.p24,
    height: theme.metrics.spacing.p24,
  },
}));
