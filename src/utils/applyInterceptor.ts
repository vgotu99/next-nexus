import type {
  NextFetchRequestInterceptor,
  NextFetchResponseInterceptor,
} from '@/types/interceptor';
import type {
  InternalNextFetchRequestConfig,
  InternalNextFetchResponse,
} from '@/types/internal';

export const applyRequestInterceptors = async (
  config: InternalNextFetchRequestConfig,
  interceptors: NextFetchRequestInterceptor[]
): Promise<InternalNextFetchRequestConfig> => {
  return interceptors.reduce(
    async (configPromise, interceptor) => {
      const currentConfig = await configPromise;

      try {
        return await interceptor.onFulfilled(currentConfig);
      } catch (error) {
        if (interceptor.onRejected) {
          throw interceptor.onRejected(error);
        }
        throw error;
      }
    },
    Promise.resolve({ ...config })
  );
};

export const applyResponseInterceptors = async <T>(
  response: InternalNextFetchResponse<T | undefined>,
  interceptors: NextFetchResponseInterceptor<unknown>[]
): Promise<InternalNextFetchResponse<T | undefined>> => {
  return interceptors.reduce(
    async (responsePromise, interceptor) => {
      const currentResponse = await responsePromise;

      try {
        const result = await interceptor.onFulfilled(
          currentResponse as InternalNextFetchResponse<unknown>
        );
        return result as InternalNextFetchResponse<T | undefined>;
      } catch (error) {
        if (interceptor.onRejected) {
          throw interceptor.onRejected(error);
        }
        throw error;
      }
    },
    Promise.resolve({ ...response })
  );
};
