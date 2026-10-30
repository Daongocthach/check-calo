# Gemini Food Analyzer Setup

This project uses the same pattern as `hu-tai-chinh`:

- the mobile app never stores the Gemini API key
- the Gemini API key lives in a Supabase Edge Function secret
- the app sends the food photo to the Edge Function
- the Edge Function calls Gemini and returns a JSON draft for the meal form

## Files added

- `supabase/functions/gemini-food-parser/index.ts`
- `src/features/nutrition/services/geminiFoodAnalyzer.ts`

## Supabase setup

Create the secret values in your Supabase project:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase secrets set GEMINI_MODEL=gemini-2.5-flash-lite
```

Deploy the function:

```bash
supabase functions deploy gemini-food-parser
```

## Usage limits

Each call goes through `consume_ai_quota()` (migration `20261030000001_add_ai_quota_limits.sql`),
which only counts the call when every limit still has room. Anonymous (guest) users are free to
create, so they get a lower quota plus per-network and app-wide caps.

| Secret                       | Default | Limit                                               |
| ---------------------------- | ------- | --------------------------------------------------- |
| `AI_USER_DAILY_LIMIT`        | 30      | `food_photo` calls per signed-up user per day       |
| `AI_GUEST_DAILY_LIMIT`       | 10      | `food_photo` calls per guest per day                |
| `AI_REVIEW_DAILY_LIMIT`      | 10      | `home_review` calls per user per day (older builds) |
| `AI_GUEST_IP_DAILY_LIMIT`    | 100     | guest calls per network (hashed IP) per day         |
| `AI_GUEST_TOTAL_DAILY_LIMIT` | 3000    | guest calls across the app per day                  |
| `AI_TOTAL_DAILY_LIMIT`       | 20000   | all calls across the app per day                    |

Change one without redeploying the app:

```bash
supabase secrets set AI_GUEST_DAILY_LIMIT=15
```

A blocked call returns 429 with an `error` starting with `Daily AI usage limit reached` (installed
app versions match on that text) and a `code`: `user_limit`, `guest_limit`, `ip_limit`,
`guest_total_limit` or `total_limit`. Days follow the database clock (UTC).

Also set a quota and a budget alert on the Gemini API key in Google Cloud; that is the cap that
holds even if these counters are bypassed.

If you want local development:

```bash
supabase start
supabase functions serve gemini-food-parser --env-file .env
```

## App usage

Use the service:

```ts
import { analyzeFoodPhotoWithGemini } from '@/features/nutrition/services/geminiFoodAnalyzer';

const result = await analyzeFoodPhotoWithGemini(photoUri, 'com ga xoi mo');
```

Possible results:

- `status: 'ready'`
  - contains a `draft` with `mealName`, `quantityGrams`, `calories`, `proteinGrams`, `carbsGrams`, `fatGrams`, `notes`, and `confidence`
- `status: 'need_more_info'`
  - contains `assistantMessage`
- `status: 'unsupported'`
  - contains `assistantMessage`

## Recommended next step

Wire `analyzeFoodPhotoWithGemini(...)` into the capture flow in `app/(main)/(tabs)/add.tsx`:

1. capture photo
2. call the analyzer
3. if ready, push to `/food-form` with AI-prefilled params
4. let the user review and save manually

That keeps AI in the role of suggestion, not source of truth.
