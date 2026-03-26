import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Icon,
  ListItem,
  ScreenContainer,
  Switch,
  Text,
} from '@/common/components';
import { getCurrentMode, toggleDarkMode } from '@/theme/themeManager';

export default function ProfileTab() {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(getCurrentMode() === 'dark');

  const handleDarkModeChange = (value: boolean) => {
    setIsDarkMode(value);
    toggleDarkMode(value);
  };

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar initials="AJ" size="xl" accessibilityLabel={t('settings.profile.name')} />
            <View style={styles.profileInfo}>
              <Text variant="h2">{t('settings.profile.name')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('settings.profile.email')}
              </Text>
              <Chip
                label={isDarkMode ? t('settings.darkMode') : t('settings.appearance')}
                variant="outline"
                icon={<Icon name="sparkles-outline" variant="accent" size={16} />}
              />
            </View>
          </View>
          <Button
            title={t('settings.profile.editProfile')}
            variant="secondary"
            onPress={() => undefined}
          />
        </Card>

        <View style={styles.sectionBlock}>
          <Text variant="overline" color="secondary">
            {t('settings.sections.account')}
          </Text>
          <Card variant="filled" style={styles.sectionCard}>
            <ListItem
              title={t('settings.account.profile')}
              subtitle={t('settings.account.profileSubtitle')}
              divider
              left={<Icon name="person-circle-outline" variant="primary" size={22} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
            <ListItem
              title={t('settings.account.security')}
              subtitle={t('settings.account.securitySubtitle')}
              divider
              left={<Icon name="shield-checkmark-outline" variant="accent" size={22} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
            <ListItem
              title={t('settings.account.billing')}
              subtitle={t('settings.account.billingSubtitle')}
              divider
              left={<Icon name="card-outline" variant="secondary" size={22} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
            <ListItem
              title={t('settings.account.notifications')}
              subtitle={t('settings.account.notificationsSubtitle')}
              left={<Icon name="notifications-outline" destructive size={22} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
          </Card>
        </View>

        <View style={styles.sectionBlock}>
          <Text variant="overline" color="secondary">
            {t('settings.sections.preferences')}
          </Text>
          <Card variant="filled" style={styles.sectionCard}>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <Text variant="body" weight="medium">
                  {t('settings.darkMode')}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('settings.appearance')}
                </Text>
              </View>
              <Switch value={isDarkMode} onValueChange={handleDarkModeChange} />
            </View>
            <View style={styles.preferenceDivider} />
            <ListItem
              title={t('settings.preferences.pushNotifications')}
              subtitle={t('settings.account.notificationsSubtitle')}
              divider
              left={<Icon name="paper-plane-outline" variant="primary" size={20} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
            <ListItem
              title={t('settings.preferences.appIcon')}
              subtitle={t('settings.preferences.appIconSubtitle')}
              left={<Icon name="phone-portrait-outline" variant="accent" size={20} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
          </Card>
        </View>

        <View style={styles.sectionBlock}>
          <Text variant="overline" color="secondary">
            {t('settings.sections.support')}
          </Text>
          <Card variant="filled" style={styles.sectionCard}>
            <ListItem
              title={t('settings.support.helpCenter')}
              subtitle={t('settings.support.helpCenterSubtitle')}
              divider
              left={<Icon name="help-buoy-outline" variant="primary" size={20} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
            <ListItem
              title={t('settings.support.feedback')}
              subtitle={t('settings.support.feedbackSubtitle')}
              divider
              left={<Icon name="chatbox-ellipses-outline" variant="accent" size={20} />}
              right={<Icon name="chevron-forward" variant="muted" size={18} />}
            />
            <ListItem
              title={t('settings.about')}
              subtitle={t('settings.support.aboutSubtitle')}
              left={<Icon name="information-circle-outline" variant="secondary" size={20} />}
              right={
                <Text variant="caption" color="secondary">
                  {t('settings.version')} 1.0.0
                </Text>
              }
            />
          </Card>
        </View>

        <View style={styles.sectionBlock}>
          <Text variant="overline" color="secondary">
            {t('settings.sections.danger')}
          </Text>
          <Card variant="outlined" style={styles.sectionCard}>
            <Pressable style={styles.dangerRow}>
              <View style={styles.dangerCopy}>
                <Text variant="body" weight="medium">
                  {t('settings.danger.logout')}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('settings.danger.logoutSubtitle')}
                </Text>
              </View>
              <Icon name="log-out-outline" destructive size={20} />
            </Pressable>
            <View style={styles.preferenceDivider} />
            <Pressable style={styles.dangerRow}>
              <View style={styles.dangerCopy}>
                <Text variant="body" weight="medium">
                  {t('settings.danger.deleteAccount')}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('settings.danger.deleteAccountSubtitle')}
                </Text>
              </View>
              <Icon name="trash-outline" destructive size={20} />
            </Pressable>
          </Card>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  profileCard: {
    gap: theme.metrics.spacingV.p16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p16,
  },
  profileInfo: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  sectionBlock: {
    gap: theme.metrics.spacingV.p12,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
  },
  preferenceCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  preferenceDivider: {
    height: 1,
    backgroundColor: theme.colors.border.subtle,
    marginHorizontal: theme.metrics.spacing.p16,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
  },
  dangerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
}));
