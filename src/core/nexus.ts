import { findExactClientCacheMetadata } from '@/cache/serverCacheStateProcessor';
import { ERROR_CODES } from '@/constants/errorCodes';
import {
  trackCache,
  trackRequestError,
  trackRequestStart,
  trackRequestSuccess,
  trackRequestTimeout,
} from '@/debug/tracker';
import { isNexusError } from '@/errors/errorFactory';
import { incPending, decPending } from '@/scope/requestPendingStore';
import type { ServerCacheOptions } from '@/types/cache';
import type { NexusDefinition } from '@/types/definition';
import type {
  InterceptorHandler,
  NexusInterceptors,
} from '@/types/interceptor';
import type {
  InternalNexusRequestConfig,
  InternalNexusResponse,
  NexusOptions,
} from '@/types/internal';
import type { NexusResponse } from '@/types/response';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
} from '@/utils/applyInterceptor';
import {
  generateBaseKey,
  generateCacheKey,
  generateETag,
} from '@/utils/cacheUtils';
import { isServerEnvironment } from '@/utils/environmentUtils';
import { executeRequest } from '@/utils/executeRequest';
import { retry } from '@/utils/retry';

import {
  createRequestInterceptor,
  createResponseInterceptor,
} from './interceptor';

const transformServerOptionsToNextOptions = (
  server?: ServerCacheOptions
): NexusOptions | undefined => {
  if (!server) return undefined;

  const nextOptions: NexusOptions = {};
  if (server.revalidate !== undefined) {
    nextOptions.revalidate = server.revalidate;
  }
  if (server.tags?.length) {
    nextOptions.tags = server.tags;
  }

  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
};

const buildRequestConfig = (
  definition: NexusDefinition<unknown>
): InternalNexusRequestConfig => {
  const { data, server, ...restOptions } = definition;

  const next = transformServerOptionsToNextOptions(server);

  return {
    ...restOptions,
    cache: server?.cache ? server.cache : 'no-store',
    next,
    body: data ? JSON.stringify(data) : undefined,
    server,
  };
};

const createInterceptorInterface = (
  requestInterceptor: ReturnType<typeof createRequestInterceptor>,
  responseInterceptor: ReturnType<typeof createResponseInterceptor>
): NexusInterceptors => ({
  request: {
    use: (name, onFulfilled, onRejected?) =>
      requestInterceptor.use(name, onFulfilled, onRejected),
    remove: name => requestInterceptor.remove(name),
    getAll: () => requestInterceptor.getAll(),
    get: name => requestInterceptor.get(name),
  },
  response: {
    use: (name, onFulfilled, onRejected?) =>
      responseInterceptor.use(
        name,
        onFulfilled as InterceptorHandler<InternalNexusResponse<unknown>>,
        onRejected
      ),
    remove: name => responseInterceptor.remove(name),
    getAll: () => responseInterceptor.getAll(),
    get: name => responseInterceptor.get(name),
  },
});

