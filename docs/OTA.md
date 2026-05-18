# OTA Updates

This app is already set up for Expo OTA updates.

## What You Can Ship With OTA

- UI and layout changes
- TypeScript / JavaScript logic
- text changes and translations
- styling tweaks
- image asset changes that do not require native code

## What Requires a Full Build

- native code changes
- new native dependencies
- changes to `app.config.ts` native settings
- anything that affects iOS / Android binaries

## Current Project Setup

- OTA is enabled in `app.config.ts`
- `runtimeVersion.policy` is set to `appVersion`
- EAS channels are configured in `eas.json`
  - `preview`
  - `production`

## Suggested Workflow

1. Make your JS / TS change.
2. Run validation:
   ```bash
   npm run validate
   ```
3. Publish to preview:
   ```bash
   eas update --branch preview --message "your message"
   ```
4. Test on a real device or internal build.
5. Publish to production when ready:
   ```bash
   eas update --branch production --message "your message"
   ```

## Build Commands

Use a full build when OTA is not enough:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile preview --platform all
eas build --profile production --platform all
```

## Notes

- Because `runtimeVersion.policy` is `appVersion`, a new app version means a new runtime.
- OTA updates only reach installs that match the same runtime version.
- If you change native config or dependencies, rebuild and redistribute the app.
