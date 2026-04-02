import Constants from 'expo-constants';

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseFoodImageBucket: string;
  apiBaseUrl: string;
  sentryDsn: string;
  appEnv: 'development' | 'staging' | 'production';
  isDev: boolean;
  isProd: boolean;
}

const expoExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

function getEnvVar(key: string, fallback = ''): string {
  return expoExtra[key] ?? process.env[key] ?? fallback;
}

function getSupabaseAnonKey(): string {
  return (
    getEnvVar('EXPO_PUBLIC_SUPABASE_PUBLISHED_KEY') || getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY')
  );
}

export const env: EnvConfig = {
  supabaseUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getSupabaseAnonKey(),
  supabaseFoodImageBucket: getEnvVar('EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET', 'food-entry-images'),
  apiBaseUrl: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'https://api.example.com'),
  sentryDsn: getEnvVar('EXPO_PUBLIC_SENTRY_DSN'),
  appEnv: getEnvVar('EXPO_PUBLIC_APP_ENV', 'development') as EnvConfig['appEnv'],
  get isDev() {
    return this.appEnv === 'development';
  },
  get isProd() {
    return this.appEnv === 'production';
  },
};

export function validateEnv(): string[] {
  const warnings: string[] = [];
  if (!env.supabaseUrl) warnings.push('EXPO_PUBLIC_SUPABASE_URL is not set');
  if (!env.supabaseAnonKey) {
    warnings.push('EXPO_PUBLIC_SUPABASE_PUBLISHED_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
  }
  return warnings;
}
