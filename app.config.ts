import type { ExpoConfig } from '@expo/config-types';
import 'tsx/cjs';

const config: ExpoConfig = {
  name: 'Check Calo',
  slug: 'check-calo',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'check-calo',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gempixel.checkcalo',
    icon: {
      light: './assets/ios-light.png',
    },
    infoPlist: {
      CFBundleDisplayName: 'Check Calo',
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ['en', 'vi'],
      ITSAppUsesNonExemptEncryption: false,
    },
    buildNumber: '1',
  },
  android: {
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.gempixel.checkcalo',
  },
  extra: {
    router: {},
    eas: {
      projectId: '',
    },
  },
  plugins: [
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
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#F6F9E8',
        dark: {
          image: './assets/splash-icon.png',
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
    'expo-image',
    'expo-sqlite',
    ['./plugins/with-android-splits'],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
};

export default config;
