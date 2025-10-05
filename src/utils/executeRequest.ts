import { isNexusError } from '@/errors/errorFactory';
import type { ServerCacheOptions } from '@/types/cache';
import type { NexusDefinition } from '@/types/definition';
import type {
  InternalNexusRequestConfig,
  InternalNexusResponse,
  NexusOptions,
} from '@/types/internal';

import {
  validateUrl,
  createHttpError,
  createNetworkError,
} from './httpErrorFactory';
import { processResponse } from './processResponse';

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

export const buildRequestConfig = (
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

const handleErrorResponse = async (
  response: Response,
  url: string,
  init: InternalNexusRequestConfig
): Promise<never> => {
  const raw = await response
    .clone()
    .text()
    .catch(() => '');
  const errorData = raw ? JSON.parse(raw) : {};
  const req = new Request(url, init);

  throw createHttpError(response.status, response, req, errorData);
};

export const executeRequest = async <T>(
  url: string,
  init: InternalNexusRequestConfig
): Promise<InternalNexusResponse<T | undefined>> => {
  try {
    validateUrl(url);

    const response = await fetch(url, init);

    if (!response.ok) {
      await handleErrorResponse(response, url, init);
    }

    return processResponse<T>(response, init.method || 'GET');
  } catch (error) {
    if (isNexusError(error)) {
      throw error;
    }

    const req = new Request(url, init);
    throw createNetworkError(error, req);
  }
};
