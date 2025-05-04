import type { NextFetchResponse } from "../../types";
import { NextFetchError } from "../../errors";
import { processResponse } from "../response";

export const executeRequest = async <T>(
  request: Request,
  timeoutId?: NodeJS.Timeout
): Promise<NextFetchResponse<T>> => {
  try {
    const response = (await fetch(request)) as NextFetchResponse<T>;

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      throw new NextFetchError(`Request Failed ${response.status} error: `, {
        response,
        request,
        data: await response.json(),
        config: { method: request.method, headers: request.headers },
      });
    }

    return await processResponse<T>(response);
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    throw error;
  }
};
