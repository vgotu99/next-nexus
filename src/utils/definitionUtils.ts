import { ClientCacheOptions, ServerCacheOptions } from '@/types/cache';
import type {
  NexusDefinition,
  GetNexusDefinition,
  PostNexusDefinition,
  PutNexusDefinition,
  PatchNexusDefinition,
  DeleteNexusDefinition,
  NexusDefinitionConfig,
} from '@/types/definition';
import type { NexusRequestConfig } from '@/types/request';

const validateConfig = (definition: NexusDefinition): void => {
  const { method, endpoint } = definition;
  if (!method) {
    throw new Error('Method is required');
  }
  if (!endpoint) {
    throw new Error('Endpoint is required');
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }
};

const mergeHeadersInit = (inits: (HeadersInit | undefined)[]) => {
  const merged = inits
    .filter(init => init !== undefined)
    .map(init => new Headers(init))
    .reduce((acc, cur) => {
      cur.forEach((value, key) => {
        if (value === 'null' || value === 'undefined') {
          acc.delete(key);
        } else {
          acc.set(key, value);
        }
      });
      return acc;
    }, new Headers());

  return merged.keys().next().done ? undefined : merged;
};

const mergeUnique = (a?: string[], b?: string[]) => {
  return a || b ? Array.from(new Set([...(a ?? []), ...(b ?? [])])) : undefined;
};

const mergeServerOptions = (
  defaultServer?: ServerCacheOptions,
  configServer?: ServerCacheOptions
): ServerCacheOptions | undefined => {
  if (!defaultServer && !configServer) return undefined;

  return {
    cache: configServer?.cache ?? defaultServer?.cache,
    revalidate: configServer?.revalidate ?? defaultServer?.revalidate,
    tags: mergeUnique(defaultServer?.tags, configServer?.tags),
  };
};

const mergeClientOptions = (
  defaultClient?: ClientCacheOptions,
  configClient?: ClientCacheOptions
): ClientCacheOptions | undefined => {
  if (!defaultClient && !configClient) return undefined;

  return {
    revalidate: configClient?.revalidate ?? defaultClient?.revalidate,
    tags: mergeUnique(defaultClient?.tags, configClient?.tags),
    cachedHeaders: mergeUnique(
      defaultClient?.cachedHeaders,
      configClient?.cachedHeaders
    ),
  };
};

export const createNexusDefinition =
  (defaultConfig?: NexusRequestConfig) =>
  <TResponse = unknown>(
    config: NexusDefinitionConfig
  ): NexusDefinition<TResponse> => {
    const {
      headers: defaultHeaders,
      server: defaultServer,
      client: defaultClient,
      ...restDefault
    } = defaultConfig || {};
    const {
      headers: configHeaders,
      server: configServer,
      client: configClient,
      ...restConfig
    } = config;

    const mergedBase = {
      ...restDefault,
      ...restConfig,
    };

    const mergedHeaders = mergeHeadersInit([defaultHeaders, configHeaders]);

    const mergedServer = mergeServerOptions(defaultServer, configServer);
    const mergedClient = mergeClientOptions(defaultClient, configClient);

    const definition = {
      ...mergedBase,
      headers: mergedHeaders,
      server: mergedServer,
      client: mergedClient,
    } as NexusDefinition<TResponse>;

    validateConfig(definition);

    return definition;
  };

export const isGetDefinition = <TResponse>(
  definition: NexusDefinition<TResponse>
): definition is GetNexusDefinition<TResponse> => {
  return definition.method === 'GET';
};

export const isMutationDefinition = <TResponse>(
  definition: NexusDefinition<TResponse>
): definition is
  | PostNexusDefinition<TResponse>
  | PutNexusDefinition<TResponse>
  | PatchNexusDefinition<TResponse>
  | DeleteNexusDefinition<TResponse> => {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(definition.method);
};
