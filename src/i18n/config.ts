import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getItem, STORAGE_KEYS } from '@/utils/storage';
import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from './languages';
import en from './locales/en.json';
import es from './locales/es.json';
import id from './locales/id.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}

function getInitialLanguage(): AppLanguage {
  const saved = getItem<string>(STORAGE_KEYS.preferences.language);
  if (saved.success && isAppLanguage(saved.data)) {
    return saved.data;
  }
  return DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    vi: { translation: vi },
    th: { translation: th },
    id: { translation: id },
    ja: { translation: ja },
    ko: { translation: ko },
    'zh-Hans': { translation: zhHans },
    'zh-Hant': { translation: zhHant },
    es: { translation: es },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
