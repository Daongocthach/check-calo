import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { STORAGE_KEYS } from '@/utils/storage';
import { useStorageBoolean } from '@/utils/storage/useStorage';
import { fetchSupportPromptHidden } from '../services/supportPromptService';

const SUPPORT_PROMPT_VISIBILITY_QUERY_KEY = ['support-prompt-visibility'] as const;

export function useSupportPromptVisibility() {
  const { data: isServerHidden } = useQuery({
    queryKey: SUPPORT_PROMPT_VISIBILITY_QUERY_KEY,
    queryFn: fetchSupportPromptHidden,
    staleTime: 0,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const {
    value: isLocalDismissed,
    setValue: setLocalDismissed,
    removeValue: clearLocalDismissed,
  } = useStorageBoolean(STORAGE_KEYS.app.supportPromptDismissed, { defaultValue: false });

  useEffect(() => {
    if (isServerHidden === false && isLocalDismissed) {
      clearLocalDismissed();
    }
  }, [clearLocalDismissed, isLocalDismissed, isServerHidden]);

  return {
    isHidden: Boolean(isServerHidden) || Boolean(isLocalDismissed),
    dismiss: () => setLocalDismissed(true),
  };
}
