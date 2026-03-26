---
name: migrate-template
description: Transform the base template into a specific application
disable-model-invocation: true
---

# Migrate Template

Transform this RNCopilot base template into a specific application. This is a deliberate, one-time operation that walks through all customization steps.

**Reference:** Follow the complete procedure in `docs/MIGRATION.md`.

## Steps

Walk through each section interactively, confirming with the user before making changes.

### 1. Pre-Migration

Ask the user:

- **What app are you building?** (e.g., e-commerce, social, fitness, notes)

### 2. App Identity

Update the following files based on user input:

**`app.json`:**

- `name` - app display name
- `slug` - URL-safe identifier
- `scheme` - deep link scheme
- `ios.bundleIdentifier`
- `android.package`

**`package.json`:**

- `name` - package name

Ask the user for their app name and bundle identifier.

### 3. Theme Customization

Update the color palette in:

- `src/theme/tokens/light-theme.ts`
- `src/theme/tokens/dark-theme.ts`

Ask the user:

- **Primary brand color** (defaults to Indigo #6366F1)
- **Accent color** (defaults to Teal #14B8A6)
- **Style preference**: warm, cool, neutral, bold

Generate appropriate light and dark theme token values for `brand.primary`, `brand.secondary`, `brand.tertiary`, `brand.primaryVariant`, and update dependent tokens (overlay, gradient, etc.).

### 4. Internationalization

Ask the user:

- **Which languages?** (default: EN + AR)
- **Remove Arabic?** If yes, simplify i18n config
- **Add other languages?** If yes, create new locale files

Update `src/i18n/config.ts` and locale files accordingly.

Replace template-specific strings in both locale files:

- App name references
- Template placeholder text
- Settings screen labels

### 5. Backend Configuration

Ask the user:

- **Using Supabase?** If yes, guide `.env` setup
- **Different backend?** If yes, update `src/services/api/client.ts` base URL
- **No backend yet?** Leave as-is (graceful degradation works)

If using Supabase, guide creation of `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Authentication Customization

If the app needs authentication, ask:

- **Auth methods needed?** (email/password, OAuth, magic link)
- **Custom fields on signup?** (username, phone, etc.)
- **Post-login redirect?** (which screen)

Update auth forms, schemas, and service as needed.

### 7. Navigation Structure

Ask the user:

- **How many tabs?** and their names/icons
- **Any stack screens?** (detail pages, modals)
- **Auth flow screens?** (login, register, forgot-password)

Update `app/(main)/(tabs)/_layout.tsx` with the new tab configuration.
Create screen files for each new route.
Add i18n keys for all new screen/tab names.

### 8. First Feature Scaffolding

Suggest using `/create-feature` to scaffold the app's primary feature module.

Ask:

- **What's the main entity?** (e.g., Product, Post, Workout, Note)
- **What fields does it have?**

Then run the create-feature workflow.

### 9. Final Verification

Run the full validation suite:

```bash
npm run validate
```

Check:

- All template references removed
- Both locale files in sync
- No TypeScript errors
- No lint errors
- App boots without crashes (`npm start`)

### 10. Summary

Report all changes made:

- Files modified
- Features scaffolded
- Remaining TODOs (manual steps like adding Supabase credentials, app icons, etc.)

## Critical Rules

- Always confirm with the user before making destructive changes
- Read `docs/MIGRATION.md` for the complete, detailed procedure
- Run `npm run validate` at the end
- Never delete files without asking first
- Commit after each major section so changes can be reverted individually
