import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Icon, Input, ScreenContainer, Text } from '@/common/components';
import { loginAuthenticate, loginSyncCloudData } from '@/features/auth/services/authService';
import { useResponsiveKeyboardLayout, useScreenDimensions } from '@/hooks';
import { useAppAlert } from '@/providers/app-alert/AppAlertProvider';
import { toast } from '@/utils/toast';
import AppLogo from '../../assets/splash-icon-light.png';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SyncPhase = 'idle' | 'authenticating' | 'syncing' | 'done' | 'failed';

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
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const alert = useAppAlert();

  const performSync = async () => {
    setSyncPhase('syncing');
    try {
      await loginSyncCloudData();
      setSyncPhase('done');
      toast.success(t('auth.loginSuccess'));
      router.replace('/(main)/(tabs)/profile');
    } catch {
      setSyncPhase('failed');
    }
  };

  const performLogin = async () => {
    setIsSubmitting(true);
    setSyncPhase('authenticating');

    try {
      await loginAuthenticate({
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.loginFailed');
      toast.error(message);
      setSyncPhase('idle');
      setIsSubmitting(false);
      return;
    }

    await performSync();
    setIsSubmitting(false);
  };

  const handleRetrySync = () => {
    void performSync();
  };

  const handleSkipSync = () => {
    setSyncPhase('idle');
    setIsSubmitting(false);
    toast.success(t('auth.loginSuccess'));
    router.replace('/(main)/(tabs)/profile');
  };

  const handleSubmit = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error(t('validation.emailInvalid'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('validation.passwordMin'));
      return;
    }

    alert.alert(
      t('auth.loginConfirmTitle'),
      t('auth.loginConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.loginConfirmAction'),
          style: 'destructive',
          onPress: () => void performLogin(),
        },
      ],
      { dismissOnBackdropPress: false }
    );
  };

  const showOverlay = syncPhase !== 'idle';

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
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={styles.primaryButton}
              />

              <View style={styles.linkRow}>
                <Button
                  title={t('auth.forgotPassword')}
                  variant="ghost"
                  disabled={isSubmitting}
                  onPress={() => {
                    router.push('/(auth)/forgot-password');
                  }}
                />

                <Button
                  title={t('auth.signUp')}
                  variant="ghost"
                  disabled={isSubmitting}
                  onPress={() => {
                    router.push('/(auth)/register');
                  }}
                />
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>

      <Modal
        visible={showOverlay}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // Prevent hardware back during sync
        }}
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            {syncPhase === 'failed' ? (
              <>
                <Icon name="cloud-offline-outline" variant="muted" size={40} />
                <Text variant="body" weight="semibold" align="center">
                  {t('auth.syncFailedTitle')}
                </Text>
                <Text variant="bodySmall" color="secondary" align="center">
                  {t('auth.syncFailedMessage')}
                </Text>
                <View style={styles.overlayActions}>
                  <Button
                    title={t('auth.syncRetry')}
                    variant="primary"
                    size="sm"
                    onPress={handleRetrySync}
                  />
                  <Button
                    title={t('auth.syncSkip')}
                    variant="ghost"
                    size="sm"
                    onPress={handleSkipSync}
                  />
                </View>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                <Text variant="body" weight="semibold" align="center">
                  {syncPhase === 'authenticating'
                    ? t('auth.syncPhaseAuth')
                    : t('auth.syncPhaseData')}
                </Text>
                <Text variant="caption" color="secondary" align="center">
                  {t('auth.syncPleaseWait')}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.metrics.spacing.p32,
  },
  overlayCard: {
    width: '100%',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.metrics.borderRadius.xl,
    paddingHorizontal: theme.metrics.spacing.p24,
    paddingVertical: theme.metrics.spacingV.p32,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p16,
  },
  overlayActions: {
    gap: theme.metrics.spacingV.p8,
    width: '100%',
    marginTop: theme.metrics.spacingV.p8,
  },
}));
