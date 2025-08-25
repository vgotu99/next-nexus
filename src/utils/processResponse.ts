import type { InternalNexusResponse } from '@/types/internal';

import {
  isJsonResponse,
  parseJsonResponse,
  createNexusResponse,
} from './responseProcessor';

export const processResponse = async <T>(
  response: Response,
  _requestMethod?: string
): Promise<InternalNexusResponse<T | undefined>> => {
  const data = isJsonResponse(response)
    ? await parseJsonResponse<T>(response)
    : undefined;

  const nexusResponse = createNexusResponse(response, data);

  return nexusResponse;
};
