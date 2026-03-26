# React Native Template

Production-ready Expo template for building real mobile apps on top of a solid base instead of starting from a blank screen.

[![React Native](https://img.shields.io/badge/React%20Native-0.83.2-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-55-000020?logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E)](LICENSE)

This template ships with the parts most projects end up rebuilding anyway:

- Expo Router with typed routes
- strict TypeScript
- light and dark themes with `react-native-unistyles`
- React Query for server state
- Zustand for client state
- Supabase integration with graceful degradation when unconfigured
- English and Vietnamese i18n
- MMKV storage
- form handling with React Hook Form and Zod v4
- shared UI components, testing, linting, formatting, and AI-agent guidance

## Why use this

- Start from a real app foundation instead of a demo counter app
- Keep design and spacing consistent through semantic theme tokens
- Build features inside a predictable `src/features/*` structure
- Work smoothly with AI tools using repo-specific instructions in `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, and more
- Reuse built-in scripts for migration, scaffolding, i18n validation, and project health checks

## Tech stack

| Layer        | Technology                        |
| ------------ | --------------------------------- |
| Framework    | React Native 0.83.2 + Expo SDK 55 |
| Routing      | `expo-router`                     |
| Language     | TypeScript 5.9 (strict mode)      |
| Styling      | `react-native-unistyles` 3.x      |
| Server state | `@tanstack/react-query`           |
| Client state | Zustand                           |
| Backend      | Supabase                          |
| Networking   | Axios                             |
| i18n         | `react-i18next`                   |
| Storage      | `react-native-mmkv`               |
| Forms        | `react-hook-form` + `zod/v4`      |
| Testing      | Jest + `jest-expo`                |
| Quality      | ESLint 9 + Prettier + Husky       |

## Included out of the box

- Authentication foundation with Zustand auth store and Supabase-backed services
- 30+ reusable UI components in [`src/common/components`](src/common/components)
- API client with request/response interceptors
- environment config in [`src/config/env.ts`](src/config/env.ts)
- locale files in [`src/i18n/locales/en.json`](src/i18n/locales/en.json) and [`src/i18n/locales/vi.json`](src/i18n/locales/vi.json)
- theme tokens in [`src/theme`](src/theme)
- utility scripts in [`scripts`](scripts)

## Quick start

```bash
# 1. Clone the repository
git clone <your-fork-or-template-url> my-app
cd my-app

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Start Expo
npm start
```

The app can boot without Supabase credentials. Auth-related features simply stay inactive until valid env values are provided.

## Development commands

```bash
# App
npm start
npm run ios
npm run android
npm run web

# Quality
npm run type-check
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run validate

# Testing
npm test
npm run test:watch
npm run test:coverage

# Project helpers
npm run migrate
npm run scaffold -- <feature-name>
npm run doctor
npm run i18n:check
npm run check-env
```

`npm run validate` currently runs:

- `type-check`
- `lint`
- `format:check`
- `i18n:check`

Run it before every commit.

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and update the values you need:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHED_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_APP_ENV=development
```

These values are read through [`src/config/env.ts`](src/config/env.ts).

## Project structure

```text
.
├── app/                         # Expo Router screens and layouts
├── src/
│   ├── common/components/       # Shared UI components
│   ├── config/                  # Environment config
│   ├── features/                # Feature modules
│   ├── hooks/                   # Global hooks
│   ├── i18n/                    # Translation setup and locale files
│   ├── integrations/            # Third-party clients such as Supabase
│   ├── providers/               # Query provider and auth store
│   ├── services/api/            # Axios client
│   ├── theme/                   # Tokens, fonts, metrics, theme config
│   ├── types/                   # Shared TypeScript types
│   └── utils/storage/           # MMKV helpers
├── assets/                      # Fonts and images
├── docs/                        # Setup, architecture, migration, AI guide
├── scripts/                     # CLI helpers
└── app.config.ts                # Expo app configuration
```

Path aliases:

- `@/*` -> `src/*`
- `~/*` -> `app/*`

## Core conventions

- Use named exports inside `src/`; only Expo Router screen files use default exports
- Use `StyleSheet` from `react-native-unistyles`, not React Native `StyleSheet`
- Use theme tokens instead of hardcoded colors or spacing values
- Put all user-facing strings through `useTranslation`
- Use React Query for server state and Zustand selectors for client state
- Place tests next to the files they cover

## Feature workflow

### 1. Customize the template

Main files to update first:

- [`app.config.ts`](app.config.ts) for app name, slug, scheme, package IDs, assets, and Expo config
- [`package.json`](package.json) for package metadata
- [`src/theme/light-theme.ts`](src/theme/light-theme.ts) and [`src/theme/dark-theme.ts`](src/theme/dark-theme.ts) for branding
- locale files in [`src/i18n/locales`](src/i18n/locales)

### 2. Scaffold a feature

```bash
npm run scaffold -- products
```

This creates a feature folder with `components`, `services`, `hooks`, `types`, `constants`, `stores`, and `schemas`, and also appends starter i18n keys.

### 3. Migrate interactively

```bash
npm run migrate
```

Use the migration wizard if you want guided template cleanup and app identity updates.

## Documentation

- [`docs/SETUP.md`](docs/SETUP.md): local setup and environment notes
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): architecture overview
- [`docs/COMPONENTS.md`](docs/COMPONENTS.md): shared component API
- [`docs/AI-GUIDE.md`](docs/AI-GUIDE.md): patterns and examples for AI-assisted development
- [`docs/MIGRATION.md`](docs/MIGRATION.md): step-by-step migration guide
- [`CONVENTIONS.md`](CONVENTIONS.md): coding conventions
- [`AGENTS.md`](AGENTS.md): universal instructions for coding agents

## AI tooling

This repo includes instructions for multiple coding assistants so they can work with the codebase with minimal setup:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursorrules`
- `.cursor/rules/project.mdc`
- `.windsurfrules`
- `.clinerules`
- `.github/copilot-instructions.md`
- `docs/llms.txt`

## Contributing

Before opening a PR:

1. Run `npm run validate`
2. Run `npm test`
3. Update both locale files if you added UI strings
4. Keep commit messages in conventional format such as `feat(home): redesign dashboard`

## License

MIT. See [LICENSE](LICENSE).
