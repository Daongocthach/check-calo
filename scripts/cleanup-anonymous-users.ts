import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CleanupOptions {
  dryRun: boolean;
  minAgeDays: number;
  onlyTest: boolean;
  pageSize: number;
  bucket: string | null;
}

interface AnonymousUserSummary {
  id: string;
  createdAt: string;
  email: string;
  hasFoodEntries: boolean;
  hasStorageObjects: boolean;
}

const DEFAULT_MIN_AGE_DAYS = 1;
const DEFAULT_PAGE_SIZE = 100;

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, 'utf-8').split('\n');

  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue = ''] = match;
    if (process.env[key] !== undefined) {
      continue;
    }

    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
}

function loadEnvFiles() {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));
}

function parseBooleanFlag(flag: string) {
  return process.argv.includes(flag);
}

function parseNumberFlag(flag: string, fallback: number) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  const rawValue = process.argv[index + 1];
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStringFlag(flag: string, fallback: string) {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function getOptions(): CleanupOptions {
  return {
    dryRun: parseBooleanFlag('--dry-run'),
    minAgeDays: parseNumberFlag('--min-age-days', DEFAULT_MIN_AGE_DAYS),
    onlyTest: parseBooleanFlag('--only-test'),
    pageSize: parseNumberFlag('--page-size', DEFAULT_PAGE_SIZE),
    bucket: parseStringFlag('--bucket', '').trim() || null,
  };
}

function requireOneEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`${names.join(' or ')} is required`);
}

function isAnonymousUser(user: {
  is_anonymous?: boolean;
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
}) {
  if (user.is_anonymous) {
    return true;
  }

  const provider = user.app_metadata?.provider;
  if (provider === 'anonymous') {
    return true;
  }

  return user.identities?.some((identity) => identity.provider === 'anonymous') ?? false;
}

function isOlderThan(createdAt: string, minAgeDays: number) {
  const createdAtMs = new Date(createdAt).getTime();
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;

  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  return Date.now() - createdAtMs >= minAgeMs;
}

function matchesTestFilter(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}) {
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

async function hasFoodEntries(adminClient: SupabaseClient, userId: string) {
  const { count, error } = await adminClient
    .from('food_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

async function listBuckets(adminClient: SupabaseClient) {
  const { data, error } = await adminClient.storage.listBuckets();

  if (error) {
    throw error;
  }

  return data.map((bucket) => bucket.name).filter((bucketName) => bucketName.length > 0);
}

async function hasStorageObjects(
  adminClient: SupabaseClient,
  bucket: string | null,
  userId: string
) {
  const bucketNames = bucket ? [bucket] : await listBuckets(adminClient);

  for (const bucketName of bucketNames) {
    const { data, error } = await adminClient.storage.from(bucketName).list(`users/${userId}`, {
      limit: 1,
    });

    if (error) {
      throw error;
    }

    if ((data?.length ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

async function listAnonymousUsers(adminClient: SupabaseClient, options: CleanupOptions) {
  const matches: Array<{
    id: string;
    created_at?: string;
    email?: string | null;
    is_anonymous?: boolean;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    identities?: Array<{ provider?: string }>;
  }> = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: options.pageSize,
    });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];

    matches.push(
      ...users.filter((user) => {
        if (!isAnonymousUser(user)) {
          return false;
        }

        if (!user.created_at || !isOlderThan(user.created_at, options.minAgeDays)) {
          return false;
        }

        if (options.onlyTest && !matchesTestFilter(user)) {
          return false;
        }

        return true;
      })
    );

    if (users.length < options.pageSize) {
      break;
    }

    page += 1;
  }

  return matches;
}

async function main() {
  loadEnvFiles();

  const options = getOptions();
  const supabaseUrl = requireOneEnv(['EXPO_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
  const serviceRoleKey = requireOneEnv([
    'CHECK_CALO_SUPABASE_SECRET_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const anonymousUsers = await listAnonymousUsers(adminClient, options);

  if (anonymousUsers.length === 0) {
    console.log('No anonymous users matched the cleanup criteria.');
    return;
  }

  const summaries: AnonymousUserSummary[] = [];

  for (const user of anonymousUsers) {
    const [foodEntries, storageObjects] = await Promise.all([
      hasFoodEntries(adminClient, user.id),
      hasStorageObjects(adminClient, options.bucket, user.id),
    ]);

    summaries.push({
      id: user.id,
      createdAt: user.created_at ?? '',
      email: user.email ?? '',
      hasFoodEntries: foodEntries,
      hasStorageObjects: storageObjects,
    });
  }

  const deletableUsers = summaries.filter(
    (summary) => !summary.hasFoodEntries && !summary.hasStorageObjects
  );

  console.table(
    summaries.map((summary) => ({
      id: summary.id,
      createdAt: summary.createdAt,
      email: summary.email || '(none)',
      foodEntries: summary.hasFoodEntries ? 'yes' : 'no',
      storageObjects: summary.hasStorageObjects ? 'yes' : 'no',
      action:
        summary.hasFoodEntries || summary.hasStorageObjects
          ? 'skip'
          : options.dryRun
            ? 'would_delete'
            : 'delete',
    }))
  );

  if (options.dryRun) {
    console.log(`Dry run complete. ${deletableUsers.length} anonymous users are eligible.`);
    return;
  }

  for (const user of deletableUsers) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      throw error;
    }
  }

  console.log(`Deleted ${deletableUsers.length} anonymous users.`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Anonymous user cleanup failed: ${message}`);
  process.exitCode = 1;
});
