import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Avatar,
  Card,
  Dialog,
  Icon,
  ListItem,
  ScreenContainer,
  SupportPromptCard,
  Text,
} from '@/common/components';
import type { IconProps } from '@/common/components/Icon';
import { logout } from '@/features/auth/services/authService';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import { useAuthStore } from '@/providers/auth/authStore';
import { toast } from '@/utils/toast';

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
    case 'logout':
      return 'log-out-outline';
    case 'login':
      return 'log-in-outline';
    default:
      return 'chevron-forward-outline';
  }
}

interface SettingsMenuRowProps {
  title: string;
  iconKey: string;
  onPress?: () => void;
  rightLabel?: string;
  destructive?: boolean;
  avatarInitials?: string;
}

function SettingsMenuRow({
  title,
  iconKey,
  onPress,
  rightLabel,
  destructive,
  avatarInitials,
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
      {iconKey === 'profile' ? (
        <Avatar initials={avatarInitials ?? 'US'} size="sm" accessibilityLabel={title} />
      ) : (
        <Icon
          name={getRowIconName(iconKey)}
          size={20}
          destructive={destructive}
          color={isLoginRow ? theme.colors.state.info : undefined}
        />
      )}
    </View>
  );

  const right = (
    <View style={styles.rowMeta}>
      {rightLabel ? (
        <Text variant="caption" color="secondary" align="right">
          {rightLabel}
        </Text>
      ) : null}
      <Icon name="chevron-forward-outline" size={18} variant="muted" />
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
  const authUser = useAuthStore((state) => state.user);
  const [profileInitials, setProfileInitials] = useState('US');
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSupportVisible, setIsSupportVisible] = useState(true);
  const showLogoutAction = Boolean(authUser && !authUser.isAnonymous);
  const showSignInPrompt = authUser?.isAnonymous ?? false;

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const profile = await getUserProfile();

      if (!active) {
        return;
      }

      const displayName = profile?.displayName.trim() ?? '';
      if (displayName.length > 0) {
        const initials = displayName
          .split(' ')
          .filter(Boolean)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        setProfileInitials(initials || 'US');
        return;
      }

      const emailPrefix = authUser?.email?.split('@')[0]?.trim() ?? '';
      setProfileInitials(emailPrefix.slice(0, 2).toUpperCase() || 'US');
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [authUser?.email]);

  const handleSupportPress = useCallback(() => {
    router.push('/support');
  }, [router]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
      setLogoutVisible(false);
      toast.success(t('profileScreen.logoutSuccess'));
      router.replace('/welcome');
    } catch {
      toast.error(t('profileScreen.actionError'));
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router, t]);

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <View style={styles.content}>
          <SettingsGroup>
            <SettingsMenuRow
              title={t('settings.menu.profile')}
              iconKey="profile"
              avatarInitials={profileInitials}
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

          {isSupportVisible ? (
            <SupportPromptCard
              message={t('foodDetail.supportMessage')}
              actionLabel={t('foodDetail.supportAction')}
              onActionPress={handleSupportPress}
              dismissible
              onClosePress={() => {
                setIsSupportVisible(false);
              }}
            />
          ) : null}

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
          </SettingsGroup>

          {showLogoutAction ? (
            <SettingsGroup>
              <SettingsMenuRow
                title={t('profileScreen.logoutAction')}
                iconKey="logout"
                destructive
                onPress={() => {
                  setLogoutVisible(true);
                }}
              />
            </SettingsGroup>
          ) : null}

          {showSignInPrompt ? (
            <SettingsGroup>
              <SettingsMenuRow
                title={t('profileScreen.signInAction')}
                iconKey="login"
                onPress={() => {
                  router.push('/(auth)/login');
                }}
              />
            </SettingsGroup>
          ) : null}
        </View>
      </View>

      <Dialog
        visible={logoutVisible}
        onDismiss={() => setLogoutVisible(false)}
        title={t('profileScreen.logoutConfirmTitle')}
        size="md"
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setLogoutVisible(false),
          },
          {
            label: isLoggingOut ? t('common.loading') : t('common.confirm'),
            variant: 'primary',
            onPress: () => {
              void handleLogout();
            },
          },
        ]}
      >
        <Text variant="body" color="secondary">
          {t('profileScreen.logoutConfirmMessage')}
        </Text>
      </Dialog>
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
  signInCard: {
    gap: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.section,
  },
  signInCopy: {
    gap: theme.metrics.spacingV.p4,
  },
  signInButton: {
    borderColor: theme.colors.brand.primary,
    backgroundColor:
      theme.colors.mode === 'dark'
        ? theme.colors.background.elevated
        : theme.colors.background.surface,
  },
  signInButtonLabel: {
    color: theme.colors.brand.primary,
  },
}));
