import { useState } from 'react';
import i18n from '@/i18n/config';
import { getThemePreference, setThemeMode, type ThemeModePreference } from '@/theme/themeManager';
import { setItem, STORAGE_KEYS } from '@/utils/storage';

export type LanguagePreference = 'vi' | 'en';

/** Theme and language preferences (formerly in the global header). */
export function usePreferences() {
  const [theme, setTheme] = useState<ThemeModePreference>(() => getThemePreference());
  const [language, setLanguage] = useState<LanguagePreference>(() =>
    i18n.language === 'en' ? 'en' : 'vi'
  );

  const changeTheme = (value: string) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') {
      return;
    }

    setThemeMode(value);
    setTheme(value);
  };

  const changeLanguage = (value: string) => {
    if (value !== 'vi' && value !== 'en') {
      return;
    }

    void i18n.changeLanguage(value);
    setItem(STORAGE_KEYS.preferences.language, value);
    setLanguage(value);
  };

  return { theme, language, changeTheme, changeLanguage };
}
