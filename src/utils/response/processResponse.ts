import { ERROR_CODES, NextFetchError } from "../../errors";
import type { NextFetchResponse } from "../../types";

export const processResponse = async <T>(
  response: Response
): Promise<NextFetchResponse<T>> => {
  const nextFetchResponse = response as NextFetchResponse<T>;

  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      nextFetchResponse.data = await response.json();
    } catch (error) {
      throw new NextFetchError("Invalid JSON response", {
        request: new Request(response.url),
        code: ERROR_CODES.ERR_BAD_RESPONSE,
      });
    }
  }

  return nextFetchResponse;
};
