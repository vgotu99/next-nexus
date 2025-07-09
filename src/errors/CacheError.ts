import { NextFetchError } from "./NextFetchError";
import { ERROR_CODES, type ErrorCode } from "./errorCodes";

export class CacheError extends NextFetchError {
  readonly isRetryable: boolean;
  readonly fallbackStrategy: "network" | "none" | "stale";

  constructor(
    message: string,
    code: ErrorCode,
    options: {
      isRetryable?: boolean;
      fallbackStrategy?: "network" | "none" | "stale";
      originalError?: Error;
      cacheKey?: string;
    } = {}
  ) {
    super(message, { code });

    this.name = "CacheError";
    this.isRetryable = options.isRetryable ?? false;
    this.fallbackStrategy = options.fallbackStrategy ?? "network";

    if (options.originalError) {
      this.stack = options.originalError.stack;
    }
  }

  static unavailable(
    message: string = "Cache storage is not available"
  ): CacheError {
    return new CacheError(message, ERROR_CODES.ERR_CACHE_UNAVAILABLE, {
      isRetryable: false,
      fallbackStrategy: "network",
    });
  }

  static quotaExceeded(
    message: string = "Cache storage quota exceeded"
  ): CacheError {
    return new CacheError(message, ERROR_CODES.ERR_CACHE_QUOTA_EXCEEDED, {
      isRetryable: true,
      fallbackStrategy: "network",
    });
  }

  static operationFailed(message: string, originalError?: Error): CacheError {
    return new CacheError(message, ERROR_CODES.ERR_CACHE_OPERATION_FAILED, {
      isRetryable: true,
      fallbackStrategy: "stale",
      originalError,
    });
  }

  static corruption(message: string = "Cache data is corrupted"): CacheError {
    return new CacheError(message, ERROR_CODES.ERR_CACHE_CORRUPTION, {
      isRetryable: false,
      fallbackStrategy: "network",
    });
  }

  static unsupported(
    message: string = "Cache feature is not supported"
  ): CacheError {
    return new CacheError(message, ERROR_CODES.ERR_CACHE_UNSUPPORTED, {
      isRetryable: false,
      fallbackStrategy: "network",
    });
  }
}
