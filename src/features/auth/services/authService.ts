import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/config/env';
import {
  syncFoodEntriesDeltaFromSupabase,
  syncUserProfileFromCloud,
  syncRecentFoodsDeltaFromSupabase,
  syncMealsDeltaFromSupabase,
  syncMealItemsDeltaFromSupabase,
} from '@/features/nutrition/services/nutritionDeltaSync';
import {
  resetLocalNutritionData,
  resetLocalNutritionDataForLogin,
} from '@/features/nutrition/services/nutritionLocalReset';
import { useFoodEntryRefreshStore } from '@/features/nutrition/stores/useFoodEntryRefreshStore';
import { supabase } from '@/integrations/supabase';
import { useAuthStore } from '@/providers/auth/authStore';
import { STORAGE_KEYS, removeItem, setItem } from '@/utils/storage';

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

interface ResetPasswordParams {
  email: string;
}

type SupportedIdentityProvider = 'google' | 'apple';

function getAuthRedirectUrl() {
  return Linking.createURL('/');
}

function getPasswordResetRedirectUrl() {
  return Linking.createURL('/reset-password');
}

function extractAuthCode(callbackUrl: string) {
  const parsed = Linking.parse(callbackUrl);
  const rawCode = parsed.queryParams?.code;

  return typeof rawCode === 'string' ? rawCode : null;
}

export async function loginAuthenticate(params: LoginParams) {
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

export async function loginSyncCloudData() {
  // Cloud is source of truth: wipe local nutrition data, then pull from cloud.
  // Uses login-safe reset that preserves the session token in MMKV.
  await resetLocalNutritionDataForLogin();

  removeItem(STORAGE_KEYS.app.nutritionDeltaFoodEntriesCursor);
  removeItem(STORAGE_KEYS.app.nutritionDeltaRecentFoodsCursor);
  removeItem(STORAGE_KEYS.app.nutritionDeltaMealsCursor);
  removeItem(STORAGE_KEYS.app.nutritionDeltaMealItemsCursor);

  await syncUserProfileFromCloud();
  await syncFoodEntriesDeltaFromSupabase();
  await syncRecentFoodsDeltaFromSupabase();
  await syncMealsDeltaFromSupabase();
  await syncMealItemsDeltaFromSupabase();
  useFoodEntryRefreshStore.getState().markFoodEntriesChanged();
  useFoodEntryRefreshStore.getState().markMenuMealsChanged();
  useFoodEntryRefreshStore.getState().markRecentFoodsChanged();
}

export async function login(params: LoginParams) {
  const data = await loginAuthenticate(params);
  await loginSyncCloudData();
  return data;
}

export async function register(params: RegisterParams) {
  const user = useAuthStore.getState().user;

  // If already in an anonymous session, upgrade it in place (preserves user_id)
  if (user?.isAnonymous) {
    const result = await linkAnonymousAccountWithEmail({
      email: params.email,
      password: params.password,
    });

    if (params.username) {
      await supabase.auth.updateUser({ data: { username: params.username } });
    }

    return result;
  }

  // No session or non-anonymous: create a brand-new account
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim().toLowerCase(),
    password: params.password,
    options: {
      data: params.username ? { username: params.username } : undefined,
    },
  });

  if (error) {
    throw error;
  }

  setItem(STORAGE_KEYS.auth.lastEmail, params.email.trim().toLowerCase());
  return data;
}

export async function sendPasswordResetEmail(params: ResetPasswordParams) {
  const { error } = await supabase.auth.resetPasswordForEmail(params.email.trim(), {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  // Clear session and anonymous flag, then create a fresh anonymous session
  useAuthStore.getState().clearSession();
  removeItem(STORAGE_KEYS.auth.anonymousSessionAttempted);
  await useAuthStore.getState().initialize();
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

  removeItem(STORAGE_KEYS.auth.anonymousSessionAttempted);
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

export async function signInWithProvider(provider: SupportedIdentityProvider) {
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
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
    throw new Error('Unable to start sign-in flow.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    return { signedIn: false };
  }

  const authCode = extractAuthCode(result.url);

  if (!authCode) {
    return { signedIn: false };
  }

  const exchangeResult = await supabase.auth.exchangeCodeForSession(authCode);

  if (exchangeResult.error) {
    throw exchangeResult.error;
  }

  return { signedIn: true };
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

  // Clear meals and items
  await supabase.from('meal_items').delete().eq('user_id', userId);
  await supabase.from('meals').delete().eq('user_id', userId);
  await supabase.from('recent_foods').delete().eq('user_id', userId);

  if (__DEV__) {
    console.warn('[AuthService] Cleared all cloud nutrition data for user:', userId);
  }

  const { error: deleteProfileError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId);

  if (deleteProfileError && __DEV__) {
    console.warn('Failed to delete leaderboard profile during disconnect', deleteProfileError);
  }
}

export async function disconnectCurrentSyncAccount() {
  const { error } = await supabase.functions.invoke('delete-sync-account');

  if (error) {
    throw error;
  }

  await resetLocalNutritionData();
  await supabase.auth.signOut({ scope: 'local' });
  useAuthStore.getState().clearSession();
}
