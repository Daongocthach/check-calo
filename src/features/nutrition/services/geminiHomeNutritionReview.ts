import { env } from '@/config/env';
import type { WeightGoalMode } from '@/features/nutrition/utils/calorie';
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
  goalMode: WeightGoalMode;
  goalLabel: string | null;
  targets: {
    calorieTarget: number;
    proteinTargetGrams: number;
    carbsTargetGrams: number;
    fatTargetGrams: number;
  } | null;
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
  const goalLine = context.goalLabel ? `The user's goal is ${context.goalLabel}.` : '';
  const calorieProgressPercent =
    context.summary.calorieTarget > 0
      ? Math.round((context.summary.consumedCalories / context.summary.calorieTarget) * 100)
      : null;
  const proteinProgressPercent =
    context.targets?.proteinTargetGrams && context.targets.proteinTargetGrams > 0
      ? Math.round((context.summary.proteinGrams / context.targets.proteinTargetGrams) * 100)
      : null;
  const carbsProgressPercent =
    context.targets?.carbsTargetGrams && context.targets.carbsTargetGrams > 0
      ? Math.round((context.summary.carbsGrams / context.targets.carbsTargetGrams) * 100)
      : null;
  const fatProgressPercent =
    context.targets?.fatTargetGrams && context.targets.fatTargetGrams > 0
      ? Math.round((context.summary.fatGrams / context.targets.fatTargetGrams) * 100)
      : null;
  const derivedMetrics = {
    calorieProgressPercent,
    proteinProgressPercent,
    carbsProgressPercent,
    fatProgressPercent,
    remainingCalories: context.summary.remainingCalories,
    calorieTarget: context.targets?.calorieTarget ?? context.summary.calorieTarget,
    consumedCalories: context.summary.consumedCalories,
  };

  return [
    `You are a nutrition coach. Review the user's food log for ${context.selectedDateLabel}.`,
    `Write in ${language}. Keep the feedback concise, practical, and non-medical.`,
    `The goal mode is ${context.goalMode}.`,
    goalLine,
    'The response must feel personal, specific, and grounded in the actual log.',
    'Return ONLY valid JSON with this exact schema:',
    '{"status":"ready|need_more_info|unsupported","title":string|null,"summary":string|null,"strengths":string[]|null,"improvements":string[]|null,"nextAction":string|null,"confidence":number|null,"ask":string|null}',
    'Rules:',
    '- Title should be a short, coach-like headline that names one clear win or one clear gap.',
    '- Do not use vague headlines like "balanced meals", "good distribution", or "focus on protein" unless you also mention the missing macro or calorie gap.',
    '- Summary should be 1-2 sentences and must mention at least two exact metrics with numbers and percentages.',
    '- Summary should use a concrete pattern like "Calo: 300 / 2000 kcal (15%), Protein: 25g / 40g (62%)" before giving the insight.',
    '- Summary should sound diagnostic, not generic. Prefer patterns like "Protein is doing well (~80%), but carbs are still low, so midday energy may dip."',
    '- If calories are under 40% of target, say that intake is still low and needs to rise soon, with the exact percentage or gap.',
    '- If consumedCalories is lower than calorieTarget, do not say the user exceeded calories.',
    '- When consumedCalories is below calorieTarget, use positive remainingCalories and say exactly how many kcal are left.',
    '- When consumedCalories is above calorieTarget, say the user exceeded the target by X kcal. Do not use that language otherwise.',
    '- If protein is around 75-90% but carbs are clearly lower, explicitly call out the carb gap and the energy impact.',
    '- When protein is around 80% and carbs are below 70%, use a direct contrast like "Protein is doing well (~80%), but carbs are still low, so midday energy may dip."',
    '- Use the numbers in Derived metrics and Context JSON to calculate precise percentages instead of broad statements.',
    '- For each metric that matters, write the exact value, target, and percentage in the text, for example "Protein: 25g / 40g (62%)".',
    '- If a meal stands out as the biggest imbalance, call out that meal by name or time using the entries list.',
    '- If breakfast/lunch/dinner has near-zero carbs, protein, or veggies, say so directly with numbers and the meal name.',
    '- improvements must contain 2 or 3 short bullets with a clear gap, context, and a number.',
    '- improvements should be concrete and goal-aware, for example "Thêm 40-60g carb tại bữa trưa" or "Bữa sáng gần như không có rau (~0g), thêm 100g rau xanh".',
    '- nextAction should be one concrete suggestion with a food, amount, and estimated kcal or macro impact, and it should match the user goal.',
    '- confidence must be a number between 0 and 1.',
    '- Avoid generic wording such as "consider", "maybe", "could", or vague encouragements.',
    '- For weight loss, prioritize calorie control, protein adequacy, and staying within target.',
    '- For weight gain, prioritize energy sufficiency and protein adequacy, and mention if calories are still too low.',
    '- For maintenance, prioritize staying close to target and keeping macro balance steady.',
    '- Goal-aware wording examples: weight loss -> "Calo còn X% mục tiêu", weight gain -> "Calo mới đạt X% mục tiêu", maintenance -> "Giữ calo sát target".',
    '- Do not invent nutrients that are not supported by the context.',
    '- If the log is too sparse to judge, set status=need_more_info and ask a short question.',
    '- If the input is not about nutrition, set status=unsupported and ask a short explanation.',
    '- Do not include markdown fences or extra commentary.',
    'Derived metrics JSON:',
    JSON.stringify(derivedMetrics),
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
