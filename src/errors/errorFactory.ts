import type {
  NextFetchErrorData,
  NextFetchErrorInfo,
  NextFetchErrorOptions,
  NextFetchErrorResponse,
} from './errorTypes';

const createErrorResponse = (
  response: Response,
  data?: NextFetchErrorData
): NextFetchErrorResponse => ({
  status: response.status,
  statusText: response.statusText,
  headers: response.headers,
  data,
});

const errorPropertyDefinitions: Array<{
  key: keyof Omit<NextFetchErrorOptions, 'data'>;
  getValue: (options: NextFetchErrorOptions) => any;
}> = [
  {
    key: 'response',
    getValue: options => createErrorResponse(options.response!, options.data),
  },
  { key: 'request', getValue: options => options.request },
  { key: 'config', getValue: options => options.config },
  { key: 'code', getValue: options => options.code },
];

export const createNextFetchError = (
  message: string,
  options: NextFetchErrorOptions = {}
): NextFetchErrorInfo => {
  const baseError = new Error(message);

  const propertyDescriptors: PropertyDescriptorMap = {
    name: {
      value: 'NextFetchError' as const,
      writable: false,
      enumerable: false,
      configurable: true,
    },
  };

  errorPropertyDefinitions
    .filter(def => options[def.key] !== undefined)
    .forEach(def => {
      propertyDescriptors[def.key] = {
        value: def.getValue(options),
        writable: false,
        enumerable: true,
        configurable: false,
      };
    });

  return Object.defineProperties(
    baseError,
    propertyDescriptors
  ) as NextFetchErrorInfo;
};

export const isNextFetchError = (error: unknown): error is NextFetchErrorInfo =>
  error instanceof Error && error.name === 'NextFetchError';
