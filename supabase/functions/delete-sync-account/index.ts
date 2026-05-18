/// <reference lib="deno.window" />
import { createClient } from 'npm:@supabase/supabase-js@2';

interface AuthUser {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const bucket = Deno.env.get('EXPO_PUBLIC_SUPABASE_FOOD_IMAGE_BUCKET') ?? 'food-entry-images';

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

async function getCurrentUser(authHeader: string) {
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!bearer) {
    return null;
  }

  const { data, error } = await userClient.auth.getUser(bearer);

  if (error) {
    throw error;
  }

  return (data.user ?? null) as AuthUser | null;
}

async function deleteCloudData(userId: string) {
  const folderPrefix = `users/${userId}/food-entries`;
  const { data: files, error: listError } = await adminClient.storage
    .from(bucket)
    .list(folderPrefix, {
      limit: 1000,
    });

  if (listError) {
    throw listError;
  }

  if (files && files.length > 0) {
    const filePaths = files.map((file) => `${folderPrefix}/${file.name}`);
    const { error: removeStorageError } = await adminClient.storage.from(bucket).remove(filePaths);

    if (removeStorageError) {
      throw removeStorageError;
    }
  }

  const { error: deleteEntriesError } = await adminClient
    .from('food_entries')
    .delete()
    .eq('user_id', userId);

  if (deleteEntriesError) {
    throw deleteEntriesError;
  }

  const { error: deleteProfileError } = await adminClient
    .from('profiles')
    .delete()
    .eq('user_id', userId);

  if (deleteProfileError) {
    throw deleteProfileError;
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const authHeader = request.headers.get('Authorization') ?? '';

  try {
    const user = await getCurrentUser(authHeader);

    if (!user) {
      return json(401, { error: 'Unauthorized' });
    }

    await deleteCloudData(user.id);

    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      throw error;
    }

    return json(200, {
      deleted: true,
      userId: user.id,
      email: user.email ?? null,
      isAnonymous: Boolean(user.is_anonymous),
    });
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : 'Failed to delete account.',
    });
  }
});
