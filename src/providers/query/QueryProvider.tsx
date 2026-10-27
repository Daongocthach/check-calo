import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient,
  type Query,
} from '@tanstack/react-query';
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

/**
 * Queries tagged `meta: { localOnly: true }` read the on-device database: they handle their own
 * errors and are not persisted (their results hold `Date`s that would not survive JSON).
 */
function isLocalOnlyQuery(query: Pick<Query, 'meta'>) {
  return query.meta?.localOnly === true;
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
      onError: (error, query) => {
        if (!isLocalOnlyQuery(query)) {
          handleError(error);
        }
      },
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: mmkvPersister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            !isLocalOnlyQuery(query) && defaultShouldDehydrateQuery(query),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
