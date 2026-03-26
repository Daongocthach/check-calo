---
name: validate-conventions
description: Review changed code against project conventions and rules
auto-invocable: true
triggers:
  - review my code
  - check conventions
  - validate changes
  - lint my changes
  - check my code
---

# Validate Conventions

Review changed code against all project conventions defined in `CONVENTIONS.md`.

## Steps

### 1. Get Changed Files

Run `git diff --name-only HEAD` to find modified files. If no uncommitted changes, check `git diff --name-only HEAD~1` for the last commit.

If the user specifies particular files, use those instead.

### 2. Read Changed Files

Read each changed file to inspect the code.

### 3. Check Against Rules

For each file, check ALL of the following rules:

#### Import Rules

- [ ] `StyleSheet` imported from `react-native-unistyles`, NOT `react-native`
- [ ] `Text` imported from `@/common/components/Text`, NOT `react-native`
- [ ] `z` imported from `zod/v4`, NOT `zod`
- [ ] Path aliases used (`@/` or `~/`), no deep relative imports (`../../..`)
- [ ] Import order: React core > third-party > `@/` internal > relative
- [ ] Type imports use `import type { ... }`
- [ ] Imports from barrel files, not implementation files (e.g., `@/common/components/Button` not `@/common/components/Button/Button`)

#### Component Rules

- [ ] Named exports in `src/` files
- [ ] Default exports in `app/` screen files
- [ ] `styles.useVariants()` called before accessing styles (if using variants)
- [ ] No inline styles - all styles in `StyleSheet.create`
- [ ] Accessibility props on all interactive elements:
  - `accessibilityRole` on Pressable, TouchableOpacity, buttons
  - `accessibilityLabel` on interactive elements
  - `accessibilityState` for disabled/busy/selected states

#### Style Rules

- [ ] `StyleSheet.create((theme) => ({...}))` pattern with theme callback
- [ ] No color literals (`#hex`, `rgb()`, named colors) - use `theme.colors.*`
- [ ] No hardcoded numeric spacing - use `theme.metrics.spacing.*` or `theme.metrics.spacingV.*`
- [ ] No hardcoded font sizes - use `theme.fonts.size.*`
- [ ] No hardcoded border radius - use `theme.metrics.borderRadius.*`

#### State Management Rules

- [ ] Zustand stores accessed with selectors: `useStore((s) => s.field)`, NOT `useStore()`
- [ ] No `useAuthStore()` without selector
- [ ] No `useAuthStore.getState()` inside React components (only in non-React code)
- [ ] Server state via React Query, NOT local state + useEffect for API data

#### i18n Rules

- [ ] No hardcoded user-facing strings in JSX
- [ ] All UI text uses `t('key')` from `useTranslation()`
- [ ] Both `en.json` and `ar.json` updated together (check git diff for both)
- [ ] Validation messages in Zod schemas are i18n keys

#### TypeScript Rules

- [ ] No `any` types
- [ ] Proper type imports with `import type`
- [ ] Props interfaces named `{ComponentName}Props`

#### File Organization Rules

- [ ] Component files: PascalCase (`Button.tsx`, `Button.styles.ts`, `Button.types.ts`)
- [ ] Screen files: lowercase with hyphens (`order-details.tsx`)
- [ ] Hook files: camelCase starting with `use` (`useProducts.ts`)
- [ ] Service files: camelCase ending with `Service` (`productService.ts`)
- [ ] Schema files: camelCase ending with `Schema` (`productSchema.ts`)
- [ ] Store files: camelCase ending with `Store` (`authStore.ts`)

#### API Pattern Rules

- [ ] API calls in service files, NOT directly in components
- [ ] Using `api` from `@/services/api`, not raw `fetch` or `axios`
- [ ] Query key factories used (not inline arrays)

#### Other Rules

- [ ] No `console.log` in production code (use `if (__DEV__)` guard or remove)
- [ ] No custom navigation state - use `expo-router` (`router.push`, `router.replace`)
- [ ] No React Context for auth - use `useAuthStore`

### 4. Report Findings

For each issue found, report:

```
[RULE] <rule name>
[FILE] <file_path>:<line_number>
[ISSUE] <description of the violation>
[FIX] <how to fix it>
```

Group findings by file. Show clean files too: `<file_path> - No issues found`

### 5. Run Validation

Run `npm run validate` as a final automated check (TypeScript + ESLint + Prettier).

Report the results.

### 6. Summary

```
Checked: X files
Issues found: Y
  - Import issues: N
  - Style issues: N
  - i18n issues: N
  - TypeScript issues: N
  - Other: N

npm run validate: PASS/FAIL
```

## Critical Rules

- Check EVERY rule for EVERY changed file - don't skip any
- Report file:line references for all issues
- Suggest concrete fixes, not just "fix this"
- Run `npm run validate` as the final step
- If locale files changed, verify both have identical key structures
