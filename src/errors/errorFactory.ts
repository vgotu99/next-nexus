import type {
  NexusErrorData,
  NexusErrorInfo,
  NexusErrorOptions,
  NexusErrorResponse,
} from '@/types/error';

const createErrorResponse = (
  response: Response,
  data?: NexusErrorData
): NexusErrorResponse => ({
  status: response.status,
  statusText: response.statusText,
  headers: response.headers,
  data,
});

const errorPropertyDefinitions: Array<{
  key: keyof Omit<NexusErrorOptions, 'data'>;
  getValue: (options: NexusErrorOptions) => any;
}> = [
  {
    key: 'response',
    getValue: options => createErrorResponse(options.response!, options.data),
  },
  { key: 'request', getValue: options => options.request },
  { key: 'config', getValue: options => options.config },
  { key: 'code', getValue: options => options.code },
];

export const createNexusError = (
  message: string,
  options: NexusErrorOptions = {}
): NexusErrorInfo => {
  const baseError = new Error(message);

  const propertyDescriptors: PropertyDescriptorMap = {
    name: {
      value: 'NexusError' as const,
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
  ) as NexusErrorInfo;
};

export const isNexusError = (error: unknown): error is NexusErrorInfo =>
  error instanceof Error && error.name === 'NexusError';
