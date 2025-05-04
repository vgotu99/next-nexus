import { executeRequest, setupHeaders, setupTimeout } from "../utils";
import type { NextFetchInstance, NextFetchRequestConfig } from "../types";
import { NextFetchError } from "../errors";
import { createMethods } from "./methods";

export const createNextFetchInstance = (
  defaultConfig: NextFetchRequestConfig = {}
): NextFetchInstance => {
  const {
    baseURL = "",
    headers: defaultHeaders = {},
    timeout: defaultTimeout,
    ...restDefaultConfig
  } = defaultConfig;

  const nextFetch = async <T>(
    endpoint: string,
    config: NextFetchRequestConfig = {}
  ) => {
    const url = `${baseURL}${endpoint}`;
    const abortController = new AbortController();
    const timeout = config.timeout || defaultTimeout;
    const timeoutId = setupTimeout(abortController, timeout);
    const headers = setupHeaders(defaultHeaders, config.headers);

    const requestConfig: NextFetchRequestConfig = {
      ...restDefaultConfig,
      ...config,
      headers,
      signal: abortController.signal,
    };

    try {
      const request = new Request(url, requestConfig);
      const response = await executeRequest<T>(request, timeoutId);

      return response;
    } catch (error) {
      if (error instanceof NextFetchError) throw error;

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new NextFetchError("Request timeout");
      }

      throw new NextFetchError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  return createMethods(nextFetch);
};
