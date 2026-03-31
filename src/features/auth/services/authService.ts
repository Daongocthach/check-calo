import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { useAuthStore } from '@/providers/auth/authStore';
import { STORAGE_KEYS, setItem } from '@/utils/storage';

WebBrowser.maybeCompleteAuthSession();

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  username?: string;
}

type SupportedIdentityProvider = 'google' | 'apple';

function getAuthRedirectUrl() {
  return Linking.createURL('/');
}

function extractAuthCode(callbackUrl: string) {
  const parsed = Linking.parse(callbackUrl);
  const rawCode = parsed.queryParams?.code;

  return typeof rawCode === 'string' ? rawCode : null;
}

export async function login(params: LoginParams) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });

  if (error) {
    throw error;
  }

  setItem(STORAGE_KEYS.auth.lastEmail, params.email.trim());
  return data;
}

export async function register(params: RegisterParams) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      data: params.username ? { username: params.username } : undefined,
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  setItem(STORAGE_KEYS.auth.lastEmail, params.email.trim());
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data;
}

export async function resetAnonymousSession() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  useAuthStore.getState().clearSession();
}

export async function linkAnonymousAccountWithEmail(params: LoginParams) {
  const normalizedEmail = params.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.updateUser(
    {
      email: normalizedEmail,
      password: params.password,
    },
    {
      emailRedirectTo: getAuthRedirectUrl(),
    }
  );

  if (error) {
    throw error;
  }

  setItem(STORAGE_KEYS.auth.lastEmail, normalizedEmail);
  return data;
}

export async function linkAnonymousAccountWithProvider(provider: SupportedIdentityProvider) {
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('Unable to start account linking flow.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    return { linked: false };
  }

  const authCode = extractAuthCode(result.url);

  if (!authCode) {
    return { linked: false };
  }

  const exchangeResult = await supabase.auth.exchangeCodeForSession(authCode);

  if (exchangeResult.error) {
    throw exchangeResult.error;
  }

  return { linked: true };
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('No authenticated Supabase user is available.');
  }

  return user.id;
}

export async function deleteCurrentUserCloudNutritionData() {
  const userId = await getCurrentUserId();
  const folderPrefix = `users/${userId}/food-entries`;
  const { data: files, error: listError } = await supabase.storage
    .from(env.supabaseFoodImageBucket)
    .list(folderPrefix, {
      limit: 1000,
    });

  if (listError) {
    throw listError;
  }

  if (files && files.length > 0) {
    const filePaths = files.map((file) => `${folderPrefix}/${file.name}`);
    const { error: removeStorageError } = await supabase.storage
      .from(env.supabaseFoodImageBucket)
      .remove(filePaths);

    if (removeStorageError) {
      throw removeStorageError;
    }
  }

  const { error: deleteEntriesError } = await supabase
    .from('food_entries')
    .delete()
    .eq('user_id', userId);

  if (deleteEntriesError) {
    throw deleteEntriesError;
  }
}

export async function disconnectCurrentSyncAccount() {
  await deleteCurrentUserCloudNutritionData();
  await logout();
}
