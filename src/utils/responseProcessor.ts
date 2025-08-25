import { ERROR_CODES } from '@/constants/errorCodes';
import { createNexusError } from '@/errors/errorFactory';
import type { InternalNexusResponse } from '@/types/internal';

export const isJsonResponse = (response: Response): boolean => {
  return (
    response.headers.get('content-type')?.includes('application/json') ?? false
  );
};

export const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  try {
    return await response.json();
  } catch (error) {
    throw createNexusError('Invalid JSON response', {
      request: new Request(response.url),
      code: ERROR_CODES.BAD_RESPONSE_ERROR,
    });
  }
};

export const createNexusResponse = <T>(
  response: Response,
  data: T | undefined
): InternalNexusResponse<T | undefined> => {
  const internalResponse: InternalNexusResponse<T | undefined> = {
    ...response,
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    ok: response.ok,
    redirected: response.redirected,
    type: response.type,
    url: response.url,
    arrayBuffer: () => response.arrayBuffer(),
    blob: () => response.blob(),
    formData: () => response.formData(),
    json: () => response.json(),
    text: () => response.text(),
    clone: () => {
      const clonedResponse = response.clone();
      return createNexusResponse(clonedResponse, data);
    },
  };

  return internalResponse;
};
