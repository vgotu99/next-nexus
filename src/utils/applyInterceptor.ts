import {
  NextFetchRequestInterceptor,
  NextFetchResponseInterceptor,
} from "@/types";
import { NextFetchRequestConfig } from "@/types/request";
import { NextFetchResponse } from "@/types/response";

export const applyRequestInterceptors = async (
  config: NextFetchRequestConfig,
  interceptors: NextFetchRequestInterceptor[]
): Promise<NextFetchRequestConfig> => {
  return interceptors.reduce(async (configPromise, interceptor) => {
    const currentConfig = await configPromise;

    try {
      return await interceptor.onFulfilled(currentConfig);
    } catch (error) {
      if (interceptor.onRejected) {
        throw interceptor.onRejected(error);
      }
      throw error;
    }
  }, Promise.resolve({ ...config }));
};

export const applyResponseInterceptors = async <T>(
  response: NextFetchResponse<T>,
  interceptors: NextFetchResponseInterceptor[]
): Promise<NextFetchResponse<T>> => {
  return interceptors.reduce(async (responsePromise, interceptor) => {
    const currentResponse = await responsePromise;

    try {
      return await interceptor.onFulfilled(currentResponse);
    } catch (error) {
      if (interceptor.onRejected) {
        throw interceptor.onRejected(error);
      }
      throw error;
    }
  }, Promise.resolve({ ...response }));
};
