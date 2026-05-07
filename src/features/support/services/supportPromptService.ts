import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';

const SUPPORT_PROMPT_FLAG_KEY = 'support_prompt_card';

interface AppFeatureFlagRow {
  is_hidden: boolean;
}

export async function fetchSupportPromptHidden(): Promise<boolean> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return false;
  }

  const { data, error } = await supabase
    .from('app_feature_flags')
    .select('is_hidden')
    .eq('flag_key', SUPPORT_PROMPT_FLAG_KEY)
    .maybeSingle<AppFeatureFlagRow>();

  if (error) {
    if (__DEV__) {
      console.warn('[SupportPrompt] Failed to load visibility flag', error);
    }

    return false;
  }

  return Boolean(data?.is_hidden);
}
