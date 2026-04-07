# Supabase Anonymous User Cleanup

Use backend cleanup for stale anonymous users. Do not do this from the mobile client.

## What Gets Deleted

The cleanup only deletes anonymous users that meet all conditions below:

- older than the configured age threshold
- optionally match test-like markers such as `test`, `staging`, `development`, or `+test`
- have no rows in `public.food_entries`
- have no files under `users/<user_id>/food-entries` in the configured storage bucket

## Required Secrets

- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET` (optional, defaults to `food-entry-images`)
- `ANONYMOUS_CLEANUP_SECRET` for the Edge Function

## Local Admin Script

Dry run:

```bash
SUPABASE_SERVICE_ROLE_KEY=... \
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
npx tsx scripts/cleanup-anonymous-users.ts --dry-run --min-age-days 7 --only-test
```

Real delete:

```bash
SUPABASE_SERVICE_ROLE_KEY=... \
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
npx tsx scripts/cleanup-anonymous-users.ts --min-age-days 7 --only-test
```

Flags:

- `--dry-run`: print eligible users without deleting
- `--min-age-days <n>`: minimum account age in days
- `--only-test`: keep cleanup scoped to test-like accounts
- `--bucket <name>`: override storage bucket name

## Edge Function

Deploy:

```bash
supabase functions deploy cleanup-anonymous-users
supabase secrets set ANONYMOUS_CLEANUP_SECRET=your-secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Manual invoke:

```bash
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/cleanup-anonymous-users" \
  -H "Authorization: Bearer your-secret" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"minAgeDays":7,"onlyTest":true}'
```

## Scheduled Job

Create a scheduled call from your backend, CI scheduler, or Supabase cron infrastructure to invoke the function once per day.

Ready-to-run SQL template:

- [cleanup-anonymous-users.sql](/Users/finepro/FineproMobileApp/check-calo/supabase/cron/cleanup-anonymous-users.sql)

Recommended payload:

```json
{
  "dryRun": false,
  "minAgeDays": 7,
  "onlyTest": true
}
```

Recommended schedule:

- daily
- outside business hours

## Notes

- This cleanup intentionally skips users that still own cloud nutrition data.
- If you want more aggressive cleanup later, add explicit deletion for orphaned data first, then delete the auth user.
