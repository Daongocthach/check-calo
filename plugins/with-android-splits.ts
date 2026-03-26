import { withAppBuildGradle } from '@expo/config-plugins';
import type { ConfigPlugin } from '@expo/config-plugins';

const withAndroidSplits: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (appBuildGradleConfig) => {
    if (appBuildGradleConfig.modResults.language === 'groovy') {
      const contents = appBuildGradleConfig.modResults.contents;

      if (contents.includes('splits {') && contents.includes('include "arm64-v8a"')) {
        return appBuildGradleConfig;
      }

      const splitConfig = `
                splits {
                    abi {
                        enable true
                        reset()
                        include "arm64-v8a"
                        universalApk false
                    }
                }`;

      const androidResourcesRegex = /androidResources\s*{[\s\S]*?}/;

      if (androidResourcesRegex.test(contents)) {
        appBuildGradleConfig.modResults.contents = contents.replace(
          androidResourcesRegex,
          (match) => `${match}${splitConfig}`
        );
      } else {
        appBuildGradleConfig.modResults.contents = contents.replace(
          /android\s*{/,
          `android {${splitConfig}`
        );
      }
    }

    return appBuildGradleConfig;
  });

export default withAndroidSplits;
