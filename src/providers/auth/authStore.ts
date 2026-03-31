import NetInfo from '@react-native-community/netinfo';
import type { Session, User } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { create } from 'zustand';
import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';

interface AuthUser {
  id: string;
  email: string;
  isAnonymous: boolean;
  [key: string]: unknown;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  [key: string]: unknown;
}

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: () => void;
  initialize: () => Promise<void>;
  cleanup: () => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;
let networkSubscription: (() => void) | null = null;
let anonymousSignInPromise: Promise<void> | null = null;

function hasSupabaseAuthConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

function mapAuthUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? '',
    isAnonymous: Boolean(user.is_anonymous),
  };
}

function mapAuthSession(session: Session | null): AuthSession | null {
  if (!session) {
    return null;
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
}

function applyAuthState(
  set: (partial: Partial<AuthState>) => void,
  session: Session | null,
  userOverride?: User | null
) {
  const user = userOverride ?? session?.user ?? null;

  set({
    user: mapAuthUser(user),
    session: mapAuthSession(session),
    isAuthenticated: Boolean(user && session),
    isLoading: false,
  });
}

async function ensureAnonymousSession(
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState
) {
  if (!hasSupabaseAuthConfigured() || get().session || anonymousSignInPromise) {
    return;
  }

  const networkState = await NetInfo.fetch();
  const isOnline = Boolean(networkState.isConnected && networkState.isInternetReachable !== false);

  if (!isOnline) {
    set({ isLoading: false });
    return;
  }

  anonymousSignInPromise = (async () => {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      if (__DEV__) {
        console.error('Failed to create anonymous auth session', error);
      }
      return;
    }

    applyAuthState(set, data.session, data.user);
  })()
    .catch((error: unknown) => {
      if (__DEV__) {
        console.error('Unexpected anonymous auth initialization error', error);
      }
    })
    .finally(() => {
      anonymousSignInPromise = null;
      set({ isLoading: false });
    });

  await anonymousSignInPromise;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: Boolean(user && get().session) }),

  setSession: (session) => set({ session, isAuthenticated: Boolean(session && get().user) }),

  setLoading: (isLoading) => set({ isLoading }),

  clearSession: () => {
    set({ user: null, session: null, isAuthenticated: false });
    void ensureAnonymousSession(set, get);
  },

  initialize: async () => {
    if (!hasSupabaseAuthConfigured()) {
      set({ isLoading: false });
      return;
    }

    authSubscription?.unsubscribe();
    networkSubscription?.();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (__DEV__) {
        console.error('Failed to read Supabase session', error);
      }
      set({ isLoading: false });
    } else {
      applyAuthState(set, session);
    }

    authSubscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applyAuthState(set, nextSession);

      if (!nextSession) {
        void ensureAnonymousSession(set, get);
      }
    }).data.subscription;

    networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false && !get().session) {
        void ensureAnonymousSession(set, get);
      }
    });

    if (!session) {
      await ensureAnonymousSession(set, get);
    } else {
      set({ isLoading: false });
    }
  },

  cleanup: () => {
    authSubscription?.unsubscribe();
    authSubscription = null;
    networkSubscription?.();
    networkSubscription = null;
  },
}));

export function useAuthInit() {
  const initialize = useAuthStore((s) => s.initialize);
  const cleanup = useAuthStore((s) => s.cleanup);

  useEffect(() => {
    void initialize();
    return () => cleanup();
  }, [initialize, cleanup]);
}
