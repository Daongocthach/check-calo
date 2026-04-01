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
