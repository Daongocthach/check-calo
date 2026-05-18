import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CleanupOptions {
  allBuckets: boolean;
  bucket: string | null;
  deleteBatchSize: number;
  dryRun: boolean;
  pageSize: number;
  prefix: string;
}

interface UserStorageFolderSummary {
  bucket: string;
  objectCount: number;
  paths: string[];
  userId: string;
}

interface StorageListItem {
  id?: string | null;
  name: string;
}

const DEFAULT_DELETE_BATCH_SIZE = 100;
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_PREFIX = 'users';

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

function normalizePrefix(prefix: string) {
  return prefix.replace(/^\/+|\/+$/g, '');
}

function getOptions(): CleanupOptions {
  const envBucket = process.env.EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET ?? '';

  return {
    allBuckets: parseBooleanFlag('--all-buckets'),
    bucket: parseStringFlag('--bucket', envBucket).trim() || null,
    deleteBatchSize: parseNumberFlag('--delete-batch-size', DEFAULT_DELETE_BATCH_SIZE),
    dryRun: parseBooleanFlag('--dry-run'),
    pageSize: parseNumberFlag('--page-size', DEFAULT_PAGE_SIZE),
    prefix: normalizePrefix(parseStringFlag('--prefix', DEFAULT_PREFIX)),
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

function isStorageFolder(item: StorageListItem) {
  return item.id == null;
}

function getChildPath(parentPath: string, childName: string) {
  return parentPath ? `${parentPath}/${childName}` : childName;
}

function chunkPaths(paths: string[], chunkSize: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < paths.length; index += chunkSize) {
    chunks.push(paths.slice(index, index + chunkSize));
  }

  return chunks;
}

async function listBuckets(adminClient: SupabaseClient) {
  const { data, error } = await adminClient.storage.listBuckets();

  if (error) {
    throw error;
  }

  return data.map((bucket) => bucket.name).filter((bucketName) => bucketName.length > 0);
}

async function listAllAuthUserIds(adminClient: SupabaseClient, pageSize: number) {
  const userIds = new Set<string>();
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];

    for (const user of users) {
      userIds.add(user.id);
    }

    if (users.length < pageSize) {
      break;
    }

    page += 1;
  }

  return userIds;
}

async function listStorageFolderItems(
  adminClient: SupabaseClient,
  bucket: string,
  path: string,
  pageSize: number
) {
  const items: StorageListItem[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await adminClient.storage.from(bucket).list(path, {
      limit: pageSize,
      offset,
      sortBy: {
        column: 'name',
        order: 'asc',
      },
    });

    if (error) {
      throw error;
    }

    const pageItems = data ?? [];
    items.push(...pageItems);

    if (pageItems.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return items;
}

async function listStorageObjectsRecursive(
  adminClient: SupabaseClient,
  bucket: string,
  path: string,
  pageSize: number
): Promise<string[]> {
  const items = await listStorageFolderItems(adminClient, bucket, path, pageSize);
  const paths: string[] = [];

  for (const item of items) {
    const childPath = getChildPath(path, item.name);

    if (isStorageFolder(item)) {
      paths.push(...(await listStorageObjectsRecursive(adminClient, bucket, childPath, pageSize)));
      continue;
    }

    paths.push(childPath);
  }

  return paths;
}

async function listOrphanedUserStorageFolders(
  adminClient: SupabaseClient,
  bucket: string,
  authUserIds: Set<string>,
  options: CleanupOptions
) {
  const userFolders = await listStorageFolderItems(
    adminClient,
    bucket,
    options.prefix,
    options.pageSize
  );
  const summaries: UserStorageFolderSummary[] = [];

  for (const folder of userFolders) {
    if (!isStorageFolder(folder)) {
      continue;
    }

    const userId = folder.name;
    if (!userId || authUserIds.has(userId)) {
      continue;
    }

    const folderPath = getChildPath(options.prefix, userId);
    const paths = await listStorageObjectsRecursive(
      adminClient,
      bucket,
      folderPath,
      options.pageSize
    );

    if (paths.length === 0) {
      continue;
    }

    summaries.push({
      bucket,
      objectCount: paths.length,
      paths,
      userId,
    });
  }

  return summaries;
}

async function deleteStorageObjects(
  adminClient: SupabaseClient,
  summary: UserStorageFolderSummary,
  deleteBatchSize: number
) {
  for (const batch of chunkPaths(summary.paths, deleteBatchSize)) {
    const { error } = await adminClient.storage.from(summary.bucket).remove(batch);

    if (error) {
      throw error;
    }
  }
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

  const bucketNames = options.allBuckets
    ? await listBuckets(adminClient)
    : options.bucket
      ? [options.bucket]
      : [];

  if (bucketNames.length === 0) {
    throw new Error(
      'No bucket was configured. Set EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET, pass --bucket, or use --all-buckets.'
    );
  }

  const authUserIds = await listAllAuthUserIds(adminClient, options.pageSize);
  const summaries: UserStorageFolderSummary[] = [];

  for (const bucket of bucketNames) {
    summaries.push(
      ...(await listOrphanedUserStorageFolders(adminClient, bucket, authUserIds, options))
    );
  }

  if (summaries.length === 0) {
    console.log('No orphaned storage image folders matched the cleanup criteria.');
    return;
  }

  console.table(
    summaries.map((summary) => ({
      bucket: summary.bucket,
      userId: summary.userId,
      objects: summary.objectCount,
      action: options.dryRun ? 'would_delete' : 'delete',
    }))
  );

  const totalObjects = summaries.reduce((sum, summary) => sum + summary.objectCount, 0);

  if (options.dryRun) {
    console.log(
      `Dry run complete. ${totalObjects} storage objects from ${summaries.length} orphaned user folders are eligible.`
    );
    return;
  }

  for (const summary of summaries) {
    await deleteStorageObjects(adminClient, summary, options.deleteBatchSize);
  }

  console.log(
    `Deleted ${totalObjects} storage objects from ${summaries.length} orphaned user folders.`
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Orphaned storage image cleanup failed: ${message}`);
  process.exitCode = 1;
});
