import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState } from 'react';
import i18n from '@/i18n/config';
import { toast } from '@/utils/toast';
import { mmkvPersister } from './mmkvPersister';

interface QueryProviderProps {
  children: React.ReactNode;
}

function handleError(error: Error) {
  toast.error(error.message || i18n.t('errors.generic'), {
    title: i18n.t('errors.title'),
  });
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 60 * 24,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
    queryCache: new QueryCache({
      onError: handleError,
    }),
    mutationCache: new MutationCache({
      onError: handleError,
    }),
  });
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Created once so a language change (new `t` identity) does not drop the query cache.
  const [queryClient] = useState(createQueryClient);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: mmkvPersister }}>
      {children}
    </PersistQueryClientProvider>
  );
}
