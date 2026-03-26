---
name: create-component
description: Scaffold a UI component with unistyles variants pattern
auto-invocable: true
triggers:
  - create a component
  - add a UI component
  - new component
  - scaffold component
---

# Create UI Component

Scaffold a UI component following the project's exact unistyles variant pattern.

## Gather Information

Ask the user for:

1. **Component name** (PascalCase, e.g., "ProductCard", "StatusBadge")
2. **Location**: common (`src/common/components/`) or feature-specific (`src/features/<feature>/components/`)
3. **Key props** and whether it needs variants (size, variant, etc.)
4. **Interactive?** Does it handle press events?

## Steps

### 1. Create Component Directory

```
<ComponentName>/
├── <ComponentName>.tsx
├── <ComponentName>.types.ts
├── <ComponentName>.styles.ts
└── index.ts
```

### 2. Generate Types File

```typescript
// <ComponentName>.types.ts
import type { ViewProps } from 'react-native';
import type { <ComponentName>StyleVariants } from './<ComponentName>.styles';

export interface <ComponentName>Props extends ViewProps, <ComponentName>StyleVariants {
  // Required props
  // Optional props with defaults documented
}
```

**Type rules:**

- Extend appropriate RN base props (`ViewProps`, `PressableProps`, etc.)
- Intersect with the style variants type from the `.styles.ts` file
- Use `import type` for all type imports
- Use project types from `@/common/components/shared.types` (e.g., `ComponentSize`)

### 3. Generate Styles File

Follow the exact pattern from `Button.styles.ts`:

```typescript
// <ComponentName>.styles.ts
import { StyleSheet, type UnistylesVariants } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    // Base styles using theme tokens
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.metrics.borderRadius.md,
    padding: theme.metrics.spacing.p16,
    // Variants block for prop-driven style changes
    variants: {
      variant: {
        primary: { /* ... */ },
        secondary: { /* ... */ },
      },
      size: {
        sm: { padding: theme.metrics.spacing.p8 },
        md: { padding: theme.metrics.spacing.p12 },
        lg: { padding: theme.metrics.spacing.p16 },
      },
      disabled: {
        true: { opacity: 0.5 },
      },
    },
  },
  // Additional style targets with their own variants if needed
}));

export type <ComponentName>StyleVariants = UnistylesVariants<typeof styles>;
```

**Style rules:**

- ALWAYS use `StyleSheet` from `react-native-unistyles`
- ALWAYS use the theme callback: `StyleSheet.create((theme) => ({...}))`
- NEVER use color literals - use `theme.colors.*`
- NEVER hardcode spacing - use `theme.metrics.spacing.*` or `theme.metrics.spacingV.*`
- Use `variants` block for any prop-driven style changes
- Use boolean variants (`true`/`false` keys) for toggleable states
- Export the variants type as `<ComponentName>StyleVariants`

### 4. Generate Component File

```typescript
// <ComponentName>.tsx
import { View } from 'react-native';
import { Text } from '@/common/components/Text';
import { styles } from './<ComponentName>.styles';
import type { <ComponentName>Props } from './<ComponentName>.types';

export function <ComponentName>({
  // Destructure props with defaults
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  ...rest
}: <ComponentName>Props) {
  // Call useVariants ONCE before accessing any styles
  styles.useVariants({ variant, size, disabled });

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="..." // appropriate role
      {...rest}
    >
      {/* Component content */}
    </View>
  );
}
```

**If interactive (handles press):**

```typescript
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function <ComponentName>({ onPress, disabled, ...props }: <ComponentName>Props) {
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress();

  styles.useVariants({ disabled });

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle, props.style]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={/* i18n label */}
      accessibilityState={{ disabled }}
      {...props}
    >
      {/* Content */}
    </AnimatedPressable>
  );
}
```

**Component rules:**

- Named export, NEVER default export
- Call `styles.useVariants(...)` once per render, before accessing styles
- All interactive elements MUST have `accessibilityRole` and `accessibilityLabel`
- Use `accessibilityState` for disabled, busy, selected states
- Import `Text` from `@/common/components/Text`, NOT from `react-native`
- All user-facing strings via `useTranslation()` hook

### 5. Generate Barrel File

```typescript
// index.ts
export { <ComponentName> } from './<ComponentName>';
export type { <ComponentName>Props } from './<ComponentName>.types';
```

### 6. Update Barrel (if common component)

If the component is in `src/common/components/`, add it to `src/common/components/index.ts` in the appropriate category section:

```typescript
// Add under the matching category comment
export { <ComponentName> } from './<ComponentName>';
export type { <ComponentName>Props } from './<ComponentName>';
```

### 7. Validate

Run `npm run validate` to ensure no TypeScript or lint errors.

## Critical Rules

- `StyleSheet` from `react-native-unistyles`, NOT `react-native`
- `Text` from `@/common/components/Text`, NOT `react-native`
- No inline styles, no color literals, no hardcoded spacing
- Named exports only
- All interactive elements need accessibility props
- `styles.useVariants()` called once before any style access
- Use `@/` path aliases
