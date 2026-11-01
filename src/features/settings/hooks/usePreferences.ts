import { useState } from 'react';
import i18n from '@/i18n/config';
import { isAppLanguage } from '@/i18n/languages';
import { getThemePreference, setThemeMode, type ThemeModePreference } from '@/theme/themeManager';
import { setItem, STORAGE_KEYS } from '@/utils/storage';

/** Theme and language preferences (formerly in the global header). */
export function usePreferences() {
  const [theme, setTheme] = useState<ThemeModePreference>(() => getThemePreference());

  const changeTheme = (value: string) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') {
      return;
    }

    setThemeMode(value);
    setTheme(value);
  };

  const changeLanguage = (value: string) => {
    if (!isAppLanguage(value)) {
      return;
    }

    void i18n.changeLanguage(value);
    setItem(STORAGE_KEYS.preferences.language, value);
  };

  return { theme, changeTheme, changeLanguage };
}
