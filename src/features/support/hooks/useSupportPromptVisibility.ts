import { useQuery } from '@tanstack/react-query';
import { fetchSupportPromptHidden } from '../services/supportPromptService';

const SUPPORT_PROMPT_VISIBILITY_QUERY_KEY = ['support-prompt-visibility'] as const;

export function useSupportPromptVisibility(): boolean {
  const { data } = useQuery({
    queryKey: SUPPORT_PROMPT_VISIBILITY_QUERY_KEY,
    queryFn: fetchSupportPromptHidden,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 24,
  });

  return data ?? false;
}
