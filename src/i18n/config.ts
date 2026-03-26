import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getItem, STORAGE_KEYS } from '@/utils/storage';
import en from './locales/en.json';
import vi from './locales/vi.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}

const savedLang = getItem<string>(STORAGE_KEYS.preferences.language);

let initialLang = 'en';
if (savedLang.success && savedLang.data) {
  initialLang = savedLang.data;
} else {
  const deviceLocale = getLocales()[0]?.languageCode;
  if (deviceLocale === 'vi') {
    initialLang = 'vi';
  }
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
