import { isNexusError } from '@/errors/errorFactory';
import type {
  InternalNexusRequestConfig,
  InternalNexusResponse,
} from '@/types/internal';

import {
  validateUrl,
  createHttpError,
  createNetworkError,
} from './httpErrorFactory';
import { processResponse } from './processResponse';

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
