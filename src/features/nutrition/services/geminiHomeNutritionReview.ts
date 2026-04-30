import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';

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

interface HomeNutritionReviewPayload {
  status?: 'ready' | 'need_more_info' | 'unsupported';
  title?: string | null;
  summary?: string | null;
  strengths?: string[] | null;
  improvements?: string[] | null;
  nextAction?: string | null;
  confidence?: number | null;
  ask?: string | null;
}

export interface HomeNutritionReviewDraft {
  title: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextAction: string | null;
  confidence: number | null;
}

export type HomeNutritionReviewResult =
  | {
      status: 'ready';
      review: HomeNutritionReviewDraft;
      assistantMessage: string | null;
    }
  | {
      status: 'need_more_info' | 'unsupported';
      assistantMessage: string | null;
    };

export interface HomeNutritionReviewContext {
  selectedDateLabel: string;
  selectedDateIso: string;
  summary: {
    consumedCalories: number;
    calorieTarget: number;
    remainingCalories: number;
    progressPercent: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  entries: Array<{
    timeLabel: string;
    mealName: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    quantityLabel: string;
  }>;
  goalTracking?: {
    activeGoalTitle: string | null;
    progressPercent: number | null;
    currentStreak: number | null;
    calorieDifferenceLabel: string | null;
  } | null;
  locale: string;
}

function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

function buildPrompt(context: HomeNutritionReviewContext) {
  const language = context.locale.startsWith('vi') ? 'Vietnamese' : 'English';

  return [
    `You are a nutrition coach. Review the user's food log for ${context.selectedDateLabel}.`,
    `Write in ${language}. Keep the feedback concise, practical, and non-medical.`,
    'Return ONLY valid JSON with this exact schema:',
    '{"status":"ready|need_more_info|unsupported","title":string|null,"summary":string|null,"strengths":string[]|null,"improvements":string[]|null,"nextAction":string|null,"confidence":number|null,"ask":string|null}',
    'Rules:',
    '- Title should be a short review headline.',
    '- Summary should be 1-2 sentences.',
    '- strengths must contain 2 or 3 short bullets.',
    '- improvements must contain 2 or 3 short bullets with practical adjustments.',
    '- nextAction should be a single concrete suggestion for the next meal or later today.',
    '- confidence must be a number between 0 and 1.',
    '- If the log is too sparse to judge, set status=need_more_info and ask a short question.',
    '- If the input is not about nutrition, set status=unsupported and ask a short explanation.',
    '- Do not include markdown fences or extra commentary.',
    'Context JSON:',
    JSON.stringify(context),
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

async function invokeGeminiNutritionReviewer(payload: InvokeParserPayload): Promise<string> {
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
    let errorMessage = 'Unable to generate a nutrition review.';
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

function toStringArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function toSafeConfidence(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(value, 0), 1);
}

export async function analyzeHomeNutritionWithGemini(
  context: HomeNutritionReviewContext
): Promise<HomeNutritionReviewResult> {
  const rawText = await invokeGeminiNutritionReviewer({
    prompt: buildPrompt(context),
    purpose: 'home_review',
  });

  let parsedPayload: HomeNutritionReviewPayload | null = null;
  try {
    parsedPayload = JSON.parse(normalizeJsonText(rawText)) as HomeNutritionReviewPayload;
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

  const title = parsedPayload.title?.trim();
  const summary = parsedPayload.summary?.trim();

  if (!title || !summary) {
    return {
      status: 'need_more_info',
      assistantMessage: parsedPayload.ask?.trim() || null,
    };
  }

  return {
    status: 'ready',
    assistantMessage: parsedPayload.ask?.trim() || null,
    review: {
      title,
      summary,
      strengths: toStringArray(parsedPayload.strengths),
      improvements: toStringArray(parsedPayload.improvements),
      nextAction: parsedPayload.nextAction?.trim() || null,
      confidence: toSafeConfidence(parsedPayload.confidence),
    },
  };
}
