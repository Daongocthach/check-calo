import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';
import { updatePassword } from '@/features/auth/services/authService';
import { toast } from '@/utils/toast';

const PASSWORD_MIN_LENGTH = 8;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (password.length < PASSWORD_MIN_LENGTH) {
      toast.error(t('validation.passwordMin'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('validation.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      toast.success(t('auth.resetPasswordSuccess'));
      router.replace('/(auth)/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.resetPasswordFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable padded edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text variant="h2">{t('auth.resetPasswordTitle')}</Text>
          <Text variant="bodySmall" color="secondary">
            {t('auth.resetPasswordSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
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
            title={t('auth.resetPasswordAction')}
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
