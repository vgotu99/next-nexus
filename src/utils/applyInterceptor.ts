import type {
  NexusRequestInterceptor,
  NexusResponseInterceptor,
} from '@/types/interceptor';
import type {
  InternalNexusRequestConfig,
  InternalNexusResponse,
} from '@/types/internal';

export const applyRequestInterceptors = async (
  config: InternalNexusRequestConfig,
  interceptors: NexusRequestInterceptor[]
): Promise<InternalNexusRequestConfig> => {
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
  response: InternalNexusResponse<T | undefined>,
  interceptors: NexusResponseInterceptor<unknown>[]
): Promise<InternalNexusResponse<T | undefined>> => {
  return interceptors.reduce(
    async (responsePromise, interceptor) => {
      const currentResponse = await responsePromise;

      try {
        const result = await interceptor.onFulfilled(
          currentResponse as InternalNexusResponse<unknown>
        );
        return result as InternalNexusResponse<T | undefined>;
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
