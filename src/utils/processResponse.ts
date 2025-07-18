import type { NextFetchResponse } from '@/types';

import {
  isJsonResponse,
  parseJsonResponse,
  createNextFetchResponse,
} from './responseProcessor';

export const processResponse = async <T>(
  response: Response,
  _requestMethod?: string
): Promise<NextFetchResponse<T | undefined>> => {
  const data = isJsonResponse(response)
    ? await parseJsonResponse<T>(response)
    : undefined;

  const nextFetchResponse = createNextFetchResponse(response, data);

  return nextFetchResponse;
};
