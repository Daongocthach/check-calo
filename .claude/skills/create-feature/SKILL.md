---
name: create-feature
description: Scaffold a complete feature module with types, service, hooks, schema, and constants
auto-invocable: true
triggers:
  - add a feature
  - build a module
  - create a feature
  - scaffold feature
  - new feature module
---

# Create Feature Module

Scaffold a complete feature module following the project's exact conventions.

## Gather Information

Ask the user for:

1. **Feature name** (e.g., "products", "orders", "notifications") - lowercase, plural
2. **Entity fields** - the data shape (name, type pairs)
3. **API endpoint base** (e.g., "/products") - defaults to `/<feature-name>`

## Steps

### 1. Create Directory Structure

```
src/features/<name>/
├── types/index.ts
├── services/<name>Service.ts
├── hooks/use<Name>.ts
├── schemas/<name>Schema.ts
├── constants/index.ts
└── components/          (empty directory, ready for feature components)
```

### 2. Generate Types File

```typescript
// src/features/<name>/types/index.ts
export interface <Entity> {
  id: string;
  // ... fields from user input
  createdAt: string;
  updatedAt: string;
}

export interface Create<Entity>Data {
  // ... writable fields (exclude id, createdAt, updatedAt)
}

export interface Update<Entity>Data extends Partial<Create<Entity>Data> {}
```

### 3. Generate Service File

```typescript
// src/features/<name>/services/<name>Service.ts
import { api } from '@/services/api';
import type { <Entity>, Create<Entity>Data, Update<Entity>Data } from '../types';

export async function fetch<Entities>(): Promise<<Entity>[]> {
  const { data } = await api.get<<Entity>[]>('<endpoint>');
  return data;
}

export async function fetch<Entity>(id: string): Promise<<Entity>> {
  const { data } = await api.get<<Entity>>(`<endpoint>/${id}`);
  return data;
}

export async function create<Entity>(payload: Create<Entity>Data): Promise<<Entity>> {
  const { data } = await api.post<<Entity>>('<endpoint>', payload);
  return data;
}

export async function update<Entity>(id: string, payload: Update<Entity>Data): Promise<<Entity>> {
  const { data } = await api.patch<<Entity>>(`<endpoint>/${id}`, payload);
  return data;
}

export async function delete<Entity>(id: string): Promise<void> {
  await api.delete(`<endpoint>/${id}`);
}
```

### 4. Generate React Query Hooks

```typescript
// src/features/<name>/hooks/use<Name>.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetch<Entities>,
  fetch<Entity>,
  create<Entity>,
  update<Entity>,
  delete<Entity>,
} from '../services/<name>Service';
import type { Create<Entity>Data, Update<Entity>Data } from '../types';

export const <NAME>_KEYS = {
  all: ['<name>'] as const,
  list: (filters?: object) => [...<NAME>_KEYS.all, 'list', filters] as const,
  detail: (id: string) => [...<NAME>_KEYS.all, 'detail', id] as const,
};

export function use<Entities>(filters?: object) {
  return useQuery({
    queryKey: <NAME>_KEYS.list(filters),
    queryFn: fetch<Entities>,
  });
}

export function use<Entity>(id: string) {
  return useQuery({
    queryKey: <NAME>_KEYS.detail(id),
    queryFn: () => fetch<Entity>(id),
    enabled: !!id,
  });
}

export function useCreate<Entity>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Create<Entity>Data) => create<Entity>(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: <NAME>_KEYS.all });
    },
  });
}

export function useUpdate<Entity>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update<Entity>Data }) =>
      update<Entity>(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: <NAME>_KEYS.all });
    },
  });
}

export function useDelete<Entity>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => delete<Entity>(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: <NAME>_KEYS.all });
    },
  });
}
```

### 5. Generate Zod Schema

```typescript
// src/features/<name>/schemas/<name>Schema.ts
import { z } from 'zod/v4';

export const create<Entity>Schema = z.object({
  // Generate field validations based on entity fields
  // Use i18n keys for ALL validation messages: 'validation.required', 'validation.<name>Min', etc.
});

export const update<Entity>Schema = create<Entity>Schema.partial();

export type Create<Entity>FormData = z.infer<typeof create<Entity>Schema>;
export type Update<Entity>FormData = z.infer<typeof update<Entity>Schema>;
```

**Validation message rules:**

- All messages are i18n keys, NOT raw text
- `z.string().min(1, 'validation.required')` for required strings
- `z.email('validation.emailInvalid')` for emails
- Feature-specific keys: `validation.<name>Min`, `validation.<name>Max`, etc.

### 6. Generate Constants File

```typescript
// src/features/<name>/constants/index.ts
// Add feature-specific constants as needed
```

### 7. Add i18n Keys

Update BOTH `src/i18n/locales/en.json` and `src/i18n/locales/ar.json` with:

```json
{
  "<name>": {
    "title": "<Name>",
    "empty": "No <name> found",
    "addNew": "Add <Entity>",
    "edit": "Edit <Entity>",
    "deleteConfirm": "Are you sure you want to delete this <entity>?",
    "created": "<Entity> created successfully",
    "updated": "<Entity> updated successfully",
    "deleted": "<Entity> deleted successfully"
  }
}
```

Also add any new validation keys under the `"validation"` namespace.

For Arabic translations: provide best-effort translations. Mark uncertain ones with a `TODO` comment in the commit message.

### 8. Validate

Run `npm run validate` to ensure no TypeScript or lint errors.

## Critical Rules

- Import `StyleSheet` from `react-native-unistyles`, NOT `react-native`
- Import `z` from `zod/v4`, NOT `zod`
- Import `Text` from `@/common/components/Text`, NOT `react-native`
- Use `@/` path aliases, never deep relative imports
- Named exports only (no default exports in `src/`)
- All validation messages are i18n keys
- Always update BOTH locale files
- Use `api` from `@/services/api` for HTTP calls
- No `any` types
