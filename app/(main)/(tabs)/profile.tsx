import { useNetInfo } from '@react-native-community/netinfo';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Avatar,
  Button,
  Card,
  Icon,
  ListItem,
  ScreenContainer,
  SupportPromptCard,
  Text,
} from '@/common/components';
import type { IconProps } from '@/common/components/Icon';
import { useSupportPromptVisibility } from '@/features/support/hooks/useSupportPromptVisibility';
import { useAppAlert } from '@/providers/app-alert';
import { useAuthStore } from '@/providers/auth/authStore';
import { STORAGE_KEYS, setItem } from '@/utils/storage';

function getRowIconName(key: string): IconProps['name'] {
  switch (key) {
    case 'profile':
      return 'person-outline';
    case 'goal':
      return 'trophy-outline';
    case 'achievements':
      return 'medal-outline';
    case 'leaderboard':
      return 'podium-outline';
    case 'reminders':
      return 'notifications-outline';
    case 'language':
      return 'language-outline';
    case 'units':
      return 'scale-outline';
    case 'theme':
      return 'sunny-outline';
    case 'about':
      return 'information-circle-outline';
    case 'terms':
      return 'document-text-outline';
    case 'privacy':
      return 'shield-checkmark-outline';
    case 'contact':
      return 'mail-outline';
    case 'switchAccount':
      return 'swap-horizontal-outline';
    case 'login':
      return 'log-in-outline';
    default:
      return 'chevron-forward-outline';
  }
}

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

interface SettingsMenuRowProps {
  title: string;
  iconKey: string;
  onPress?: () => void;
  rightLabel?: string;
  destructive?: boolean;
  showChevron?: boolean;
}

function SettingsMenuRow({
  title,
  iconKey,
  onPress,
  rightLabel,
  destructive,
  showChevron = true,
}: SettingsMenuRowProps) {
  const { theme } = useUnistyles();
  const isLoginRow = iconKey === 'login';
  const left = (
    <View
      style={[
        styles.rowIcon,
        destructive ? styles.rowIconDanger : undefined,
        isLoginRow ? styles.rowIconInfo : undefined,
      ]}
    >
      <Icon
        name={getRowIconName(iconKey)}
        size={20}
        destructive={destructive}
        color={isLoginRow ? theme.colors.state.info : undefined}
      />
    </View>
  );

  const right = (
    <View style={styles.rowMeta}>
      {rightLabel ? (
        <Text variant="caption" color="secondary" align="right">
          {rightLabel}
        </Text>
      ) : null}
      {showChevron ? <Icon name="chevron-forward-outline" size={18} variant="muted" /> : null}
    </View>
  );

  return <ListItem title={title} left={left} right={right} onPress={onPress} size="md" />;
}

function SettingsGroup({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <Card variant="elevated" style={[styles.groupCard, style]}>
      {children}
    </Card>
  );
}

