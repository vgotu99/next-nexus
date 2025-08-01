import type { ErrorCode, ErrorMessageTemplate } from '@/types/error';

export const ERROR_MESSAGE_PREFIX = '[next-fetch]';

export const ERROR_MESSAGES: Record<ErrorCode, ErrorMessageTemplate> = {
  NETWORK_ERROR: {
    message: (details: string) => `Network request failed: ${details}`,
    solution: 'Please check your internet connection and try again.',
    documentation: 'https://next-fetch.dev/docs/errors#network-error',
  },

  TIMEOUT_ERROR: {
    message: (timeout: string) => `Request timeout: ${timeout}ms`,
    solution:
      'Please check your network status or increase the timeout setting.',
    documentation: 'https://next-fetch.dev/docs/errors#timeout-error',
  },

  CANCELED_ERROR: {
    message: () => 'Request was canceled',
    solution: 'Please check if the request was intentionally canceled.',
    documentation: 'https://next-fetch.dev/docs/errors#canceled-error',
  },

  BAD_RESPONSE_ERROR: {
    message: (status: string) => `Invalid response received: ${status}`,
    solution:
      'Please verify the server response and ensure it is in the correct format.',
    documentation: 'https://next-fetch.dev/docs/errors#bad-response',
  },

  BAD_REQUEST_ERROR: {
    message: (details: string) => `Invalid request: ${details}`,
    solution: 'Please check your request data and headers.',
    documentation: 'https://next-fetch.dev/docs/errors#bad-request',
  },

  INVALID_URL_ERROR: {
    message: (url: string) => `Invalid URL: ${url}`,
    solution: 'Please check your URL format and use a valid endpoint.',
    documentation: 'https://next-fetch.dev/docs/errors#invalid-url',
  },

  UNAUTHORIZED_ERROR: {
    message: (details: string) => `Authentication required: ${details}`,
    solution: 'Please provide valid authentication information.',
    documentation: 'https://next-fetch.dev/docs/errors#unauthorized',
  },

  FORBIDDEN_ERROR: {
    message: (details: string) => `Access denied: ${details}`,
    solution: 'Please check if you have the necessary permissions.',
    documentation: 'https://next-fetch.dev/docs/errors#forbidden',
  },

  NOT_FOUND_ERROR: {
    message: (url: string) => `Resource not found: ${url}`,
    solution: 'Please check if the requested resource exists.',
    documentation: 'https://next-fetch.dev/docs/errors#not-found',
  },

  RATE_LIMITED_ERROR: {
    message: (details: string) =>
      `Request frequency limit exceeded: ${details}`,
    solution: 'Please reduce request frequency and try again later.',
    documentation: 'https://next-fetch.dev/docs/errors#rate-limited',
  },

  SERVER_ERROR: {
    message: (status: string) => `Server error occurred: ${status}`,
    solution: 'Please check the server status and try again later.',
    documentation: 'https://next-fetch.dev/docs/errors#server-error',
  },

  CACHE_KEY_GENERATION_ERROR: {
    message: (details: string) => `Cache key generation failed: ${details}`,
    solution:
      'Please check your request definition and provide valid parameters.',
    documentation: 'https://next-fetch.dev/docs/errors#cache-key-error',
  },

  CACHE_STORAGE_ERROR: {
    message: (details: string) => `Cache storage failed: ${details}`,
    solution: 'Please check your browser storage permissions.',
    documentation: 'https://next-fetch.dev/docs/errors#cache-storage-error',
  },

  INVALID_CONFIG_ERROR: {
    message: (field: string) => `Invalid configuration: ${field}`,
    solution:
      'Please check your configuration object and provide required fields.',
    documentation: 'https://next-fetch.dev/docs/errors#invalid-config',
  },

  MISSING_REQUIRED_FIELD: {
    message: (field: string) => `Missing required field: ${field}`,
    solution: 'Please provide all required fields.',
    documentation: 'https://next-fetch.dev/docs/errors#missing-field',
  },

  TYPE_MISMATCH_ERROR: {
    message: (expected: string, actual: string) =>
      `Type mismatch: expected ${expected} but got ${actual}`,
    solution: 'Please provide valid data types.',
    documentation: 'https://next-fetch.dev/docs/errors#type-mismatch',
  },

  INVALID_DEFINITION_ERROR: {
    message: (details: string) => `Invalid definition: ${details}`,
    solution:
      'Please check your API definition and provide valid method and endpoint.',
    documentation: 'https://next-fetch.dev/docs/errors#invalid-definition',
  },

  UNSUPPORTED_METHOD_ERROR: {
    message: (method: string) => `Unsupported HTTP method: ${method}`,
    solution:
      'Please use one of the supported methods: GET, POST, PUT, PATCH, DELETE.',
    documentation: 'https://next-fetch.dev/docs/errors#unsupported-method',
  },

  INTERCEPTOR_ERROR: {
    message: (details: string) => `Interceptor error: ${details}`,
    solution: 'Please check your interceptor function logic.',
    documentation: 'https://next-fetch.dev/docs/errors#interceptor-error',
  },

  ETAG_PARSING_ERROR: {
    message: (etag: string) => `ETag parsing failed: ${etag}`,
    solution: 'Please check the ETag format provided by the server.',
    documentation: 'https://next-fetch.dev/docs/errors#etag-error',
  },

  UNKNOWN_ERROR: {
    message: (details: string) => `Unknown error: ${details}`,
    solution: 'Please contact the development team if the problem persists.',
    documentation: 'https://next-fetch.dev/docs/errors#unknown-error',
  },
};

export const ERROR_SOLUTION_GUIDES = {
  NETWORK_ERROR: {
    steps: [
      'Check your internet connection status',
      'Verify firewall or proxy settings',
      'Ensure the API server is running properly',
    ],
    commonCauses: [
      'Unstable network connection',
      'Server downtime',
      'CORS configuration issues',
    ],
  },

  CACHE_ERROR: {
    steps: [
      'Check browser storage permissions',
      'Verify cache settings',
      'Try clearing browser cache',
    ],
    commonCauses: [
      'Insufficient browser storage space',
      'Cache key generation failure',
      'Storage permission denied',
    ],
  },

  CONFIG_ERROR: {
    steps: [
      'Verify the configuration object format',
      'Ensure all required fields are provided',
      'Check type definitions',
    ],
    commonCauses: [
      'Invalid configuration format',
      'Missing required fields',
      'Type mismatch',
    ],
  },
};

export const DEBUGGING_TIPS = {
  NETWORK: [
    'Check the Network tab in browser developer tools for request/response details',
    "Verify server logs to determine if it's a server-side issue",
    'Test with different API endpoints',
  ],

  CACHE: [
    'Check cache status in the Application tab of browser developer tools',
    'Verify that cache keys are generated correctly',
    'Check cache expiration time settings',
  ],

  CONFIG: [
    'Check TypeScript compiler errors',
    'Log configuration objects at runtime',
    'Compare with default settings to identify differences',
  ],
};
