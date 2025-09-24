import { queryFetcher } from '@/hooks/core/queryFetcher';
import { queryInflightPromise } from '@/hooks/core/queryInflight';
import type { NexusDefinition } from '@/types/definition';

export const executeQueryOnce = async <T>(
  cacheKey: string,
  definition: NexusDefinition<T>,
  pathname: string,
  route?: string
): Promise<{ data: T; headers: Headers }> => {
  return queryInflightPromise<T>(cacheKey, () =>
    queryFetcher<T>(definition, cacheKey, pathname, route)
  );
};