export default function ProfileTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const appAlert = useAppAlert();
  const networkInfo = useNetInfo();
  const isOffline = !(networkInfo.isConnected && networkInfo.isInternetReachable !== false);
  const { isHidden: isSupportPromptHidden, dismiss: dismissSupportPrompt } =
    useSupportPromptVisibility();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const patchLabel = '1';
  const versionLabel = `v${appVersion} • ${patchLabel}`;

  const user = useAuthStore((s) => s.user);
  const isAnonymous = !user || user.isAnonymous;

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

  useEffect(() => {
    setItem(STORAGE_KEYS.app.lastVersion, versionLabel);
  }, [versionLabel]);

  const handleSupportPress = useCallback(() => {
    router.push('/support');
  }, [router]);

  const handleVersionPress = useCallback(async () => {
    if (isCheckingUpdate) {
      return;
    }

    setIsCheckingUpdate(true);

    try {
      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        appAlert.alert(
          t('profileScreen.versionNoUpdateTitle'),
          t('profileScreen.versionNoUpdateMessage')
        );
        return;
      }

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      appAlert.alert(
        t('profileScreen.versionUpdateErrorTitle'),
        error instanceof Error ? error.message : t('profileScreen.versionUpdateErrorMessage')
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [appAlert, isCheckingUpdate, t]);

  const handleLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <View style={styles.content}>
          {isOffline ? (
            <Card variant="elevated" style={styles.offlineBanner}>
              <View style={styles.offlineBannerContent}>
                <Icon name="cloud-offline-outline" variant="muted" size={20} />
                <Text variant="bodySmall" color="secondary" style={styles.offlineBannerText}>
                  {t('profileScreen.offlineAiMessage')}
                </Text>
              </View>
            </Card>
          ) : null}

          {isAnonymous ? (
            <Card variant="elevated" style={styles.accountCard}>
              <View style={styles.accountCardInner}>
                <Avatar
                  size="lg"
                  icon={<Icon name="person" variant="onBrand" size={28} />}
                  accessibilityLabel={t('profileScreen.signInPromptTitle')}
                />
                <View style={styles.accountCardInfo}>
                  <Text variant="body" weight="semibold">
                    {t('profileScreen.signInPromptTitle')}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {t('profileScreen.signInPromptSubtitle')}
                  </Text>
                </View>
              </View>
              <Button
                title={t('profileScreen.signInAction')}
                variant="primary"
                size="sm"
                onPress={handleLogin}
                leftIcon={<Icon name="log-in-outline" variant="onBrand" size={16} />}
              />
            </Card>
          ) : (
            <Pressable
              onPress={() => {
                router.push('/account');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profileScreen.account.title')}
            >
              <Card variant="elevated" style={styles.accountCard}>
                <View style={styles.accountCardInner}>
                  <Avatar size="lg" initials={initials} accessibilityLabel={user?.email ?? ''} />
                  <View style={styles.accountCardInfo}>
                    <Text variant="body" weight="semibold" numberOfLines={1}>
                      {user?.email ?? ''}
                    </Text>
                    <Text variant="caption" color="secondary" numberOfLines={1}>
                      {lastSignInLabel}
                    </Text>
                  </View>
                  <Icon name="chevron-forward-outline" size={18} variant="muted" />
                </View>
              </Card>
            </Pressable>
          )}

          <SettingsGroup>
            <SettingsMenuRow
              title={t('settings.menu.profile')}
              iconKey="profile"
              onPress={() => {
                router.push('/welcome');
              }}
            />
            <SettingsMenuRow
              title={t('settings.menu.goal')}
              iconKey="goal"
              onPress={() => {
                router.push('/goal-history');
              }}
            />
            <SettingsMenuRow
              title={t('settings.menu.achievements')}
              iconKey="achievements"
              onPress={() => {
                router.push('/achievements');
              }}
            />
            <SettingsMenuRow
              title={t('settings.menu.leaderboard')}
              iconKey="leaderboard"
              onPress={() => {
                router.push('/leaderboard');
              }}
            />
            <SettingsMenuRow
              title={t('settings.menu.reminders')}
              iconKey="reminders"
              onPress={() => {
                router.push('/notification-settings');
              }}
            />
          </SettingsGroup>

          <SupportPromptCard
            message={t('foodDetail.supportMessage')}
            actionLabel={t('foodDetail.supportAction')}
            onActionPress={handleSupportPress}
            isHidden={isSupportPromptHidden}
            onClosePress={() => {
              dismissSupportPrompt();
            }}
          />

          <SettingsGroup>
            <SettingsMenuRow
              title={t('settings.about')}
              iconKey="about"
              onPress={() => {
                router.push('/about');
              }}
            />
            <SettingsMenuRow
              title={t('settings.terms')}
              iconKey="terms"
              onPress={() => {
                router.push('/terms');
              }}
            />
            <SettingsMenuRow
              title={t('settings.privacy')}
              iconKey="privacy"
              onPress={() => {
                router.push('/privacy');
              }}
            />
            <SettingsMenuRow
              title={t('settings.contact')}
              iconKey="contact"
              onPress={() => {
                router.push('/contact');
              }}
            />
            <SettingsMenuRow
              title={t('settings.version')}
              iconKey="about"
              rightLabel={versionLabel}
              onPress={() => {
                void handleVersionPress();
              }}
            />
          </SettingsGroup>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p20,
  },
  content: {
    gap: theme.metrics.spacingV.p16,
  },
  offlineBanner: {
    backgroundColor: theme.colors.background.input,
    paddingVertical: theme.metrics.spacingV.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
  },
  offlineBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  offlineBannerText: {
    flex: 1,
  },
  accountCard: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p16,
    gap: theme.metrics.spacingV.p16,
  },
  accountCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p16,
  },
  accountCardInfo: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  groupCard: {
    padding: 0,
    overflow: 'hidden',
  },
  rowIcon: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.input,
  },
  rowIconDanger: {
    backgroundColor: theme.colors.state.errorBg,
  },
  rowIconInfo: {
    backgroundColor: theme.colors.state.infoBg,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
}));
