import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Avatar, Button, Card, Divider, Icon, ScreenContainer, Text } from '@/common/components';
import {
  deleteCurrentUserCloudNutritionData,
  disconnectCurrentSyncAccount,
  logout,
} from '@/features/auth/services/authService';
import { useAppAlert } from '@/providers/app-alert';
import { useAuthStore } from '@/providers/auth/authStore';
import { removeItem, STORAGE_KEYS } from '@/utils/storage';
import { toast } from '@/utils/toast';

function extractInitials(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const cleaned = localPart.replace(/[^a-zA-Z]/g, '');
  if (cleaned.length === 0) return '??';
  if (cleaned.length === 1) return cleaned.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function formatLastSignIn(
  isoDate: string | null,
  fallbackLabel: string,
  templateLabel: string
): string {
  if (!isoDate) return fallbackLabel;
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return fallbackLabel;
  const formatted = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return templateLabel.replace('{{value}}', formatted);
}

export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const appAlert = useAppAlert();
  const user = useAuthStore((s) => s.user);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = useMemo(() => {
    if (!user?.email) return '??';
    return extractInitials(user.email);
  }, [user?.email]);

  const lastSignInLabel = useMemo(() => {
    return formatLastSignIn(
      user?.lastSignInAt ?? null,
      t('auth.lastSignedInUnknown'),
      t('auth.lastSignedInAt', { value: '{{value}}' })
    );
  }, [user?.lastSignInAt, t]);

  const joinedAtLabel = useMemo(() => {
    return formatLastSignIn(
      user?.createdAt ?? null,
      t('accountScreen.joinedAtUnknown'),
      t('accountScreen.joinedAt', { value: '{{value}}' })
    );
  }, [user?.createdAt, t]);

  const handleSwitchAccount = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  const handleLogout = useCallback(() => {
    appAlert.alert(
      t('accountScreen.logoutTitle'),
      t('accountScreen.logoutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accountScreen.logoutConfirm'),
          style: 'destructive',
          onPress: () => {
            setIsLoggingOut(true);

            void (async () => {
              try {
                await logout();
                toast.success(t('accountScreen.logoutSuccess'));
                router.replace('/(main)/(tabs)/profile');
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : t('accountScreen.logoutError');
                toast.error(message);
              } finally {
                setIsLoggingOut(false);
              }
            })();
          },
        },
      ],
      { dismissOnBackdropPress: true }
    );
  }, [appAlert, t, router]);

  const handleDeleteAccount = useCallback(() => {
    appAlert.alert(
      t('accountScreen.deleteTitle'),
      t('accountScreen.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accountScreen.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);

            void (async () => {
              try {
                // 1. Delete cloud data + account
                await deleteCurrentUserCloudNutritionData();
                await disconnectCurrentSyncAccount();

                // 2. Clear anonymous flag so initialize() creates fresh session
                removeItem(STORAGE_KEYS.auth.anonymousSessionAttempted);

                // 3. Re-initialize to get a fresh anonymous session
                await useAuthStore.getState().initialize();

                toast.success(t('accountScreen.deleteSuccess'));
                router.replace('/(main)/(tabs)/profile');
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : t('accountScreen.deleteError');
                toast.error(message);
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
      { dismissOnBackdropPress: true }
    );
  }, [appAlert, t, router]);

  return (
    <ScreenContainer scrollable padded edges={['bottom']}>
      <View style={styles.screen}>
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileCardInner}>
            <View style={styles.profileHeader}>
              <Avatar size="xl" initials={initials} accessibilityLabel={user?.email ?? ''} />
              <View style={styles.profileCardInfo}>
                <Text variant="h3" weight="bold" numberOfLines={1}>
                  {user?.email ?? ''}
                </Text>
                <Text variant="caption" color="secondary" numberOfLines={1}>
                  {joinedAtLabel}
                </Text>
                <Text variant="caption" color="tertiary" numberOfLines={1}>
                  {lastSignInLabel}
                </Text>
              </View>
            </View>
            <Divider />
            <View style={styles.actionCardBody}>
              <Button
                title={t('accountScreen.switchAccount')}
                variant="outline"
                leftIcon={
                  <Icon
                    name="swap-horizontal-outline"
                    size={18}
                    color={theme.colors.text.primary}
                  />
                }
                onPress={handleSwitchAccount}
                disabled={isDeleting || isLoggingOut}
              />
              <Button
                title={t('accountScreen.logoutAction')}
                variant="outline"
                loading={isLoggingOut}
                disabled={isDeleting || isLoggingOut}
                leftIcon={
                  <Icon name="log-out-outline" size={18} color={theme.colors.text.primary} />
                }
                onPress={handleLogout}
              />
            </View>
          </View>
        </Card>

        <View style={styles.actionsSection}>
          <Card variant="elevated" style={styles.actionCard}>
            <View style={styles.dangerHeader}>
              <Icon name="warning-outline" size={20} destructive />
              <Text variant="label" style={styles.dangerLabel}>
                {t('accountScreen.dangerZone')}
              </Text>
            </View>
            <Text variant="caption" color="secondary">
              {t('accountScreen.deleteDescription')}
            </Text>
            <Button
              title={t('accountScreen.deleteAction')}
              variant="outline"
              loading={isDeleting}
              disabled={isDeleting}
              leftIcon={<Icon name="trash-outline" size={18} destructive />}
              labelStyle={styles.dangerLabel}
              onPress={handleDeleteAccount}
            />
          </Card>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p24,
  },
  profileCard: {
    paddingHorizontal: theme.metrics.spacing.p20,
    paddingVertical: theme.metrics.spacingV.p24,
  },
  profileCardInner: {
    gap: theme.metrics.spacingV.p16,
  },
  profileHeader: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p16,
  },
  profileCardInfo: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  actionsSection: {
    gap: theme.metrics.spacingV.p16,
  },
  actionCard: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p16,
    gap: theme.metrics.spacingV.p12,
  },
  actionCardBody: {
    gap: theme.metrics.spacingV.p12,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  dangerLabel: {
    color: theme.colors.state.error,
  },
}));