const executeRequestWithLifecycle = async <T>(
  url: string,
  config: InternalNexusRequestConfig,
  interceptors: string[],
  requestInterceptor: ReturnType<typeof createRequestInterceptor>,
  responseInterceptor: ReturnType<typeof createResponseInterceptor>
): Promise<InternalNexusResponse<T | null | undefined>> => {
  const startTime = trackRequestStart({ url, method: config.method || 'GET' });

  const requestInterceptors = requestInterceptor.getByNames(interceptors);
  const modifiedConfig = await applyRequestInterceptors(
    config,
    requestInterceptors
  );
  const hasClientOption = typeof modifiedConfig.client === 'object';

  try {
    const response = await retry({
      attempt: ({ signal }) => {
        const attemptConfig = { ...modifiedConfig, signal };
        const request = new Request(url, attemptConfig);
        return executeRequest<T>(request);
      },
      maxAttempts: (modifiedConfig.retry?.count ?? 0) + 1,
      delaySeconds: modifiedConfig.retry?.delay ?? 1,
      timeoutSeconds: modifiedConfig.timeout ?? 10,
      context: { url, method: modifiedConfig.method || 'GET' },
    });

    if (
      isServerEnvironment() &&
      modifiedConfig.method === 'GET' &&
      hasClientOption
    ) {
      const cacheKey = generateCacheKey({
        url,
        method: modifiedConfig.method,
        clientTags: modifiedConfig.client?.tags,
        serverTags: modifiedConfig.server?.tags,
      });

      const responseEtag =
        response.data !== null && response.data !== undefined
          ? generateETag(response.data)
          : undefined;

      const { extractClientCacheMetadataFromCookies } = await import(
        '@/cache/serverCacheStateProcessor'
      );

      const clientCacheMetadataArr =
        await extractClientCacheMetadataFromCookies();
      const exactClientCacheMetadata =
        clientCacheMetadataArr &&
        findExactClientCacheMetadata(clientCacheMetadataArr, cacheKey);

      const hasNoClientCache = !exactClientCacheMetadata;
      const isClientCacheStale = exactClientCacheMetadata?.ttl === 0;
      const isETagMatched =
        !!responseEtag && exactClientCacheMetadata?.etag === responseEtag;

      const shouldSkipHydration = isETagMatched;
      const shouldHydrate =
        hasNoClientCache || (isClientCacheStale && !isETagMatched);

      const { requestScopeStore } = await import('@/scope/requestScopeStore');

      if (shouldSkipHydration) {
        const existing = await requestScopeStore.get(cacheKey);

        if (!existing && isClientCacheStale) {
          const { registerNotModifiedKey } = await import(
            '@/scope/notModifiedContext'
          );

          registerNotModifiedKey(cacheKey);
        }

        trackCache({
          type: 'MATCH',
          key: generateBaseKey({ url, method: modifiedConfig.method }),
          source: 'server',
          tags: modifiedConfig.client?.tags,
          revalidate: modifiedConfig.client?.revalidate,
          ttl: exactClientCacheMetadata.ttl,
        });
      }

      if (shouldHydrate) {
        const cachedResponseHeaders =
          modifiedConfig.client?.cachedHeaders?.reduce<Record<string, string>>(
            (acc, headerName) => {
              const headerValue = response.headers.get(headerName);
              if (headerValue !== null) {
                acc[headerName] = headerValue;
              }
              return acc;
            },
            {}
          );

        const hydrationCacheEntry = {
          data: response.data,
          key: cacheKey,
          clientRevalidate: modifiedConfig.client?.revalidate || 0,
          clientTags: modifiedConfig.client?.tags || [],
          serverTags: modifiedConfig.server?.tags || [],
          etag: responseEtag,
          headers: cachedResponseHeaders,
        };

        await requestScopeStore.set(cacheKey, hydrationCacheEntry);
      }
    }

    const responseWithConfig: InternalNexusResponse<T | undefined> = {
      ...response,
      config: modifiedConfig,
      request: new Request(url, modifiedConfig),
      clone: () => {
        const clonedResponse = response.clone();
        const clonedInternalResponse: InternalNexusResponse<T | undefined> = {
          ...clonedResponse,
          config: modifiedConfig,
          request: new Request(url, modifiedConfig),
          data: clonedResponse.data,
        };
        return clonedInternalResponse;
      },
    };

    const responseInterceptors = responseInterceptor.getByNames(interceptors);
    const finalResponse = await applyResponseInterceptors<T>(
      responseWithConfig,
      responseInterceptors
    );

    const duration = performance.now() - startTime;

    if (isServerEnvironment() && modifiedConfig.method === 'GET') {
      const cacheStatus = response.headers.get('x-nextjs-cache');
      const ageHeader = response.headers.get('age');
      const age = ageHeader ? parseInt(ageHeader, 10) : undefined;
      const revalidate = modifiedConfig.next?.revalidate as number | undefined;

      if (cacheStatus) {
        trackCache({
          type: cacheStatus as 'HIT' | 'MISS',
          key: generateBaseKey({ url, method: modifiedConfig.method }),
          source: 'server',
          duration: duration,
          status: finalResponse.status,
          tags: modifiedConfig.next?.tags,
          revalidate: modifiedConfig.next?.revalidate,
          ttl:
            revalidate !== undefined && age !== undefined
              ? revalidate - age
              : undefined,
        });
      }
    }

    if (finalResponse.ok) {
      const responseSize = finalResponse.data
        ? JSON.stringify(finalResponse.data).length
        : 0;
      trackRequestSuccess({
        url,
        method: config.method || 'GET',
        startTime,
        status: finalResponse.status,
        responseSize,
      });
    } else {
      trackRequestError({
        url,
        method: config.method || 'GET',
        startTime,
        error: `HTTP ${finalResponse.status}`,
      });
    }

    return finalResponse;
  } catch (error) {
    if (isNexusError(error) && error.code === ERROR_CODES.TIMEOUT_ERROR) {
      trackRequestTimeout({ url, method: config.method || 'GET', startTime });
    } else {
      trackRequestError({
        url,
        method: config.method || 'GET',
        startTime,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error after retries',
      });
    }
    throw error;
  }
};

const globalRequestInterceptor = createRequestInterceptor();
const globalResponseInterceptor = createResponseInterceptor();

export const nexus = async <T>(
  definition: NexusDefinition<T>
): Promise<NexusResponse<T>> => {
  incPending();

  const { baseURL, endpoint, interceptors } = definition;
  const url = baseURL ? `${baseURL}${endpoint}` : endpoint;
  const requestConfig = buildRequestConfig(definition);

  try {
    const response = await executeRequestWithLifecycle<T>(
      url,
      requestConfig,
      interceptors || [],
      globalRequestInterceptor,
      globalResponseInterceptor
    );
    return response as NexusResponse<T>;
  } finally {
    decPending();
  }
};

export const interceptors: NexusInterceptors = createInterceptorInterface(
  globalRequestInterceptor,
  globalResponseInterceptor
);
