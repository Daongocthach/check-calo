# Old App Compatibility

The redesigned app shares the production Supabase project with the version already in the
stores. This page lists everything that installed version depends on, so new features can be
built without breaking it. Check every migration, Edge Function change and OTA update against
it until the old version is gone (see [Retiring the old version](#retiring-the-old-version)).

**Old version:** iOS `1.0.0` (build 8), built by EAS from commit `c7e0d35` on 2026-05-05, runtime
`1.0.0`. The last OTA update for that runtime (`19f3d92`, 2026-05-04) is older than the build, so
devices run the embedded `c7e0d35` code. Android is not tracked: no EAS build exists for it.

## What the old app uses

### Auth

- Email + password: `signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`.
- Anonymous sessions: `signInAnonymously`, upgraded in place to email with `updateUser`.
  Deleting them removes the user's data for good, since there is nothing to sign back in with.
- Google / Apple OAuth code ships without a button (removed in `15b9ad6`, before this build).

### Tables

| Table           | Access                 | Columns the old app sends or selects                                                                                                                                                                       |
| --------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `food_entries`  | upsert, select, delete | `id, user_id, entry_date, consumed_at, meal_name, quantity_label, quantity_grams, total_calories, protein_grams, carbs_grams, fat_grams, notes, image_uri, thumbnail_uri, barcode, created_at, updated_at` |
| `profiles`      | delete own row         | Only deletes its row on sign-out; never reads profiles and has no leaderboard                                                                                                                              |
| `food_products` | select, upsert         | Barcode lookups; updates of existing rows have failed (warning only) since `20261018000003`                                                                                                                |

The old app does not touch `recent_foods`, `meals`, `meal_items`, `app_feature_flags`,
`weight_logs`, `get_my_profile()` or any column added after May.

### Edge Functions

| Function                  | How the old app calls it                                                                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gemini-food-parser`      | `POST` with `{ prompt, purpose, image?, userMessage? }`; `purpose` is `food_photo` or `home_review` (meal plan suggestions also send `home_review`). Reads `text` on success and `error`/`message` on failure. |
| `delete-sync-account`     | `functions.invoke` with no body                                                                                                                                                                                |
| `cleanup-anonymous-users` | Scheduled, not called by the app                                                                                                                                                                               |

### Storage

- Bucket `food-entry-images`, paths under `users/<user_id>/food-entries/...`, read through public
  URLs.

### Local data

- Same Supabase session store (MMKV `supabase-auth`), MMKV `default` and SQLite `check-calo.db`
  as the redesign, so an in-place update keeps the session, guests included. The old SQLite
  schema is version 11; the redesign migrates it from there.

### OTA

- `runtimeVersion.policy` is `appVersion`, so binaries only take OTA updates published with
  the same `version`. The redesign is `2.0.0`, so its updates never reach `1.0.0` binaries,
  which lack the new native modules. The old app checks for an update on every launch and
  reloads into it at once, so an update published from the old code with `version: '1.0.0'`
  reaches active users within a launch.

## Rules for new work

1. **Never set `version` in `app.config.ts` back to `1.0.0` or `1.0.1`**, and bump it again whenever a
   release adds native code, so OTA updates only reach binaries that can run them.
2. **New data goes in new tables** (or nullable columns with defaults). Never rename, drop,
   retype or add `NOT NULL` without a default to anything in the tables above.
3. **Never tighten RLS or grants** on what the old app uses above. Hiding the health columns
   of `profiles` (`supabase/deferred/hide_profile_health_columns.sql`) is safe for this build,
   which never reads them.
4. **Edge Functions and RPCs keep their contract.** Request fields, `purpose` values, the
   `text` / `error` response shape and the `Daily AI usage limit reached` prefix stay as they
   are. A change the old app cannot handle goes in a new function (`..._v2`).
5. **Try migrations locally first** (`supabase start`), with a rollback in
   `supabase/rollbacks/`, then apply to production before shipping the app version that needs
   them.
6. **Gate the redesign by version** when a breaking change becomes unavoidable: add a
   minimum supported version flag to `app_feature_flags`, ship a build that reads it, and
   only make the breaking change once most users have updated.

## Review of `refactor/core-redesign` (2026-11-01)

| Change                                           | Effect on the old app                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261027000001_add_nutrient_columns`            | Safe: nullable columns the old app never sends. Its upserts leave them untouched.                                                                                                                                                                                                                           |
| `20261028000001_add_weight_logs_and_goal_fields` | Safe: new table, new nullable columns, `get_my_profile()` only gains trailing columns.                                                                                                                                                                                                                      |
| `20261030000001_add_ai_quota_limits`             | Safe: new tables and a new service-role RPC; `consume_daily_ai_usage()` is kept.                                                                                                                                                                                                                            |
| `gemini-food-parser` (quota + validation)        | Request and response shapes still match. Old prompts (under ~4K chars plus a day of entries) and photos (resized to 1280px, JPEG) fit the new size limits, and replies fit `maxOutputTokens: 4096`. **Behaviour change:** guests keep 30 photo analyses a day but share a 100-call daily limit per network. |
| `version` bumped to `2.0.0`                      | Fixed: the redesign's OTA updates no longer reach old binaries, see rule 1.                                                                                                                                                                                                                                 |

Open points:

- Mobile carriers in Vietnam put many phones behind one public IP (CGNAT), so the per-network
  guest limit (`AI_GUEST_IP_DAILY_LIMIT`, default 100) can block guests who never met. Watch
  `ai_usage_ip_daily` after release and raise it with the Edge Function secret if needed.
- Which migrations production has already applied was not checked (`supabase migration list`).

## Retiring the old version

Once store analytics show the old version is barely used:

1. Raise the minimum supported version so remaining users must update.
2. Drop what no app version uses any more (`meals`, `meal_items`, `consume_daily_ai_usage()`),
   each with a rollback.
3. Delete this page.
