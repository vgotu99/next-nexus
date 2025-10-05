import { ERROR_CODES } from '@/constants/errorCodes';
import {
  globalRequestInterceptor,
  globalResponseInterceptor,
} from '@/core/interceptor';
import {
  trackRequestError,
  trackRequestStart,
  trackRequestSuccess,
  trackRequestTimeout,
} from '@/debug/tracker';
import { isNexusError } from '@/errors/errorFactory';
import type { NexusDefinition } from '@/types/definition';
import type {
  InternalNexusRequestConfig,
  InternalNexusResponse,
} from '@/types/internal';
import type { NexusResponse } from '@/types/response';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
} from '@/utils/applyInterceptor';
import { executeRequest, buildRequestConfig } from '@/utils/executeRequest';
import { retry } from '@/utils/retry';

const executeRequestWithLifecycle = async <T>(
  url: string,
  config: InternalNexusRequestConfig,
  interceptors: string[],
  requestInterceptor: typeof globalRequestInterceptor,
  responseInterceptor: typeof globalResponseInterceptor
): Promise<InternalNexusResponse<T | null | undefined>> => {
  const startTime = trackRequestStart({ url, method: config.method || 'GET' });

  const requestInterceptors = requestInterceptor.getByNames(interceptors);
  const modifiedConfig = await applyRequestInterceptors(
    config,
    requestInterceptors
  );

  try {
    const response = await retry({
      attempt: ({ signal }) => {
        const attemptConfig: InternalNexusRequestConfig = {
          ...modifiedConfig,
          signal,
        };

        return executeRequest<T>(url, attemptConfig);
      },
      maxAttempts: (modifiedConfig.retry?.count ?? 0) + 1,
      delaySeconds: modifiedConfig.retry?.delay ?? 1,
      timeoutSeconds: modifiedConfig.timeout ?? 10,
      context: { url, method: modifiedConfig.method || 'GET' },
    });

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

export const nexusClient = async <T>(
  definition: NexusDefinition<T>
): Promise<NexusResponse<T>> => {
  const { baseURL, endpoint, interceptors } = definition;
  const url = baseURL ? `${baseURL}${endpoint}` : endpoint;

  const requestConfig = buildRequestConfig(definition);

  const response = await executeRequestWithLifecycle<T>(
    url,
    requestConfig,
    interceptors || [],
    globalRequestInterceptor,
    globalResponseInterceptor
  );

  return response as NexusResponse<T>;
};
