import * as FileSystem from 'expo-file-system/legacy';
import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';

interface ReceiptImagePayload {
  base64: string;
  mimeType: string;
}

interface InvokeParserPayload {
  prompt: string;
  userMessage?: string | null;
  image?: ReceiptImagePayload;
}

interface InvokeParserResponse {
  text?: string;
  error?: string;
  message?: string;
}

interface FoodAnalysisPayload {
  status?: 'ready' | 'need_more_info' | 'unsupported';
  mealName?: string | null;
  quantityGrams?: number | null;
  calories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
  notes?: string | null;
  confidence?: number | null;
  ask?: string | null;
}

export interface FoodDraftEstimate {
  mealName: string;
  quantityGrams: number | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
  confidence: number | null;
}

export type FoodAnalysisResult =
  | {
      status: 'ready';
      draft: FoodDraftEstimate;
      assistantMessage: string | null;
    }
  | {
      status: 'need_more_info' | 'unsupported';
      assistantMessage: string | null;
    };

function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

function buildFoodPrompt(userMessage?: string | null) {
  return [
    'You are a nutrition assistant that analyzes food photos for Vietnamese users.',
    'Your job is to estimate a single meal draft that the user can edit before saving.',
    'If the user provides text, use it as primary context for the meal name or portion.',
    'Return ONLY valid JSON with this exact schema:',
    '{"status":"ready|need_more_info|unsupported","mealName":string|null,"quantityGrams":number|null,"calories":number|null,"proteinGrams":number|null,"carbsGrams":number|null,"fatGrams":number|null,"notes":string|null,"confidence":number|null,"ask":string|null}',
    'Rules:',
    '- Focus on the main visible food item or combined plated meal.',
    '- mealName should be short Vietnamese text.',
    '- quantityGrams should be an estimated serving size in grams when possible; otherwise null.',
    '- calories, proteinGrams, carbsGrams, fatGrams must be totals for the visible serving, not per 100g.',
    '- confidence must be a number from 0 to 1.',
    '- notes should briefly explain what was detected or any uncertainty in Vietnamese.',
    '- If the image is too unclear or no food is visible, set status=need_more_info and ask a short Vietnamese question.',
    '- If the content is not food-related, set status=unsupported and ask a short Vietnamese explanation.',
    '- Do not include markdown fences or extra commentary.',
    userMessage?.trim() ? `User hint: ${userMessage.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
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

async function readImageAsBase64(imageUri: string): Promise<ReceiptImagePayload> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    base64,
    mimeType: 'image/jpeg',
  };
}

async function invokeGeminiFoodParser(payload: InvokeParserPayload): Promise<string> {
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
    let errorMessage = 'Unable to analyze your food photo.';
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

function toSafeConfidence(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(value, 0), 1);
}

export async function analyzeFoodPhotoWithGemini(
  imageUri: string,
  userMessage?: string | null
): Promise<FoodAnalysisResult> {
  const image = await readImageAsBase64(imageUri);
  const rawText = await invokeGeminiFoodParser({
    prompt: buildFoodPrompt(userMessage),
    userMessage,
    image,
  });

  let parsedPayload: FoodAnalysisPayload | null = null;
  try {
    parsedPayload = JSON.parse(normalizeJsonText(rawText)) as FoodAnalysisPayload;
  } catch {
    throw new Error('AI response could not be parsed.');
  }

  if (parsedPayload.status === 'unsupported') {
    return {
      status: 'unsupported',
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  if (parsedPayload.status === 'need_more_info') {
    return {
      status: 'need_more_info',
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  const mealName = parsedPayload.mealName?.trim();
  if (!mealName) {
    return {
      status: 'need_more_info',
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  return {
    status: 'ready',
    assistantMessage: parsedPayload.ask?.trim() || null,
    draft: {
      mealName,
      quantityGrams: toSafeQuantity(parsedPayload.quantityGrams),
      calories: Math.round(toSafeNumber(parsedPayload.calories)),
      proteinGrams: Math.round(toSafeNumber(parsedPayload.proteinGrams)),
      carbsGrams: Math.round(toSafeNumber(parsedPayload.carbsGrams)),
      fatGrams: Math.round(toSafeNumber(parsedPayload.fatGrams)),
      notes: parsedPayload.notes?.trim() || null,
      confidence: toSafeConfidence(parsedPayload.confidence),
    },
  };
}
