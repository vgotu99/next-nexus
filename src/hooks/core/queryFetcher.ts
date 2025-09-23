import { clientCacheStore } from '@/cache/clientCacheStore';
import { nexusClient } from '@/core/nexus.client';
import type { NexusDefinition } from '@/types/definition';
import { generateETag } from '@/utils/cacheUtils';

const fetchData = async <TData>(
  definition: NexusDefinition<TData>,
  route?: string
): Promise<{ data: TData; headers: Headers }> => {
  const finalDefinition = route
    ? { ...definition, baseURL: '', endpoint: route }
    : definition;

  const response = await nexusClient({
    ...finalDefinition,
    client: undefined,
  } as typeof definition);

  return { data: response.data, headers: response.headers };
};

const updateClientCache = <TData>(
  definition: NexusDefinition<TData>,
  cacheKey: string,
  pathname: string,
  data: TData,
  headers: Headers
) => {
  const etag =
    data !== null && data !== undefined ? generateETag(data) : undefined;

  const cachedResponseHeaders = definition.client?.cachedHeaders?.reduce<
    Record<string, string>
  >((acc, headerName) => {
    const headerValue = headers.get(headerName);
    if (headerValue !== null) {
      acc[headerName] = headerValue;
    }
    return acc;
  }, {});

  clientCacheStore.set(cacheKey, {
    data,
    clientRevalidate: definition.client?.revalidate,
    clientTags: definition.client?.tags,
    serverTags: definition.server?.tags,
    source: 'fetch',
    etag,
    headers: cachedResponseHeaders,
  });

  clientCacheStore.indexPathname(pathname, cacheKey);
};

export const queryFetcher = async <TData>(
  definition: NexusDefinition<TData>,
  cacheKey: string,
  pathname: string,
  route?: string
): Promise<{ data: TData; headers: Headers }> => {
  const { data, headers } = await fetchData(definition, route);

  updateClientCache(definition, cacheKey, pathname, data, headers);

  return { data, headers };
};
