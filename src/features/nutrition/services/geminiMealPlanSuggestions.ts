import { env } from '@/config/env';
import type { MealType, UserProfile } from '@/features/nutrition/types';
import { supabase } from '@/integrations/supabase';
import type { ManualMealItemInput } from './manualMealsDatabase';

export type MealPlanCriterion = 'quick' | 'cheap' | 'satiating' | 'protein';

export interface MealPlanSuggestionRequest {
  selectedDateIso: string;
  targetMealType?: MealType;
  noteText: string;
  profile: UserProfile | null;
  locale: string;
  existingMeals?: Array<{
    mealType: Exclude<MealType, 'other'>;
    name: string;
    calories: number;
    items: string[];
  }>;
}

export interface MealPlanSuggestionItem {
  mealType: Exclude<MealType, 'other'>;
  item: ManualMealItemInput;
}

export type MealPlanSuggestionResult =
  | {
      status: 'ready';
      suggestions: MealPlanSuggestionItem[];
      assistantMessage: string | null;
    }
  | {
      status: 'need_more_info' | 'unsupported';
      suggestions: [];
      assistantMessage: string | null;
    };

interface InvokeParserPayload {
  prompt: string;
  userMessage?: string | null;
  purpose: 'home_review';
}

interface InvokeParserResponse {
  text?: string;
  error?: string;
  message?: string;
}

interface MealPlanSuggestionPayload {
  status?: 'ready' | 'need_more_info' | 'unsupported';
  suggestions?: Array<{
    mealType?: Exclude<MealType, 'other'> | null;
    item?: Partial<ManualMealItemInput> | null;
  }> | null;
  ask?: string | null;
  confidence?: number | null;
}

function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

function getLanguageName(locale: string) {
  return locale.startsWith('vi') ? 'Vietnamese' : 'English';
}

function buildPrompt(request: MealPlanSuggestionRequest) {
  const language = getLanguageName(request.locale);
  const selectedDate = new Date(request.selectedDateIso);
  const selectedDateLabel = new Intl.DateTimeFormat(request.locale, {
    dateStyle: 'full',
  }).format(selectedDate);
  const mealTypeHint =
    request.targetMealType && request.targetMealType !== 'other'
      ? request.targetMealType
      : 'all meals for the day';

  return [
    'You are a nutrition planner that creates real meal suggestions for Vietnamese users.',
    `Write in ${language}. Keep the output practical, specific, and ready to save as actual menu items.`,
    `Create suggestions for ${mealTypeHint}.`,
    `The target day is ${selectedDateLabel}.`,
    'Use the noteText as the primary instruction.',
    'Avoid repeating existing meals from the same day if possible.',
    'Return ONLY valid JSON with this exact schema:',
    '{"status":"ready|need_more_info|unsupported","suggestions":[{"mealType":"breakfast|lunch|dinner|snack","item":{"sourceKey":string|null,"title":string,"quantityLabel":string,"quantityGrams":number|null,"totalCalories":number,"proteinGrams":number,"carbsGrams":number,"fatGrams":number,"notes":string|null,"imageUri":string|null,"thumbnailUri":string|null,"servings":number}}],"ask":string|null,"confidence":number|null}',
    'Rules:',
    '- Return one suggestion per requested meal type.',
    '- If targetMealType is provided, return only that meal type.',
    '- mealType must be one of breakfast, lunch, dinner, snack.',
    '- title should be a short, natural meal name.',
    '- quantityLabel should be a normal portion label such as 1 serving, 1 box, 1 plate, 1 bowl, etc.',
    '- quantityGrams should be an estimated serving size in grams when possible; otherwise null.',
    '- calories, proteinGrams, carbsGrams, fatGrams must be totals for the serving, not per 100g.',
    '- notes should briefly mention the meal idea or why it fits.',
    '- sourceKey can be null.',
    '- If the note or context is too vague, set status=need_more_info and ask a short question.',
    '- If the input is not about meal planning or nutrition, set status=unsupported and ask a short explanation.',
    '- Do not include markdown fences or extra commentary.',
    'Context JSON:',
    JSON.stringify(request),
  ].join('\n');
}

async function getSupabaseAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }

  return data.session?.access_token ?? null;
}

