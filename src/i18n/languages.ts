/** App languages, in the order the language picker lists them. */
export const APP_LANGUAGES = [
  'vi',
  'en',
  'th',
  'id',
  'ja',
  'ko',
  'zh-Hans',
  'zh-Hant',
  'es',
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

interface LanguageInfo {
  /** Key under `language.*` holding the language's own name. */
  labelKey:
    | 'vietnamese'
    | 'english'
    | 'thai'
    | 'indonesian'
    | 'japanese'
    | 'korean'
    | 'chineseSimplified'
    | 'chineseTraditional'
    | 'spanish';
  /** Intl / speech recognition locale. */
  locale: string;
  /** English name, used in AI prompts. */
  englishName: string;
}

export const LANGUAGE_INFO: Record<AppLanguage, LanguageInfo> = {
  vi: { labelKey: 'vietnamese', locale: 'vi-VN', englishName: 'Vietnamese' },
  en: { labelKey: 'english', locale: 'en-US', englishName: 'English' },
  th: { labelKey: 'thai', locale: 'th-TH', englishName: 'Thai' },
  id: { labelKey: 'indonesian', locale: 'id-ID', englishName: 'Indonesian' },
  ja: { labelKey: 'japanese', locale: 'ja-JP', englishName: 'Japanese' },
  ko: { labelKey: 'korean', locale: 'ko-KR', englishName: 'Korean' },
  'zh-Hans': { labelKey: 'chineseSimplified', locale: 'zh-CN', englishName: 'Simplified Chinese' },
  'zh-Hant': {
    labelKey: 'chineseTraditional',
    locale: 'zh-TW',
    englishName: 'Traditional Chinese (Taiwan)',
  },
  es: { labelKey: 'spanish', locale: 'es-ES', englishName: 'Spanish' },
};

/** Used until the user picks a language in Settings. */
export const DEFAULT_LANGUAGE: AppLanguage = 'vi';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
}

/** The app language for any language code, falling back to the default. */
export function toAppLanguage(value: string | null | undefined): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}
