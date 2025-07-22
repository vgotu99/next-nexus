import type { InternalNextFetchResponse } from '@/types/internal';

import {
  isJsonResponse,
  parseJsonResponse,
  createNextFetchResponse,
} from './responseProcessor';

export const processResponse = async <T>(
  response: Response,
  _requestMethod?: string
): Promise<InternalNextFetchResponse<T | undefined>> => {
  const data = isJsonResponse(response)
    ? await parseJsonResponse<T>(response)
    : undefined;

  const nextFetchResponse = createNextFetchResponse(response, data);

  return nextFetchResponse;
};
