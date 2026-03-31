import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/integrations/supabase';
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
