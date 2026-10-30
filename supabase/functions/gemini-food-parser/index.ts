/// <reference lib="deno.window" />
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RequestPayload {
  prompt?: string;
  userMessage?: string | null;
  purpose?: 'food_photo' | 'home_review';
  image?: {
    base64?: string;
    mimeType?: string;
  };
}

interface GeminiTextPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiTextPart[];
  };
  finishReason?: string;
}

type AiPurpose = 'food_photo' | 'home_review';
type QuotaBlock = 'user' | 'ip' | 'guest_total' | 'total';

interface QuotaResult {
  allowed: boolean;
  blockedBy: QuotaBlock | null;
  limit: number;
}

interface GeminiGenerateResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite';
const supabaseSecretKey =
  Deno.env.get('CHECK_CALO_SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
  throw new Error('Supabase environment variables are not configured for gemini-food-parser.');
}

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is not configured for gemini-food-parser.');
}

function readLimit(name: string, fallback: number) {
  const value = Number(Deno.env.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

// Daily limits, overridable with Edge Function secrets without a redeploy of the app.
const limits = {
  userFoodPhoto: readLimit('AI_USER_DAILY_LIMIT', 30),
  guestFoodPhoto: readLimit('AI_GUEST_DAILY_LIMIT', 10),
  homeReview: readLimit('AI_REVIEW_DAILY_LIMIT', 10),
  guestPerIp: readLimit('AI_GUEST_IP_DAILY_LIMIT', 100),
  guestTotal: readLimit('AI_GUEST_TOTAL_DAILY_LIMIT', 3000),
  total: readLimit('AI_TOTAL_DAILY_LIMIT', 20000),
};

// App builds resize photos to 1280px JPEG (~300KB), and older builds send prompts with a
// meal-plan context JSON, so these only stop requests no app version sends.
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BASE64_LENGTH = 2 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 20000;
const MAX_USER_MESSAGE_LENGTH = 2000;
const MAX_OUTPUT_TOKENS = 4096;
const AI_PURPOSES: AiPurpose[] = ['food_photo', 'home_review'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Every quota message keeps this prefix: installed app versions match on it.
const QUOTA_ERROR_PREFIX = 'Daily AI usage limit reached';

const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function createResponse(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function extractResponseText(payload: GeminiGenerateResponse): string {
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text.trim() : '';
}

function isAiPurpose(value: unknown): value is AiPurpose {
  return typeof value === 'string' && AI_PURPOSES.includes(value as AiPurpose);
}

function isQuotaBlock(value: unknown): value is QuotaBlock {
  return value === 'user' || value === 'ip' || value === 'guest_total' || value === 'total';
}

function getUserLimit(purpose: AiPurpose, isGuest: boolean) {
  if (purpose === 'home_review') {
    return limits.homeReview;
  }

  return isGuest ? limits.guestFoodPhoto : limits.userFoodPhoto;
}

// Cloudflare and the Supabase gateway overwrite cf-connecting-ip and x-real-ip, while the
// first x-forwarded-for entry can come from the client, so it is only the last resort.
function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0];
  const ip =
    request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? forwardedFor;

  return ip?.trim() || null;
}

// Keyed hash so the counter table never holds a readable IP address.
async function hashIp(ip: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(supabaseSecretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));

  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

async function consumeAiQuota(params: {
  userId: string;
  purpose: AiPurpose;
  isGuest: boolean;
  ipHash: string | null;
}): Promise<QuotaResult> {
  const limit = getUserLimit(params.purpose, params.isGuest);
  const { data, error } = await adminClient.rpc('consume_ai_quota', {
    p_user_id: params.userId,
    p_purpose: params.purpose,
    p_is_guest: params.isGuest,
    p_user_limit: limit,
    p_ip_hash: params.ipHash,
    p_ip_limit: limits.guestPerIp,
    p_guest_total_limit: limits.guestTotal,
    p_total_limit: limits.total,
  });

  if (error) {
    throw new Error(error.message);
  }

  const usageRow = Array.isArray(data) ? data[0] : data;

  return {
    allowed: Boolean(usageRow?.allowed),
    blockedBy: isQuotaBlock(usageRow?.blocked_by) ? usageRow.blocked_by : null,
    limit,
  };
}

function createQuotaResponse(purpose: AiPurpose, isGuest: boolean, quota: QuotaResult) {
  switch (quota.blockedBy) {
    case 'ip':
      return createResponse(429, {
        error: `${QUOTA_ERROR_PREFIX} for guest accounts on this network.`,
        code: 'ip_limit',
      });
    case 'guest_total':
      return createResponse(429, {
        error: `${QUOTA_ERROR_PREFIX} for guest accounts today.`,
        code: 'guest_total_limit',
      });
    case 'total':
      return createResponse(429, {
        error: `${QUOTA_ERROR_PREFIX} for the app today.`,
        code: 'total_limit',
      });
    default:
      return createResponse(429, {
        error: `${QUOTA_ERROR_PREFIX} for ${purpose}. Limit is ${quota.limit} per day.`,
        code: isGuest ? 'guest_limit' : 'user_limit',
      });
  }
}

function validatePayload(body: RequestPayload): { status: number; error: string } | null {
  if (body.purpose !== undefined && body.purpose !== null && !isAiPurpose(body.purpose)) {
    return { status: 400, error: 'Invalid purpose' };
  }

  if ((body.prompt?.length ?? 0) > MAX_PROMPT_LENGTH) {
    return { status: 413, error: 'Prompt is too long' };
  }

  if ((body.userMessage?.length ?? 0) > MAX_USER_MESSAGE_LENGTH) {
    return { status: 413, error: 'Message is too long' };
  }

  if (body.image?.base64) {
    if (body.image.base64.length > MAX_IMAGE_BASE64_LENGTH) {
      return { status: 413, error: 'Image is too large' };
    }

    if (body.image.mimeType && !IMAGE_MIME_TYPES.includes(body.image.mimeType)) {
      return { status: 400, error: 'Unsupported image type' };
    }
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return createResponse(401, { error: 'Authentication required' });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return createResponse(401, { error: userError?.message ?? 'Unauthorized' });
  }

  const contentLength = Number(request.headers.get('Content-Length'));
  if (contentLength > MAX_BODY_BYTES) {
    return createResponse(413, { error: 'Request is too large' });
  }

  let body: RequestPayload;
  try {
    body = (await request.json()) as RequestPayload;
  } catch {
    return createResponse(400, { error: 'Invalid JSON payload' });
  }

  const invalidPayload = validatePayload(body);
  if (invalidPayload) {
    return createResponse(invalidPayload.status, { error: invalidPayload.error });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return createResponse(400, { error: 'Missing prompt' });
  }

  const purpose = body.purpose ?? 'food_photo';
  const isGuest = Boolean(user.is_anonymous);
  const clientIp = isGuest ? getClientIp(request) : null;
  const quotaResult = await consumeAiQuota({
    userId: user.id,
    purpose,
    isGuest,
    ipHash: clientIp ? await hashIp(clientIp) : null,
  });
  if (!quotaResult.allowed) {
    return createQuotaResponse(purpose, isGuest, quotaResult);
  }

  const userMessage = body.userMessage?.trim();
  const hasImage = Boolean(body.image?.base64 && body.image?.mimeType);

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (userMessage) {
    parts.push({
      text: ['USER MESSAGE TO PRIORITIZE:', userMessage].join('\n'),
    });
  }
  if (hasImage) {
    parts.push({
      inlineData: {
        mimeType: body.image?.mimeType,
        data: body.image?.base64,
      },
    });
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    let errorMessage = `Gemini request failed with status ${geminiResponse.status}.`;
    try {
      const errorPayload = (await geminiResponse.clone().json()) as GeminiGenerateResponse;
      errorMessage = errorPayload.error?.message ?? errorMessage;
    } catch {
      const text = await geminiResponse.clone().text();
      if (text.trim()) {
        errorMessage = text;
      }
    }

    return createResponse(502, { error: errorMessage });
  }

  const geminiPayload = (await geminiResponse.json()) as GeminiGenerateResponse;
  if (geminiPayload.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    console.warn(`[gemini-food-parser] ${purpose} reply hit maxOutputTokens and was cut off`);
  }

  const text = extractResponseText(geminiPayload);

  if (!text) {
    return createResponse(502, { error: 'Gemini returned empty content' });
  }

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
