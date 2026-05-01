import type { ExpoConfig } from '@expo/config-types';
import 'tsx/cjs';

const publicEnv = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHED_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHED_KEY,
  EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET: process.env.EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
};

const config: ExpoConfig = {
  name: 'Check Calo',
  slug: 'check-calo',
  owner: 'thachdaongoc75',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'check-calo',
  userInterfaceStyle: 'automatic',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    enabled: true,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.thachdaongoc.checkcalo',
    icon: {
      light: './assets/ios-light.png',
    },
    infoPlist: {
      CFBundleDisplayName: 'Check Calo',
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ['en', 'vi'],
      ITSAppUsesNonExemptEncryption: false,
    },
    buildNumber: '2',
  },
  android: {
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.thachdaongoc.checkcalo',
  },
  extra: {
    router: {},
    eas: {
      projectId: '70cde4e9-73b0-40ca-aa21-c4cbe8d72591',
    },
    ...publicEnv,
  },
  plugins: [
    'expo-updates',
    [
      'expo-localization',
      {
        supportedLocales: {
          ios: ['en', 'vi'],
          android: ['en', 'vi'],
        },
      },
    ],
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon-light.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#F6F9E8',
        dark: {
          image: './assets/splash-icon-light.png',
          backgroundColor: '#020617',
        },
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Inter-Regular.ttf',
          './assets/fonts/Inter-Medium.ttf',
          './assets/fonts/Inter-SemiBold.ttf',
          './assets/fonts/Inter-Bold.ttf',
        ],
      },
    ],
    'expo-notifications',
    'expo-image',
    [
      'expo-camera',
      {
        cameraPermission:
          'CheckCalo requires camera access to capture food photos for calorie estimation and meal tracking.',
        recordAudioPermission: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'CheckCalo requires photo library access to select food photos for calorie estimation and meal tracking.',
      },
    ],
    'expo-sqlite',
    'expo-build-properties',
    'expo-web-browser',
    ['./plugins/with-android-splits'],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
};

export default config;
