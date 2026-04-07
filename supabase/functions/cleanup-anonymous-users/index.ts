/// <reference lib="deno.window" />
import { createClient } from 'npm:@supabase/supabase-js@2';

interface CleanupRequest {
  dryRun?: boolean;
  minAgeDays?: number;
  onlyTest?: boolean;
  bucket?: string;
}

interface AdminUser {
  id: string;
  email?: string | null;
  created_at?: string;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const cleanupSecret = Deno.env.get('ANONYMOUS_CLEANUP_SECRET');
const defaultBucket = Deno.env.get('EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET') ?? 'food-entry-images';

if (!supabaseUrl || !serviceRoleKey || !cleanupSecret) {
  throw new Error(
    'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ANONYMOUS_CLEANUP_SECRET are required.'
  );
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function isAnonymousUser(user: AdminUser) {
  if (user.is_anonymous) {
    return true;
  }

  if (user.app_metadata?.provider === 'anonymous') {
    return true;
  }

  return user.identities?.some((identity) => identity.provider === 'anonymous') ?? false;
}

function isOlderThan(createdAt: string, minAgeDays: number) {
  const createdAtMs = new Date(createdAt).getTime();
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;
  return !Number.isNaN(createdAtMs) && Date.now() - createdAtMs >= minAgeMs;
}

function matchesTestFilter(user: AdminUser) {
  const email = user.email?.toLowerCase() ?? '';
  const tags = [
    email,
    String(user.user_metadata?.environment ?? ''),
    String(user.user_metadata?.app_env ?? ''),
    String(user.user_metadata?.source ?? ''),
    String(user.app_metadata?.environment ?? ''),
  ]
    .join(' ')
    .toLowerCase();

  return (
    !email ||
    email.includes('+test') ||
    email.includes('test') ||
    tags.includes('test') ||
    tags.includes('staging') ||
    tags.includes('development')
  );
}

async function hasFoodEntries(userId: string) {
  const { count, error } = await adminClient
    .from('food_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

async function hasStorageObjects(bucket: string, userId: string) {
  const { data, error } = await adminClient.storage
    .from(bucket)
    .list(`users/${userId}/food-entries`, { limit: 1 });

  if (error) {
    throw error;
  }

  return (data?.length ?? 0) > 0;
}

async function listAnonymousUsers(minAgeDays: number, onlyTest: boolean) {
  const matches: AdminUser[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const users = (data.users ?? []) as AdminUser[];

    matches.push(
      ...users.filter((user) => {
        if (!isAnonymousUser(user)) {
          return false;
        }

        if (!user.created_at || !isOlderThan(user.created_at, minAgeDays)) {
          return false;
        }

        if (onlyTest && !matchesTestFilter(user)) {
          return false;
        }

        return true;
      })
    );

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return matches;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (bearer !== cleanupSecret) {
    return json(401, { error: 'Unauthorized' });
  }

  let payload: CleanupRequest = {};
  try {
    payload = (await request.json()) as CleanupRequest;
  } catch {
    payload = {};
  }

  const dryRun = Boolean(payload.dryRun);
  const minAgeDays = payload.minAgeDays && payload.minAgeDays > 0 ? payload.minAgeDays : 7;
  const onlyTest = payload.onlyTest !== false;
  const bucket = payload.bucket?.trim() || defaultBucket;

  const candidates = await listAnonymousUsers(minAgeDays, onlyTest);
  const skipped: string[] = [];
  const deletable: string[] = [];

  for (const user of candidates) {
    const [foodEntries, storageObjects] = await Promise.all([
      hasFoodEntries(user.id),
      hasStorageObjects(bucket, user.id),
    ]);

    if (foodEntries || storageObjects) {
      skipped.push(user.id);
      continue;
    }

    deletable.push(user.id);
  }

  if (!dryRun) {
    for (const userId of deletable) {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        throw error;
      }
    }
  }

  return json(200, {
    dryRun,
    minAgeDays,
    onlyTest,
    bucket,
    matchedUsers: candidates.length,
    skippedUsers: skipped.length,
    deletedUsers: dryRun ? 0 : deletable.length,
    deletableUsers: dryRun ? deletable.length : undefined,
  });
});
