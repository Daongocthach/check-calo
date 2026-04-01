/// <reference lib="deno.window" />
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RequestPayload {
  prompt?: string;
  userMessage?: string | null;
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

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not configured for gemini-food-parser.');
}

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is not configured for gemini-food-parser.');
}

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

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  const authorization = request.headers.get('Authorization');
  if (authorization) {
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
  }

  let body: RequestPayload;
  try {
    body = (await request.json()) as RequestPayload;
  } catch {
    return createResponse(400, { error: 'Invalid JSON payload' });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return createResponse(400, { error: 'Missing prompt' });
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
