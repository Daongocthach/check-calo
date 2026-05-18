import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import { register } from '@/features/auth/services/authService';
import { useResponsiveKeyboardLayout, useScreenDimensions } from '@/hooks';
import { toast } from '@/utils/toast';
import AppLogo from '../../assets/splash-icon-light.png';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { height } = useScreenDimensions();
  const { theme } = useUnistyles();
  const isCompactHeight = height < 700;
  const { keyboardBottomOffset, footerBottomPadding: _footerBottomPadding } =
    useResponsiveKeyboardLayout({
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
  const [confirmPassword, setConfirmPassword] = useState('');
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
                disabled={isSubmitting}
                onPress={handleSubmit}
              />
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