async function invokeGeminiMealPlanner(payload: InvokeParserPayload): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const accessToken = await getSupabaseAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: env.supabaseAnonKey,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${env.supabaseUrl}/functions/v1/gemini-food-parser`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = 'Unable to generate meal suggestions.';
    try {
      const responsePayload = (await response.clone().json()) as InvokeParserResponse;
      errorMessage = responsePayload.error ?? responsePayload.message ?? errorMessage;
    } catch {
      const text = await response.clone().text();
      if (text.trim()) {
        errorMessage = text;
      }
    }

    throw new Error(errorMessage);
  }

  const responsePayload = (await response.json()) as InvokeParserResponse;
  const text = responsePayload.text?.trim();
  if (!text) {
    throw new Error('AI response is empty.');
  }

  return text;
}

function normalizeJsonText(input: string): string {
  const fenced = input.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  return input.trim();
}

function toSafeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toSafeQuantity(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function toSafeServings(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.round(value))
    : 1;
}

function toMealType(value: unknown): Exclude<MealType, 'other'> | null {
  if (value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack') {
    return value;
  }

  return null;
}

function toSuggestionItem(value: unknown): ManualMealItemInput | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const item = value as Partial<ManualMealItemInput>;
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  const quantityLabel = typeof item.quantityLabel === 'string' ? item.quantityLabel.trim() : '';

  if (!title || !quantityLabel) {
    return null;
  }

  return {
    sourceKey:
      typeof item.sourceKey === 'string' || item.sourceKey === null
        ? (item.sourceKey ?? null)
        : null,
    title,
    quantityLabel,
    quantityGrams: toSafeQuantity(item.quantityGrams),
    totalCalories: Math.round(toSafeNumber(item.totalCalories)),
    proteinGrams: Math.round(toSafeNumber(item.proteinGrams)),
    carbsGrams: Math.round(toSafeNumber(item.carbsGrams)),
    fatGrams: Math.round(toSafeNumber(item.fatGrams)),
    notes:
      typeof item.notes === 'string' && item.notes.trim().length > 0 ? item.notes.trim() : null,
    imageUri:
      typeof item.imageUri === 'string' && item.imageUri.trim().length > 0 ? item.imageUri : null,
    thumbnailUri:
      typeof item.thumbnailUri === 'string' && item.thumbnailUri.trim().length > 0
        ? item.thumbnailUri
        : null,
    servings: toSafeServings(item.servings),
  };
}

export async function generateMealPlanSuggestions(
  request: MealPlanSuggestionRequest
): Promise<MealPlanSuggestionResult> {
  const rawText = await invokeGeminiMealPlanner({
    prompt: buildPrompt(request),
    purpose: 'home_review',
    userMessage: request.noteText,
  });

  let parsedPayload: MealPlanSuggestionPayload | null = null;
  try {
    parsedPayload = JSON.parse(normalizeJsonText(rawText)) as MealPlanSuggestionPayload;
  } catch {
    throw new Error('AI response could not be parsed.');
  }

  if (parsedPayload.status === 'unsupported') {
    return {
      status: 'unsupported',
      suggestions: [],
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  if (parsedPayload.status === 'need_more_info') {
    return {
      status: 'need_more_info',
      suggestions: [],
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  const suggestions = (parsedPayload.suggestions ?? [])
    .map((suggestion) => {
      const mealType = toMealType(suggestion.mealType);
      const item = toSuggestionItem(suggestion.item);

      if (!mealType || !item) {
        return null;
      }

      return {
        mealType,
        item,
      };
    })
    .filter((suggestion): suggestion is MealPlanSuggestionItem => suggestion !== null);

  if (suggestions.length === 0) {
    return {
      status: 'need_more_info',
      suggestions: [],
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  const requestedMealType =
    request.targetMealType && request.targetMealType !== 'other' ? request.targetMealType : null;
  const filteredSuggestions = requestedMealType
    ? suggestions.filter((suggestion) => suggestion.mealType === requestedMealType)
    : suggestions;

  if (filteredSuggestions.length === 0) {
    return {
      status: 'need_more_info',
      suggestions: [],
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  return {
    status: 'ready',
    assistantMessage: parsedPayload.ask?.trim() || null,
    suggestions: filteredSuggestions,
  };
}
