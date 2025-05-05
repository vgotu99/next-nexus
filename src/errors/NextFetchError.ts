import { ErrorCode } from "./errorCodes";

export class NextFetchError extends Error {
  response?: {
    data?: {
      message?: string;
      error?: string;
      [key: string]: any;
    };
    status: number;
    statusText: string;
    headers: Headers;
  };
  request?: Request;
  config?: RequestInit;
  code?: ErrorCode;

  constructor(
    message: string,
    options: {
      response?: Response;
      request?: Request;
      data?: {
        [key: string]: any;
        message?: string | undefined;
        error?: string | undefined;
      };
      config?: RequestInit;
      code?: ErrorCode;
    } = {}
  ) {
    super(message);
    this.name = "NextFetchError";

    if (options.response) {
      this.response = {
        status: options.response.status,
        statusText: options.response.statusText,
        headers: options.response.headers,
        data: options.data,
      };
    }

    this.request = options.request;
    this.config = options.config;
    this.code = options.code;
  }
}
