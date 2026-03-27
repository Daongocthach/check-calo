import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon } from '@/common/components/Icon';
import { Select } from '@/common/components/Select';
import { Text } from '@/common/components/Text';
import { useScreenDimensions } from '@/hooks/useScreenDimensions';
import i18n from '@/i18n/config';
import { getThemePreference, setThemeMode, type ThemeModePreference } from '@/theme/themeManager';
import { setItem, STORAGE_KEYS } from '@/utils/storage';
import DarkModeIcon from '../../../../assets/dark-mode-icon.png';
import LightModeIcon from '../../../../assets/light-mode-icon.png';
import SystemModeIcon from '../../../../assets/system-mode-icon.png';
import UnitedStatesFlagIcon from '../../../../assets/united-states-flag-icon.png';
import VietnamFlagIcon from '../../../../assets/vietnam-flag-icon.png';

type LanguageValue = 'vi' | 'en';

function toLanguageValue(language: string): LanguageValue {
  return language === 'en' ? 'en' : 'vi';
}

function getGreetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function AppHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useUnistyles();
  const { isTablet } = useScreenDimensions();
  const [currentMode, setCurrentMode] = useState<ThemeModePreference>(() => getThemePreference());

  const isHomeRoute = pathname === '/' || pathname === '/index';
  const isTabRoute = ['/', '/index', '/stats', '/add', '/favorites', '/profile'].includes(pathname);
  const greeting = getGreetingKey(new Date().getHours());

  const pageTitle = useMemo(() => {
    if (pathname === '/' || pathname === '/index') return t('tabs.home');
    if (pathname === '/stats') return t('tabs.stats');
    if (pathname === '/add') return t('tabs.add');
    if (pathname === '/favorites') return t('tabs.favorites');
    if (pathname === '/profile') return t('tabs.profile');
    if (pathname === '/food-result') return t('addScreen.result.title');
    if (pathname === '/manual-food-entry') return t('manualFoodEntry.title');
    if (pathname === '/application-form') return t('application.applyTitle');
    if (pathname === '/application-form-success') {
      return t('application.form.successPageTitle');
    }

    return '';
  }, [pathname, t]);

  const languageOptions = useMemo(
    () => [
      { label: t('language.vietnamese'), value: 'vi', iconSource: VietnamFlagIcon },
      { label: t('language.english'), value: 'en', iconSource: UnitedStatesFlagIcon },
    ],
    [t]
  );

  const themeOptions = useMemo(
    () => [
      { label: t('header.themeSystem'), value: 'system', iconSource: SystemModeIcon },
      { label: t('header.themeLight'), value: 'light', iconSource: LightModeIcon },
      { label: t('header.themeDark'), value: 'dark', iconSource: DarkModeIcon },
    ],
    [t]
  );

  const selectedLanguage: LanguageValue = toLanguageValue(i18n.language);
  const selectedLanguageOption = languageOptions.find(
    (option) => option.value === selectedLanguage
  );
  const selectedThemeOption = themeOptions.find((option) => option.value === currentMode);
  let headerContent = (
    <>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('header.back')}
        style={styles.backButtonWrap}
      >
        <Icon name="chevron-back" variant="primary" size={18} />
      </Pressable>
      <Text
        variant="body"
        weight="medium"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={styles.title}
      >
        {pageTitle || t('header.brandName')}
      </Text>
    </>
  );

  if (isHomeRoute) {
    headerContent = (
      <View style={styles.profileRow}>
        <LinearGradient colors={theme.colors.gradient.highlight} style={styles.avatarBubble}>
          <Text variant="body" weight="bold">
            AL
          </Text>
        </LinearGradient>
        <View style={styles.textWrap}>
          <Text variant="h3">{t('homeScreen.greetingTitle', { name: 'Alex' })}</Text>
          <Text variant="bodySmall" color="secondary">
            {t(`homeScreen.greetings.${greeting}`)}
          </Text>
        </View>
      </View>
    );
  } else if (isTabRoute) {
    headerContent = (
      <Text variant="h2" weight="bold" numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
        {pageTitle}
      </Text>
    );
  }

  const handleLanguageChange = (value: string) => {
    if (value !== 'vi' && value !== 'en') {
      return;
    }

    void i18n.changeLanguage(value);
    setItem(STORAGE_KEYS.preferences.language, value);
  };

  const handleThemeChange = (value: string) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') {
      return;
    }

    setThemeMode(value);
    setCurrentMode(value);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, isTablet && styles.containerTablet]}>
        <View style={styles.brandWrap}>{headerContent}</View>

        <View style={styles.actionsWrap}>
          <View style={styles.themeSelectWrap}>
            <Select
              value={currentMode}
              onChange={handleThemeChange}
              options={themeOptions}
              size="sm"
              triggerVariant="plain"
              placeholder={t('header.toggleTheme')}
            >
              <View style={styles.themeSelectContent}>
                <Image
                  source={selectedThemeOption?.iconSource ?? LightModeIcon}
                  style={styles.themeToggleIcon}
                  contentFit="contain"
                />
              </View>
            </Select>
          </View>

          <View style={styles.selectWrap}>
            <Select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              options={languageOptions}
              size="sm"
              triggerVariant="plain"
              placeholder={t('language.label')}
            >
              <View style={styles.languageSelectContent}>
                {selectedLanguageOption?.iconSource ? (
                  <Image
                    source={selectedLanguageOption.iconSource}
                    style={styles.languageFlagIcon}
                    contentFit="contain"
                  />
                ) : null}
              </View>
            </Select>
          </View>
        </View>
      </View>
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  wrapper: {
    width: '100%',
    backgroundColor: theme.colors.background.app,
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: rt.insets.top,
    paddingBottom: theme.metrics.spacingV.p12,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  containerTablet: {
    maxWidth: 960,
  },
  brandWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    minWidth: 0,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    minWidth: 0,
  },
  avatarBubble: {
    width: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p48,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
  },
  backButtonWrap: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.metrics.spacing.p16,
    backgroundColor: theme.colors.background.surface,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p16,
  },
  iconShell: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  themeSelectWrap: {
    width: theme.metrics.spacing.p20,
    flexShrink: 0,
  },
  themeSelectContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
  },
  selectWrap: {
    width: theme.metrics.spacing.p20,
    flexShrink: 0,
  },
  languageSelectContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageFlagIcon: {
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
  },
  separator: {
    height: 1,
    marginHorizontal: -theme.metrics.spacing.p16,
    backgroundColor: theme.colors.border.default,
  },
}));
