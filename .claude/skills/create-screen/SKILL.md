---
name: create-screen
description: Add a new screen or tab to the app with routing and i18n
auto-invocable: true
triggers:
  - add a screen
  - create a page
  - add a tab
  - new screen
  - new tab
  - create a route
---

# Create Screen / Tab

Add a new screen or tab following expo-router conventions and project patterns.

## Gather Information

Ask the user for:

1. **Screen name** (e.g., "products", "order-details", "profile")
2. **Type**: tab screen, stack screen, or modal
3. **Location in routing**:
   - Tab: `app/(main)/(tabs)/<name>.tsx`
   - Stack within main: `app/(main)/<name>.tsx`
   - Auth screen: `app/(auth)/<name>.tsx`
4. **Protected?** Does it require authentication?
5. **Needs backing data?** If yes, suggest running `/create-feature` first

## Steps

### 1. Create the Screen File

Screen files use **lowercase with hyphens** and **default exports**.

```typescript
// app/(main)/(tabs)/<name>.tsx  OR  app/(main)/<name>.tsx
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { ScreenContainer } from '@/common/components/ScreenContainer';
import { Text } from '@/common/components/Text';
import { ErrorBoundary } from '@/common/components/ErrorBoundary';

export default function <Name>Screen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer scrollable padded>
      <ErrorBoundary>
        <Text variant="h1">{t('<name>.title')}</Text>
      </ErrorBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Add styles as needed
}));
```

**If protected (requires auth):**

```typescript
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function <Name>Screen() {
  useProtectedRoute(); // Redirects to /(auth)/login if not authenticated
  const { t } = useTranslation();
  // ... rest of screen
}
```

### 2. Register as Tab (if tab screen)

Edit `app/(main)/(tabs)/_layout.tsx` to add the new tab:

```typescript
<Tabs.Screen
  name="<name>"
  options={{
    title: t('tabs.<name>'),
    tabBarIcon: ({ color, size }) => (
      <Icon name="<icon-name>-outline" color={color} size={size} />
    ),
  }}
/>
```

The `Icon` component uses Ionicons names. Choose an appropriate icon from the Ionicons set.

**Current tab layout reference** (`app/(main)/(tabs)/_layout.tsx`):

- Uses custom `TabBar` component: `tabBar={(props) => <TabBar {...props} />}`
- `headerShown: false` in screenOptions
- Import `Icon` from `@/common/components/Icon` if adding tabBarIcon

### 3. Add i18n Keys

Update BOTH `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`:

```json
// For the screen content
{
  "<name>": {
    "title": "<Screen Title>",
    "subtitle": "<Optional subtitle>"
  }
}

// If it's a tab, also add under "tabs":
{
  "tabs": {
    "<name>": "<Tab Label>"
  }
}
```

Provide Arabic translations for both. Mark uncertain ones with TODO in commit.

### 4. Add Navigation (if stack screen)

If the screen is navigated to from another screen, add the navigation call:

```typescript
import { router } from 'expo-router';

// Navigate to the screen
router.push('/(main)/<name>');

// Or with params
router.push({ pathname: '/(main)/<name>', params: { id: '123' } });
```

### 5. Validate

Run `npm run validate` to ensure no TypeScript or lint errors.

## Screen Patterns

### List Screen (with data)

```typescript
import { FlatList } from 'react-native';
import { Loading } from '@/common/components/Loading';
import { EmptyState } from '@/common/components/EmptyState';
import { use<Entities> } from '@/features/<name>/hooks/use<Name>';

export default function <Name>Screen() {
  const { t } = useTranslation();
  const { data, isLoading } = use<Entities>();

  if (isLoading) return <Loading fullScreen />;

  return (
    <ScreenContainer>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        ListEmptyComponent={<EmptyState title={t('<name>.empty')} />}
      />
    </ScreenContainer>
  );
}
```

### Detail Screen (with params)

```typescript
import { useLocalSearchParams } from 'expo-router';
import { use<Entity> } from '@/features/<name>/hooks/use<Name>';

export default function <Name>DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = use<Entity>(id);
  // ...
}
```

## Critical Rules

- Screen files MUST use `export default` (expo-router requirement)
- Screen filenames are **lowercase with hyphens**: `order-details.tsx`, NOT `OrderDetails.tsx`
- `StyleSheet` from `react-native-unistyles`, NOT `react-native`
- `Text` from `@/common/components/Text`, NOT `react-native`
- All user-facing strings via `useTranslation()`
- Always update BOTH locale files
- Wrap screen content in `ScreenContainer`
- Use `ErrorBoundary` for data-driven screens
- No inline styles, no color literals, no hardcoded strings
