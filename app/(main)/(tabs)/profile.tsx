import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Card,
  Icon,
  ListItem,
  ScreenContainer,
  SupportPromptCard,
  Text,
} from '@/common/components';
import type { IconProps } from '@/common/components/Icon';
import { useAppAlert } from '@/providers/app-alert';
import { setItem, STORAGE_KEYS } from '@/utils/storage';

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
  const [isSupportVisible, setIsSupportVisible] = useState(true);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const patchLabel = '1';
  const versionLabel = `v${appVersion} • ${patchLabel}`;

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

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <View style={styles.content}>
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
