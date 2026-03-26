---
name: create-form
description: Generate a validated form with Zod schema, react-hook-form, and i18n
auto-invocable: true
triggers:
  - create a form
  - add a form
  - build an input form
  - form with validation
  - new form
---

# Create Validated Form

Generate a complete form with Zod v4 schema, react-hook-form integration, and i18n support.

## Gather Information

Ask the user for:

1. **Form name** (e.g., "CreateProduct", "EditProfile", "ContactUs")
2. **Fields** with types: name (string), email (email), age (number), role (enum), etc.
3. **Which fields are required** vs optional
4. **Feature location**: `src/features/<feature>/` (which feature module)
5. **Submit action**: mutation hook name or API endpoint (optional)

## Steps

### 1. Generate Zod Schema

```typescript
// src/features/<feature>/schemas/<name>Schema.ts
import { z } from 'zod/v4';

export const <name>Schema = z.object({
  // String fields
  name: z.string().min(1, 'validation.required').max(100, 'validation.nameTooLong'),

  // Email fields
  email: z.email('validation.emailInvalid'),

  // Number fields
  price: z.number({ message: 'validation.required' }).min(0, 'validation.priceMin'),

  // Enum fields
  role: z.enum(['admin', 'user', 'viewer']),

  // Optional fields
  bio: z.string().max(500, 'validation.bioMax').optional(),

  // Array fields
  tags: z.array(z.string()).min(1, 'validation.tagsRequired').optional(),

  // Boolean fields
  acceptTerms: z.literal(true, { message: 'validation.mustAcceptTerms' }),
});

export type <Name>FormData = z.infer<typeof <name>Schema>;
```

**Schema rules:**

- Import `z` from `zod/v4`, NOT `zod`
- ALL validation messages are i18n keys: `'validation.required'`, `'validation.emailInvalid'`
- Use `z.email()` for email validation (Zod v4 syntax)
- Use `z.number({ message: ... })` for required number with custom message
- Export the inferred type alongside the schema

### 2. Generate Form Component

```typescript
// src/features/<feature>/components/<Name>Form.tsx
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { Button } from '@/common/components/Button';
import { FormField } from '@/common/components/FormField';
import { Input } from '@/common/components/Input';
import { Select } from '@/common/components/Select';
import { Checkbox } from '@/common/components/Checkbox';
import { TextArea } from '@/common/components/TextArea';
import { <name>Schema, type <Name>FormData } from '../schemas/<name>Schema';

interface <Name>FormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<<Name>FormData>;
}

export function <Name>Form({ onSuccess, defaultValues }: <Name>FormProps) {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<<Name>FormData>({
    resolver: zodResolver(<name>Schema),
    defaultValues: {
      // Provide sensible defaults for every field
      ...defaultValues,
    },
  });

  const onSubmit = async (data: <Name>FormData) => {
    // If wired to a mutation hook:
    // await mutation.mutateAsync(data);
    onSuccess?.();
  };

  return (
    <View style={styles.form}>
      {/* String field */}
      <FormField name="name" control={control} label={t('fields.name')} required>
        <Input autoCapitalize="words" />
      </FormField>

      {/* Email field */}
      <FormField name="email" control={control} label={t('fields.email')} required>
        <Input keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      </FormField>

      {/* Number field */}
      <FormField name="price" control={control} label={t('fields.price')} required>
        <Input keyboardType="numeric" />
      </FormField>

      {/* Select/enum field */}
      <FormField name="role" control={control} label={t('fields.role')} required>
        <Select
          options={[
            { label: t('roles.admin'), value: 'admin' },
            { label: t('roles.user'), value: 'user' },
            { label: t('roles.viewer'), value: 'viewer' },
          ]}
        />
      </FormField>

      {/* TextArea field */}
      <FormField name="bio" control={control} label={t('fields.bio')}>
        <TextArea maxLength={500} />
      </FormField>

      {/* Checkbox field */}
      <FormField name="acceptTerms" control={control}>
        <Checkbox label={t('fields.acceptTerms')} />
      </FormField>

      <Button
        title={t('common.submit')}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: {
    gap: theme.metrics.spacingV.p16,
  },
}));
```

**Form component rules:**

- Use `FormField` + child input pattern (FormField handles error display)
- Set appropriate `keyboardType` for each field type
- Set `autoCapitalize`, `autoComplete` for better UX
- All labels via `t()` function
- Named export, NOT default export
- Use `isSubmitting` or `mutation.isPending` for loading state

### 3. Wire to Mutation (if API endpoint provided)

```typescript
import { useCreate<Entity> } from '../hooks/use<Name>';

export function <Name>Form({ onSuccess }: <Name>FormProps) {
  const createEntity = useCreate<Entity>();

  const onSubmit = async (data: <Name>FormData) => {
    await createEntity.mutateAsync(data);
    onSuccess?.();
  };

  return (
    // ...
    <Button
      loading={isSubmitting || createEntity.isPending}
      // ...
    />
  );
}
```

### 4. Add i18n Keys

Update BOTH `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`:

```json
{
  "fields": {
    "<fieldName>": "<Field Label>"
  },
  "validation": {
    // ... any new validation message keys
  }
}
```

Add field labels under a `"fields"` namespace (or feature-specific namespace).
Add any new validation keys under `"validation"`.

### 5. Validate

Run `npm run validate` to ensure no TypeScript or lint errors.

## Field Type Reference

| Field Type | Input Component | KeyboardType                    | Zod Validator                      |
| ---------- | --------------- | ------------------------------- | ---------------------------------- |
| Text       | `<Input />`     | `"default"`                     | `z.string()`                       |
| Email      | `<Input />`     | `"email-address"`               | `z.email()`                        |
| Password   | `<Input />`     | `"default"` + `secureTextEntry` | `z.string().min(8)`                |
| Number     | `<Input />`     | `"numeric"`                     | `z.number()`                       |
| Phone      | `<Input />`     | `"phone-pad"`                   | `z.string()`                       |
| URL        | `<Input />`     | `"url"`                         | `z.url()`                          |
| Multiline  | `<TextArea />`  | `"default"`                     | `z.string().max(n)`                |
| Select     | `<Select />`    | N/A                             | `z.enum([...])`                    |
| Checkbox   | `<Checkbox />`  | N/A                             | `z.boolean()` or `z.literal(true)` |
| Toggle     | `<Switch />`    | N/A                             | `z.boolean()`                      |

## Critical Rules

- Import `z` from `zod/v4`, NOT `zod`
- ALL validation messages are i18n keys, NOT raw text
- `StyleSheet` from `react-native-unistyles`, NOT `react-native`
- Named export for the form component
- Always update BOTH locale files
- Use `@/` path aliases
- No `any` types
- All field labels via `useTranslation()`
