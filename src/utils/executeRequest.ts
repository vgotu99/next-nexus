import type { NextFetchResponse } from "../types";
import { ERROR_CODES, NextFetchError } from "../errors";
import { processResponse } from "./processResponse";

export const executeRequest = async <T>(
  request: Request,
  timeoutId?: NodeJS.Timeout
): Promise<NextFetchResponse<T>> => {
  try {
    try {
      new URL(request.url);
    } catch (error) {
      throw new NextFetchError("Invalid URL", {
        request,
        code: ERROR_CODES.ERR_INVALID_URL,
      });
    }

    const response = (await fetch(request)) as NextFetchResponse<T>;

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.clone().json();

      switch (response.status) {
        case 400:
          throw new NextFetchError("Bad Request", {
            response,
            request,
            data: errorData,
            code: ERROR_CODES.ERR_BAD_REQUEST,
          });

        case 401:
          throw new NextFetchError("Unauthorized", {
            response,
            request,
            data: errorData,
            code: ERROR_CODES.ERR_UNAUTHORIZED,
          });

        case 403:
          throw new NextFetchError("Forbidden", {
            response,
            request,
            data: errorData,
            code: ERROR_CODES.ERR_FORBIDDEN,
          });

        case 404:
          throw new NextFetchError("Not Found", {
            response,
            request,
            data: errorData,
            code: ERROR_CODES.ERR_NOT_FOUND,
          });

        case 408:
          throw new NextFetchError("Request Timeout", {
            response,
            request,
            data: errorData,
            code: ERROR_CODES.ERR_TIMEOUT,
          });

        case 429:
          throw new NextFetchError("Too Many Requests", {
            response,
            request,
            data: errorData,
            code: ERROR_CODES.ERR_RATE_LIMITED,
          });

        default:
          if (response.status >= 500) {
            throw new NextFetchError(`Server Error: ${response.status}`, {
              response,
              request,
              data: errorData,
              code: ERROR_CODES.ERR_SERVER,
            });
          }

          throw new NextFetchError(
            `Request failed with status ${response.status}`,
            {
              response,
              request,
              data: errorData,
              code: ERROR_CODES.ERR_BAD_RESPONSE,
            }
          );
      }
    }

    return await processResponse<T>(response, request.method);
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error instanceof NextFetchError) throw error;

    if (error instanceof TypeError) {
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        throw new NextFetchError("Network Error", {
          request,
          code: ERROR_CODES.ERR_NETWORK,
        });
      }

      if (error.message.includes("CORS")) {
        throw new NextFetchError("CORS Error", {
          request,
          code: ERROR_CODES.ERR_NETWORK,
        });
      }
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      if (error.message === "timeout") {
        throw new NextFetchError("Request timeout", {
          request,
          code: ERROR_CODES.ERR_TIMEOUT,
        });
      } else {
        throw new NextFetchError("Request canceled", {
          request,
          code: ERROR_CODES.ERR_CANCELED,
        });
      }
    }

    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      throw new NextFetchError("Invalid JSON response", {
        request,
        code: ERROR_CODES.ERR_BAD_RESPONSE,
      });
    }

    throw new NextFetchError(
      error instanceof Error ? error.message : "Unknown error",
      {
        request,
        code: ERROR_CODES.ERR_UNKNOWN,
      }
    );
  }
};
