import { useCallback } from 'react';
import { STORAGE_KEYS, useStorage } from '@/utils/storage';

/** Name shown until the user picks their own. A proper name, so it is not translated. */
export const BUDDY_DEFAULT_NAME = 'Mew';
export const BUDDY_NAME_MAX_LENGTH = 20;

/** The pet's display name, stored on the device; a blank name falls back to the default. */
export function useBuddyName() {
  const { value, setValue } = useStorage<string>(STORAGE_KEYS.profile.petName);
  const name = value?.trim() || BUDDY_DEFAULT_NAME;

  const setName = useCallback(
    (next: string) => {
      const trimmed = next.trim().slice(0, BUDDY_NAME_MAX_LENGTH);
      setValue(trimmed && trimmed !== BUDDY_DEFAULT_NAME ? trimmed : null);
    },
    [setValue]
  );

  return { name, setName };
}
