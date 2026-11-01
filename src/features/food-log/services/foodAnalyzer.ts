import * as FileSystem from 'expo-file-system/legacy';
import { env } from '@/config/env';
import { LANGUAGE_INFO, type AppLanguage } from '@/i18n/languages';
import { supabase } from '@/integrations/supabase';
import type { NutrientKey, NutrientValues } from '../types';
import { pickNutrients } from '../utils/nutrients';

interface ReceiptImagePayload {
  base64: string;
  mimeType: string;
}

interface InvokeParserPayload {
  prompt: string;
  userMessage?: string | null;
  purpose: 'food_photo';
  image?: ReceiptImagePayload;
}

interface InvokeParserResponse {
  text?: string;
  error?: string;
  message?: string;
}

interface ChatFoodItemPayload extends Partial<Record<NutrientKey, number | null>> {
  name?: string | null;
  quantityLabel?: string | null;
  quantityGrams?: number | null;
  calories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
}

interface ChatAnalysisPayload {
  intent?: 'log' | 'suggest' | 'answer' | 'unsupported';
  reply?: string | null;
  items?: ChatFoodItemPayload[] | null;
  mealTime?: string | null;
  followUps?: string[] | null;
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

export interface ChatFoodItem extends NutrientValues {
  name: string;
  quantityLabel: string;
  quantityGrams: number | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  /** Set when the item came from a barcode scan rather than the AI. */
  barcode?: string | null;
}

export type ChatIntent = 'log' | 'suggest' | 'answer' | 'unsupported';

export type ChatMealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const CHAT_MEAL_TIMES: ChatMealTime[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface ChatAnalysisResult {
  intent: ChatIntent;
  reply: string;
  items: ChatFoodItem[];
  /** Meal the user said they ate (e.g. "this morning"), or null when not mentioned. */
  mealTime: ChatMealTime | null;
  followUps: string[];
}

export interface ChatAnalysisContext {
  /** Language the reply should be written in. */
  language: AppLanguage;
  /** Short plain-text summary of today's intake so suggestions fit the remaining budget. */
  daySummary?: string | null;
}

function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

const VIETNAMESE_MACRO_TERMS_RULE =
  '- In Vietnamese text, write "đạm", "tinh bột" and "chất béo", never "protein", "carb" or "fat".';

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
    VIETNAMESE_MACRO_TERMS_RULE,
    '- If the image is too unclear or no food is visible, set status=need_more_info and ask a short Vietnamese question.',
    '- If the content is not food-related, set status=unsupported and ask a short Vietnamese explanation.',
    '- Do not include markdown fences or extra commentary.',
    userMessage?.trim() ? `User hint: ${userMessage.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildChatPrompt(context: ChatAnalysisContext) {
  const replyLanguage = LANGUAGE_INFO[context.language].englishName;

  return [
    'You are "Check AI", a friendly nutrition assistant inside a calorie tracking app.',
    'The user chats to log what they ate, optionally with a food photo, or asks for meal ideas.',
    'Return ONLY valid JSON with this exact schema:',
    '{"intent":"log|suggest|answer|unsupported","reply":string,"items":[{"name":string,"quantityLabel":string,"quantityGrams":number|null,"calories":number,"proteinGrams":number,"carbsGrams":number,"fatGrams":number,"fiberGrams":number|null,"sugarGrams":number|null,"saturatedFatGrams":number|null,"transFatGrams":number|null,"cholesterolMg":number|null,"sodiumMg":number|null,"potassiumMg":number|null}],"mealTime":"breakfast|lunch|dinner|snack"|null,"followUps":string[]}',
    'Rules:',
    '- intent=log when the user describes or photographs food they ate or are eating. List every food as its own item.',
    '- intent=suggest when the user asks what to eat. Give 1 to 3 concrete dishes as items that fit their request.',
    '- intent=answer for other nutrition questions. items must be [].',
    '- intent=unsupported when the message is unrelated to food or nutrition. items must be [].',
    '- Numbers are totals for the described portion, not per 100g. Round to whole numbers.',
    '- fiberGrams, sugarGrams (total sugars), saturatedFatGrams, transFatGrams are grams and may have one decimal; cholesterolMg, sodiumMg, potassiumMg are milligrams.',
    '- Estimate these nutrients like the macros; use null only when you cannot estimate one at all. Count sodium from sauces, broth and seasoning (e.g. nước mắm, nước dùng, mì gói seasoning).',
    '- mealTime is set only when the user says which meal or time of day it was (e.g. "sáng nay" = breakfast); otherwise null.',
    '- For intent=log, the user still confirms in the app, so never say the food was already saved; invite them to add it.',
    '- quantityLabel is a short human portion such as "1 tô", "2 lát", "1 bowl".',
    `- reply is 1 to 2 short sentences in ${replyLanguage}. Item names are in ${replyLanguage}.`,
    `- followUps has up to 3 very short suggested user replies in ${replyLanguage}.`,
    context.language === 'vi' ? VIETNAMESE_MACRO_TERMS_RULE : null,
    '- Do not include markdown fences or extra commentary.',
    context.daySummary ? `Today so far: ${context.daySummary}` : null,
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

function toChatFoodItem(item: ChatFoodItemPayload): ChatFoodItem | null {
  const name = item.name?.trim();

  if (!name) {
    return null;
  }

  return {
    name,
    quantityLabel: item.quantityLabel?.trim() ?? '',
    quantityGrams: toSafeQuantity(item.quantityGrams),
    calories: Math.round(toSafeNumber(item.calories)),
    proteinGrams: Math.round(toSafeNumber(item.proteinGrams)),
    carbsGrams: Math.round(toSafeNumber(item.carbsGrams)),
    fatGrams: Math.round(toSafeNumber(item.fatGrams)),
    ...pickNutrients(item),
  };
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
    purpose: 'food_photo',
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

/**
 * Sends one chat turn (text and/or photo) to the existing `gemini-food-parser` edge function.
 * Uses the `food_photo` quota bucket so no backend change is needed.
 */
export async function analyzeFoodChatMessage(
  message: string,
  context: ChatAnalysisContext,
  imageUri?: string | null
): Promise<ChatAnalysisResult> {
  const image = imageUri ? await readImageAsBase64(imageUri) : undefined;
  const rawText = await invokeGeminiFoodParser({
    prompt: buildChatPrompt(context),
    userMessage: message.trim() || null,
    purpose: 'food_photo',
    image,
  });

  let parsedPayload: ChatAnalysisPayload;
  try {
    parsedPayload = JSON.parse(normalizeJsonText(rawText)) as ChatAnalysisPayload;
  } catch {
    throw new Error('AI response could not be parsed.');
  }

  const items = (parsedPayload.items ?? [])
    .map(toChatFoodItem)
    .filter((item): item is ChatFoodItem => item !== null);
  const intent: ChatIntent = parsedPayload.intent ?? (items.length > 0 ? 'log' : 'answer');

  return {
    intent,
    reply: parsedPayload.reply?.trim() ?? '',
    items: intent === 'log' || intent === 'suggest' ? items : [],
    mealTime: CHAT_MEAL_TIMES.find((value) => value === parsedPayload.mealTime) ?? null,
    followUps: (parsedPayload.followUps ?? [])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 3),
  };
}
